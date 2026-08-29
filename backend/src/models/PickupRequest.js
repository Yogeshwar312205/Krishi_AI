const mongoose = require('mongoose');

/**
 * A farmer asking for their lot to be collected.
 *
 * This is the demand side of the capacitated VRP and it is the reason the
 * request carries coordinates rather than place names: distance drives
 * insertion cost, insertion cost is what the fleet owner ranks on, and a
 * request we cannot locate must be reported as unrankable rather than given a
 * plausible-looking position. Same rule as backend/src/data/mandiGeo.js.
 *
 * The farmer does not choose a truck. They state what they have, where it is,
 * where it is sold and when it can be collected; the fleet owner's dispatch
 * screen decides which of their own vehicles it costs least to send.
 */
const PickupRequestSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, default: '' },

  cropType: { type: String, required: true },
  quantityKg: { type: Number, required: true, min: 1 },

  origin: {
    label: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  destination: {
    label: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // the agreed mandi
  },

  /**
   * The rate the farmer settled with a trader, not the Agmarknet board rate.
   * Carried so the waybill and the buyer's inbound list read the same number.
   */
  agreedRatePerKg: { type: Number, default: null },

  /**
   * Link to buyer posting if this request originated from a buyer deal.
   * This allows buyers to see shipments related to their postings.
   */
  buyerPosting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuyerPosting',
    default: null,
    index: true,
  },
  
  /**
   * Buyer who will receive this shipment (for direct buyer deals).
   * Used to show arrivals in buyer's dashboard.
   */
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },

  pickupDate: { type: String, required: true }, // ISO yyyy-mm-dd, as the farmer picked it
  /**
   * Hours, not a label. The slot label is translated into three languages, so
   * anything needing the actual hours must not parse it back out.
   */
  window: {
    startHour: { type: Number, default: null },
    endHour: { type: Number, default: null },
    label: { type: String, default: '' },
  },

  status: {
    type: String,
    enum: ['pending', 'assigned', 'collected', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  },

  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  assignedOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: null },

  /** What the assignment cost, kept so the decision can be reviewed after. */
  dispatch: {
    insertionCostKm: Number,
    addedFreightCost: Number,
    estimatedAddedMinutes: Number,
    pickupPosition: Number,
    dropPosition: Number,
  },

  /** Status changes, so both sides see the same history on the tracking screen. */
  timeline: [{
    status: String,
    at: { type: Date, default: Date.now },
    note: String,
  }],

  /* Marks a record created by the Blackout resilience drill — the drill only
   * deletes or corrupts { drill: true } docs, never a real farmer's request. */
  drill: { type: Boolean, default: false, index: true },
}, { timestamps: true });

PickupRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PickupRequest', PickupRequestSchema);
