const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../config/jwt');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route (No token)' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized (Invalid token)' });
  }

  try {
    req.user = await User.findById(decoded.id).select('-password');
  } catch (e) {
    logger.error(`Auth lookup error: ${e.message}`);
    return res.status(503).json({ success: false, message: 'Authorization is temporarily unavailable. Please try again shortly.' });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized (user no longer exists)' });
  }

  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'Guest'}' is not authorized to perform this action`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
