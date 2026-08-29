const BuyerPosting = require('../models/BuyerPosting');
const logger = require('../utils/logger');

/**
 * Create a new buyer posting (rate announcement)
 * POST /api/buyer/postings
 * @protected - Requires Buyer/APMC Buyer/Trader authentication
 */
const createPosting = async (req, res) => {
  try {
    const { cropType, grade, offeredPricePerKg, requiredQuantityKg, mandiName, expiresInDays } = req.body;

    if (!cropType || !grade || !offeredPricePerKg || !requiredQuantityKg || !mandiName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cropType, grade, offeredPricePerKg, requiredQuantityKg, mandiName'
      });
    }

    // Calculate expiry date (default 7 days from now)
    const daysToExpire = expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToExpire);

    const posting = new BuyerPosting({
      buyer: req.user._id,
      cropType,
      grade,
      offeredPricePerKg: Number(offeredPricePerKg),
      requiredQuantityKg: Number(requiredQuantityKg),
      mandiName,
      buyerLocation: {
        address: req.user.buyerAddress || req.body.buyerAddress || '',
        coordinates: req.user.buyerCoordinates || req.body.buyerCoordinates || undefined,
      },
      expiresAt,
      status: 'Active Procurement'
    });

    await posting.save();
    
    // Populate buyer details for response
    await posting.populate('buyer', 'name phone company');

    logger.info(`Buyer posting created: ${posting._id} by user ${req.user._id}`);

    return res.status(201).json({
      success: true,
      message: 'Buyer posting created successfully',
      posting: {
        id: posting._id,
        cropType: posting.cropType,
        grade: posting.grade,
        offeredPricePerKg: posting.offeredPricePerKg,
        requiredQuantityKg: posting.requiredQuantityKg,
        receivedQuantityKg: posting.receivedQuantityKg,
        mandiName: posting.mandiName,
        traderName: `${posting.buyer.name}${posting.buyer.company ? ` (${posting.buyer.company})` : ''}`,
        traderPhone: posting.buyer.phone,
        buyerLocation: posting.buyerLocation,
        status: posting.status,
        expiresAt: posting.expiresAt,
        createdAt: posting.createdAt
      }
    });
  } catch (error) {
    logger.error(`Create buyer posting error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to create buyer posting',
      error: error.message
    });
  }
};

/**
 * Get all active buyer postings (visible to farmers)
 * GET /api/buyer/postings
 * @query cropType - Optional filter by crop
 * @query mandiName - Optional filter by mandi
 */
const getPostings = async (req, res) => {
  try {
    const { cropType, mandiName } = req.query;

    // Build query for active, non-expired postings
    const query = {
      status: { $in: ['Active Procurement', 'Partial'] },
      expiresAt: { $gt: new Date() }
    };

    if (cropType) {
      query.cropType = cropType;
    }

    if (mandiName) {
      query.mandiName = new RegExp(mandiName, 'i');
    }

    const postings = await BuyerPosting.find(query)
      .populate('buyer', 'name phone company')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formatted = postings.map((posting) => ({
      id: posting._id,
      cropType: posting.cropType,
      grade: posting.grade,
      offeredPricePerKg: posting.offeredPricePerKg,
      requiredQuantityKg: posting.requiredQuantityKg,
      receivedQuantityKg: posting.receivedQuantityKg,
      mandiName: posting.mandiName,
      traderName: `${posting.buyer.name}${posting.buyer.company ? ` (${posting.buyer.company})` : ''}`,
      traderPhone: posting.buyer.phone,
      buyerLocation: posting.buyerLocation,
      status: posting.status,
      expiresAt: posting.expiresAt,
      createdAt: posting.createdAt
    }));

    return res.json({
      success: true,
      count: formatted.length,
      postings: formatted
    });
  } catch (error) {
    logger.error(`Get buyer postings error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch buyer postings',
      error: error.message
    });
  }
};

/**
 * Get buyer's own postings
 * GET /api/buyer/postings/mine
 * @protected - Requires Buyer authentication
 */
const getMyPostings = async (req, res) => {
  try {
    const postings = await BuyerPosting.find({ buyer: req.user._id })
      .populate('buyer', 'name phone company')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = postings.map((posting) => ({
      id: posting._id,
      cropType: posting.cropType,
      grade: posting.grade,
      offeredPricePerKg: posting.offeredPricePerKg,
      requiredQuantityKg: posting.requiredQuantityKg,
      receivedQuantityKg: posting.receivedQuantityKg,
      mandiName: posting.mandiName,
      traderName: `${posting.buyer.name}${posting.buyer.company ? ` (${posting.buyer.company})` : ''}`,
      traderPhone: posting.buyer.phone,
      buyerLocation: posting.buyerLocation,
      status: posting.status,
      expiresAt: posting.expiresAt,
      createdAt: posting.createdAt
    }));

    return res.json({
      success: true,
      count: formatted.length,
      postings: formatted
    });
  } catch (error) {
    logger.error(`Get my buyer postings error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your postings',
      error: error.message
    });
  }
};

/**
 * Delete a buyer posting
 * DELETE /api/buyer/postings/:id
 * @protected - Requires Buyer authentication, can only delete own postings
 */
const deletePosting = async (req, res) => {
  try {
    const { id } = req.params;

    const posting = await BuyerPosting.findOne({ _id: id, buyer: req.user._id });

    if (!posting) {
      return res.status(404).json({
        success: false,
        message: 'Posting not found or you do not have permission to delete it'
      });
    }

    await posting.deleteOne();

    logger.info(`Buyer posting deleted: ${id} by user ${req.user._id}`);

    return res.json({
      success: true,
      message: 'Posting deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete buyer posting error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete posting',
      error: error.message
    });
  }
};

/**
 * Update received quantity for a posting
 * PATCH /api/buyer/postings/:id/received
 * @protected - Requires Buyer authentication
 */
const updateReceivedQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedQuantityKg } = req.body;

    const posting = await BuyerPosting.findOne({ _id: id, buyer: req.user._id });

    if (!posting) {
      return res.status(404).json({
        success: false,
        message: 'Posting not found or you do not have permission to update it'
      });
    }

    posting.receivedQuantityKg = Number(receivedQuantityKg) || 0;

    // Auto-update status based on quantities
    if (posting.receivedQuantityKg >= posting.requiredQuantityKg) {
      posting.status = 'Fulfilled';
    } else if (posting.receivedQuantityKg > 0) {
      posting.status = 'Partial';
    }

    await posting.save();

    return res.json({
      success: true,
      message: 'Posting updated successfully',
      posting: {
        id: posting._id,
        receivedQuantityKg: posting.receivedQuantityKg,
        status: posting.status
      }
    });
  } catch (error) {
    logger.error(`Update buyer posting error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update posting',
      error: error.message
    });
  }
};

module.exports = {
  createPosting,
  getPostings,
  getMyPostings,
  deletePosting,
  updateReceivedQuantity
};
