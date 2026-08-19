/**
 * Crops the app offers as first-class, translated choices.
 *
 * Each string is the **exact** `Commodity` value the data.gov.in Agmarknet feed
 * publishes — "Bengal Gram(Gram)(Whole)", parentheses and all — because it is
 * sent straight through as a filter. Renaming one to something tidier here
 * silently returns zero rows.
 *
 * The list used to be seven crops chosen by hand, and only Tomato and Onion
 * ever resolved to live rates. These nineteen were picked from what Maharashtra
 * mandis actually report: the state's feed carries ~119 commodities across ~290
 * markets, and every crop below is reported by enough markets for a comparison
 * between mandis to mean something. The full live list is available from
 * /api/agmarknet/commodities and the crop picker offers it as well.
 */
export const CROP_OPTIONS = [
  'Onion',
  'Tomato',
  'Potato',
  'Wheat',
  'Soyabean',
  'Jowar(Sorghum)',
  'Bajra(Pearl Millet/Cumbu)',
  'Maize',
  'Bengal Gram(Gram)(Whole)',
  'Red gram/Arhar/Tur(whole)',
  'Groundnut',
  'Rice',
  'Green Chilli',
  'Brinjal',
  'Cabbage',
  'Cauliflower',
  'Pomegranate',
  'Banana',
  'Mango',
];

/**
 * The four crops on the landing rate board — the widest-reported staples, so a
 * first-time visitor sees four live numbers rather than four fallbacks.
 * Also the prefetch set warmed at app start (see App.jsx, data/marketCache.js).
 */
export const BOARD_CROPS = ['Onion', 'Tomato', 'Wheat', 'Soyabean'];

/** Crops that need a cold vehicle. Drives the Transport suggestion. */
export const PERISHABLE_CROPS = new Set([
  'Tomato', 'Mango', 'Banana', 'Green Chilli', 'Cabbage', 'Cauliflower', 'Brinjal', 'Pomegranate',
]);
