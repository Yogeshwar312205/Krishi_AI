/**
 * DEMO DATA — every number in this file is invented.
 *
 * It lives in one module, under one obviously-fake name, so that before
 * submission you can grep for `demoMarket` and find every fabricated figure in
 * the frontend. Previously these were inlined in FarmerDashboard.jsx beneath an
 * "Agmarknet Live" badge, which is the version of this problem that loses marks.
 *
 * Anything rendered from here must carry a <DemoStamp />.
 *
 * TODO(data): replace with real sources. Do not hand-write updated numbers.
 *   Mandi rates & arrivals
 *     data.gov.in — "Current Daily Price of Various Commodities from Various
 *     Markets (Mandi)", published by the Directorate of Marketing & Inspection
 *     (Agmarknet). Requires an api.data.gov.in key.
 *     The backend already has a client stub: backend/src/services/agmarknetService.js
 *   Trade volumes / buyer demand
 *     e-NAM (enam.gov.in) — no open API at time of writing; needs a data-sharing
 *     request, so treat as out of scope for the hackathon build and keep stamped.
 *
 * Also note: ai-engine/app/services/price_service.py currently returns
 * "LightGBM + LSTM Agmarknet V2" from a hardcoded lookup table, and lightgbm is
 * in requirements.txt but never imported. That claim needs either a real model
 * behind it or a rewritten label — separate from this file, but the same issue.
 */

import { transitHours, spoilageFraction } from './geo';

/** Per-kg rates by crop, keyed by mandi. Invented. */
const DEMO_RATES = {
  Tomato: { Vashi: 48.0, Pune: 44.0, Nashik: 38.5, Pimpalgaon: 39.0 },
  Potato: { Vashi: 28.5, Pune: 25.0, Nashik: 22.0, Pimpalgaon: 23.0 },
  Onion:  { Vashi: 36.5, Pune: 32.0, Nashik: 29.0, Pimpalgaon: 30.5 },
  Wheat:  { Vashi: 38.0, Pune: 35.0, Nashik: 32.0, Pimpalgaon: 32.5 },
  Rice:   { Vashi: 52.0, Pune: 48.0, Nashik: 45.0, Pimpalgaon: 45.5 },
  Mango:  { Vashi: 125.0, Pune: 105.0, Nashik: 85.0, Pimpalgaon: 88.0 },
  Banana: { Vashi: 40.0, Pune: 36.0, Nashik: 30.0, Pimpalgaon: 31.0 },
};

/** Mandi metadata. Coordinates are real; distances are from Nashik. */
export const DEMO_MANDIS = [
  { id: 'Vashi',      name: 'Vashi',      distanceKm: 165, freightPerKg: 3.4, arrivalQuintals: 2850 },
  { id: 'Pune',       name: 'Pune',       distanceKm: 210, freightPerKg: 4.1, arrivalQuintals: 2100 },
  { id: 'Nashik',     name: 'Nashik',     distanceKm: 15,  freightPerKg: 0.7, arrivalQuintals: 950 },
  { id: 'Pimpalgaon', name: 'Pimpalgaon', distanceKm: 35,  freightPerKg: 1.0, arrivalQuintals: 1420 },
];

/** Mandi commission, as a share of gross. Invented but in a realistic range. */
const COMMISSION_RATE = 0.06;

/** Yesterday's rate at the best mandi, so the UI can show a direction of travel. */
const DEMO_YESTERDAY_DELTA = { Tomato: 3.0, Potato: -1.5, Onion: 2.0, Wheat: 0, Rice: 1.0, Mango: -6.0, Banana: 0.5 };

/**
 * Builds the full comparison for one crop and quantity.
 *
 * `net` is the number that actually matters to a farmer and the one the old UI
 * buried: gross sale, minus freight, minus commission. A nearer mandi at a
 * lower rate frequently beats a distant one at a higher rate, and that
 * inversion is the whole argument for the product.
 */
export const buildMandiComparison = (cropType, quantityKg) => {
  const rates = DEMO_RATES[cropType] || DEMO_RATES.Tomato;
  const qty = Number(quantityKg) || 0;

  return DEMO_MANDIS
    .map((mandi) => {
      const ratePerKg = rates[mandi.id];
      const gross = ratePerKg * qty;
      const freight = mandi.freightPerKg * qty;
      const commission = gross * COMMISSION_RATE;

      // Same spoilage term as the live rows (data/useLiveMarket.js). No live
      // weather on the demo path, so it uses the default road temperature.
      const hours = transitHours(mandi.distanceKm);
      const spoilFrac = spoilageFraction(cropType, hours);
      const spoilageCost = gross * spoilFrac;
      const spoilageCostCold = gross * spoilageFraction(cropType, hours, undefined, true);

      return {
        ...mandi,
        ratePerKg,
        gross,
        freight,
        commission,
        transitHours: hours,
        spoilageFraction: spoilFrac,
        spoilageCost,
        spoilageCostCold,
        net: gross - freight - commission - spoilageCost,
      };
    })
    .sort((a, b) => b.net - a.net);
};

/**
 * Fourteen days of rate history and forecast for one crop, centred on today.
 *
 * The shape is deterministic per crop (a seeded sine plus drift) rather than
 * random, so the chart does not redraw differently on every render and a demo
 * can be rehearsed. `band` widens with distance from today — the one honest
 * thing a forecast can say is that it gets less sure the further out it looks.
 *
 * TODO(ml): this is a curve, not a prediction. Replace with the real output of
 * ai-engine /predict once that returns a trajectory rather than a single
 * number, and take the band from the model's own interval rather than from a
 * widening constant.
 */
export const PAST_DAYS = 7;
export const AHEAD_DAYS = 7;

export const buildForecast = (cropType) => {
  const rates = DEMO_RATES[cropType] || DEMO_RATES.Tomato;
  const base = rates.Vashi;

  // Stable per-crop phase, so each crop has its own recognisable shape.
  const seed = [...cropType].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const points = [];
  for (let offset = -PAST_DAYS; offset <= AHEAD_DAYS; offset += 1) {
    const wave = Math.sin((offset + seed) / 3.1) * base * 0.06;
    const drift = offset * base * 0.004;
    const value = base + wave + drift;

    const isFuture = offset > 0;
    // ±1.5% per day out, so uncertainty visibly grows.
    const spread = isFuture ? value * 0.015 * offset : 0;

    const date = new Date();
    date.setDate(date.getDate() + offset);

    points.push({
      offset,
      date,
      isFuture,
      value: Math.round(value * 100) / 100,
      low: Math.round((value - spread) * 100) / 100,
      high: Math.round((value + spread) * 100) / 100,
    });
  }

  return points;
};

/**
 * The Today verdict.
 *
 * Deliberately a transparent rule, not a model output: if the rate rose today
 * it is treated as still climbing (wait), and if it fell or held it is treated
 * as at or past its peak (sell). That is a crude heuristic and it is labelled
 * as demo data wherever it is shown.
 *
 * TODO(ml): replace with the real forecast once ai-engine returns one — the
 * verdict should come from the predicted 7-day trajectory, not from a
 * single day-over-day delta.
 */
export const buildVerdict = (cropType, quantityKg) => {
  const comparison = buildMandiComparison(cropType, quantityKg);
  const best = comparison[0];
  const delta = DEMO_YESTERDAY_DELTA[cropType] ?? 0;

  return {
    best,
    comparison,
    delta,
    /** 'go' -> sell today. 'wait' -> hold a few days. */
    action: delta > 0 ? 'wait' : 'go',
  };
};
