import { useEffect, useState } from 'react';
import { fetchLiveAgmarknetMarkets, fetchAgmarknetHistory } from '../services/api';
import {
  buildMandiComparison,
  buildForecast as buildDemoForecast,
  buildVerdict as buildDemoVerdict,
  PAST_DAYS,
  AHEAD_DAYS,
} from './demoMarket';

/**
 * Wires the Price/Today screens to the live data.gov.in Agmarknet feed
 * (backend/src/services/agmarknetService.js), falling back to demoMarket.js
 * wherever a live number isn't available — same "degrade instead of fail"
 * pattern as the rest of the backend.
 *
 * The government feed's market names ("Pune(Pimpri) APMC", "Mumbai APMC", …)
 * don't line up with the app's four fixed, translated mandi ids, so each
 * canonical mandi is fuzzy-matched against whatever markets reported that
 * commodity most recently in Maharashtra.
 */
const CANONICAL_MATCHERS = {
  Vashi: ['vashi', 'mumbai'],
  Pune: ['pune'],
  Nashik: ['nashik', 'nasik'],
  Pimpalgaon: ['pimpalgaon'],
};

const COMMISSION_RATE = 0.06;

const matchRecord = (records, matchers) => {
  // Market name only — district/city collides two ways: several distinct
  // APMC markets share one district (Nashik district contains both "Nasik
  // APMC" and "Pimpalgaon Baswant APMC"), so matching on it can attribute a
  // record to the wrong market entirely.
  const lower = (s) => (s || '').toLowerCase();
  return records.find((r) => matchers.some((m) => lower(r.mandi).includes(m))) || null;
};

const buildComparisonFromLive = (records, cropType, quantityKg) => {
  const base = buildMandiComparison(cropType, quantityKg);
  const logisticsRatePerKm = records[0]?.logisticsRatePerKm;
  let liveCount = 0;

  const rows = base.map((row) => {
    const matched = matchRecord(records, CANONICAL_MATCHERS[row.id] || []);
    if (!matched) return { ...row, isLive: false };

    liveCount += 1;
    const ratePerKg = matched.pricePerKg ?? matched.rate;
    const gross = ratePerKg * quantityKg;
    // Real distance × today's real diesel-derived rate/km, spread over this
    // consignment's own weight — a dedicated trip, not a shared-truck estimate.
    const freightPerKg = logisticsRatePerKm
      ? (logisticsRatePerKm * row.distanceKm) / Math.max(quantityKg, 1)
      : row.freightPerKg;
    const freight = freightPerKg * quantityKg;
    const commission = gross * COMMISSION_RATE;

    return {
      ...row,
      ratePerKg,
      gross,
      freight,
      commission,
      net: gross - freight - commission,
      isLive: true,
      arrivalDate: matched.arrivalDate,
    };
  });

  rows.sort((a, b) => b.net - a.net);
  return { rows, liveCount };
};

/**
 * Real past prices (averaged daily across reporting Maharashtra markets) plus
 * a linear-trend projection for the days ahead. The chart already draws the
 * future half dashed and inside a widening band — that visual language is the
 * honest label for "guessed", so the projection doesn't need one of its own.
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

const demoState = (cropType, quantityKg) => {
  const verdict = buildDemoVerdict(cropType, quantityKg);
  return {
    status: 'demo',
    best: verdict.best,
    comparison: verdict.comparison,
    delta: verdict.delta,
    action: verdict.action,
    forecast: buildDemoForecast(cropType),
  };
};

/**
 * status progression: 'loading' -> 'live' | 'partial' | 'demo'.
 *
 * The demo baseline is shown immediately (so nothing is ever blank) but
 * tagged 'loading' rather than 'demo' until the live fetch settles — a
 * farmer glancing at the screen mid-fetch should see "updating", not a
 * number that then silently changes underneath them.
 */
export const useLiveMarket = (cropType, quantityKg) => {
  const [state, setState] = useState(() => ({ ...demoState(cropType, quantityKg), status: 'loading' }));

  useEffect(() => {
    let cancelled = false;
    setState({ ...demoState(cropType, quantityKg), status: 'loading' });

    (async () => {
      const [marketsRes, historyRes] = await Promise.all([
        fetchLiveAgmarknetMarkets(cropType, 'Maharashtra'),
        fetchAgmarknetHistory(cropType, 'Maharashtra'),
      ]);
      if (cancelled) return;

      const records = marketsRes?.records || [];
      const liveRecords = records.filter((r) => r.isGovtVerified);
      if (!liveRecords.length) {
        setState(demoState(cropType, quantityKg)); // confirmed no live data — settle on demo
        return;
      }

      const { rows, liveCount } = buildComparisonFromLive(liveRecords, cropType, quantityKg);
      if (!liveCount) {
        setState(demoState(cropType, quantityKg));
        return;
      }

      const history = historyRes?.days || [];
      const forecast = buildForecastFromHistory(history) || buildDemoForecast(cropType);

      // Real day-over-day delta when the history call came through; otherwise
      // keep the demo heuristic's delta rather than silently presenting "flat".
      let delta = buildDemoVerdict(cropType, quantityKg).delta;
      if (history.length >= 2) {
        delta = Math.round((history[history.length - 1].avgRatePerKg - history[history.length - 2].avgRatePerKg) * 100) / 100;
      }

      setState({
        status: liveCount === rows.length ? 'live' : 'partial',
        best: rows[0],
        comparison: rows,
        delta,
        action: delta > 0 ? 'wait' : 'go',
        forecast,
        liveCount,
        total: rows.length,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [cropType, quantityKg]);

  return state;
};

export default useLiveMarket;
