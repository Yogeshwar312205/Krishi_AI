const express = require('express');
const router = express.Router();

const { getNearbyVehicles, seedVehicles } = require('../controllers/vehicleController');
const { recommendLogistics, getPriceForecast, getDemandAnalysis, MARKETS } = require('../controllers/orchestratorController');
const { sendSMSAlert } = require('../controllers/alertController');
const { getAgmarknetLivePrices, getLiveGovtWeather, getLiveGovtFuelRates } = require('../services/agmarknetService');
const { apiLimiter } = require('../middlewares/rateLimiter');

// Rate limited API routes
router.get('/vehicles/nearby', apiLimiter, getNearbyVehicles);
router.post('/vehicles/seed', seedVehicles);
router.post('/recommend', apiLimiter, recommendLogistics);

router.get('/prices/forecast', apiLimiter, getPriceForecast);
router.get('/demand/analysis', apiLimiter, getDemandAnalysis);

// SMS Alert Trigger
router.post('/alerts/send-sms', apiLimiter, sendSMSAlert);

// Govt Agmarknet Live Market & Weather Feed
router.get('/agmarknet/live-rates', async (req, res) => {
  const crop = req.query.crop || 'Tomato';
  const state = req.query.state || '';
  const limit = parseInt(req.query.limit, 10) || 100;
  const data = await getAgmarknetLivePrices(crop, state, limit);
  res.json({ success: true, crop: crop, state: state, count: data.length, records: data });
});

// Live Govt Weather Endpoint
router.get('/weather/live', async (req, res) => {
  const lat = parseFloat(req.query.lat) || 19.0760;
  const lon = parseFloat(req.query.lon) || 73.0044;
  const weather = await getLiveGovtWeather(lat, lon);
  res.json({ success: true, weather });
});

// Live Govt Fuel & Logistics Freight Rates
router.get('/logistics/fuel-rates', async (req, res) => {
  const fuel = await getLiveGovtFuelRates();
  res.json({ success: true, fuel });
});

router.get('/markets', async (req, res) => {
  const crop = req.query.crop || 'Tomato';
  const state = req.query.state || '';
  const limit = parseInt(req.query.limit, 10) || 100;
  
  const liveAgmarknetData = await getAgmarknetLivePrices(crop, state, limit);
  
  if (liveAgmarknetData && liveAgmarknetData.length > 0) {
    return res.json({
      success: true,
      source: 'Government Agmarknet API (data.gov.in)',
      count: liveAgmarknetData.length,
      markets: liveAgmarknetData
    });
  }

  res.json({ success: true, source: 'Static APMC Dataset', count: MARKETS.length, markets: MARKETS });
});

module.exports = router;
