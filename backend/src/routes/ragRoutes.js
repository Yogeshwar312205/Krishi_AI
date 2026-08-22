const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  handleRagChat,
  triggerIndexing,
  getRagHealth,
  getSources
} = require('../controllers/ragController');

// Public health check
router.get('/health', getRagHealth);

// Authenticated RAG Chat route
router.post('/chat', protect, handleRagChat);

// Authenticated sources route
router.get('/sources', protect, getSources);

// Admin trigger knowledge re-indexing
router.post('/index', protect, authorize('Admin'), triggerIndexing);

module.exports = router;
