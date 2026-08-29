const fsp = require('fs/promises');
const path = require('path');

const Snapshot = require('../models/Snapshot');
const { getIsConnected } = require('../config/db');
const { ENTITIES } = require('./entityRegistry');
const journal = require('./journal');
const logger = require('../utils/logger');

/**
 * Point-in-time copies of the four protected collections, pinned to the journal
 * `seq` at the moment they were taken.
 *
 * Recovery loads the newest snapshot, restores those docs, then replays only
 * the journal events after `atSeq`. Without this, replay would grow without
 * bound and a wipe on a mature system would take minutes.
 *
 * Written to `backend/data/snapshots/<iso>.json` AND the `snapshots` collection
 * — same bytes, so a snapshot is still usable if the DB copy is lost too.
 */

const SNAP_DIR = path.join(journal.DATA_DIR, 'snapshots');

/** Take a snapshot now. `reason` is one of boot | scheduled | manual | pre-drill. */
const take = async (reason = 'scheduled') => {
  if (!getIsConnected()) {
    logger.warn('[snapshot] skipped — database not connected');
    return null;
  }

  const jstats = await journal.stats();
  const atSeq = jstats.lastSeq;

  const collections = {};
  const counts = {};
  for (const ent of ENTITIES) {
    // `+password` — normally `select:false`. We keep the bcrypt hash so a
    // recovered account can still sign in; it is already a one-way hash.
    const query = ent.type === 'User' ? ent.model.find().select('+password') : ent.model.find();
    const docs = await query.lean();
    collections[ent.type] = docs;
    counts[ent.type] = docs.length;
  }

  const takenAt = new Date();
  const fileName = `${takenAt.toISOString().replace(/[:.]/g, '-')}.json`;
  const body = { atSeq, takenAt: takenAt.toISOString(), reason, counts, collections };

  await fsp.mkdir(SNAP_DIR, { recursive: true });
  await fsp.writeFile(path.join(SNAP_DIR, fileName), JSON.stringify(body), 'utf8');

  const doc = await Snapshot.create({ atSeq, takenAt, reason, counts, collections, fileName });

  // Keep the last 10 on disk and in the DB — a demo does not need history.
  await prune();

  logger.info(`[snapshot] took snapshot (${reason}) atSeq=${atSeq} counts=${JSON.stringify(counts)}`);
  return { id: String(doc._id), atSeq, takenAt: takenAt.toISOString(), reason, counts, fileName };
};

/** The newest snapshot, from disk (falling back to the collection). */
const latest = async () => {
  // Prefer the DB pointer to know which file is newest, then read the file.
  if (getIsConnected()) {
    try {
      const doc = await Snapshot.findOne().sort({ atSeq: -1, takenAt: -1 }).lean();
      if (doc) {
        try {
          const raw = await fsp.readFile(path.join(SNAP_DIR, doc.fileName), 'utf8');
          return JSON.parse(raw);
        } catch {
          return { atSeq: doc.atSeq, takenAt: doc.takenAt, reason: doc.reason, counts: doc.counts, collections: doc.collections };
        }
      }
    } catch (err) {
      logger.warn(`[snapshot] latest() DB lookup failed: ${err.message}`);
    }
  }

  // Pure-file fallback: newest by filename (ISO names sort lexically).
  try {
    const files = (await fsp.readdir(SNAP_DIR)).filter((f) => f.endsWith('.json')).sort();
    if (!files.length) return null;
    const raw = await fsp.readFile(path.join(SNAP_DIR, files[files.length - 1]), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn(`[snapshot] latest() file fallback failed: ${err.message}`);
    return null;
  }
};

const meta = async () => {
  const snap = await latest();
  if (!snap) return { at: null, ageSec: null, atSeq: 0, counts: {} };
  const at = new Date(snap.takenAt);
  return {
    at: snap.takenAt,
    ageSec: Math.round((Date.now() - at.getTime()) / 1000),
    atSeq: snap.atSeq,
    counts: snap.counts || {},
    reason: snap.reason,
  };
};

const prune = async (keep = 10) => {
  try {
    const files = (await fsp.readdir(SNAP_DIR)).filter((f) => f.endsWith('.json')).sort();
    const stale = files.slice(0, Math.max(0, files.length - keep));
    await Promise.all(stale.map((f) => fsp.unlink(path.join(SNAP_DIR, f)).catch(() => {})));
  } catch { /* dir may not exist yet */ }

  if (getIsConnected()) {
    try {
      const ids = await Snapshot.find().sort({ atSeq: -1, takenAt: -1 }).skip(keep).select('_id').lean();
      if (ids.length) await Snapshot.deleteMany({ _id: { $in: ids.map((d) => d._id) } });
    } catch { /* best effort */ }
  }
};

/** Ensure there is a reasonably fresh snapshot; take one on boot if not. */
const ensureFresh = async (maxAgeSec = 3600) => {
  const m = await meta();
  if (!m.at || m.ageSec == null || m.ageSec > maxAgeSec) {
    return take('boot');
  }
  return null;
};

module.exports = { take, latest, meta, ensureFresh, prune, SNAP_DIR };
