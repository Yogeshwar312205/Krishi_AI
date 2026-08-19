const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../config/jwt');

const PUBLIC_ROLES = ['Farmer', 'Driver', 'Transporter', 'Trader', 'Buyer', 'APMC Buyer'];

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: '7d',
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (role && !PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selection' });
    }

    let userExists;
    try {
      userExists = await User.findOne({ email });
    } catch (e) {
      logger.error(`Register lookup error: ${e.message}`);
      return res.status(503).json({ success: false, message: 'Registration is temporarily unavailable. Please try again shortly.' });
    }

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    let user;
    try {
      user = await User.create({ name, email, password, phone, role });
    } catch (e) {
      logger.error(`Register create error: ${e.message}`);
      if (e.code === 11000) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      if (e.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: e.message });
      }
      return res.status(503).json({ success: false, message: 'Registration is temporarily unavailable. Please try again shortly.' });
    }

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user;
    try {
      user = await User.findOne({ email }).select('+password');
    } catch (e) {
      logger.error(`Login lookup error: ${e.message}`);
      return res.status(503).json({ success: false, message: 'Login is temporarily unavailable. Please try again shortly.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login };
