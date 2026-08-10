const express = require('express');
const router = express.Router();

const { getNearbyVehicles, seedVehicles } = require('../controllers/vehicleController');
const { recommendLogistics, getPriceForecast, getDemandAnalysis, MARKETS } = require('../controllers/orchestratorController');
const { apiLimiter } = require('../middlewares/rateLimiter');

// Rate limited API routes
router.get('/vehicles/nearby', apiLimiter, getNearbyVehicles);
router.post('/vehicles/seed', seedVehicles);
router.post('/recommend', apiLimiter, recommendLogistics);

router.get('/prices/forecast', apiLimiter, getPriceForecast);
router.get('/demand/analysis', apiLimiter, getDemandAnalysis);

router.get('/markets', (req, res) => {
  res.json({ success: true, count: MARKETS.length, markets: MARKETS });
});

module.exports = router;
