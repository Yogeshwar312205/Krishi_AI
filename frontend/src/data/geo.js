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

/* --------------------------------------------------------- spoilage (Q10)
 *
 * Mirrors ai-engine/app/services/spoilage_service.py so the Prices screen can
 * put a spoilage cost on every mandi row without a round-trip — the same reason
 * the distance maths above lives on the client (the market cache is keyed on
 * crop alone, so quantity and farm location change with no re-fetch, and the
 * spoilage term moves with both).
 *
 * Fraction of the consignment's value lost over a haul:
 *     f = 1 - exp(-k * hours * 2^((Teff - 20) / 10))
 * k is a per-crop per-hour decay constant (~25 °C); the 2^(…) term is the Q10
 * rule — decay roughly doubles per 10 °C above 20. A refrigerated deck holds
 * ~4 °C whatever the weather outside.
 *
 * This is the term the product name promises ("net after freight AND spoilage")
 * and the one that flips the ranking for a soft crop on a long haul.
 */

/**
 * Per-hour decay constants. The seven with a measured value are taken straight
 * from the Python service; the leafy / soft produce the feed also carries is
 * set alongside tomato and mango, and anything unlisted takes a mild default
 * that rounds to nothing on a short haul (so wheat/onion rankings never move).
 */
const CROP_DECAY_K = {
  Tomato: 0.035,
  Mango: 0.045,
  Banana: 0.038,
  Potato: 0.008,
  Onion: 0.005,
  Rice: 0.001,
  Wheat: 0.001,
  'Green Chilli': 0.035,
  Brinjal: 0.030,
  Cabbage: 0.028,
  Cauliflower: 0.030,
  Pomegranate: 0.018,
};
const DEFAULT_DECAY_K = 0.02;

/** Ambient road temperature assumed when live weather is unavailable. Matches
 *  the Python service default. */
export const DEFAULT_AMBIENT_C = 32;

/** Refrigerated deck temperature. */
const REEFER_C = 4;

/**
 * Loaded-truck speed on state highways, with the mandi-approach crawl in it.
 * Matches AVG_SPEED_KMH in backend/src/services/insertionService.js so the
 * farmer's spoilage hours and the dispatcher's ETA agree.
 */
export const HAUL_SPEED_KMH = 45;

/** Rough transit time for a haul, in hours. */
export const transitHours = (distanceKm) =>
  distanceKm == null || distanceKm <= 0 ? 0 : distanceKm / HAUL_SPEED_KMH;

/**
 * Fraction (0–1) of the consignment's value lost to spoilage over `hours` of
 * transit. Non-perishable crops return a number that rounds to ~0.
 */
export const spoilageFraction = (
  cropType,
  hours,
  ambientC = DEFAULT_AMBIENT_C,
  isRefrigerated = false,
) => {
  if (!hours || hours <= 0) return 0;
  const k = CROP_DECAY_K[cropType] ?? DEFAULT_DECAY_K;
  const effectiveC = isRefrigerated ? REEFER_C : ambientC;
  const tempFactor = 2 ** ((effectiveC - 20) / 10);
  return 1 - Math.exp(-k * hours * tempFactor);
};
