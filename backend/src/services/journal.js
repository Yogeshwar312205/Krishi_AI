const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const EventJournal = require('../models/EventJournal');
const { getIsConnected } = require('../config/db');
const logger = require('../utils/logger');

/**
 * The event journal writer.
 *
 * Two sinks, written in lock-step for every event:
 *   1. `backend/data/journal.ndjson` — append-only file, one JSON object per
 *      line. Survives a full MongoDB drop; recovery reads this first.
 *   2. the `eventjournals` MongoDB collection — the same object, for the health
 *      scan to query by entity.
 *
 * Events are hash-chained. `hash = sha256(prevHash + canonicalBody)` where the
 * body is the event minus its own hash fields, key-sorted. A mismatch anywhere
 * in the chain is reported by `verifyChain` and surfaced on the health screen —
 * a corrupted black box must not be trusted silently.
 *
 * `record()` calls are serialised through an in-process promise chain so `seq`
 * and `prevHash` stay consistent under concurrent requests. A sink failure is
 * logged, never thrown back into the caller — journalling must never be the
 * reason a farmer's request fails.
 */

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const JOURNAL_FILE = path.join(DATA_DIR, 'journal.ndjson');

const GENESIS_HASH = '0'.repeat(64);

let lastSeq = 0;
let lastHash = GENESIS_HASH;
let ready = false;
let writeChain = Promise.resolve();

const canonical = (obj) => {
  // Normalise first: a fresh document carries ObjectId / Date / Buffer
  // instances, but the same event re-read from the file is plain JSON. Round
  // -tripping through JSON here makes the write-time and read-time forms
  // identical, so the hash of an event is the same before and after it is
  // persisted. (This bug made every chain verify as "broken".)
  const plain = JSON.parse(JSON.stringify(obj));
  const sortDeep = (v) => {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === 'object') {
      return Object.keys(v).sort().reduce((acc, k) => { acc[k] = sortDeep(v[k]); return acc; }, {});
    }
    return v;
  };
  return JSON.stringify(sortDeep(plain));
};

const hashEvent = (evt, prevHash) => {
  const body = {
    seq: evt.seq,
    eventId: evt.eventId,
    entityType: evt.entityType,
    entityId: evt.entityId,
    eventType: evt.eventType,
    payload: evt.payload,
    actorId: evt.actorId,
    drill: !!evt.drill,
    at: evt.at,
  };
  return crypto.createHash('sha256').update(prevHash + canonical(body)).digest('hex');
};

const ensureDir = async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(path.join(DATA_DIR, 'snapshots'), { recursive: true });
};

/**
 * Recover `lastSeq` / `lastHash` on boot. The file is authoritative; if it is
 * missing or shorter than the DB (e.g. first run against an existing DB) we
 * take the max seq seen anywhere.
 */
const init = async () => {
  await ensureDir();

  let fileSeq = 0;
  let fileHash = GENESIS_HASH;
  try {
    const raw = await fsp.readFile(JOURNAL_FILE, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    if (lines.length) {
      const last = JSON.parse(lines[lines.length - 1]);
      fileSeq = last.seq || 0;
      fileHash = last.hash || GENESIS_HASH;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn(`[journal] could not read journal file on boot: ${err.message}`);
  }

  let dbSeq = 0;
  if (getIsConnected()) {
    try {
      const top = await EventJournal.findOne().sort({ seq: -1 }).select('seq hash').lean();
      if (top) dbSeq = top.seq || 0;
    } catch (err) {
      logger.warn(`[journal] could not read journal collection on boot: ${err.message}`);
    }
  }

  lastSeq = Math.max(fileSeq, dbSeq);
  lastHash = fileSeq >= dbSeq ? fileHash : lastHash;
  ready = true;
  logger.info(`[journal] ready — lastSeq=${lastSeq}`);
};

/**
 * Append one event. Returns the stored event (or null on total failure).
 *   record({ entityType, entityId, eventType, payload, actorId, drill })
 */
const record = (input) => {
  const run = async () => {
    try {
      if (!ready) await init();

      const seq = lastSeq + 1;
      const at = new Date().toISOString();
      const evt = {
        seq,
        eventId: crypto.randomUUID(),
        entityType: input.entityType,
        entityId: String(input.entityId),
        eventType: input.eventType,
        payload: input.payload || {},
        actorId: input.actorId ? String(input.actorId) : 'system',
        drill: !!input.drill,
        at,
        prevHash: lastHash,
      };
      evt.hash = hashEvent(evt, lastHash);

      // Sink 1: the file. This is the one that matters when the DB is gone.
      await fsp.appendFile(JOURNAL_FILE, JSON.stringify(evt) + '\n', 'utf8');

      // Advance the chain only once the durable sink succeeded.
      lastSeq = seq;
      lastHash = evt.hash;

      // Sink 2: the collection. Best-effort — a DB hiccup here does not lose the
      // event, the file already has it and recovery reads the file first.
      if (getIsConnected()) {
        EventJournal.create(evt).catch((err) => {
          logger.warn(`[journal] collection write failed for seq ${seq}: ${err.message}`);
        });
      }

      return evt;
    } catch (err) {
      logger.error(`[journal] record failed: ${err.message}`);
      return null;
    }
  };

  // Serialise writes; hand every caller the same tail so ordering is total.
  const result = writeChain.then(run);
  writeChain = result.catch(() => {});
  return result;
};

/** All events, oldest first, from the file (falling back to the collection). */
const readAll = async () => {
  try {
    const raw = await fsp.readFile(JOURNAL_FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l)).sort((a, b) => a.seq - b.seq);
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn(`[journal] readAll file failed: ${err.message}`);
    if (getIsConnected()) {
      try {
        return await EventJournal.find().sort({ seq: 1 }).lean();
      } catch (dbErr) {
        logger.warn(`[journal] readAll collection failed: ${dbErr.message}`);
      }
    }
    return [];
  }
};

/** Verify the hash chain. Returns { ok, brokenAtSeq }. */
const verifyChain = (events) => {
  let prev = GENESIS_HASH;
  for (const evt of events) {
    if (evt.prevHash !== prev) return { ok: false, brokenAtSeq: evt.seq };
    if (hashEvent(evt, prev) !== evt.hash) return { ok: false, brokenAtSeq: evt.seq };
    prev = evt.hash;
  }
  return { ok: true, brokenAtSeq: null };
};

const stats = async () => {
  const events = await readAll();
  const chain = verifyChain(events);
  let fileBytes = 0;
  try { fileBytes = (await fsp.stat(JOURNAL_FILE)).size; } catch { /* no file yet */ }
  return {
    events: events.length,
    lastSeq: events.length ? events[events.length - 1].seq : 0,
    chainOk: chain.ok,
    brokenAtSeq: chain.brokenAtSeq,
    fileBytes,
    status: chain.ok ? 'intact' : 'broken',
  };
};

/**
 * Drop drill events from both sinks (used by `POST /api/system/drill/reset`).
 * Rewrites the file without the `drill:true` lines and rechains what remains so
 * the chain stays valid for the real data.
 */
const purgeDrillEvents = async () => {
  const all = await readAll();
  const kept = all.filter((e) => !e.drill);

  let prev = GENESIS_HASH;
  let seq = 0;
  const rechained = kept.map((e) => {
    seq += 1;
    const evt = { ...e, seq, prevHash: prev };
    delete evt.hash;
    evt.hash = hashEvent(evt, prev);
    prev = evt.hash;
    return evt;
  });

  await ensureDir();
  await fsp.writeFile(JOURNAL_FILE, rechained.map((e) => JSON.stringify(e)).join('\n') + (rechained.length ? '\n' : ''), 'utf8');
  lastSeq = seq;
  lastHash = prev;

  if (getIsConnected()) {
    try {
      await EventJournal.deleteMany({});
      if (rechained.length) await EventJournal.insertMany(rechained);
    } catch (err) {
      logger.warn(`[journal] purgeDrillEvents collection rewrite failed: ${err.message}`);
    }
  }
  return { removed: all.length - kept.length, remaining: kept.length };
};

module.exports = {
  init,
  record,
  readAll,
  verifyChain,
  stats,
  purgeDrillEvents,
  JOURNAL_FILE,
  DATA_DIR,
  GENESIS_HASH,
};
