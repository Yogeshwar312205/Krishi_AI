const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

/**
 * A fleet owner's own vehicles. Every query is scoped to `req.user._id`, so one
 * owner can never read or move another owner's trucks.
 */

const publicVehicle = (v) => ({
  id: String(v._id),
  vehicleNo: v.vehicleNo,
  driverName: v.driverName,
  driverPhone: v.driverPhone,
  vehicleType: v.vehicleType,
  capacityKg: v.capacityKg,
  currentLoadKg: v.currentLoadKg,
  ratePerKm: v.ratePerKm,
  isRefrigerated: v.isRefrigerated,
  baseLocation: v.baseLocation,
  status: v.status,
  routeStartAt: v.routeStartAt,
  currentRoute: (v.currentRoute || []).map((s) => ({
    id: String(s._id),
    kind: s.kind,
    label: s.label,
    coordinates: s.coordinates,
    loadDeltaKg: s.loadDeltaKg,
    requestId: s.requestId ? String(s.requestId) : null,
  })),
  coordinates: v.location?.coordinates || null,
  locationUpdatedAt: v.locationUpdatedAt,
});

// GET /api/fleet
const listFleet = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: 1 });
    return res.json({ success: true, count: vehicles.length, vehicles: vehicles.map(publicVehicle) });
  } catch (error) {
    logger.error(`List fleet failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load your fleet.' });
  }
};

// POST /api/fleet
const addVehicle = async (req, res) => {
  try {
    const {
      vehicleNo, driverName, driverPhone, vehicleType,
      capacityKg, ratePerKm, isRefrigerated, baseLocation, baseCoords,
    } = req.body || {};

    const coords = Array.isArray(baseCoords) && baseCoords.length === 2
      && baseCoords.every(Number.isFinite) ? baseCoords : null;

    // A truck with no base has no position, and a vehicle with no position
    // cannot be ranked at all. Refuse rather than store one that will silently
    // sit out every dispatch.
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Pick the vehicle base on the map.' });
    }
    if (!vehicleNo || !driverName || !Number(capacityKg) || !Number(ratePerKm)) {
      return res.status(400).json({ success: false, message: 'Vehicle number, driver, capacity and rate are required.' });
    }

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      vehicleNo: String(vehicleNo).trim(),
      driverName, driverPhone: driverPhone || '',
      vehicleType, capacityKg: Number(capacityKg), ratePerKm: Number(ratePerKm),
      isRefrigerated: Boolean(isRefrigerated),
      currentLoadKg: 0,
      baseLocation: baseLocation || '',
      status: 'Idle',
      routeStartAt: new Date(new Date().setHours(6, 0, 0, 0)),
      currentRoute: [{
        kind: 'depot',
        label: baseLocation || 'Base',
        coordinates: coords,
        loadDeltaKg: 0,
      }],
      location: { type: 'Point', coordinates: coords },
      locationUpdatedAt: new Date(),
    });

    return res.status(201).json({ success: true, vehicle: publicVehicle(vehicle) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'That vehicle number is already in your fleet.' });
    }
    logger.error(`Add vehicle failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not add the vehicle.' });
  }
};

// POST /api/fleet/:id/location — a position report from the cab
const reportLocation = async (req, res) => {
  try {
    const { coordinates } = req.body || {};
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'coordinates must be [lng, lat].' });
    }
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { location: { type: 'Point', coordinates }, locationUpdatedAt: new Date() },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: 'Not one of your vehicles.' });
    return res.json({ success: true, vehicle: publicVehicle(vehicle) });
  } catch (error) {
    logger.error(`Report location failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not update the position.' });
  }
};

module.exports = { listFleet, addVehicle, reportLocation, publicVehicle };
