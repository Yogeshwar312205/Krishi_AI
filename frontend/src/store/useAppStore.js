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
  activeTab: 'home', // 'home' | 'forecasting' | 'mandi-comparison' | 'demand-analysis' | 'profitability' | 'price-alerts' | 'logistics'
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Dev Trigger Traffic Jam Alert
  trafficAlert: null,
  isSimulatingJam: false,
  setTrafficAlert: (alert) => set({ trafficAlert: alert, isSimulatingJam: true }),
  clearTrafficAlert: () => set({ trafficAlert: null, isSimulatingJam: false }),
}));
