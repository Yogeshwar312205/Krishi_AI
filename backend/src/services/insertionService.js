/**
 * Capacitated VRP — cheapest-insertion suggestions for a human dispatcher.
 *
 * This is the core of the problem statement, and it is deliberately NOT what
 * ai-engine/app/services/vrp_service.py claims to be. That file labels itself
 * "Google OR-Tools Multi-Objective VRP" and then picks a vehicle with
 * `available_vehicles[idx % len(available_vehicles)]` — round-robin over a list
 * of markets. It has no route, no stop sequence and no capacity feasibility.
 * See VRP.md for the full accounting.
 *
 * What this does instead: for every (vehicle, pending request) pair, work out
 * what it would actually cost in extra kilometres to slot that farmer into the
 * route the vehicle is already driving, reject the pairs that break capacity,
 * and rank the rest. It proposes. A dispatcher approves.
 *
 * Rule-based on purpose. The rank key is one measured quantity — extra road km
 * — and every suggestion carries the arithmetic that produced it, because a
 * dispatcher who cannot audit a suggestion will not act on it.
 */

const { haversineKm, ROAD_FACTOR } = require('../data/mandiGeo');

/* ------------------------------------------------------------- constants */

/**
 * A loaded truck on Maharashtra state highways. The farmer-facing engine has
 * used 50 km/h; 45 is the same figure with the mandi-approach crawl in it,
 * which is where a dispatch ETA actually goes wrong.
 */
const AVG_SPEED_KMH = 45;

/** Time on the ground at a farm gate or a mandi yard — loading is not free. */
const SERVICE_MINUTES_PER_STOP = 20;

/** Suggestions offered per vehicle. The dispatcher wants options, not an oracle. */
const DEFAULT_TOP_N = 3;

/* ------------------------------------------------------------- distances */

/** Unrounded road km between two `[lng, lat]` pairs. */
const legKm = (a, b) => haversineKm(a[1], a[0], b[1], b[0]) * ROAD_FACTOR;

const hasCoords = (c) => Array.isArray(c) && c.length === 2
  && Number.isFinite(c[0]) && Number.isFinite(c[1]);

/**
 * Total length of an ordered stop list.
 *
 * The route is OPEN: no return-to-depot leg. A transporter running three trucks
 * out of Nashik does not send one home empty between hires, and adding a phantom
 * return would inflate every insertion cost by a leg nobody drives.
 */
const routeDistanceKm = (stops) => {
  let total = 0;
  for (let k = 0; k < stops.length - 1; k += 1) {
    total += legKm(stops[k].coordinates, stops[k + 1].coordinates);
  }
  return total;
};

/* -------------------------------------------------------------- capacity */

/**
 * Capacity is not one subtraction.
 *
 * Load rises at each pickup and falls at each drop, so a lot that "fits" by
 * `quantityKg <= capacity - currentLoad` can still overload the truck between
 * two pickups if its drop comes later. The real test is the peak load across
 * the whole sequence.
 */
const loadProfile = (stops, startLoadKg) => {
  let load = startLoadKg;
  let peak = startLoadKg;
  for (const stop of stops) {
    load += stop.loadDeltaKg || 0;
    if (load > peak) peak = load;
  }
  return { peakKg: peak, endKg: load };
};

const capacityFeasible = (stops, vehicle) =>
  loadProfile(stops, vehicle.currentLoadKg || 0).peakKg <= vehicle.capacityKg;

/* ------------------------------------------------------------- insertion */

const spliceIn = (route, pickup, i, drop, j) => {
  const next = route.slice();
  next.splice(i, 0, pickup);
  next.splice(j, 0, drop);
  return next;
};

/**
 * Cheapest paired pickup-and-delivery insertion.
 *
 * A farmer request is two stops, not one. Textbook cheapest insertion places a
 * single node; doing that here — inserting only the pickup and letting the
 * vehicle's existing terminal mandi stand as the drop — would offer a truck
 * bound for Pune to collect a lot that was sold to a trader in Vashi.
 *
 * So: every ordered pair of positions (i, j) with i < j, pickup at i, drop at
 * j. O(n^2) per pair, and n is a handful of stops.
 *
 * Position 0 is the vehicle's current location and is never displaced, so
 * insertion starts at 1.
 */
const bestInsertion = (vehicle, request) => {
  const route = vehicle.currentRoute || [];
  if (route.length === 0) return null;

  const pickup = {
    id: `${request.id}-P`,
    kind: 'pickup',
    label: request.origin.label,
    coordinates: request.origin.coordinates,
    loadDeltaKg: request.quantityKg,
    requestId: request.id,
  };
  const drop = {
    id: `${request.id}-D`,
    kind: 'drop',
    label: request.destination.label,
    coordinates: request.destination.coordinates,
    loadDeltaKg: -request.quantityKg,
    requestId: request.id,
  };

  const base = routeDistanceKm(route);
  let best = null;

  for (let i = 1; i <= route.length; i += 1) {
    for (let j = i + 1; j <= route.length + 1; j += 1) {
      const candidate = spliceIn(route, pickup, i, drop, j);
      if (!capacityFeasible(candidate, vehicle)) continue;

      const cost = routeDistanceKm(candidate) - base;
      if (best === null || cost < best.costKm) {
        best = { costKm: cost, pickupAt: i, dropAt: j, candidate, baseKm: base };
      }
    }
  }

  return best;
};

/* ------------------------------------------------------------------ time */

const travelMinutes = (km) => (km / AVG_SPEED_KMH) * 60;

/** Hour-of-day in Asia/Kolkata, as a fraction (07:30 -> 7.5). */
const istHours = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return get('hour') + get('minute') / 60;
};

/**
 * When the truck reaches the farm gate, counting travel plus the time it spends
 * standing at every stop before it.
 *
 * A vehicle with no `routeStartAt` returns null. An ETA invented from an
 * unknown departure time is worse than no ETA — the dispatcher would plan a
 * farmer's morning around it.
 */
const etaAtPickup = (vehicle, candidate, pickupAt) => {
  if (!vehicle.routeStartAt) return null;
  const start = new Date(vehicle.routeStartAt);
  if (Number.isNaN(start.getTime())) return null;

  let km = 0;
  for (let k = 0; k < pickupAt; k += 1) {
    km += legKm(candidate[k].coordinates, candidate[k + 1].coordinates);
  }
  const minutes = travelMinutes(km) + SERVICE_MINUTES_PER_STOP * Math.max(pickupAt - 1, 0);
  return new Date(start.getTime() + minutes * 60000);
};

/**
 * The requested window is reported, never enforced.
 *
 * Filtering on it would empty the suggestion list without saying why, and the
 * dispatcher is the one who knows whether a farmer will wait an hour. So a
 * clash is a warning they weigh, not a vehicle we hide.
 */
const windowVerdict = (eta, requestedWindow) => {
  if (!eta || !requestedWindow
    || !Number.isFinite(requestedWindow.startHour)
    || !Number.isFinite(requestedWindow.endHour)) {
    return { etaAtPickup: eta ? eta.toISOString() : null, verdict: 'unknown' };
  }

  // Pinned to Asia/Kolkata rather than read off the server clock. A farmer's
  // "morning slot" is 6 AM where the farm is, and a container running UTC
  // would have declared every window missed by five and a half hours.
  const hour = istHours(eta);
  let verdict = 'ok';
  if (hour > requestedWindow.endHour) verdict = 'late';
  else if (hour < requestedWindow.startHour) verdict = 'early';

  return { etaAtPickup: eta.toISOString(), verdict };
};

/* ------------------------------------------------------------ suggestion */

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Crops that arrive ruined if they travel warm. Mirrors PERISHABLE_CROPS in
 * frontend/src/utils/constants.js — kept as a warning, not a filter, because a
 * three-hour haul in an open truck is normal practice for most of them.
 */
const PERISHABLE = new Set([
  'Tomato', 'Green Chilli', 'Cabbage', 'Cauliflower', 'Brinjal',
  'Okra', 'Bhindi(Ladies Finger)', 'Spinach', 'Coriander', 'Methi(Leaves)',
  'Grapes', 'Banana', 'Mango', 'Papaya', 'Pomegranate',
]);

const buildSuggestion = (vehicle, request, insertion) => {
  const { costKm, pickupAt, dropAt, candidate, baseKm } = insertion;

  const profile = loadProfile(candidate, vehicle.currentLoadKg || 0);
  const eta = etaAtPickup(vehicle, candidate, pickupAt);
  const timeWindow = windowVerdict(eta, request.requestedWindow);

  const needsCold = PERISHABLE.has(request.produceType);
  const produceCompatibility = !needsCold
    ? 'n/a'
    : (vehicle.isRefrigerated ? 'ok' : 'warn-not-refrigerated');

  const warnings = [];
  if (produceCompatibility === 'warn-not-refrigerated') warnings.push('notRefrigerated');
  if (timeWindow.verdict === 'late') warnings.push('arrivesAfterWindow');
  if (timeWindow.verdict === 'early') warnings.push('arrivesBeforeWindow');
  if (timeWindow.verdict === 'unknown') warnings.push('etaUnknown');

  /*
   * The arithmetic, kept so the dispatcher can check it.
   *
   * A cheapest-insertion cost is the length of the legs added minus the length
   * of the leg (or legs) they replace. Showing only the net figure is the same
   * black box the spec asks us to avoid, and every other number in this app
   * opens into its working — see MandiRow and WhyFurther on the farmer side.
   */
  const legLabel = (a, b) => ({
    from: a.label, to: b.label, km: round1(legKm(a.coordinates, b.coordinates)),
  });

  const removedLegs = [];
  const addedLegs = [];
  const route = vehicle.currentRoute;

  if (dropAt === pickupAt + 1) {
    // Pickup and drop go in as a consecutive pair, replacing one leg.
    if (pickupAt < route.length) removedLegs.push(legLabel(route[pickupAt - 1], route[pickupAt]));
    addedLegs.push(legLabel(route[pickupAt - 1], candidate[pickupAt]));
    addedLegs.push(legLabel(candidate[pickupAt], candidate[pickupAt + 1]));
    if (pickupAt < route.length) {
      addedLegs.push(legLabel(candidate[pickupAt + 1], candidate[pickupAt + 2]));
    }
  } else {
    if (pickupAt < route.length) removedLegs.push(legLabel(route[pickupAt - 1], route[pickupAt]));
    if (dropAt - 1 < route.length) removedLegs.push(legLabel(route[dropAt - 2], route[dropAt - 1]));
    addedLegs.push(legLabel(candidate[pickupAt - 1], candidate[pickupAt]));
    addedLegs.push(legLabel(candidate[pickupAt], candidate[pickupAt + 1]));
    addedLegs.push(legLabel(candidate[dropAt - 1], candidate[dropAt]));
    if (dropAt + 1 < candidate.length) {
      addedLegs.push(legLabel(candidate[dropAt], candidate[dropAt + 1]));
    }
  }

  return {
    vehicleId: vehicle.id,
    vehicleNo: vehicle.vehicleNo,
    driverName: vehicle.driverName,
    vehicleType: vehicle.vehicleType,
    requestId: request.id,

    insertionCostKm: round1(costKm),
    baselineRouteKm: round1(baseKm),
    newRouteKm: round1(baseKm + costKm),
    bestInsertionPosition: pickupAt,
    dropPosition: dropAt,

    capacityKg: vehicle.capacityKg,
    currentLoadKg: vehicle.currentLoadKg || 0,
    requestQuantityKg: request.quantityKg,
    /*
     * Weight the vehicle has already promised to collect further up its route
     * but is not yet carrying. It counts against capacity and it is NOT this
     * farmer's lot, so the dispatcher's bar has to show it as its own band —
     * folding it into "this lot" made a 2,500 kg consignment read as 5,500.
     */
    committedLoadKg: Math.max(profile.peakKg - (vehicle.currentLoadKg || 0) - request.quantityKg, 0),
    peakLoadKg: profile.peakKg,
    remainingCapacityAfterKg: vehicle.capacityKg - profile.peakKg,

    estimatedAddedMinutes: Math.round(travelMinutes(costKm) + SERVICE_MINUTES_PER_STOP * 2),
    addedFreightCost: Math.round(costKm * (vehicle.ratePerKm || 0)),

    produceCompatibility,
    timeWindow,
    warnings,

    // Zero-length legs are real but say nothing: they appear when a drop
    // coincides with a stop the vehicle was already making, which is exactly
    // the case that makes an insertion cheap. Keep the number, drop the row.
    workings: {
      removedLegs: removedLegs.filter((l) => l.km > 0),
      addedLegs: addedLegs.filter((l) => l.km > 0),
    },

    // The sequence the dispatcher is approving, so the route that gets written
    // is exactly the one they were shown.
    proposedRoute: candidate.map((s) => ({
      id: s.id, kind: s.kind, label: s.label,
      coordinates: s.coordinates, loadDeltaKg: s.loadDeltaKg || 0,
      requestId: s.requestId || null,
    })),
  };
};

/* ------------------------------------------------------------------ main */

/**
 * Ranks every feasible (vehicle, request) pair by ascending insertion cost.
 *
 * Returns a flat list plus the rejects. Flat because the dispatcher screen
 * groups by request and the fleet screen groups by vehicle — one contract, two
 * renderings, and no second copy of the ranking rule.
 *
 * `infeasible` is returned rather than filtered away for the same reason the
 * farmer's TransportScreen shows a too-small truck with the reason written on
 * it: a dispatcher who sees four vehicles out of six, with no explanation,
 * assumes the software is broken.
 */
const suggestInsertions = (vehicles = [], requests = [], topN = DEFAULT_TOP_N) => {
  const suggestions = [];
  const infeasible = [];
  const unrankable = [];

  const rankable = [];
  for (const request of requests) {
    if (request.status && request.status !== 'pending') continue;
    // Never guess a position. Distance drives insertion cost and insertion cost
    // is the whole answer — the same rule mandiGeo.js exists to enforce.
    if (!hasCoords(request.origin?.coordinates)) {
      unrankable.push({ requestId: request.id, reason: 'no-pickup-coordinates' });
      continue;
    }
    if (!hasCoords(request.destination?.coordinates)) {
      unrankable.push({ requestId: request.id, reason: 'no-drop-coordinates' });
      continue;
    }
    rankable.push(request);
  }

  for (const vehicle of vehicles) {
    if (vehicle.status === 'Unavailable') continue;
    if (!(vehicle.currentRoute || []).every((s) => hasCoords(s.coordinates))) {
      infeasible.push({
        vehicleId: vehicle.id, vehicleNo: vehicle.vehicleNo,
        requestId: null, reason: 'route-missing-coordinates',
      });
      continue;
    }

    for (const request of rankable) {
      const free = vehicle.capacityKg - (vehicle.currentLoadKg || 0);
      if (request.quantityKg > free) {
        infeasible.push({
          vehicleId: vehicle.id, vehicleNo: vehicle.vehicleNo, requestId: request.id,
          reason: 'capacity', shortfallKg: request.quantityKg - free, freeCapacityKg: free,
        });
        continue;
      }

      const insertion = bestInsertion(vehicle, request);
      if (!insertion) {
        infeasible.push({
          vehicleId: vehicle.id, vehicleNo: vehicle.vehicleNo, requestId: request.id,
          reason: 'no-feasible-position',
        });
        continue;
      }

      suggestions.push(buildSuggestion(vehicle, request, insertion));
    }
  }

  suggestions.sort((a, b) => a.insertionCostKm - b.insertionCostKm);

  // top-N per vehicle, as the spec asks: the dispatcher gets options, and no
  // single vehicle can flood the list with every request it could technically take.
  const perVehicle = new Map();
  const capped = suggestions.filter((s) => {
    const seen = perVehicle.get(s.vehicleId) || 0;
    if (seen >= topN) return false;
    perVehicle.set(s.vehicleId, seen + 1);
    return true;
  });

  return { suggestions: capped, infeasible, unrankable };
};

module.exports = {
  legKm,
  routeDistanceKm,
  loadProfile,
  capacityFeasible,
  bestInsertion,
  suggestInsertions,
  AVG_SPEED_KMH,
  SERVICE_MINUTES_PER_STOP,
  DEFAULT_TOP_N,
  ROAD_FACTOR,
};
