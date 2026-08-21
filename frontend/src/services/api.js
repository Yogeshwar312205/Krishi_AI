import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Interceptor attaching Bearer JWT token if present
apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// A rejected token means the stored session is dead; clear it so the UI returns
// to a signed-out state instead of retrying with a credential the server refuses.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && useAppStore.getState().token) {
      useAppStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

/**
 * Normalises an axios failure into a single Error with a message worth showing.
 * Distinguishes "the server said no" from "the server never answered", because
 * the two need different things from the user.
 */
const toApiError = (err, fallbackMessage) => {
  if (err.response) {
    return new Error(err.response.data?.message || fallbackMessage);
  }
  if (err.code === 'ECONNABORTED') {
    return new Error('The server took too long to respond. Please try again.');
  }
  return new Error('Cannot reach the KrishiFlow server. Check your connection.');
};

/** True when the request failed because the backend is unreachable, not because it refused. */
const isOffline = (err) => !err.response;

export const fetchHealthStatus = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    return res.data;
  } catch (err) {
    return { status: 'offline', aiEngineStatus: 'offline', dbConnected: false };
  }
};

export const submitOptimization = async (payload) => {
  try {
    const response = await apiClient.post('/recommend', payload);
    return response.data;
  } catch (err) {
    throw toApiError(err, 'Could not calculate routes for this consignment.');
  }
};

export const fetchNearbyVehicles = async (lng, lat) => {
  try {
    const response = await apiClient.get('/vehicles/nearby', { params: { lng, lat } });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch nearby vehicles:', err.message);
    return { success: false, vehicles: [] };
  }
};

export const seedVehicleFleet = async () => {
  try {
    const response = await apiClient.post('/vehicles/seed');
    return response.data;
  } catch (err) {
    throw toApiError(err, 'Could not seed the demo vehicle fleet.');
  }
};

export const fetchLiveAgmarknetMarkets = async (crop = 'Tomato', state = '') => {
  try {
    const response = await apiClient.get('/agmarknet/live-rates', {
      params: { crop, state }
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch live Govt Agmarknet markets:', err.message);
    return { success: false, records: [] };
  }
};

export const fetchAgmarknetHistory = async (crop = 'Tomato', state = 'Maharashtra', days = 14) => {
  try {
    const response = await apiClient.get('/agmarknet/history', {
      params: { crop, state, days }
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch Agmarknet price history:', err.message);
    return { success: false, days: [] };
  }
};

/*
 * The commodity list is fetched at most once per session per state.
 *
 * It is the heaviest query we make — an unfiltered sweep of the feed rather
 * than one crop — and the answer changes with the season, not with the minute.
 * The Crop screen mounts every time the farmer taps that tab, so without this
 * the same 40-second query ran on each visit.
 */
const commodityCache = new Map();

/** Which commodities Maharashtra's mandis are actually reporting right now. */
export const fetchAgmarknetCommodities = async (state = 'Maharashtra') => {
  if (commodityCache.has(state)) return commodityCache.get(state);

  const request = (async () => {
    try {
      const response = await apiClient.get('/agmarknet/commodities', {
        params: { state },
        // An unfiltered sweep of the feed is far heavier than one crop's rates.
        timeout: 45000,
      });
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch Agmarknet commodity list:', err.message);
      // Not cached: a failure should be retried on the next visit, unlike a
      // successful answer which is good for the rest of the session.
      commodityCache.delete(state);
      return { success: false, commodities: [] };
    }
  })();

  commodityCache.set(state, request);
  return request;
};

export const sendPriceAlertSms = async ({ phone, cropType, targetPrice, currentPrice, mandiName }) => {
  try {
    const response = await apiClient.post('/alerts/send-sms', {
      phone, cropType, targetPrice, currentPrice, mandiName
    });
    return response.data;
  } catch (err) {
    throw toApiError(err, 'Could not send the alert SMS.');
  }
};

export const fetchAllMarkets = async (crop = 'Tomato', state = '') => {
  try {
    const response = await apiClient.get('/markets', {
      params: { crop, state, limit: 100 }
    });
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch markets:', err.message);
    return { success: false, markets: [] };
  }
};

/*
 * Offline demo profiles.
 *
 * When the backend is unreachable the app still needs a coherent identity to
 * render, so each demo account carries a full profile. Deriving a name from the
 * email local-part instead would surface strings like "rajesh.buyer" as the
 * user's display name.
 */
const DEMO_PROFILES = {
  'ramesh.farmer@krishiflow.ai': {
    name: 'Ramesh Singh',
    role: 'Farmer',
    phone: '+91 98765 43210',
    location: 'Nashik, Maharashtra'
  },
  'suresh.driver@krishiflow.ai': {
    name: 'Suresh Shinde',
    role: 'Driver',
    phone: '+91 98230 11223',
    location: 'Nashik Logistics Hub'
  },
  'rajesh.buyer@krishiflow.ai': {
    name: 'Rajesh Mehta',
    role: 'APMC Buyer',
    phone: '+91 98200 55443',
    company: 'Mehta Produce Corp',
    licenseNo: 'APMC-MH-8842',
    location: 'Vashi Wholesale APMC'
  }
};

/** Turns "priya.patil@x.com" into "Priya Patil" for accounts with no stored profile. */
const nameFromEmail = (email = '') =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'KrishiFlow User';

const buildDemoUser = (email, overrides = {}) => ({
  id: 'usr-' + Date.now(),
  email,
  role: 'Farmer',
  ...(DEMO_PROFILES[email] || { name: nameFromEmail(email), phone: '' }),
  ...overrides
});

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  } catch (err) {
    // Only fall back to demo mode when the server is unreachable. A real 401
    // must stay an error, or bad credentials would silently "succeed".
    if (!isOffline(err)) {
      throw toApiError(err, 'Login failed. Check your email and password.');
    }
    return {
      success: true,
      offline: true,
      token: 'demo-token-' + Date.now(),
      user: buildDemoUser(credentials.email)
    };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (err) {
    if (!isOffline(err)) {
      throw toApiError(err, 'Registration failed. Please try again.');
    }
    return {
      success: true,
      offline: true,
      token: 'demo-token-' + Date.now(),
      user: buildDemoUser(userData.email, {
        name: userData.name || nameFromEmail(userData.email),
        role: userData.role || 'Farmer',
        phone: userData.phone || ''
      })
    };
  }
};

/*
 * Pickup requests and dispatch.
 *
 * All of it is authenticated and server-side. None of these have an offline
 * fallback, unlike login above, and that is deliberate: a fabricated dispatch
 * queue would have a fleet owner sending a real truck to a farmer who never
 * asked, and a fabricated ranking could disagree with the one the server would
 * have given. When the backend is down these screens say so.
 */

/* ----------------------------------------------------------------- farmer */

export const createPickupRequest = async (payload) => {
  const { data } = await apiClient.post('/requests', payload);
  return data.request;
};

export const fetchMyRequests = async () => {
  const { data } = await apiClient.get('/requests/mine');
  return data.requests;
};

export const cancelPickupRequest = async (id) => {
  const { data } = await apiClient.post(`/requests/${id}/cancel`);
  return data.request;
};

/* ----------------------------------------------------------- fleet owner */

/**
 * The ranked queue. Takes no fleet payload — the server reads the caller's own
 * vehicles and the open requests, so nobody can rank a fleet they do not own.
 */
export const fetchDispatchSuggestions = async (topN = 3) => {
  const { data } = await apiClient.get('/dispatch/suggestions', { params: { topN } });
  return data;
};

export const approveSuggestion = async (requestId, { vehicleId, proposedRoute, dispatch }) => {
  const { data } = await apiClient.post(`/requests/${requestId}/assign`, {
    vehicleId, proposedRoute, dispatch,
  });
  return data.request;
};

export const fetchDispatchQueue = async () => {
  const { data } = await apiClient.get('/requests/queue');
  return data;
};

export const updateRequestStatus = async (requestId, status, note) => {
  const { data } = await apiClient.post(`/requests/${requestId}/status`, { status, note });
  return data.request;
};

export const fetchFleet = async () => {
  const { data } = await apiClient.get('/fleet');
  return data.vehicles;
};

export const addFleetVehicle = async (vehicle) => {
  const { data } = await apiClient.post('/fleet', vehicle);
  return data.vehicle;
};
