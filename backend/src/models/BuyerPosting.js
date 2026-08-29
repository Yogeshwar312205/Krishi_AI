const mongoose = require('mongoose');

/**
 * APMC Buyer Rate Posting - Procurement bids posted by buyers/commission agents
 * 
 * Represents rates that buyers are offering to purchase crops at specific mandis.
 * Farmers can see these postings and initiate deals based on attractive offers.
 */
const BuyerPostingSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  cropType: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  grade: {
    type: String,
    required: true,
    trim: true,
  },
  offeredPricePerKg: {
    type: Number,
    required: true,
    min: 0,
  },
  requiredQuantityKg: {
    type: Number,
    required: true,
    min: 0,
  },
  receivedQuantityKg: {
    type: Number,
    default: 0,
    min: 0,
  },
  mandiName: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  /**
   * Buyer's actual location/address for pickup.
   * 
   * Optional - if provided, farmers can select this as delivery destination
   * instead of the mandi center point. Useful for buyers who have warehouses,
   * procurement centers, or APMC yard offices at specific locations.
   */
  buyerLocation: {
    address: { type: String, trim: true, default: '' },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  status: {
    type: String,
    enum: ['Active Procurement', 'Partial', 'Fulfilled', 'Expired', 'Cancelled'],
    default: 'Active Procurement',
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
}, { timestamps: true });

// Compound index for efficient queries by crop and mandi
BuyerPostingSchema.index({ cropType: 1, mandiName: 1, status: 1 });

// Index for expiry-based queries
BuyerPostingSchema.index({ expiresAt: 1, status: 1 });

// Virtual field for trader info (populated from buyer reference)
BuyerPostingSchema.virtual('traderName').get(function() {
  return this.buyer?.name || 'APMC Buyer';
});

BuyerPostingSchema.virtual('traderPhone').get(function() {
  return this.buyer?.phone || '';
});

// Ensure virtuals are included in JSON output
BuyerPostingSchema.set('toJSON', { virtuals: true });
BuyerPostingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BuyerPosting', BuyerPostingSchema);
