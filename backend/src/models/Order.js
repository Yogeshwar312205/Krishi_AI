const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  farmerName: {
    type: String,
    required: true,
  },
  farmerPhone: {
    type: String,
    default: '+91 98765 43210',
  },
  cropDetails: {
    cropType: {
      type: String,
      required: true,
      enum: ['Tomato', 'Potato', 'Onion', 'Rice', 'Wheat', 'Mango', 'Banana'],
    },
    quantityKg: {
      type: Number,
      required: true,
    },
    harvestTime: {
      type: Date,
      required: true,
    },
    temperatureSensitivity: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'High',
    },
  },
  farmLocation: {
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  selectedMarket: {
    name: String,
    coordinates: [Number],
    expectedPricePerKg: Number,
  },
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  status: {
    type: String,
    enum: ['Pending', 'Recommended', 'Booked', 'In-Transit', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  optimizationResult: {
    netProfit: Number,
    transportCost: Number,
    spoilageRiskPercent: Number,
    routeDistanceKm: Number,
    travelTimeHours: Number,
  },
}, { timestamps: true });

// Compound index for efficient filtering by status and recency
OrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
