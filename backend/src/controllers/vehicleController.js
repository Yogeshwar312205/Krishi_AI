const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

const SEED_FLEET = [
  {
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98112 34567',
    vehicleType: 'Refrigerated Van',
    capacityKg: 3000,
    ratePerKm: 18,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.7898, 19.9975] } // Nashik
  },
  {
    driverName: 'Suresh Patil',
    driverPhone: '+91 98223 45678',
    vehicleType: 'Mini Truck',
    capacityKg: 1500,
    ratePerKm: 12,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.8567, 18.5204] } // Pune
  },
  {
    driverName: 'Vikram Singh',
    driverPhone: '+91 98334 56789',
    vehicleType: 'Heavy Freighter',
    capacityKg: 8000,
    ratePerKm: 25,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.8000, 20.0100] } // North Nashik
  },
  {
    driverName: 'Amit Sharma',
    driverPhone: '+91 98445 67890',
    vehicleType: 'E-Pickup',
    capacityKg: 1000,
    ratePerKm: 9,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.7500, 19.9500] } // South Nashik
  }
];

let fallbackVehicles = [...SEED_FLEET];

// GET /api/vehicles/nearby?lng=...&lat=...&maxDistanceKm=100
const getNearbyVehicles = async (req, res) => {
  try {
    const lng = parseFloat(req.query.lng) || 73.7898;
    const lat = parseFloat(req.query.lat) || 19.9975;
    const maxDistanceKm = parseFloat(req.query.maxDistanceKm) || 100;
    const maxDistanceMeters = maxDistanceKm * 1000;

    let vehicles = [];

    try {
      vehicles = await Vehicle.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: maxDistanceMeters
          }
        },
        isAvailable: true
      }).exec();
    } catch (err) {
      logger.warn(`MongoDB $near spatial query notice: ${err.message}`);
    }

    if (!vehicles || vehicles.length === 0) {
      vehicles = fallbackVehicles.filter(v => v.isAvailable).map(v => {
        const [vLng, vLat] = v.location.coordinates;
        const dLat = (lat - vLat) * Math.PI / 180;
        const dLng = (lng - vLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(vLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...v, distanceKm: Math.round(distKm * 10) / 10 };
      }).sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      searchCenter: { lng, lat },
      vehicles
    });
  } catch (error) {
    logger.error(`Error fetching nearby vehicles: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/vehicles/seed
const seedVehicles = async (req, res) => {
  try {
    await Vehicle.deleteMany({});
    const inserted = await Vehicle.insertMany(SEED_FLEET);
    logger.info(`Seeded ${inserted.length} vehicles into MongoDB`);
    return res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    fallbackVehicles = [...SEED_FLEET];
    return res.status(200).json({ success: true, count: SEED_FLEET.length, data: SEED_FLEET });
  }
};

module.exports = { getNearbyVehicles, seedVehicles, fallbackVehicles };
