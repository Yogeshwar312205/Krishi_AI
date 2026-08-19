/**
 * One shared, time-limited cache for the government mandi feed.
 *
 * Before this existed, every screen that wanted a rate called the API itself
 * on mount. The landing board alone fired eight requests (four crops × rates +
 * history), and walking Today → Prices → Today re-fetched all of it each time —
 * against a government endpoint whose sample key is rate-limited hard enough to
 * start returning "Rate limit exceeded" mid-demo.
 *
 * Three separate problems, three mechanisms:
 *   - repeat visits           -> TTL entries, served instantly from memory
 *   - simultaneous callers    -> in-flight de-duplication, one request per crop
 *   - going stale on screen   -> a background refresh timer while anything is
 *                                subscribed, stopping when nothing is mounted
 *
 * The backend caches the same data for 15 minutes too (agmarknetService.js), so
 * a cold client still doesn't reach data.gov.in on most loads.
 */
import { fetchLiveAgmarknetMarkets, fetchAgmarknetHistory } from '../services/api';

/** How long a cached crop stays usable without a network call. */
export const MARKET_TTL_MS = 10 * 60 * 1000;

/** How often a crop that is currently on screen gets quietly refreshed. */
export const MARKET_REFRESH_MS = 5 * 60 * 1000;

/** Rates are published once a day; polling faster than this buys nothing. */
const REFRESH_TICK_MS = 60 * 1000;

const entries = new Map();   // crop -> { records, history, fetchedAt, error }
const inFlight = new Map();  // crop -> Promise
const subscribers = new Map(); // crop -> Set<callback>

let timer = null;

const emit = (crop) => {
  const listeners = subscribers.get(crop);
  if (listeners) listeners.forEach((fn) => fn());
};

const isFresh = (entry) => Boolean(entry) && Date.now() - entry.fetchedAt < MARKET_TTL_MS;

/**
 * Fetches one crop, collapsing concurrent callers onto a single request.
 *
 * Rates and history are requested together but settled independently: the
 * history query filters by state server-side and can take tens of seconds,
 * while the rate list is usually sub-second. Waiting for both would hold the
 * whole screen hostage to the slower one, so a failed or slow history just
 * leaves `history: []` and the chart falls back.
 */
const load = (crop) => {
  if (inFlight.has(crop)) return inFlight.get(crop);

  const promise = (async () => {
    const [ratesResult, historyResult] = await Promise.allSettled([
      fetchLiveAgmarknetMarkets(crop, 'Maharashtra'),
      fetchAgmarknetHistory(crop, 'Maharashtra'),
    ]);

    const rates = ratesResult.status === 'fulfilled' ? ratesResult.value : null;
    const history = historyResult.status === 'fulfilled' ? historyResult.value : null;

    const entry = {
      crop,
      records: rates?.records || [],
      isLive: Boolean(rates?.isLiveGovtData && rates?.records?.length),
      latestArrivalDate: rates?.latestArrivalDate || null,
      history: history?.days || [],
      fetchedAt: Date.now(),
      error: rates ? null : 'unreachable',
    };

    entries.set(crop, entry);
    inFlight.delete(crop);
    emit(crop);
    return entry;
  })();

  inFlight.set(crop, promise);
  return promise;
};

/** Cached snapshot for a crop, or null if it has never been fetched. */
export const peek = (crop) => entries.get(crop) || null;

/** Fetch unless a fresh copy is already in hand. `force` ignores the TTL. */
export const ensure = (crop, { force = false } = {}) => {
  const entry = entries.get(crop);
  if (!force && isFresh(entry)) return Promise.resolve(entry);
  return load(crop);
};

/**
 * Warm the cache before anything asks for it — called once at app start with
 * the crops the first screens will need, so the landing board and the Today
 * verdict render from memory rather than from a spinner.
 */
export const prefetch = (crops = []) => {
  crops.forEach((crop) => { if (!isFresh(entries.get(crop))) load(crop); });
};

const startTimer = () => {
  if (timer) return;
  timer = setInterval(() => {
    for (const [crop, listeners] of subscribers) {
      if (!listeners.size) continue;
      const entry = entries.get(crop);
      if (!entry || Date.now() - entry.fetchedAt >= MARKET_REFRESH_MS) load(crop);
    }
  }, REFRESH_TICK_MS);
};

const stopTimerIfIdle = () => {
  const anyActive = [...subscribers.values()].some((set) => set.size);
  if (!anyActive && timer) {
    clearInterval(timer);
    timer = null;
  }
};

/**
 * Subscribe to one crop. Returns an unsubscribe function.
 * Shaped for useSyncExternalStore, which is what makes several components
 * reading the same crop share one entry and one request.
 */
export const subscribe = (crop, callback) => {
  if (!subscribers.has(crop)) subscribers.set(crop, new Set());
  subscribers.get(crop).add(callback);
  startTimer();

  return () => {
    subscribers.get(crop)?.delete(callback);
    stopTimerIfIdle();
  };
};
