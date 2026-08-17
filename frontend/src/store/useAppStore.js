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

  setActiveRole: (role) => {
    localStorage.setItem('activeRole', role);
    // Switching the dashboard view also switches the signed-in user's role, but
    // never their identity — the name/email belong to the real account.
    set((state) => {
      if (!state.user) return { activeRole: role };
      const updatedUser = { ...state.user, role };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { activeRole: role, user: updatedUser };
    });
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
  activeTab: 'home', // 'home' | 'forecasting' | 'mandi-comparison' | 'demand-analysis' | 'profitability' | 'price-alerts' | 'logistics' | 'bookings' | 'auth' | 'driver-jobs' | 'driver-vehicles' | 'buyer-postings' | 'inbound-shipments' | 'book-truck'
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
  registeredVehicles: [
    {
      id: 'VEH-101',
      driverName: 'Suresh Shinde',
      driverPhone: '+91 98230 11223',
      vehicleNo: 'MH 15 GH 4921',
      vehicleType: 'Refrigerated Van',
      capacityKg: 3500,
      ratePerKm: 52,
      isRefrigerated: true,
      baseLocation: 'Nashik APMC Hub',
      availableFrom: new Date().toISOString().split('T')[0],
      availableTo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      isAvailable: true,
      tempSensor: '11°C Active Cooling'
    },
    {
      id: 'VEH-102',
      driverName: 'Sunita Patil',
      driverPhone: '+91 94221 88990',
      vehicleNo: 'MH 31 CB 7810',
      vehicleType: 'Heavy Freighter',
      capacityKg: 10000,
      ratePerKm: 78,
      isRefrigerated: true,
      baseLocation: 'Nagpur & Vashi APMC',
      availableFrom: new Date().toISOString().split('T')[0],
      availableTo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      isAvailable: true,
      tempSensor: 'Ventilated Cargo Container'
    },
    {
      id: 'VEH-103',
      driverName: 'Aniket Deshmukh',
      driverPhone: '+91 98901 44556',
      vehicleNo: 'MH 12 AB 9910',
      vehicleType: 'E-Pickup Express',
      capacityKg: 1500,
      ratePerKm: 34,
      isRefrigerated: false,
      baseLocation: 'Pune & Satara Circle',
      availableFrom: new Date().toISOString().split('T')[0],
      availableTo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      isAvailable: true,
      tempSensor: 'Insulated Fast Deck'
    }
  ],

  addRegisteredVehicle: (vehicleData) => set((state) => ({
    registeredVehicles: [vehicleData, ...state.registeredVehicles]
  })),

  // Date-Based Uber-Like Vehicle Booking Requests (Farmer -> Driver)
  dateBookings: [
    {
      id: 'UBER-501',
      farmerName: 'Ramesh Singh',
      farmerPhone: '+91 98765 43210',
      pickupDate: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], // 2 days from now
      timeSlot: 'Morning (06:00 AM - 10:00 AM)',
      cropType: 'Tomato',
      quantityKg: 2500,
      origin: 'Nashik Farm HQ, Maharashtra',
      destination: 'Vashi Wholesale APMC, Navi Mumbai',
      vehicleId: 'VEH-101',
      vehicleNo: 'MH 15 GH 4921',
      driverName: 'Suresh Shinde',
      driverPhone: '+91 98230 11223',
      estDistanceKm: 165,
      estTotalFare: '₹8,500',
      status: 'Accepted',
      createdAt: 'Today, 09:30 AM'
    },
    {
      id: 'UBER-502',
      farmerName: 'Kiran Thorat',
      farmerPhone: '+91 94211 77665',
      pickupDate: new Date(Date.now() + 4*24*60*60*1000).toISOString().split('T')[0],
      timeSlot: 'Afternoon (01:00 PM - 05:00 PM)',
      cropType: 'Onion',
      quantityKg: 5000,
      origin: 'Pimpalgaon Grape Farm',
      destination: 'Gultekdi APMC, Pune',
      vehicleId: 'VEH-101',
      vehicleNo: 'MH 15 GH 4921',
      driverName: 'Suresh Shinde',
      driverPhone: '+91 98230 11223',
      estDistanceKm: 210,
      estTotalFare: '₹12,000',
      status: 'Pending Driver Acceptance',
      createdAt: 'Today, 10:15 AM'
    }
  ],

  createDateBooking: (booking) => set((state) => {
    const newBookingList = [booking, ...state.dateBookings];
    // Also create a booking entry in main bookings for seamless tracking
    const newMainBooking = {
      id: booking.id,
      cropType: booking.cropType,
      quantityKg: booking.quantityKg,
      driverName: booking.driverName,
      driverPhone: booking.driverPhone,
      vehicleType: 'Refrigerated Vehicle',
      vehicleNo: booking.vehicleNo,
      origin: booking.origin,
      destination: booking.destination,
      status: 'Scheduled for ' + booking.pickupDate,
      dispatchTime: booking.pickupDate + ' (' + booking.timeSlot.split(' ')[0] + ')',
      estArrival: 'Target Mandi Delivery',
      temperature: 'Active Cold Chain',
      expectedRevenue: '₹1,20,000',
      transportCost: booking.estTotalFare,
      netProfit: '₹1,11,500'
    };
    return {
      dateBookings: newBookingList,
      bookings: [newMainBooking, ...state.bookings]
    };
  }),

  respondToDateBooking: (bookingId, newStatus) => set((state) => ({
    dateBookings: state.dateBookings.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b)
  })),

  // Farmer Bookings & Consignments
  bookings: [
    {
      id: 'DISP-8921',
      cropType: 'Tomato',
      quantityKg: 2500,
      driverName: 'Suresh Shinde',
      driverPhone: '+91 98230 11223',
      vehicleType: 'Refrigerated Van',
      vehicleNo: 'MH 15 GH 4921',
      origin: 'Nashik Farm HQ',
      destination: 'Vashi Wholesale APMC',
      status: 'In Transit',
      dispatchTime: 'Today, 06:30 AM',
      estArrival: 'Today, 11:45 AM',
      temperature: '11°C (Optimal)',
      expectedRevenue: '₹1,20,000',
      transportCost: '₹8,500',
      netProfit: '₹1,11,500'
    },
    {
      id: 'DISP-7710',
      cropType: 'Onion',
      quantityKg: 5000,
      driverName: 'Sunita Patil',
      driverPhone: '+91 94221 88990',
      vehicleType: 'Heavy Freighter',
      vehicleNo: 'MH 31 CB 7810',
      origin: 'Nagpur APMC Hub',
      destination: 'Mumbai APMC Market',
      status: 'Completed',
      dispatchTime: 'Yesterday, 04:00 PM',
      estArrival: 'Today, 02:00 AM',
      temperature: 'Ventilated 22°C',
      expectedRevenue: '₹1,75,000',
      transportCost: '₹14,000',
      netProfit: '₹1,61,000'
    }
  ],
  addBooking: (newBooking) => set((state) => ({
    bookings: [newBooking, ...state.bookings]
  })),

  // Driver Jobs (Driver Dashboard State)
  driverJobs: [
    {
      id: 'JOB-301',
      farmerName: 'Ramesh Singh',
      farmerPhone: '+91 98765 43210',
      origin: 'Nashik Farm HQ, Sector 4',
      destination: 'Vashi Wholesale APMC, Navi Mumbai',
      cropType: 'Tomato',
      quantityKg: 2500,
      requiredVehicle: 'Refrigerated Van',
      offeredFreight: '₹8,500',
      distanceKm: 165,
      estTime: '3.5 Hours',
      status: 'In Transit',
      createdAt: 'Today, 06:15 AM'
    },
    {
      id: 'JOB-302',
      farmerName: 'Anand Kulkarni',
      farmerPhone: '+91 94220 99881',
      origin: 'Pimpalgaon Grape Orchards',
      destination: 'Gultekdi APMC, Pune',
      cropType: 'Onion',
      quantityKg: 4000,
      requiredVehicle: 'Heavy Freighter',
      offeredFreight: '₹12,000',
      distanceKm: 210,
      estTime: '4.5 Hours',
      status: 'Pending',
      createdAt: 'Today, 07:45 AM'
    }
  ],

  updateDriverJobStatus: (jobId, newStatus) => set((state) => ({
    driverJobs: state.driverJobs.map((j) => j.id === jobId ? { ...j, status: newStatus } : j)
  })),

  // APMC Buyer Rate Postings & Procurement Bids (Buyer Dashboard State)
  buyerPostings: [
    {
      id: 'BID-901',
      cropType: 'Tomato',
      grade: 'Grade-A Premium Red',
      offeredPricePerKg: 46,
      requiredQuantityKg: 5000,
      receivedQuantityKg: 2500,
      mandiName: 'Vashi Wholesale APMC',
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
      mandiName: 'Nashik Main APMC',
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
      mandiName: 'Vashi Wholesale APMC',
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
      mandiName: 'Vashi Wholesale APMC',
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
