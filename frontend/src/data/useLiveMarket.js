import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribe, peek, ensure, MARKET_TTL_MS } from './marketCache';
import { roadDistanceKm, DISTRICT_MIN_HAUL_KM } from './geo';
import {
  buildMandiComparison,
  buildForecast as buildDemoForecast,
  buildVerdict as buildDemoVerdict,
  PAST_DAYS,
  AHEAD_DAYS,
} from './demoMarket';

/**
 * The market view every farmer-facing screen reads from.
 *
 * What changed, and why it matters:
 *
 * This used to fuzzy-match the government feed against four hardcoded mandis
 * (Vashi, Pune, Nashik, Pimpalgaon) and show only those. Two things went wrong
 * with that. The feed's most recent hundred postings for a crop are whichever
 * markets happened to report first that morning, so those four were usually
 * absent and the screen silently fell back to invented numbers — in practice
 * only Tomato and Onion ever resolved live. And even when it worked, showing
 * four markets out of the ~290 that report in Maharashtra is not optimisation;
 * it is a shortlist someone else picked.
 *
 * Now every reporting mandi comes through, ranked by what actually lands in
 * the farmer's hand: rate × weight, minus real road freight, minus commission.
 * That ranking is the product's whole claim — a farther mandi at a higher rate
 * often beats the one down the road — so `advantage` below returns the
 * arithmetic that justifies it, not just the winner.
 */

/** Mandi commission as a share of gross. APMC rates run 4–8% in Maharashtra. */
export const COMMISSION_RATE = 0.06;

/* ----------------------------------------------------------- live rows */

const buildRows = (records, { originCoords, quantityKg }) => {
  const qty = Math.max(Number(quantityKg) || 0, 1);
  const [originLon, originLat] = originCoords || [];
  const hasOrigin = Number.isFinite(originLat) && Number.isFinite(originLon);

  return records
    .filter((rec) => rec.coordinates && rec.rate > 0)
    .map((rec) => {
      const measured = hasOrigin
        ? roadDistanceKm(originLat, originLon, rec.coordinates[1], rec.coordinates[0])
        : null;

      // A district-precision market sits at its district town, so a farm in the
      // same district measures 0 km and books itself a free truck. Floor it and
      // say it is approximate rather than show a net profit built on that.
      const approx = rec.geoPrecision !== 'market';
      const distanceKm = measured === null
        ? null
        : (approx ? Math.max(measured, DISTRICT_MIN_HAUL_KM) : measured);

      const ratePerKg = rec.rate;
      const gross = ratePerKg * qty;
      const ratePerKm = rec.logisticsRatePerKm || 31;
      const freight = distanceKm === null ? 0 : ratePerKm * distanceKm;
      const commission = gross * COMMISSION_RATE;

      return {
        id: rec.mandi,
        name: rec.mandi,
        place: rec.place || rec.district,
        district: rec.district,
        variety: rec.variety,
        distanceKm,
        distanceApprox: approx,
        geoPrecision: rec.geoPrecision,
        ratePerKm,
        fuelDetails: rec.fuelDetails,
        minPricePerQuintal: rec.minPricePerQuintal,
        maxPricePerQuintal: rec.maxPricePerQuintal,
        modalPricePerQuintal: rec.modalPricePerQuintal,
        arrivalDate: rec.arrivalDate,
        isStale: rec.isStale,
        ratePerKg,
        quantityKg: qty,
        gross,
        freight,
        freightPerKg: freight / qty,
        commission,
        net: gross - freight - commission,
        isLive: true,
      };
    })
    .filter((row) => row.distanceKm !== null)
    .sort((a, b) => b.net - a.net);
};

/**
 * Why the top mandi wins, stated as the trade the farmer is being asked to make.
 *
 * Comparing the best row against the *nearest* row rather than the second-best
 * is deliberate: the nearest mandi is the one the farmer would go to anyway, so
 * it is the real alternative, and the difference against it is the real gain.
 */
const buildAdvantage = (rows) => {
  if (rows.length < 2) return null;

  const best = rows[0];
  const nearest = rows.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a));
  if (nearest.id === best.id) return null;

  return {
    best,
    nearest,
    extraKm: best.distanceKm - nearest.distanceKm,
    extraFreight: best.freight - nearest.freight,
    rateGap: best.ratePerKg - nearest.ratePerKg,
    // What the higher rate earns on this consignment, before the extra haul.
    grossGain: best.gross - nearest.gross,
    extraCommission: best.commission - nearest.commission,
    netGain: best.net - nearest.net,
  };
};

/* ------------------------------------------------------------ forecast */

/**
 * Real past prices (daily average across reporting Maharashtra markets) plus a
 * linear-trend projection. The chart draws the future half dashed inside a
 * widening band — that visual language is the honest label for "guessed".
 */
const buildForecastFromHistory = (historyDays) => {
  if (!historyDays || historyDays.length < 3) return null;

  const past = historyDays.slice(-PAST_DAYS).map((p, i, arr) => ({
    offset: i - (arr.length - 1),
    date: new Date(p.date),
    isFuture: false,
    value: p.avgRatePerKg,
    low: p.avgRatePerKg,
    high: p.avgRatePerKg,
  }));
  if (!past.length) return null;

  const n = past.length;
  const ys = past.map((p) => p.value);
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = ys.reduce((sum, y, i) => sum + (i - meanX) * (y - meanY), 0);
  const den = ys.reduce((sum, _, i) => sum + (i - meanX) ** 2, 0) || 1;
  const slope = num / den;

  const lastValue = ys[n - 1];
  const future = [];
  for (let step = 1; step <= AHEAD_DAYS; step += 1) {
    const value = Math.max(0, Math.round((lastValue + slope * step) * 100) / 100);
    const spread = value * 0.02 * step;
    const date = new Date(past[n - 1].date);
    date.setDate(date.getDate() + step);
    future.push({
      offset: step,
      date,
      isFuture: true,
      value,
      low: Math.round((value - spread) * 100) / 100,
      high: Math.round((value + spread) * 100) / 100,
    });
  }

  return [...past, ...future];
};

/* --------------------------------------------------------- demo fallback */

const demoState = (cropType, quantityKg, status = 'demo') => {
  const verdict = buildDemoVerdict(cropType, quantityKg);
  const qty = Math.max(Number(quantityKg) || 0, 1);
  const rows = buildMandiComparison(cropType, quantityKg).map((row) => ({
    ...row,
    nameKey: `mandis.${row.id}`,
    quantityKg: qty,
    // Back-derived so the breakdown rows render the same shape as live ones —
    // the demo baseline quotes ₹/kg freight, the live feed quotes ₹/km.
    ratePerKm: row.distanceKm ? Math.round(row.freight / row.distanceKm) : 0,
    geoPrecision: 'market',
    isLive: false,
  }));
  return {
    status,
    best: rows[0],
    topRate: rows.reduce((a, b) => (b.ratePerKg > a.ratePerKg ? b : a), rows[0]),
    comparison: rows,
    advantage: buildAdvantage(rows),
    delta: verdict.delta,
    action: verdict.action,
    forecast: buildDemoForecast(cropType),
    liveCount: 0,
    total: rows.length,
    fetchedAt: null,
    latestArrivalDate: null,
  };
};

/**
 * A mandi's display name.
 *
 * The four demo mandis are translated (`mandis.Vashi` etc.); the ~290 live ones
 * come from the government feed as English strings like "Pune(Moshi) APMC" and
 * cannot be — translating them would mean inventing Devanagari names for real
 * market yards that publish under those names on their own boards.
 */
export const mandiLabel = (t, row) => (row?.nameKey ? t(row.nameKey) : row?.name || '');

/* ------------------------------------------------------------- the hook */

/**
 * status: 'loading' while the first fetch is in flight (over a demo baseline,
 * so nothing is ever blank), then 'live' or 'demo'.
 */
export const useLiveMarket = (cropType, quantityKg) => {
  const farmerOrigin = useAppStore((state) => state.farmerOrigin);

  const subscribeToCrop = useCallback((callback) => subscribe(cropType, callback), [cropType]);
  const getSnapshot = useCallback(() => peek(cropType), [cropType]);
  const entry = useSyncExternalStore(subscribeToCrop, getSnapshot, getSnapshot);

  // Kick off the fetch for any crop that isn't already cached and fresh. The
  // subscription above delivers the result, so nothing is awaited here; App.jsx
  // has usually warmed this crop already and `ensure` then does nothing at all.
  useEffect(() => { ensure(cropType); }, [cropType]);

  return useMemo(() => {
    if (!entry) return demoState(cropType, quantityKg, 'loading');
    if (!entry.isLive || !entry.records.length) return demoState(cropType, quantityKg);

    const rows = buildRows(entry.records, { originCoords: farmerOrigin, quantityKg });
    if (!rows.length) return demoState(cropType, quantityKg);

    const history = entry.history || [];
    const forecast = buildForecastFromHistory(history) || buildDemoForecast(cropType);

    // Real day-over-day movement in the state average when history came
    // through; otherwise keep the demo heuristic rather than assert "flat".
    let delta = buildDemoVerdict(cropType, quantityKg).delta;
    if (history.length >= 2) {
      delta = Math.round(
        (history[history.length - 1].avgRatePerKg - history[history.length - 2].avgRatePerKg) * 100
      ) / 100;
    }

    return {
      status: 'live',
      best: rows[0],
      // The highest headline rate in the state, irrespective of freight. Used
      // by the landing board, where there is no signed-in farmer and therefore
      // no farm to measure a haul from — ranking by net there would silently
      // rank against a default location the visitor never gave us.
      topRate: rows.reduce((a, b) => (b.ratePerKg > a.ratePerKg ? b : a), rows[0]),
      comparison: rows,
      advantage: buildAdvantage(rows),
      delta,
      action: delta > 0 ? 'wait' : 'go',
      forecast,
      liveCount: rows.length,
      total: rows.length,
      fetchedAt: entry.fetchedAt,
      latestArrivalDate: entry.latestArrivalDate,
      isStaleCache: Date.now() - entry.fetchedAt > MARKET_TTL_MS,
    };
  }, [entry, cropType, quantityKg, farmerOrigin]);
};

export default useLiveMarket;
