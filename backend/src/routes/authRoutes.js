const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword } = require('../controllers/authController');
const { authLimiter, apiLimiter } = require('../middlewares/rateLimiter');
const { protect } = require('../middlewares/auth');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

/*
 * The account, editable by the account.
 *
 * `protect` supplies the identity, so there is no id in any of these paths —
 * a signed-in user can read and edit exactly one profile, their own.
 *
 * Reads and edits sit under the ordinary apiLimiter; the password change sits
 * under the tighter authLimiter, because it takes the current password and a
 * loose limit there is a guessing budget.
 */
router.get('/me', apiLimiter, protect, getMe);
router.patch('/me', apiLimiter, protect, updateMe);
router.post('/me/password', authLimiter, protect, changePassword);

module.exports = router;
