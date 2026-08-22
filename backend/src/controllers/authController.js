const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../config/jwt');

/*
 * Roles someone may register as.
 *
 * 'Driver' and 'Transporter' are gone: a driver is a name and a phone number on
 * a vehicle, not an account. The person who decides where a truck goes is the
 * fleet owner, and modelling drivers as logins turned this into a ride-hailing
 * app — you cannot run a capacitated VRP over a fleet you do not control.
 * Existing Driver accounts still log in and are read as fleet owners; see
 * normaliseRole in frontend/src/app/routes.js.
 */
const PUBLIC_ROLES = ['Farmer', 'Logistics', 'Trader', 'Buyer', 'APMC Buyer'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Indian mobile: ten digits starting 6-9, once the +91 and whatever spaces or
 * dashes the user typed are stripped. Stored as typed — '+91 98765 43210' is
 * what a farmer recognises as their own number — and only validated here.
 * Mirrors PHONE_PATTERN in frontend/src/features/auth/AuthScreen.jsx.
 */
const isValidPhone = (value = '') =>
  /^[6-9]\d{9}$/.test(String(value).trim().replace(/^\+?91/, '').replace(/[\s-]/g, ''));

/** Same rule the signup form enforces: 8+ characters with a letter and a digit. */
const isStrongPassword = (value = '') =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

/*
 * The client sends a village as a plain string ('Nashik') because that is the
 * one thing it can honestly ask for; the schema stores an address plus optional
 * coordinates. This reconciles the two.
 *
 * A village name is never geocoded into a guess here. Coordinates survive only
 * when a caller supplies a real pair — distance drives freight, freight drives
 * net profit, and net profit is the number the farmer acts on. Same rule as
 * backend/src/data/mandiGeo.js and the pickup request store.
 */
const normaliseLocation = (input) => {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'string') return { address: input.trim() };
  if (typeof input !== 'object') return undefined;

  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const pair = Array.isArray(input.coordinates) ? input.coordinates.map(Number) : null;
  const hasRealPair = pair && pair.length === 2 && pair.every(Number.isFinite);

  return hasRealPair ? { address, coordinates: pair } : { address };
};

/*
 * The single shape of a user as the client sees one. Every auth response goes
 * through this, so a profile fetched after an edit is the same object the login
 * handed over — no screen has to cope with two versions of "the user".
 *
 * `location` is flattened to the address string: that is what the profile and
 * signup forms collect and what ProfilePanel renders. The stored coordinates
 * are the server's business (they are not the farm origin the farmer drags
 * around on the map, which lives in the client store).
 *
 * The password hash is never in here, whatever the caller selected.
 */
const publicProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  role: user.role,
  location: user.location?.address || '',
  primaryCrop: user.primaryCrop || '',
});

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: '7d',
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, location, primaryCrop } = req.body;

    if (role && !PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selection' });
    }
    if (!EMAIL_PATTERN.test(String(email || '').trim())) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    }
    if (!isStrongPassword(String(password || ''))) {
      return res.status(400).json({ success: false, message: 'Password needs at least 8 characters, with a letter and a number' });
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
      // location and primaryCrop used to be collected by the signup form and
      // dropped on the floor here; the profile screen then showed "Not given"
      // for a village the account had just typed in.
      user = await User.create({
        name, email, password, phone, role,
        location: normaliseLocation(location),
        primaryCrop: typeof primaryCrop === 'string' ? primaryCrop.trim() : '',
      });
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
      user: publicProfile(user)
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
      user: publicProfile(user)
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* --------------------------------------------------------------- the account

 * Three handlers behind `protect`, all acting on req.user and nobody else. The
 * id never comes from the body: an account can only ever edit itself, so there
 * is no :id to tamper with.
 */

// GET /api/auth/me
const getMe = async (req, res) => {
  // `protect` already loaded the document, so this is a read of what it found.
  // It exists so a session restored from localStorage can refresh itself —
  // sessions stored before phone and village were returned carry neither.
  return res.status(200).json({ success: true, user: publicProfile(req.user) });
};

// PATCH /api/auth/me
const updateMe = async (req, res) => {
  try {
    const { name, email, phone, location, primaryCrop } = req.body;
    const user = req.user;

    /*
     * Role is deliberately not editable here. It decides which tabs exist and
     * which endpoints authorise (see app/routes.js and the FLEET list in
     * apiRoutes.js), and a self-service switch from Farmer to Logistics would
     * be a privilege escalation with a form in front of it. Changing a role is
     * an operator job.
     */
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }
      user.name = String(name).trim();
    }

    if (phone !== undefined) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
      }
      user.phone = String(phone).trim();
    }

    if (email !== undefined) {
      const next = String(email).trim().toLowerCase();
      if (!EMAIL_PATTERN.test(next)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address' });
      }
      if (next !== user.email) {
        // The email IS the login, so a collision has to be refused before the
        // save rather than surfaced as a duplicate-key error afterwards.
        let taken;
        try {
          taken = await User.findOne({ email: next, _id: { $ne: user._id } });
        } catch (e) {
          logger.error(`Profile email lookup error: ${e.message}`);
          return res.status(503).json({ success: false, message: 'Your details could not be saved just now. Please try again shortly.' });
        }
        if (taken) {
          return res.status(400).json({ success: false, message: 'That email is already in use' });
        }
        user.email = next;
      }
    }

    if (location !== undefined) {
      const next = normaliseLocation(location);
      // Spread rather than replace: a form that only knows the village must not
      // wipe coordinates the account was created with.
      if (next) user.location = { ...(user.location?.toObject?.() || user.location || {}), ...next };
    }

    if (primaryCrop !== undefined) {
      user.primaryCrop = String(primaryCrop).trim();
    }

    try {
      await user.save();
    } catch (e) {
      logger.error(`Profile save error: ${e.message}`);
      if (e.code === 11000) {
        return res.status(400).json({ success: false, message: 'That email is already in use' });
      }
      if (e.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: e.message });
      }
      return res.status(503).json({ success: false, message: 'Your details could not be saved just now. Please try again shortly.' });
    }

    return res.status(200).json({ success: true, user: publicProfile(user) });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/me/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please fill in every box' });
    }
    if (!isStrongPassword(String(newPassword))) {
      return res.status(400).json({ success: false, message: 'Password needs at least 8 characters, with a letter and a number' });
    }

    // req.user was loaded without the hash, so re-read the document WITH it.
    let user;
    try {
      user = await User.findById(req.user._id).select('+password');
    } catch (e) {
      logger.error(`Password lookup error: ${e.message}`);
      return res.status(503).json({ success: false, message: 'Your password could not be changed just now. Please try again shortly.' });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized (user no longer exists)' });
    }

    /*
     * Proving the current password is what stops a borrowed handset from
     * locking the owner out of their own account.
     *
     * A wrong one is a 400, not a 401: the session is perfectly valid, it is
     * the typed field that is wrong. The client's axios interceptor tears down
     * the session on any 401, so answering 401 here would sign the user out
     * for a typo.
     */
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Your current password is not right' });
    }

    user.password = String(newPassword); // hashed by the pre-save hook
    try {
      await user.save();
    } catch (e) {
      logger.error(`Password save error: ${e.message}`);
      return res.status(503).json({ success: false, message: 'Your password could not be changed just now. Please try again shortly.' });
    }

    /*
     * The existing token stays valid: it carries id and role, neither of which
     * changed, and invalidating it would sign the user out of the screen they
     * are standing on. There is no session list to revoke here.
     */
    return res.status(200).json({ success: true, message: 'Password changed' });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe, updateMe, changePassword };
