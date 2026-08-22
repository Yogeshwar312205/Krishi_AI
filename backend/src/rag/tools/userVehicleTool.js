const mongoose = require('mongoose');
const Vehicle = require('../../models/Vehicle');
const logger = require('../../utils/logger');

class UserVehicleTool {
  constructor() {
    this.name = 'getUserVehicles';
    this.description = 'Fetches personal registered vehicles owned by the authenticated user from MongoDB database.';
  }

  /**
   * Executes database query to get user's registered vehicles.
   * @param {object} params - { user }
   */
  async execute({ user }) {
    if (!user || (!user._id && !user.id)) {
      return {
        success: false,
        message: 'User authentication is required to access personal registered vehicles. Please log in to view your registered fleet.',
        count: 0,
        vehicles: []
      };
    }

    try {
      const userId = user._id || user.id;
      const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
      const vehicles = isValidObjectId
        ? await Vehicle.find({ owner: userId }).sort({ createdAt: -1 }).lean()
        : [];

      return {
        success: true,
        count: vehicles.length,
        vehicles: vehicles.map(v => ({
          vehicleNo: v.vehicleNo,
          vehicleType: v.vehicleType,
          capacityKg: v.capacityKg,
          status: v.status || 'Idle',
          driverName: v.driverName,
          driverPhone: v.driverPhone,
          ratePerKm: v.ratePerKm,
          isRefrigerated: !!v.isRefrigerated,
          currentLoadKg: v.currentLoadKg || 0,
          baseLocation: v.baseLocation || ''
        }))
      };
    } catch (err) {
      logger.error(`[UserVehicleTool] Database query error: ${err.message}`);
      return {
        success: false,
        message: `Failed to fetch registered vehicles from database: ${err.message}`,
        count: 0,
        vehicles: []
      };
    }
  }
}

module.exports = new UserVehicleTool();
