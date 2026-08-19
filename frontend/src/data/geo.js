/**
 * Distance maths, mirroring backend/src/data/mandiGeo.js.
 *
 * It lives on the client as well as the server because the cache is keyed on
 * crop alone (see marketCache.js): rates change a few times a day, but the
 * farm location and the consignment weight change while the farmer is sitting
 * on the screen. Recomputing distance and profit locally means moving the
 * quantity slider costs nothing, instead of re-fetching a government feed.
 */

/** Great-circle km between two [lon, lat] pairs. */
export const haversineKm = (aLat, aLon, bLat, bLon) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Straight-line km × 1.3 — the usual planning approximation for Indian roads. */
export const ROAD_FACTOR = 1.3;

export const roadDistanceKm = (aLat, aLon, bLat, bLon) =>
  Math.round(haversineKm(aLat, aLon, bLat, bLon) * ROAD_FACTOR);

/** Shortest haul we will claim for a market we can only place to its district. */
export const DISTRICT_MIN_HAUL_KM = 15;
