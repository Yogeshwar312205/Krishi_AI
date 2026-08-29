const mongoose = require('mongoose');

const { getIsConnected } = require('../config/db');
const journal = require('../services/journal');
const snapshot = require('../services/snapshot');
const recovery = require('../services/recovery');
const recoveryState = require('../services/recoveryState');
const drill = require('../services/drill');
const { ENTITIES } = require('../services/entityRegistry');
const logger = require('../utils/logger');

/**
 * The resilience / Blackout console API. Deliberately UNAUTHENTICATED: if the
 * `users` collection is wiped, `middlewares/auth.js` can no longer look anyone
 * up, so a JWT-guarded console would lock itself out at exactly the moment it
 * is needed. Mutations are instead gated by `drillGuard` below.
 */

// Mutations are allowed outside production, or with the shared drill token.
const drillGuard = (req, res, next) => {
  const token = process.env.RESILIENCE_DRILL_TOKEN;
  if (process.env.NODE_ENV !== 'production') return next();
  if (token && req.headers['x-drill-token'] === token) return next();
  return res.status(403).json({ success: false, message: 'Resilience drill is disabled on this deployment.' });
};

const liveCounts = async () => {
  if (!getIsConnected()) return {};
  const out = {};
  await Promise.all(ENTITIES.map(async (e) => { out[e.type] = await e.model.countDocuments(); }));
  return out;
};

const getHealth = async (req, res) => {
  try {
    const mongoConnected = getIsConnected() && mongoose.connection.readyState === 1;
    const jstats = await journal.stats();
    const snapMeta = await snapshot.meta();
    const state = recoveryState.get();
    const queuePending = await recoveryState.queueDepth();
    const manifest = await recovery.readManifest();

    let scan = { byType: {}, affected: [], recoverable: 0, unrecoverable: [] };
    if (mongoConnected) {
      scan = await recovery.scan();
    }

    const scopeCount = Object.values(manifest.seededIds || {}).reduce((n, a) => n + a.length, 0);

    let db = 'online';
    if (!mongoConnected) db = 'down';
    else if (scan.affected.length || !jstats.chainOk) db = 'degraded';

    return res.json({
      ok: true,
      at: new Date().toISOString(),
      mode: state.mode,
      db,
      mongoConnected,
      recovery: state.mode,
      journal: {
        status: jstats.status,
        events: jstats.events,
        lastSeq: jstats.lastSeq,
        chainOk: jstats.chainOk,
        brokenAtSeq: jstats.brokenAtSeq,
        fileBytes: jstats.fileBytes,
      },
      snapshot: snapMeta,
      scan: {
        byType: scan.byType,
        affected: scan.affected,
        affectedCount: scan.affected.length,
        recoverable: scan.recoverable,
        unrecoverable: scan.unrecoverable,
        unrecoverableCount: scan.unrecoverable.length,
      },
      queue: { pending: queuePending },
      load: drill.loadStatus(),
      drill: {
        scopeCount,
        lastSeedAt: manifest.lastSeedAt,
        lastBlackoutAt: manifest.lastBlackoutAt,
      },
      counts: await liveCounts(),
    });
  } catch (err) {
    logger.error(`[system] health failed: ${err.message}`);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

const takeSnapshot = async (req, res) => {
  try {
    const snap = await snapshot.take('manual');
    return res.json({ success: true, snapshot: snap });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const drillSeed = async (req, res) => {
  try {
    const result = await drill.seed();
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`[system] drill seed failed: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const drillBlackout = async (req, res) => {
  try {
    const result = await drill.blackout();
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`[system] drill blackout failed: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const drillReset = async (req, res) => {
  try {
    await drill.reset();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const loadStart = (req, res) => res.json({ success: true, ...drill.startLoad() });
const loadStop = (req, res) => res.json({ success: true, ...drill.stopLoad() });

const recoverNow = async (req, res) => {
  try {
    // Stop new load-generator traffic so the queue snapshot the engine reads is
    // stable; anything already queued is still replayed.
    drill.stopLoad();
    const report = await recovery.run({ actorId: 'console' });
    return res.json({ success: true, report });
  } catch (err) {
    logger.error(`[system] recovery failed: ${err.message}`);
    recoveryState.set('blackout'); // leave it visibly un-recovered rather than pretend
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  drillGuard,
  getHealth,
  takeSnapshot,
  drillSeed,
  drillBlackout,
  drillReset,
  loadStart,
  loadStop,
  recoverNow,
};
