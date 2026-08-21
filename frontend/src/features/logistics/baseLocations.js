/**
 * Places a vehicle may be based, with real coordinates.
 *
 * A vehicle's base is the first stop of its route and every insertion cost is
 * measured from it, so it cannot be free text. The same rule as
 * backend/src/data/mandiGeo.js: never synthesise a coordinate, because distance
 * drives the ranking and the ranking sends a real truck.
 *
 * Extend this list only with coordinates you have actually looked up.
 */
export const BASE_LOCATIONS = [
  { id: 'nashik',      label: 'Nashik APMC Hub',       coordinates: [73.7898, 19.9975] },
  { id: 'pimpalgaon',  label: 'Pimpalgaon Baswant',    coordinates: [73.9850, 20.1750] },
  { id: 'lasalgaon',   label: 'Lasalgaon, Niphad',     coordinates: [74.2400, 20.1400] },
  { id: 'vashi',       label: 'Mumbai APMC, Vashi',    coordinates: [73.0044, 19.0760] },
  { id: 'pune',        label: 'Pune depot',            coordinates: [73.8567, 18.5204] },
  { id: 'gultekdi',    label: 'Gultekdi APMC, Pune',   coordinates: [73.8757, 18.4938] },
  { id: 'sambhajinagar', label: 'Chh. Sambhajinagar',  coordinates: [75.3433, 19.8762] },
  { id: 'solapur',     label: 'Solapur',               coordinates: [75.9064, 17.6599] },
  { id: 'kolhapur',    label: 'Kolhapur',              coordinates: [74.2433, 16.7050] },
  { id: 'nagpur',      label: 'Nagpur',                coordinates: [79.0882, 21.1458] },
];
