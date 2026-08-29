import { useCallback, useEffect, useState } from 'react';
import { fetchModelForecast } from '../services/api';

/**
 * The trained model's forecast series for one crop, plus model/rule-based crop
 * coverage for the NOTE. Small module cache (15 min TTL) with in-flight
 * de-duplication — the forecast panel and the NOTE both read it, and it should
 * not re-fetch on every tab switch.
 *
 * `chartPoints` is null unless the model actually produced a series; the caller
 * falls back to its history-trend line. `modelInfo` is populated even when the
 * model is off, so the NOTE can explain why.
 */

const TTL_MS = 15 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();

const load = (crop) => {
  if (inFlight.has(crop)) return inFlight.get(crop);
  const p = fetchModelForecast(crop)
    .then((value) => {
      cache.set(crop, { at: Date.now(), value });
      inFlight.delete(crop);
      return value;
    })
    .catch((err) => { inFlight.delete(crop); throw err; });
  inFlight.set(crop, p);
  return p;
};

/**
 * The live-rate refresh button must refresh this series too.  Otherwise the
 * chart can keep an old model projection for up to 15 minutes after the price
 * board has fetched new Agmarknet history.
 */
const forceLoad = (crop) => {
  cache.delete(crop);
  return load(crop);
};

const shape = (value) => {
  const fc = value?.forecast || null;
  const points = fc?.available && Array.isArray(fc.points)
    ? fc.points.map((p) => ({ ...p, date: new Date(p.date) }))
    : null;
  return {
    status: value ? 'ready' : 'error',
    chartPoints: points,
    forecast: fc,
    modelInfo: value?.modelInfo || null,
  };
};

export const useModelForecast = (cropType) => {
  const [state, setState] = useState(() => {
    const hit = cache.get(cropType);
    return hit ? shape(hit.value) : { status: 'loading', chartPoints: null, forecast: null, modelInfo: null };
  });

  useEffect(() => {
    let alive = true;
    const hit = cache.get(cropType);
    if (hit && Date.now() - hit.at < TTL_MS) {
      setState(shape(hit.value));
      return () => { alive = false; };
    }
    setState((prev) => (prev.modelInfo ? prev : { status: 'loading', chartPoints: null, forecast: null, modelInfo: null }));
    load(cropType)
      .then((value) => { if (alive) setState(shape(value)); })
      .catch(() => { if (alive) setState({ status: 'error', chartPoints: null, forecast: null, modelInfo: null }); });
    return () => { alive = false; };
  }, [cropType]);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    const value = await forceLoad(cropType);
    setState(shape(value));
    return value;
  }, [cropType]);

  return { ...state, refresh };
};

export default useModelForecast;
