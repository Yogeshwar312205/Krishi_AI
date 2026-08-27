const Vehicle = require('../../models/Vehicle');
const logger = require('../../utils/logger');

class AvailableVehiclesTool {
  constructor() {
    this.name = 'getAvailableVehicles';
    this.description = 'Fetches all available logistics vehicles, transport freight rates, and vehicle specifications from the platform fleet database.';
  }

  /**
   * Executes database query to fetch available platform vehicles and freight rates.
   * @param {object} params 
   */
  async execute(params = {}) {
    try {
      const vehicles = await Vehicle.find({}).sort({ ratePerKm: 1 }).lean();

      return {
        success: true,
        count: vehicles.length,
        availableVehicles: vehicles.map(v => ({
          vehicleNo: v.vehicleNo,
          vehicleType: v.vehicleType,
          capacityKg: v.capacityKg,
          status: v.status || 'Idle',
          ratePerKm: v.ratePerKm || 40,
          driverName: v.driverName || 'Operator',
          driverPhone: v.driverPhone || 'N/A',
          isRefrigerated: !!v.isRefrigerated,
          baseLocation: v.baseLocation || 'Nashik APMC Hub'
        }))
      };
    } catch (err) {
      logger.error(`[AvailableVehiclesTool] Error querying vehicles: ${err.message}`);
      return {
        success: false,
        message: `Failed to query vehicle fleet: ${err.message}`,
        count: 0,
        availableVehicles: []
      };
    }
  }
}

module.exports = new AvailableVehiclesTool();
