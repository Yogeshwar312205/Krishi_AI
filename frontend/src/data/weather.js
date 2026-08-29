import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchLiveWeather } from '../services/api';

/**
 * Current conditions at the farm.
 *
 * Feeds two things: the Today-screen weather strip, and the ambient temperature
 * the Prices screen puts into its spoilage maths (a hot day makes a soft crop
 * on an open truck lose value faster — see data/geo.js `spoilageFraction`).
 *
 * Keyed on the rounded farm coordinate. The backend already caches Open-Meteo
 * for 20 minutes, so this client cache only needs to stop a re-fetch on every
 * tab switch. Degrades silently: no farm pin, or the feed down, returns null
 * and every caller treats that as "no strip, default road temperature".
 */

const TTL_MS = 20 * 60 * 1000;
const cache = new Map();     // key -> { at, value }
const inFlight = new Map();  // key -> Promise

const keyFor = (origin) => {
  const lng = Number.isFinite(origin?.[0]) ? origin[0].toFixed(2) : 'na';
  const lat = Number.isFinite(origin?.[1]) ? origin[1].toFixed(2) : 'na';
  return `${lng}|${lat}`;
};

const load = (origin) => {
  const key = keyFor(origin);
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = fetchLiveWeather(origin[1], origin[0])
    .then(({ weather }) => {
      cache.set(key, { at: Date.now(), value: weather });
      inFlight.delete(key);
      return weather;
    })
    .catch(() => {
      inFlight.delete(key);
      return null;
    });

  inFlight.set(key, promise);
  return promise;
};

/**
 * WMO weather codes → an i18n key under `weather.*`. Coarse buckets on purpose:
 * a farmer needs "rain / clear / cloudy", not "light freezing drizzle".
 * https://open-meteo.com/en/docs — WW interpretation codes.
 */
export const weatherLabelKey = (code) => {
  if (code == null) return 'weather.unknown';
  if (code === 0) return 'weather.clear';
  if (code <= 2) return 'weather.partCloud';
  if (code === 3) return 'weather.cloudy';
  if (code <= 48) return 'weather.fog';
  if (code <= 57) return 'weather.drizzle';
  if (code <= 67) return 'weather.rain';
  if (code <= 77) return 'weather.snow';
  if (code <= 82) return 'weather.rain';
  if (code <= 86) return 'weather.snow';
  return 'weather.thunder';
};

/**
 * @returns {{ tempC:number, weathercode:number, windspeed:number, isDay:boolean,
 *   source:string } | null}
 */
export const useWeather = () => {
  const origin = useAppStore((state) => state.farmerOrigin);
  const hasOrigin = Number.isFinite(origin?.[0]) && Number.isFinite(origin?.[1]);
  const key = hasOrigin ? keyFor(origin) : null;

  const [weather, setWeather] = useState(() => {
    const hit = key && cache.get(key);
    return hit ? hit.value : null;
  });

  useEffect(() => {
    if (!hasOrigin) {
      setWeather(null);
      return undefined;
    }

    let alive = true;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      setWeather(hit.value);
      return () => { alive = false; };
    }

    load(origin).then((value) => { if (alive) setWeather(value); });
    return () => { alive = false; };
  }, [hasOrigin, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!weather || weather.temperature == null) return null;
  return {
    tempC: weather.temperature,
    weathercode: weather.weathercode,
    windspeed: weather.windspeed,
    isDay: weather.isDay,
    source: weather.source,
  };
};

export default useWeather;
