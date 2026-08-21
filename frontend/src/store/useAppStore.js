import { create } from 'zustand';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n';

/**
 * The signed-in user is restored from localStorage rather than reconstructed,
 * so a refresh keeps whoever actually logged in. (Previously any stored token
 * rehydrated as a hardcoded demo farmer, overwriting the real identity.)
 */
const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const readStoredLanguage = () => {
  const stored = localStorage.getItem('language');
  return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
};

// Keep <html lang> in sync so the Devanagari CSS and screen readers both apply.
const applyDocumentLanguage = (lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
};

const storedUser = readStoredUser();
const storedToken = localStorage.getItem('token');
// A token without a user (or vice versa) is a broken half-session — drop both.
const hasValidSession = Boolean(storedUser && storedToken);
if (!hasValidSession) {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

/**
 * Today at a given hour, ISO. Fleet routes are seeded relative to the current
 * day so the dispatcher's ETAs stay believable instead of rotting to last year.
 */
const todayAt = (hour, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const initialLanguage = readStoredLanguage();
applyDocumentLanguage(initialLanguage);

export const useAppStore = create((set, get) => ({
  // Auth state
  user: hasValidSession ? storedUser : null,
  token: hasValidSession ? storedToken : null,
  activeRole: (hasValidSession && storedUser.role) || localStorage.getItem('activeRole') || 'Farmer',

  setAuth: (user, token) => {
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    const role = user?.role || 'Farmer';
    localStorage.setItem('activeRole', role);
    set({ user, token, activeRole: role });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
    set({ user: null, token: null, activeRole: 'Farmer' });
  },

  // Service health statuses
  backendStatus: 'online',
  aiEngineStatus: 'online',
  dbConnected: true,
  setSystemHealth: (data) => set({
    backendStatus: data.status || 'offline',
    aiEngineStatus: data.aiEngineStatus || 'offline',
    dbConnected: data.dbConnected ?? true
  }),

  // Crop & Wizard Form state
  farmerOrigin: [73.7898, 19.9975], // Nashik default [lng, lat]
  farmerAddress: 'Nashik Central Farm HQ, Maharashtra',
  cropDetails: {
    cropType: 'Tomato',
    quantityKg: 2500,
    harvestTime: new Date().toISOString().split('T')[0],
    temperatureSensitivity: 'High'
  },
  setCropDetails: (details) => set((state) => ({
    cropDetails: { ...state.cropDetails, ...details }
  })),
  setFarmerOrigin: (coords, address) => set({ farmerOrigin: coords, farmerAddress: address }),

  // Optimization recommendations
  isLoadingRecommendations: false,
  recommendations: [],
  selectedRecommendation: null,
  aiEngineSource: null,
  setRecommendations: (data) => set({
    recommendations: data.recommendations || [],
    selectedRecommendation: data.recommendations?.[0] || null,
    aiEngineSource: data.aiEngineSource || 'FastAPI OR-Tools Engine',
    isLoadingRecommendations: false
  }),
  setSelectedRecommendation: (rec) => set({ selectedRecommendation: rec }),

  // Live Vehicle Tracking & WebSocket
  trackedVehicle: {
    vehicleId: 'VEH-9988',
    driverName: 'Suresh Shinde',
    currentCoordinates: [73.7898, 19.9975],
    speedKmH: 58,
    progressPercent: 35
  },
  updateTrackedVehicle: (data) => set((state) => ({
    trackedVehicle: { ...state.trackedVehicle, ...data }
  })),

  // Active Navigation Tab
  // Valid ids live in app/routes.js — that file is the only source of them.
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Multilingual Support
  language: initialLanguage, // 'en' | 'hi' | 'mr'
  setLanguage: (lang) => {
    const next = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
    localStorage.setItem('language', next);
    applyDocumentLanguage(next);
    set({ language: next });
  },

  /*
   * Registered driver vehicles.
   *
   * `ratePerKm` is the vehicle's own quoted freight rate and it has to stay
   * consistent with data/demoMarket.js, where the Price screen deducts freight
   * per KILO to work out "You get". The two describe the same trip: Vashi is
   * 165 km at ₹3.4/kg on 2,500 kg — ₹8,500, or about ₹52/km. The rates here
   * used to be ₹12–28/km, so the same journey was quoted at a third of what
   * the rate comparison had already subtracted from it.
   */
  /*
   * The fleet and the pickup queue used to be seeded here. They are not any
   * more: vehicles belong to a fleet owner and pickup requests are raised by a
   * farmer, both persisted in MongoDB and read through services/api.js.
   *
   * Nothing about dispatch is seeded on the client. A fleet owner looking at an
   * empty queue has to be looking at an empty queue — sample rows on that
   * screen are rows somebody might send a real truck against.
   */

  /*
   * Mandi deals — the step that used to be missing entirely.
   *
   * A farmer does not hire a truck and then find out what the mandi will pay;
   * they agree a price with a commission agent or trader first, and the truck
   * is what happens after. Without this gate a farmer could ask for a pickup to
   * a mandi nobody there had agreed to receive.
   *
   * A deal carries the agreed rate, which is what the farmer actually gets —
   * the Agmarknet modal price is the market's midpoint, not a quote made to
   * this farmer for this lot. Everything downstream (the pickup request, the
   * waybill, the buyer's inbound list) reads the agreed rate, not the board
   * rate.
   *
   * Deals live in the store rather than Mongo because they are a conversation
   * between a farmer and a trader, not fleet state. The pickup request they
   * produce IS persisted — that is the thing a fleet owner acts on.
   */
  deals: [],

  /**
   * The mandi the farmer tapped on the Prices screen, handed to the Transport
   * screen so it opens on that mandi instead of asking the question again.
   */
  pendingMandi: null,
  setPendingMandi: (mandi) => set({ pendingMandi: mandi }),

  createDeal: (deal) => set((state) => ({
    deals: [deal, ...state.deals],
    pendingMandi: null,
  })),

  sendDealMessage: (dealId, message) => set((state) => ({
    deals: state.deals.map((deal) =>
      deal.id === dealId ? { ...deal, messages: [...deal.messages, message] } : deal
    ),
  })),

  /** Records the price the two sides settled on. This is what unlocks a pickup. */
  agreeDeal: (dealId, { agreedRatePerKg, quantityKg }) => set((state) => ({
    deals: state.deals.map((deal) =>
      deal.id === dealId
        ? { ...deal, agreedRatePerKg, quantityKg: quantityKg ?? deal.quantityKg, status: 'Agreed' }
        : deal
    ),
  })),

  setDealStatus: (dealId, status) => set((state) => ({
    deals: state.deals.map((deal) => (deal.id === dealId ? { ...deal, status } : deal)),
  })),

  /** Links a deal to the pickup request raised against it, so neither drifts. */
  attachBookingToDeal: (dealId, bookingId) => set((state) => ({
    deals: state.deals.map((deal) => (deal.id === dealId ? { ...deal, bookingId } : deal)),
  })),

  /*
   * `bookings` used to sit here: a seeded pair of consignments that no screen
   * reads any more. The farmer's consignments are PickupRequest documents now,
   * fetched in features/farmer/transport/useMyRequests.js.
   */

  // APMC Buyer Rate Postings & Procurement Bids (Buyer Dashboard State)
  buyerPostings: [
    {
      id: 'BID-901',
      cropType: 'Tomato',
      grade: 'Grade-A Premium Red',
      offeredPricePerKg: 46,
      requiredQuantityKg: 5000,
      receivedQuantityKg: 2500,
      mandiName: 'Mumbai APMC',
      traderName: 'Rajesh Mehta (Mehta Produce Corp)',
      traderPhone: '+91 98200 55443',
      status: 'Active Procurement',
      expiresIn: '2 Days'
    },
    {
      id: 'BID-902',
      cropType: 'Onion',
      grade: 'Lasalgaon Red Export Grade',
      offeredPricePerKg: 34,
      requiredQuantityKg: 10000,
      receivedQuantityKg: 5000,
      mandiName: 'Nasik APMC',
      traderName: 'Rajesh Mehta (Mehta Produce Corp)',
      traderPhone: '+91 98200 55443',
      status: 'Active Procurement',
      expiresIn: '5 Days'
    }
  ],

  addBuyerPosting: (posting) => set((state) => ({
    buyerPostings: [posting, ...state.buyerPostings]
  })),

  deleteBuyerPosting: (id) => set((state) => ({
    buyerPostings: state.buyerPostings.filter((p) => p.id !== id)
  })),

  // Inbound Shipments for APMC Buyer
  inboundShipments: [
    {
      id: 'DISP-8921',
      farmerName: 'Ramesh Singh',
      cropType: 'Tomato',
      quantityKg: 2500,
      driverName: 'Suresh Shinde',
      driverPhone: '+91 98230 11223',
      vehicleNo: 'MH 15 GH 4921',
      mandiName: 'Mumbai APMC',
      eta: 'Today, 11:45 AM',
      agreedRate: '₹46 / kg',
      estTotalValue: '₹1,15,000',
      status: 'In Transit (35km away)'
    },
    {
      id: 'DISP-7710',
      farmerName: 'Anand Kulkarni',
      cropType: 'Onion',
      quantityKg: 5000,
      driverName: 'Sunita Patil',
      driverPhone: '+91 94221 88990',
      vehicleNo: 'MH 31 CB 7810',
      mandiName: 'Mumbai APMC',
      eta: 'Arrived at Gate #4',
      agreedRate: '₹34 / kg',
      estTotalValue: '₹1,70,000',
      status: 'Unloading'
    }
  ],

  // Dev Trigger Traffic Jam Alert
  trafficAlert: null,
  isSimulatingJam: false,
  setTrafficAlert: (alert) => set({ trafficAlert: alert, isSimulatingJam: true }),
  clearTrafficAlert: () => set({ trafficAlert: null, isSimulatingJam: false }),
}));
