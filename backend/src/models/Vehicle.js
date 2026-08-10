const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  driverName: {
    type: String,
    required: true,
  },
  driverPhone: {
    type: String,
    required: true,
  },
  vehicleType: {
    type: String,
    enum: ['Mini Truck', 'Refrigerated Van', 'Heavy Freighter', 'E-Pickup'],
    default: 'Refrigerated Van',
  },
  capacityKg: {
    type: Number,
    required: true,
  },
  ratePerKm: {
    type: Number,
    required: true,
  },
  isRefrigerated: {
    type: Boolean,
    default: false,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
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
}, { timestamps: true });

// Optimize 2dsphere index for real-time driver matching
VehicleSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Vehicle', VehicleSchema);
