const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route (No token)' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'krishiflow_production_jwt_secret_key_2026_super_secure');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      // Fallback user object if DB offline
      req.user = { id: decoded.id, role: decoded.role || 'Farmer', name: 'Demo Farmer' };
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized (Invalid token)' });
  }
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
