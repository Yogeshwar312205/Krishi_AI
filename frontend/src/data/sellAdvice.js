import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchSellAdvice } from '../services/api';

/**
 * The sell-now/wait guidance for one crop, for the farmer's own location.
 *
 * Kept separate from `marketCache.js` on purpose. That cache is keyed on crop
 * alone — distance and profit are recomputed client-side so moving the farm
 * pin never re-fetches. This one *does* depend on the farm location (the engine
 * looks up weather there), so its key is crop + rounded coordinate.
 *
 * The backend already caches the pieces this is built from (Agmarknet 15 min,
 * OpenWeather 20 min), so this client cache only needs to stop a re-fetch on
 * every tab switch. TTL is 10 minutes, with in-flight de-duplication.
 */

const TTL_MS = 10 * 60 * 1000;

const cache = new Map();     // key -> { at, value }
const inFlight = new Map();  // key -> Promise

const keyFor = (crop, origin, baseline) => {
  const lng = Number.isFinite(origin?.[0]) ? origin[0].toFixed(2) : 'na';
  const lat = Number.isFinite(origin?.[1]) ? origin[1].toFixed(2) : 'na';
  const base = Number.isFinite(baseline) ? baseline.toFixed(1) : 'na';
  return `${crop}|${lng}|${lat}|${base}`;
};

const load = (crop, origin, baseline) => {
  const key = keyFor(crop, origin, baseline);
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = fetchSellAdvice(crop, {
    originLng: origin?.[0],
    originLat: origin?.[1],
    baselinePricePerKg: Number.isFinite(baseline) ? baseline : undefined,
  })
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      inFlight.delete(key);
      return value;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
};

const snapshotFrom = (value) => ({
  status: value && value.success !== false && value.advice ? 'ready'
    : value && value.success !== false ? 'empty'  // reached the engine, no advice (e.g. no live rates)
    : 'error',
  data: value || null,
});

/**
 * @returns {{ status: 'loading'|'ready'|'empty'|'error', data: object|null }}
 *   data.advice — the context advice block (recommendation, working, …) or null
 *   data.aiEngineSource — names the outage when the Python scorer was down
 *   data.inputs — what the scorer was given (baseline, trailing avg, weather?)
 */
/**
 * @param cropType
 * @param baselinePricePerKg  the rate the screen is already showing (net-ranked
 *   best). Passed through so the advice card and the headline agree; omit it and
 *   the backend falls back to the state-wide median.
 */
export const useSellAdvice = (cropType, baselinePricePerKg, enabled = true) => {
  const origin = useAppStore((state) => state.farmerOrigin);
  const key = keyFor(cropType, origin, baselinePricePerKg);

  const [state, setState] = useState(() => {
    const hit = cache.get(key);
    return hit ? snapshotFrom(hit.value) : { status: 'loading', data: null };
  });

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: null });
      return undefined;
    }

    let alive = true;
    const hit = cache.get(key);

    if (hit && Date.now() - hit.at < TTL_MS) {
      setState(snapshotFrom(hit.value));
      return () => { alive = false; };
    }

    setState((prev) => (prev.data ? prev : { status: 'loading', data: null }));

    load(cropType, origin, baselinePricePerKg)
      .then((value) => { if (alive) setState(snapshotFrom(value)); })
      .catch(() => { if (alive) setState({ status: 'error', data: null }); });

    return () => { alive = false; };
  }, [enabled, key, cropType, origin, baselinePricePerKg]);

  return state;
};

export default useSellAdvice;
