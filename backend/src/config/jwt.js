const logger = require('../utils/logger');

const FALLBACK_SECRET = 'krishiflow_production_jwt_secret_key_2026_super_secure';
let warned = false;

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!warned) {
    logger.warn('JWT_SECRET is not set — falling back to a publicly-known default secret. Tokens can be forged. Set JWT_SECRET in the environment.');
    warned = true;
  }
  return FALLBACK_SECRET;
};

module.exports = { getJwtSecret };
