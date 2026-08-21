/**
 * Dispatch suggestions for the logistics provider.
 *
 * POST, not GET: a fleet's routes do not fit in a query string.
 *
 * Stateless by design — vehicles and pending requests arrive in the body. The
 * fleet lives in the zustand store, exactly as bookings, deals and buyer
 * postings do, and this endpoint is the arithmetic rather than the record.
 *
 * The response names what produced it (`source`), following the same rule as
 * `aiEngineSource` on /api/recommend and `source` on /api/markets: the UI must
 * be able to tell the dispatcher honestly what they are looking at. Here that
 * string says "no solver" on purpose — see VRP.md.
 */

const {
  suggestInsertions,
  AVG_SPEED_KMH,
  SERVICE_MINUTES_PER_STOP,
  DEFAULT_TOP_N,
  ROAD_FACTOR,
} = require('../services/insertionService');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const { publicVehicle } = require('./fleetController');
const { publicRequest } = require('./requestController');
const logger = require('../utils/logger');

const SOURCE = 'Cheapest Insertion Heuristic (rule-based, no solver)';

/*
 * GET /api/dispatch/suggestions
 *
 * Reads this owner's fleet and the open request queue straight from Mongo. It
 * takes no fleet payload from the client: the ranking decides where a real
 * truck goes, and a caller who can post their own vehicles could rank a fleet
 * they do not own against requests they cannot see.
 */
const getDispatchSuggestions = async (req, res) => {
  const topN = Number.isFinite(Number(req.query.topN)) && Number(req.query.topN) > 0
    ? Math.min(Number(req.query.topN), 10)
    : DEFAULT_TOP_N;

  try {
    const [fleet, queue] = await Promise.all([
      Vehicle.find({ owner: req.user._id }),
      PickupRequest.find({ status: 'pending' }).sort({ createdAt: -1 }),
    ]);

    const vehicles = fleet.map(publicVehicle);
    const requests = queue.map((doc) => ({
      id: String(doc._id),
      quantityKg: doc.quantityKg,
      produceType: doc.cropType,
      origin: doc.origin,
      destination: doc.destination,
      requestedWindow: {
        date: doc.pickupDate,
        label: doc.window?.label || '',
        startHour: doc.window?.startHour ?? null,
        endHour: doc.window?.endHour ?? null,
      },
      status: 'pending',
    }));

    const { suggestions, infeasible, unrankable } = suggestInsertions(vehicles, requests, topN);

    return res.json({
      success: true,
      source: SOURCE,
      params: {
        roadFactor: ROAD_FACTOR,
        avgSpeedKmH: AVG_SPEED_KMH,
        serviceMinutesPerStop: SERVICE_MINUTES_PER_STOP,
        topN,
      },
      generatedAt: new Date().toISOString(),
      counts: {
        vehicles: vehicles.length,
        requests: requests.length,
        suggestions: suggestions.length,
        infeasible: infeasible.length,
        unrankable: unrankable.length,
      },
      vehicles,
      pending: queue.map(publicRequest),
      suggestions,
      infeasible,
      unrankable,
    });
  } catch (error) {
    logger.error(`Dispatch suggestion failed: ${error.message}`);
    return res.status(503).json({ success: false, error: 'Could not rank your fleet.' });
  }
};

module.exports = { getDispatchSuggestions, SOURCE };
