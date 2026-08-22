/**
 * Road geometry for the maps — and nothing else.
 *
 * This draws lines. It does NOT decide anything. The dispatch ranking still
 * measures haversine × ROAD_FACTOR exactly as VRP.md §4.6 describes, because
 * ranking a fleet needs a distance for every (vehicle, request) pair and
 * routing each of those over the network would be hundreds of calls to answer
 * one screen. What changes here is only what the dispatcher SEES: a line that
 * follows the road instead of a straight one drawn through a hill.
 *
 * Because the two numbers are different, both are reported. The map caption
 * shows the routed length beside the estimate the ranking used, so nobody
 * concludes from a road-shaped line that the ranking was road-measured.
 *
 * Provider: OSRM. The public demo server needs no key and no account, which is
 * the same reason the basemap is CARTO — nothing in this repo should require
 * provisioning before it runs. Set OSRM_URL to point at your own instance; the
 * demo server is explicitly not for production traffic.
 *
 * It fails the way everything else here fails: never. An unreachable or
 * rate-limited router returns the straight-line geometry with
 * `source: 'straight-line'`, and the UI stamps it. A missing map is a worse
 * answer than an honest approximate one — but an approximate one presented as
 * routed would be worse than both.
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { haversineKm, ROAD_FACTOR } = require('../data/mandiGeo');

const OSRM_BASE = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

/** The router is slow far more often than it is wrong; one try, then draw. */
const TIMEOUT_MS = 7000;

/**
 * Geometry for a fixed set of stops does not change between page views, and a
 * dispatcher opens the same card repeatedly while deciding. 30 minutes.
 */
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * A route is one line per approved stop sequence. Anything longer than this is
 * not a truck's day, it is a caller passing the whole fleet.
 */
const MAX_WAYPOINTS = 25;

const cache = new Map();
const inFlight = new Map();

/** ~1 m. Keeps the cache key stable against float noise from the client. */
const round5 = (n) => Math.round(n * 1e5) / 1e5;

const isCoord = (c) => Array.isArray(c) && c.length === 2
  && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1]))
  && Math.abs(Number(c[0])) <= 180 && Math.abs(Number(c[1])) <= 90;

/**
 * "73.78980,19.99750;73.00120,19.07600" -> [[lng, lat], ...]
 *
 * Anything that is not a real pair is rejected outright rather than dropped:
 * silently skipping a bad waypoint would draw a line that misses a stop, and
 * the dispatcher would have no way to tell.
 */
const parsePath = (raw = '') => {
  const points = String(raw)
    .split(';')
    .map((pair) => pair.split(',').map(Number))
    .filter((pair) => pair.length === 2);

  if (points.length < 2) return null;
  if (points.some((p) => !isCoord(p))) return null;
  return points;
};

/** Straight legs between the stops, measured the way the ranking measures. */
const straightLine = (points) => {
  let km = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [aLng, aLat] = points[i];
    const [bLng, bLat] = points[i + 1];
    km += haversineKm(aLat, aLng, bLat, bLng) * ROAD_FACTOR;
  }
  return {
    source: 'straight-line',
    distanceKm: Math.round(km * 10) / 10,
    // 45 km/h, the loaded-truck figure insertionService uses for its ETAs.
    durationMin: Math.round((km / 45) * 60),
    geometry: { type: 'LineString', coordinates: points },
  };
};

const fetchOsrm = async (points) => {
  const path = points.map(([lng, lat]) => `${round5(lng)},${round5(lat)}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${path}`;

  const { data } = await axios.get(url, {
    params: { overview: 'full', geometries: 'geojson', alternatives: false, steps: false },
    timeout: TIMEOUT_MS,
  });

  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error('router returned no geometry');

  return {
    source: 'osrm',
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.round(route.duration / 60),
    geometry: route.geometry,
  };
};

/**
 * Road geometry through `points`, or the straight line if the router will not
 * answer. Concurrent callers asking for the same path share one request — the
 * dispatch screen can open several cards against the same vehicle route.
 */
const getRoute = async (points) => {
  const key = points.map(([lng, lat]) => `${round5(lng)},${round5(lat)}`).join(';');

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  if (inFlight.has(key)) return inFlight.get(key);

  const request = (async () => {
    let result;
    try {
      result = await fetchOsrm(points);
    } catch (err) {
      logger.warn(`Routing fell back to straight legs: ${err.message}`);
      result = straightLine(points);
    }
    // Both outcomes are cached. A router that is down stays down for a while,
    // and re-asking it on every card open would stall the screen each time.
    cache.set(key, { at: Date.now(), value: result });
    inFlight.delete(key);
    return result;
  })();

  inFlight.set(key, request);
  return request;
};

module.exports = { getRoute, parsePath, straightLine, MAX_WAYPOINTS, CACHE_TTL_MS };
