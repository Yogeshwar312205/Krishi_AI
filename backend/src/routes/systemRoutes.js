const express = require('express');
const router = express.Router();

const {
  drillGuard,
  getHealth,
  takeSnapshot,
  drillSeed,
  drillBlackout,
  drillReset,
  loadStart,
  loadStop,
  recoverNow,
} = require('../controllers/systemController');

/*
 * The Blackout resilience console.
 *
 * Unauthenticated on purpose — see systemController.js. `/health` is always
 * readable; every mutation goes through `drillGuard` (non-production, or the
 * x-drill-token header).
 */

router.get('/health', getHealth);

router.post('/snapshot', drillGuard, takeSnapshot);
router.post('/recover', drillGuard, recoverNow);

router.post('/drill/seed', drillGuard, drillSeed);
router.post('/drill/blackout', drillGuard, drillBlackout);
router.post('/drill/reset', drillGuard, drillReset);
router.post('/drill/load/start', drillGuard, loadStart);
router.post('/drill/load/stop', drillGuard, loadStop);

module.exports = router;
