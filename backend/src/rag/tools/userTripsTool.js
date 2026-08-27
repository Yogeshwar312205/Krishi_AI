const mongoose = require('mongoose');
const PickupRequest = require('../../models/PickupRequest');
const Order = require('../../models/Order');
const Vehicle = require('../../models/Vehicle');
const logger = require('../../utils/logger');

class UserTripsTool {
  constructor() {
    this.name = 'getUserTrips';
    this.description = 'Fetches past and active trip history, driver assignments, and trip earnings from MongoDB.';
  }

  /**
   * Executes database query to get user's trips (as fleet owner or farmer).
   * @param {object} params - { user }
   */
  async execute({ user }) {
    if (!user || (!user._id && !user.id)) {
      return {
        success: false,
        message: 'User authentication is required to access personal trip history. Please log in.',
        totalTrips: 0,
        totalEarnings: 0,
        trips: []
      };
    }

    try {
      const userId = user._id || user.id;
      const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
      const userObjectId = isValidObjectId ? new mongoose.Types.ObjectId(userId) : null;

      // Query PickupRequest records for this user (either as assigned fleet owner or farmer)
      const queryFilter = userObjectId ? {
        $or: [
          { assignedOwner: userObjectId },
          { farmer: userObjectId }
        ]
      } : {};

      let pickupRequests = await PickupRequest.find(queryFilter)
        .populate('assignedVehicle')
        .sort({ createdAt: -1 })
        .lean();

      // If user has vehicles, find all requests linked to user's vehicles as well
      if (userObjectId) {
        const userVehicles = await Vehicle.find({ owner: userObjectId }).select('_id').lean();
        const vehicleIds = userVehicles.map(v => v._id);
        if (vehicleIds.length > 0) {
          const vehicleRequests = await PickupRequest.find({
            assignedVehicle: { $in: vehicleIds }
          }).populate('assignedVehicle').sort({ createdAt: -1 }).lean();

          // Merge without duplicates
          const existingIds = new Set(pickupRequests.map(r => r._id.toString()));
          for (const req of vehicleRequests) {
            if (!existingIds.has(req._id.toString())) {
              pickupRequests.push(req);
            }
          }
        }
      }

      // Also query Orders table as secondary source
      let orders = [];
      if (user.name) {
        orders = await Order.find({ farmerName: new RegExp(user.name, 'i') })
          .populate('assignedVehicle')
          .sort({ createdAt: -1 })
          .lean();
      }

      // Map trips
      const mappedTrips = [];
      let totalEarnings = 0;

      for (const req of pickupRequests) {
        const agreedRate = req.agreedRatePerKg || 0;
        const qty = req.quantityKg || 0;
        const freight = req.dispatch?.addedFreightCost || (agreedRate * qty);
        const tripEarnings = freight || (agreedRate * qty);
        
        if (req.status === 'delivered' || req.status === 'completed' || req.status === 'in_transit') {
          totalEarnings += tripEarnings;
        }

        mappedTrips.push({
          id: req._id.toString(),
          cropType: req.cropType,
          quantityKg: req.quantityKg,
          agreedRatePerKg: req.agreedRatePerKg,
          tripEarnings: tripEarnings,
          origin: req.origin?.label || 'Farm Location',
          destination: req.destination?.label || 'Mandi APMC',
          pickupDate: req.pickupDate || req.createdAt?.toISOString().split('T')[0],
          status: req.status || 'completed',
          farmerName: req.farmerName,
          vehicleNo: req.assignedVehicle?.vehicleNo || 'MH 15 BB 1111',
          driverName: req.assignedVehicle?.driverName || 'King',
          driverPhone: req.assignedVehicle?.driverPhone || '9087654321'
        });
      }

      // Map Orders if no pickup requests found
      if (mappedTrips.length === 0 && orders.length > 0) {
        for (const ord of orders) {
          const earnings = ord.optimizationResult?.netProfit || (ord.cropDetails?.quantityKg * (ord.selectedMarket?.expectedPricePerKg || 30));
          totalEarnings += earnings;
          mappedTrips.push({
            id: ord._id.toString(),
            cropType: ord.cropDetails?.cropType || 'Produce',
            quantityKg: ord.cropDetails?.quantityKg || 0,
            agreedRatePerKg: ord.selectedMarket?.expectedPricePerKg || 0,
            tripEarnings: earnings,
            origin: ord.farmLocation?.address || 'Farm Location',
            destination: ord.selectedMarket?.name || 'Mandi APMC',
            pickupDate: ord.createdAt?.toISOString().split('T')[0],
            status: ord.status || 'Completed',
            farmerName: ord.farmerName,
            vehicleNo: ord.assignedVehicle?.vehicleNo || 'MH 15 BB 1111',
            driverName: ord.assignedVehicle?.driverName || 'King',
            driverPhone: ord.assignedVehicle?.driverPhone || '9087654321'
          });
        }
      }

      const completedCount = mappedTrips.filter(t => ['delivered', 'completed', 'Completed', 'In-Transit', 'in_transit'].includes(t.status)).length;

      return {
        success: true,
        totalTrips: mappedTrips.length,
        completedTripsCount: completedCount,
        totalEarnings: Math.round(totalEarnings),
        trips: mappedTrips
      };
    } catch (err) {
      logger.error(`[UserTripsTool] Error fetching trip history: ${err.message}`);
      return {
        success: false,
        message: `Failed to fetch trip history: ${err.message}`,
        totalTrips: 0,
        totalEarnings: 0,
        trips: []
      };
    }
  }
}

module.exports = new UserTripsTool();
