const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Separate limiter for dispatch endpoints - fleet owners may check frequently
const dispatchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (reasonable for manual refreshes)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many dispatch requests. Please wait a moment before refreshing.'
  }
});

module.exports = { apiLimiter, authLimiter, dispatchLimiter };
