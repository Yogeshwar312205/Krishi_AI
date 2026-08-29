/**
 * Q10 spoilage math for the backend.
 *
 * One formula, three copies by necessity — this file, the Python engine
 * (ai-engine/app/services/spoilage_service.py) and the client
 * (frontend/src/data/geo.js). Keep the constants in step across all three.
 *
 * Fraction of a consignment's value lost over a haul:
 *     f = 1 - exp(-k * hours * 2^((Teff - 20) / 10))
 * k is a per-crop per-hour decay constant (~25 °C); the 2^(…) term is the Q10
 * rule (decay roughly doubles per 10 °C above 20). A refrigerated deck holds
 * ~4 °C whatever the weather outside.
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

/** Ambient road temperature assumed when a live reading is unavailable. */
const DEFAULT_AMBIENT_C = 32;
/** Refrigerated deck temperature. */
const REEFER_C = 4;
/** Loaded-truck speed with the mandi-approach crawl in it. Matches
 *  AVG_SPEED_KMH in services/insertionService.js. */
const HAUL_SPEED_KMH = 45;

const transitHours = (distanceKm) =>
  !distanceKm || distanceKm <= 0 ? 0 : distanceKm / HAUL_SPEED_KMH;

const decayK = (cropType) =>
  CROP_DECAY_K[cropType] != null ? CROP_DECAY_K[cropType] : DEFAULT_DECAY_K;

/** Fraction (0–1) of value lost to spoilage over `hours` of transit. */
const spoilageFraction = (cropType, hours, ambientC = DEFAULT_AMBIENT_C, isRefrigerated = false) => {
  if (!hours || hours <= 0) return 0;
  const effectiveC = isRefrigerated ? REEFER_C : ambientC;
  const tempFactor = 2 ** ((effectiveC - 20) / 10);
  return 1 - Math.exp(-decayK(cropType) * hours * tempFactor);
};

/**
 * Full spoilage picture for a haul, open truck vs refrigerated, at a given
 * ambient temperature. `consignmentValue` is optional — pass it to get rupee
 * figures alongside the percentages.
 */
const assessHaul = ({ cropType, distanceKm, ambientC, consignmentValue }) => {
  const hours = transitHours(distanceKm);
  const ambient = Number.isFinite(ambientC) ? ambientC : DEFAULT_AMBIENT_C;

  const openFraction = spoilageFraction(cropType, hours, ambient, false);
  const reeferFraction = spoilageFraction(cropType, hours, ambient, true);

  const out = {
    cropType,
    distanceKm: distanceKm != null ? Math.round(distanceKm) : null,
    transitHours: Math.round(hours * 10) / 10,
    ambientTempC: Math.round(ambient),
    ambientAssumed: !Number.isFinite(ambientC),
    openTruckSpoilagePct: Math.round(openFraction * 1000) / 10,
    refrigeratedSpoilagePct: Math.round(reeferFraction * 1000) / 10,
    decayConstantPerHour: decayK(cropType),
    formula: 'f = 1 - exp(-k * hours * 2^((T-20)/10))  (Q10)',
  };

  if (Number.isFinite(consignmentValue) && consignmentValue > 0) {
    out.openTruckLossRupees = Math.round(consignmentValue * openFraction);
    out.refrigeratedLossRupees = Math.round(consignmentValue * reeferFraction);
    out.refrigeratedSavingRupees = Math.round(consignmentValue * (openFraction - reeferFraction));
  }
  return out;
};

module.exports = {
  CROP_DECAY_K,
  DEFAULT_AMBIENT_C,
  HAUL_SPEED_KMH,
  transitHours,
  spoilageFraction,
  assessHaul,
};
