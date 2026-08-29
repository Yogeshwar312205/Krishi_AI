const mongoose = require('mongoose');

/**
 * A truck, owned by a fleet owner.
 *
 * There is no "driver" login in this system. A driver is a name and a phone
 * number attached to a vehicle, because the person who decides where a truck
 * goes is the fleet owner, not the person holding the wheel. Modelling drivers
 * as accounts turned this into a ride-hailing app and made the capacitated VRP
 * meaningless — you cannot optimise a fleet you do not control.
 */

/**
 * One stop on a route. `loadDeltaKg` is +qty at a pickup and -qty at a drop, so
 * capacity can be checked as a peak across the whole sequence rather than as a
 * single subtraction. See VRP.md.
 */
const StopSchema = new mongoose.Schema({
  kind: { type: String, enum: ['depot', 'pickup', 'drop'], default: 'depot' },
  label: { type: String, required: true },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
  loadDeltaKg: { type: Number, default: 0 },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupRequest', default: null },
}, { _id: true });

const VehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  vehicleNo: {
    type: String,
    required: true,
    trim: true,
  },
  driverName: { type: String, required: true },
  driverPhone: { type: String, required: true },
  vehicleType: {
    type: String,
    enum: ['Mini Truck', 'Refrigerated Van', 'Heavy Freighter', 'E-Pickup'],
    default: 'Refrigerated Van',
  },
  capacityKg: { type: Number, required: true },
  /** What is on the deck right now, BEFORE the route below is driven. */
  currentLoadKg: { type: Number, default: 0 },
  ratePerKm: { type: Number, required: true },
  isRefrigerated: { type: Boolean, default: false },

  baseLocation: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Idle', 'Loading', 'En route', 'Unavailable'],
    default: 'Idle',
  },
  /** Anchors every ETA. Absent means the window verdict is reported unknown. */
  routeStartAt: { type: Date, default: null },
  /**
   * Ordered stops. Index 0 is where the vehicle is now and is never displaced
   * by an insertion. The route is OPEN — no return-to-depot leg.
   */
  currentRoute: { type: [StopSchema], default: [] },

  /** Last reported position, for the tracking view both sides can watch. */
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  locationUpdatedAt: { type: Date, default: null },

  /* Marks a record created by the Blackout resilience drill — the drill only
   * touches { drill: true } docs, never a real fleet. */
  drill: { type: Boolean, default: false, index: true },
}, { timestamps: true });

VehicleSchema.index({ location: '2dsphere' });
VehicleSchema.index({ owner: 1, vehicleNo: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
