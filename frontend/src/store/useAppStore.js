import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Auth state
  user: localStorage.getItem('token') ? { name: 'Ramesh Singh', role: 'Farmer', email: 'ramesh.farmer@krishiflow.ai' } : null,
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
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
    driverName: 'Ramesh Kumar',
    currentCoordinates: [73.7898, 19.9975],
    speedKmH: 58,
    progressPercent: 0
  },
  updateTrackedVehicle: (data) => set((state) => ({
    trackedVehicle: { ...state.trackedVehicle, ...data }
  })),

  // Active Navigation Tab
  activeTab: 'home', // 'home' | 'forecasting' | 'mandi-comparison' | 'demand-analysis' | 'profitability' | 'price-alerts' | 'logistics' | 'bookings' | 'auth'
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Multilingual Support
  language: 'en', // 'en' | 'hi' | 'mr'
  setLanguage: (lang) => set({ language: lang }),

  // Farmer Bookings & Consignments
  bookings: [
    {
      id: 'DISP-8921',
      cropType: 'Tomato',
      quantityKg: 2500,
      driverName: 'Ramesh Kumar',
      driverPhone: '+91 98765 12345',
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

  // Dev Trigger Traffic Jam Alert
  trafficAlert: null,
  isSimulatingJam: false,
  setTrafficAlert: (alert) => set({ trafficAlert: alert, isSimulatingJam: true }),
  clearTrafficAlert: () => set({ trafficAlert: null, isSimulatingJam: false }),
}));
