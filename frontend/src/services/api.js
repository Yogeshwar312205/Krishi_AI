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

export const fetchHealthStatus = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/health`);
    return res.data;
  } catch (err) {
    return { status: 'offline', aiEngineStatus: 'offline', dbConnected: false };
  }
};

export const submitOptimization = async (payload) => {
  const response = await apiClient.post('/recommend', payload);
  return response.data;
};

export const fetchNearbyVehicles = async (lng, lat) => {
  const response = await apiClient.get(`/vehicles/nearby?lng=${lng}&lat=${lat}`);
  return response.data;
};

export const seedVehicleFleet = async () => {
  const response = await apiClient.post('/vehicles/seed');
  return response.data;
};
