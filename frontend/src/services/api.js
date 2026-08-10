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

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      throw new Error(err.response.data.message || 'Login failed');
    }
    // Fallback for demo mode
    return {
      success: true,
      token: 'jwt-demo-token-' + Date.now(),
      user: {
        id: 'usr-' + Date.now(),
        name: credentials.email.split('@')[0] || 'Farmer User',
        email: credentials.email,
        role: 'Farmer',
        phone: '+91 98765 43210'
      }
    };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      throw new Error(err.response.data.message || 'Registration failed');
    }
    // Fallback for demo mode
    return {
      success: true,
      token: 'jwt-demo-token-' + Date.now(),
      user: {
        id: 'usr-' + Date.now(),
        name: userData.name || 'Farmer User',
        email: userData.email,
        role: userData.role || 'Farmer',
        phone: userData.phone || '+91 98765 43210'
      }
    };
  }
};
