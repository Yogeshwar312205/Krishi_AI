const express = require('express');
const router = express.Router();

const { getNearbyVehicles, seedVehicles } = require('../controllers/vehicleController');
const { recommendLogistics, getPriceForecast, getDemandAnalysis, MARKETS } = require('../controllers/orchestratorController');
const { sendSMSAlert } = require('../controllers/alertController');
const {
  getAgmarknetLivePrices, getAgmarknetCommodities, getAgmarknetHistory,
  getLiveGovtWeather, getLiveGovtFuelRates, withProfitBreakdown, CACHE_TTL_MS,
} = require('../services/agmarknetService');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { protect, authorize } = require('../middlewares/auth');

// Rate limited API routes
router.get('/vehicles/nearby', apiLimiter, getNearbyVehicles);
// Destructive fleet reset — operator/admin only, never client-triggerable.
router.post('/vehicles/seed', apiLimiter, protect, authorize('Admin'), seedVehicles);
router.post('/recommend', apiLimiter, recommendLogistics);

router.get('/prices/forecast', apiLimiter, getPriceForecast);
router.get('/demand/analysis', apiLimiter, getDemandAnalysis);

// SMS Alert Trigger
router.post('/alerts/send-sms', apiLimiter, sendSMSAlert);

// Govt Agmarknet Live Market & Weather Feed
//
// Returns every Maharashtra APMC that reported this commodity in the last few
// days — not a fixed shortlist. The service caches for 15 minutes, so the
// frontend calling this on every screen is cheap; see frontend/src/data/marketCache.js
// for the matching client-side cache.
router.get('/agmarknet/live-rates', async (req, res) => {
  const crop = req.query.crop || 'Tomato';
  const state = req.query.state || '';
  // Deliberately no client-controlled `limit`: how many raw feed rows we pull
  // is what decides how many days and markets survive de-duplication, and the
  // response is cached under crop+state alone — one caller passing a small
  // limit would serve everyone else a truncated market list for 15 minutes.
  const data = await getAgmarknetLivePrices(crop, state);
  res.json({
    success: true,
    crop,
    state,
    count: data.records.length,
    latestArrivalDate: data.latestArrivalDate || null,
    isLiveGovtData: data.isLiveGovtData,
    fetchedAt: data.fetchedAt,
    cacheTtlMs: CACHE_TTL_MS.prices,
    records: data.records,
  });
});

// Which commodities this state's mandis are actually reporting right now.
// Drives the crop picker, so it can offer crops that have live rates instead
// of a hardcoded seven of which only two ever resolved.
router.get('/agmarknet/commodities', async (req, res) => {
  const state = req.query.state || 'Maharashtra';
  const data = await getAgmarknetCommodities(state);
  res.json({ success: true, ...data });
});

// Govt Agmarknet Recent Price History (for trend charts)
router.get('/agmarknet/history', async (req, res) => {
  const crop = req.query.crop || 'Tomato';
  const state = req.query.state || 'Maharashtra';
  const days = parseInt(req.query.days, 10) || 14;
  const history = await getAgmarknetHistory(crop, state, days);
  res.json({ success: true, crop, state, ...history });
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

// Same live feed as /agmarknet/live-rates, but ranked by what the farmer
// actually takes home. Pass originLng/originLat/quantityKg to get the
// distance, freight, commission and net for each mandi.
router.get('/markets', async (req, res) => {
  const crop = req.query.crop || 'Tomato';
  const state = req.query.state || '';
  const quantityKg = parseFloat(req.query.quantityKg) || 1000;
  const originLng = parseFloat(req.query.originLng);
  const originLat = parseFloat(req.query.originLat);

  const live = await getAgmarknetLivePrices(crop, state);

  if (live.records.length) {
    const hasOrigin = Number.isFinite(originLng) && Number.isFinite(originLat);
    const markets = hasOrigin
      ? withProfitBreakdown(live.records, { originCoords: [originLng, originLat], quantityKg })
          .sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity))
      : live.records;

    return res.json({
      success: true,
      source: 'Government Agmarknet API (data.gov.in)',
      rankedBy: hasOrigin ? 'net' : 'rate',
      latestArrivalDate: live.latestArrivalDate,
      count: markets.length,
      markets,
    });
  }

  res.json({ success: true, source: 'Static APMC Dataset', count: MARKETS.length, markets: MARKETS });
});

module.exports = router;
