const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const logger = require('../utils/logger');

const pythonClient = axios.create({
  baseURL: process.env.PYTHON_ENGINE_URL || 'http://localhost:8000',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
});

// Configure robust retry logic (3 retries with exponential backoff)
axiosRetry(pythonClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  },
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn(`Retrying Python AI Engine request attempt #${retryCount} to ${requestConfig.url}: ${error.message}`);
  }
});

const callOptimizeRoute = async (payload) => {
  try {
    const response = await pythonClient.post('/optimize-route', payload);
    return response.data;
  } catch (error) {
    logger.error(`Python AI Service call failed: ${error.message}`);
    throw error;
  }
};

const checkAiEngineHealth = async () => {
  try {
    const res = await pythonClient.get('/health');
    return res.data;
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
};

module.exports = {
  callOptimizeRoute,
  checkAiEngineHealth
};
