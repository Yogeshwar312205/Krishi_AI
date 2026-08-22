const express = require('express');
const router = express.Router();

const { getNearbyVehicles, seedVehicles } = require('../controllers/vehicleController');
const { recommendLogistics, getPriceForecast, getDemandAnalysis, MARKETS } = require('../controllers/orchestratorController');
const { sendSMSAlert } = require('../controllers/alertController');
const { getDispatchSuggestions } = require('../controllers/dispatchController');
const { listFleet, addVehicle, reportLocation } = require('../controllers/fleetController');
const {
  createRequest, myRequests, dispatchQueue, assignRequest, updateStatus, cancelRequest,
} = require('../controllers/requestController');
const {
  getAgmarknetLivePrices, getAgmarknetCommodities, getAgmarknetHistory,
  getLiveGovtWeather, getLiveGovtFuelRates, withProfitBreakdown, CACHE_TTL_MS,
} = require('../services/agmarknetService');
const {
  getRoute, parsePath, MAX_WAYPOINTS, CACHE_TTL_MS: ROUTING_CACHE_TTL_MS,
} = require('../services/routingService');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { protect, authorize } = require('../middlewares/auth');
const ragRoutes = require('./ragRoutes');

/*
 * Accounts created before the fleet-owner model carry role 'Driver' or
 * 'Transporter'. They own vehicles like anyone else, so they authorise as fleet
 * owners here — the same mapping normaliseRole() applies on the client.
 */
const FLEET = ['Logistics', 'Driver', 'Transporter'];

// Rate limited API routes
router.use('/rag', ragRoutes);
router.get('/vehicles/nearby', apiLimiter, getNearbyVehicles);
// Destructive fleet reset — operator/admin only, never client-triggerable.
router.post('/vehicles/seed', apiLimiter, protect, authorize('Admin'), seedVehicles);
router.post('/recommend', apiLimiter, recommendLogistics);

/*
 * Pickup requests and dispatch — the capacitated VRP. See VRP.md.
 *
 * Every route below is authenticated and scoped to the caller. A farmer only
 * ever sees their own requests; a fleet owner only ever ranks and moves their
 * own vehicles. Nothing here has a seeded fallback: an empty queue means an
 * empty queue, not sample rows somebody might send a real truck against.
 */
router.post('/requests', apiLimiter, protect, authorize('Farmer'), createRequest);
router.get('/requests/mine', apiLimiter, protect, authorize('Farmer'), myRequests);
router.post('/requests/:id/cancel', apiLimiter, protect, authorize('Farmer'), cancelRequest);

router.get('/requests/queue', apiLimiter, protect, authorize(...FLEET), dispatchQueue);
router.post('/requests/:id/assign', apiLimiter, protect, authorize(...FLEET), assignRequest);
router.post('/requests/:id/status', apiLimiter, protect, authorize(...FLEET), updateStatus);

router.get('/fleet', apiLimiter, protect, authorize(...FLEET), listFleet);
router.post('/fleet', apiLimiter, protect, authorize(...FLEET), addVehicle);
router.post('/fleet/:id/location', apiLimiter, protect, authorize(...FLEET), reportLocation);

// Ranks every feasible (vehicle, pending request) pair by the extra road km it
// would cost to slot that farmer into the route the vehicle is already driving.
// It suggests; the fleet owner approves. Nothing here auto-assigns.
router.get('/dispatch/suggestions', apiLimiter, protect, authorize(...FLEET), getDispatchSuggestions);

/*
 * Road geometry for the map layer. Drawing only — see routingService.js.
 *
 * Authenticated because every screen that draws a map is behind the login, and
 * the path in the query is a farmer's gate and a mandi they are shipping to.
 *
 * `source` names what produced the line ('osrm' or 'straight-line'), following
 * the same rule as aiEngineSource and the market feed: the screen has to be
 * able to tell the user what they are looking at. The ranking's own distance
 * is unaffected by anything here.
 */
router.get('/routing/route', apiLimiter, protect, async (req, res) => {
  const points = parsePath(req.query.path);

  if (!points) {
    return res.status(400).json({
      success: false,
      message: 'path must be at least two "lng,lat" pairs separated by ";".',
    });
  }
  if (points.length > MAX_WAYPOINTS) {
    return res.status(400).json({
      success: false,
      message: `A route may have at most ${MAX_WAYPOINTS} stops.`,
    });
  }

  const route = await getRoute(points);
  return res.json({
    success: true,
    waypointCount: points.length,
    cacheTtlMs: ROUTING_CACHE_TTL_MS,
    ...route,
  });
});

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
