const recoveryState = require('../services/recoveryState');
const logger = require('../utils/logger');

/**
 * Keep the system usable during a blackout.
 *
 * While the resilience mode is anything other than `idle`, a mutating request
 * on a protected route is NOT rejected. It is journalled by the controller as
 * usual, parked in the offline queue, and answered `202` with a body that names
 * exactly what happened — the same "tell the user what they're looking at"
 * convention as `aiEngineSource` and `<DemoStamp/>`.
 *
 * When the mode is `idle` this is a pass-through with zero overhead.
 *
 * Mounted only on the write routes for the four protected entities; reads are
 * never intercepted.
 */
const guardWrites = (req, res, next) => {
  if (!recoveryState.isDegraded()) return next();

  const op = {
    kind: 'http',
    method: req.method,
    originalUrl: req.originalUrl,
    params: req.params,
    body: req.body,
    actorId: req.user ? String(req.user._id) : 'anonymous',
  };

  recoveryState.enqueue(op)
    .then((entry) => {
      logger.warn(`[guardWrites] queued ${req.method} ${req.originalUrl} (${entry.queueId})`);
      res.status(202).json({
        success: true,
        mode: 'recovery',
        queued: true,
        queueId: entry.queueId,
        message: 'Saved. The system is operating in Recovery Mode and will sync this once the database is back.',
      });
    })
    .catch((err) => {
      logger.error(`[guardWrites] could not queue: ${err.message}`);
      res.status(503).json({ success: false, message: 'System is recovering. Please try again shortly.' });
    });
};

module.exports = guardWrites;
