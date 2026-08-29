const fsp = require('fs/promises');
const path = require('path');

const mongoose = require('mongoose');
const { getIsConnected } = require('../config/db');
const { ENTITIES, byType } = require('./entityRegistry');
const journal = require('./journal');
const snapshot = require('./snapshot');
const recoveryState = require('./recoveryState');
const { broadcast } = require('../sockets/bus');
const logger = require('../utils/logger');

const PickupRequest = require('../models/PickupRequest');

const MANIFEST_FILE = path.join(journal.DATA_DIR, 'drill-manifest.json');

/**
 * The recovery engine.
 *
 *   scan()  — compare the primary DB against the black box (journal + drill
 *             manifest) and classify every entity that should exist as ok /
 *             missing / corrupt, and each affected one as recoverable /
 *             unrecoverable.
 *   run()   — rebuild the recoverable ones (fold journal events over the last
 *             snapshot), write them back (users first), replay the offline
 *             write queue, and report honest totals. Every step is broadcast on
 *             `system:recovery_progress` so the console animates against real
 *             backend work.
 *
 * "Unrecoverable" is never faked: an entity with no CREATE in the retained
 * journal and no row in the last snapshot has nothing to be rebuilt from, and
 * is reported lost with that reason.
 */

const readManifest = async () => {
  try {
    const m = JSON.parse(await fsp.readFile(MANIFEST_FILE, 'utf8'));
    if (!Array.isArray(m.writtenOff)) m.writtenOff = [];
    return m;
  } catch {
    return { seededIds: {}, outOfBandIds: [], writtenOff: [], lastSeedAt: null, lastBlackoutAt: null };
  }
};

const writeManifest = async (m) => {
  await fsp.mkdir(journal.DATA_DIR, { recursive: true });
  await fsp.writeFile(MANIFEST_FILE, JSON.stringify(m, null, 2), 'utf8');
};

/** Latest event per entityId, and whether it is alive (last event ≠ DELETE). */
const foldEvents = (events) => {
  const byId = new Map();
  for (const evt of events) {
    byId.set(evt.entityId, evt); // events are seq-ordered, so last wins
  }
  return byId;
};

const semanticProblem = (type, doc) => {
  const ent = byType[type];
  try {
    const model = ent.model;
    const hydrated = model.hydrate(doc);
    const verr = hydrated.validateSync();
    if (verr) return verr.message.split(',')[0];
  } catch (err) {
    return `schema check failed: ${err.message}`;
  }
  return ent.semanticCheck(doc);
};

/**
 * Compare DB vs black box. Returns the full picture the health endpoint serves.
 */
const scan = async () => {
  const events = await journal.readAll();
  const chain = journal.verifyChain(events);
  const manifest = await readManifest();
  const snap = await snapshot.latest();
  const snapIds = {};
  if (snap && snap.collections) {
    for (const t of Object.keys(snap.collections)) {
      snapIds[t] = new Set((snap.collections[t] || []).map((d) => String(d._id)));
    }
  }

  const byTypeReport = {};
  const affected = [];
  const unrecoverable = [];
  // Records a past recovery already established as permanently lost — they are
  // acknowledged, not still-broken, so they no longer count against health.
  const writtenOff = new Set((manifest.writtenOff || []).map(String));

  for (const ent of ENTITIES) {
    const type = ent.type;
    const typeEvents = events.filter((e) => e.entityType === type);
    const latestById = foldEvents(typeEvents);

    // "Should exist" = alive in the journal ∪ listed in the drill manifest,
    // minus anything a prior recovery already wrote off.
    const expected = new Set();
    for (const [id, evt] of latestById) if (evt.eventType !== 'DELETE') expected.add(id);
    for (const id of (manifest.seededIds[type] || [])) expected.add(String(id));
    for (const id of writtenOff) expected.delete(id);

    const hasCreate = new Set(typeEvents.filter((e) => e.eventType === 'CREATE').map((e) => e.entityId));
    const inSnap = snapIds[type] || new Set();

    let inDb = 0;
    let missing = 0;
    let corrupt = 0;

    if (getIsConnected()) {
      inDb = await ent.model.countDocuments();
      for (const id of expected) {
        if (!mongoose.isValidObjectId(id)) continue;
        const doc = await ent.model.findById(id).select(type === 'User' ? '+password' : '').lean();
        const rebuildable = hasCreate.has(id) || inSnap.has(id);

        if (!doc) {
          missing += 1;
          const rec = { entityType: type, entityId: id, kind: 'missing', reason: 'row absent from the collection', recoverable: rebuildable };
          affected.push(rec);
          if (!rebuildable) unrecoverable.push({ ...rec, reason: 'written outside the event journal and not in the last snapshot — nothing to rebuild it from' });
        } else {
          const problem = semanticProblem(type, doc);
          if (problem) {
            corrupt += 1;
            const rec = { entityType: type, entityId: id, kind: 'corrupt', reason: problem, recoverable: rebuildable };
            affected.push(rec);
            if (!rebuildable) unrecoverable.push({ ...rec, reason: `corrupt (${problem}) and no journal history to rebuild from` });
          }
        }
      }
    }

    byTypeReport[type] = { label: ent.label, inDb, expected: expected.size, missing, corrupt };
  }

  const affectedRecoverable = affected.filter((a) => a.recoverable).length;

  return {
    byType: byTypeReport,
    affected,
    recoverable: affectedRecoverable,
    unrecoverable,
    journalChain: chain,
    snapshotSeq: snap ? snap.atSeq : 0,
  };
};

/** Rebuild one entity's current state from snapshot + its journal events. */
const reconstructEntity = async (type, id, eventsForId, snap) => {
  const nonDelete = eventsForId.filter((e) => e.eventType !== 'DELETE');
  const lastEvent = eventsForId[eventsForId.length - 1];

  if (lastEvent && lastEvent.eventType === 'DELETE') {
    return { tombstone: true };
  }
  if (nonDelete.length) {
    // Full-document events: the newest one IS the current state.
    return { doc: nonDelete[nonDelete.length - 1].payload };
  }
  // No events — fall back to the snapshot row.
  const row = snap && snap.collections && (snap.collections[type] || []).find((d) => String(d._id) === String(id));
  if (row) return { doc: row };
  return { unrecoverable: true, reason: 'no journal events and not in the last snapshot' };
};

const emit = (step, status, detail, counts) => {
  broadcast('system:recovery_progress', { step, status, detail: detail || '', counts: counts || {}, at: new Date().toISOString() });
  logger.info(`[recovery] ${step} ${status}${detail ? ' — ' + detail : ''}`);
};

/** Replay one queued offline op. Returns true if it was applied. */
const replayQueuedOp = async (op) => {
  try {
    if (op.kind === 'createPickupRequest') {
      const doc = await PickupRequest.create(op.payload);
      await journal.record({ entityType: 'PickupRequest', entityId: doc._id, eventType: 'CREATE', payload: doc.toObject(), actorId: op.actorId || 'recovery', drill: !!doc.drill });
      return true;
    }
    if (op.kind === 'http' && op.method === 'POST' && /\/api\/requests\/?$/.test(op.originalUrl || '')) {
      const b = op.body || {};
      if (b.cropType && b.quantityKg && b.origin && b.destination) {
        const doc = await PickupRequest.create({
          farmer: op.actorId, farmerName: b.farmerName || 'Farmer', farmerPhone: b.farmerPhone || '',
          cropType: b.cropType, quantityKg: Number(b.quantityKg), origin: b.origin, destination: b.destination,
          agreedRatePerKg: b.agreedRatePerKg ?? null, pickupDate: b.pickupDate || new Date().toISOString().split('T')[0],
          window: b.window || {}, status: 'pending', timeline: [{ status: 'pending', note: 'Raised during blackout — replayed on recovery' }],
        });
        await journal.record({ entityType: 'PickupRequest', entityId: doc._id, eventType: 'CREATE', payload: doc.toObject(), actorId: op.actorId || 'recovery' });
        return true;
      }
    }
  } catch (err) {
    logger.warn(`[recovery] queued op ${op.queueId} failed to replay: ${err.message}`);
  }
  return false;
};


const run = async ({ actorId = 'recovery' } = {}) => {
  const started = Date.now();
  recoveryState.set('recovering');

  emit('detect', 'running', 'Comparing the database against the event journal');
  const found = await scan();
  const affectedIds = found.affected.map((a) => ({ type: a.entityType, id: a.entityId }));
  emit('detect', 'done', `${found.affected.length} affected · ${found.recoverable} recoverable · ${found.unrecoverable.length} unrecoverable`, {
    affected: found.affected.length, recoverable: found.recoverable, unrecoverable: found.unrecoverable.length,
  });

  emit('snapshot', 'running', 'Loading the last good snapshot');
  const snap = await snapshot.latest();
  emit('snapshot', 'done', snap ? `snapshot at seq ${snap.atSeq}, taken ${snap.takenAt}` : 'no snapshot on file — replaying from journal only');

  emit('replay', 'running', 'Reading events after the snapshot');
  const allEvents = await journal.readAll();
  emit('replay', 'done', `${allEvents.length} events in the journal`);

  emit('reconstruct', 'running', 'Folding events into current state');
  const rebuilt = {};
  const lost = [...found.unrecoverable];
  for (const ent of ENTITIES) rebuilt[ent.type] = [];

  const unrecoverableIds = new Set(found.unrecoverable.map((u) => `${u.entityType}:${u.entityId}`));
  for (const { type, id } of affectedIds) {
    if (unrecoverableIds.has(`${type}:${id}`)) continue;
    const eventsForId = allEvents.filter((e) => e.entityType === type && e.entityId === id);
    const result = await reconstructEntity(type, id, eventsForId, snap);
    if (result.tombstone) continue; // correctly deleted — leave it gone
    if (result.unrecoverable) { lost.push({ entityType: type, entityId: id, reason: result.reason }); continue; }
    rebuilt[type].push(result.doc);
  }
  emit('reconstruct', 'done', `${Object.values(rebuilt).reduce((n, a) => n + a.length, 0)} documents rebuilt`);

  emit('validate', 'running', 'Checking rebuilt documents against the schema');
  for (const ent of ENTITIES) {
    rebuilt[ent.type] = rebuilt[ent.type].filter((doc) => {
      const problem = semanticProblem(ent.type, doc);
      if (problem) { lost.push({ entityType: ent.type, entityId: String(doc._id), reason: `rebuilt copy still invalid: ${problem}` }); return false; }
      return true;
    });
  }
  emit('validate', 'done', `${lost.length} could not be rebuilt cleanly`);

  emit('restore', 'running', 'Writing documents back — accounts first so sign-in returns');
  let recovered = 0;
  if (getIsConnected()) {
    for (const ent of ENTITIES) { // ENTITIES is ordered User-first on purpose
      const docs = rebuilt[ent.type];
      if (!docs.length) continue;
      const ops = docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }));
      await ent.model.bulkWrite(ops, { ordered: false });
      recovered += docs.length;
      emit('restore', 'running', `${ent.type}: ${docs.length} restored`);
    }
  }
  emit('restore', 'done', `${recovered} documents restored`);

  emit('replay-queue', 'running', 'Applying operations accepted during the outage');
  const queued = await recoveryState.readQueue();
  let replayed = 0;
  for (const op of queued) if (await replayQueuedOp(op)) replayed += 1;
  await recoveryState.clearQueue();
  emit('replay-queue', 'done', `${replayed} of ${queued.length} queued operations applied`);

  // Of everything the black box said should exist, the share now back and valid.
  const denom = recovered + lost.length;
  const consistencyPct = denom ? Math.round((recovered / denom) * 1000) / 10 : 100;

  // Acknowledge the permanent losses so the next health scan stops flagging the
  // system as degraded over records nothing can rebuild.
  try {
    const manifest = await readManifest();
    manifest.writtenOff = Array.from(new Set([...(manifest.writtenOff || []), ...lost.map((l) => String(l.entityId))]));
    manifest.lastRecoveryAt = new Date().toISOString();
    await writeManifest(manifest);
  } catch (err) {
    logger.warn(`[recovery] could not record write-offs: ${err.message}`);
  }

  recoveryState.set('idle');
  await snapshot.take('post-recovery').catch(() => {});

  const report = {
    recovered,
    unrecoverable: lost,
    unrecoverableCount: lost.length,
    opsDuringOutage: recoveryState.get().opsDuringOutage,
    queuedReplayed: replayed,
    queuedTotal: queued.length,
    consistencyPct,
    tookMs: Date.now() - started,
    finishedAt: new Date().toISOString(),
  };
  emit('complete', 'done', `recovered ${recovered} · unrecoverable ${lost.length} · queued replayed ${replayed}`, report);
  return report;
};

module.exports = { scan, run, readManifest, writeManifest, MANIFEST_FILE, reconstructEntity };
