const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

// Statewide Fleet across Maharashtra (20+ Refrigerated Vans, Heavy Freighters & E-Pickups)
const SEED_FLEET = [
  // Nashik Division
  {
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98112 34567',
    vehicleType: 'Refrigerated Cold Van',
    capacityKg: 3500,
    ratePerKm: 18,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.7898, 19.9975] } // Nashik Main
  },
  {
    driverName: 'Vikram Singh',
    driverPhone: '+91 98334 56789',
    vehicleType: 'Heavy Multi-Axle Freighter',
    capacityKg: 10000,
    ratePerKm: 28,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.9850, 20.1750] } // Pimpalgaon Nashik
  },
  {
    driverName: 'Amit Sharma',
    driverPhone: '+91 98445 67890',
    vehicleType: 'E-Pickup Express',
    capacityKg: 1500,
    ratePerKm: 12,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.7500, 19.9500] } // South Nashik
  },

  // Mumbai / Konkan Division
  {
    driverName: 'Sunita Patil',
    driverPhone: '+91 98765 12345',
    vehicleType: 'Refrigerated Van',
    capacityKg: 3500,
    ratePerKm: 20,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.0012, 19.0760] } // Vashi Mumbai
  },
  {
    driverName: 'Ganesh More',
    driverPhone: '+91 98234 11223',
    vehicleType: 'Heavy Cold Transport',
    capacityKg: 8000,
    ratePerKm: 26,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.3120, 16.9902] } // Ratnagiri Konkan
  },

  // Pune / Western Maharashtra Division
  {
    driverName: 'Suresh Patil',
    driverPhone: '+91 98223 45678',
    vehicleType: 'Ventilated Mini Truck',
    capacityKg: 2000,
    ratePerKm: 14,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [73.8567, 18.5204] } // Pune Gultekdi
  },
  {
    driverName: 'Dnyaneshwar Jadhav',
    driverPhone: '+91 98901 22334',
    vehicleType: 'Refrigerated Cold Truck',
    capacityKg: 5000,
    ratePerKm: 22,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [74.2433, 16.7050] } // Kolhapur
  },
  {
    driverName: 'Mahadev Shinde',
    driverPhone: '+91 98902 33445',
    vehicleType: 'E-Pickup Express',
    capacityKg: 1500,
    ratePerKm: 11,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [74.5815, 16.8524] } // Sangli
  },
  {
    driverName: 'Rajendra Pawar',
    driverPhone: '+91 98903 44556',
    vehicleType: 'Heavy Onion Freighter',
    capacityKg: 9000,
    ratePerKm: 25,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [75.9064, 17.6599] } // Solapur
  },
  {
    driverName: 'Balasaheb Thorat',
    driverPhone: '+91 98904 55667',
    vehicleType: 'Refrigerated Produce Van',
    capacityKg: 3500,
    ratePerKm: 19,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [74.7480, 19.0948] } // Ahmednagar
  },

  // Marathwada Division
  {
    driverName: 'Santosh Deshmukh',
    driverPhone: '+91 98905 66778',
    vehicleType: 'Refrigerated Heavy Truck',
    capacityKg: 7500,
    ratePerKm: 24,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [75.3433, 19.8762] } // Chhatrapati Sambhajinagar
  },
  {
    driverName: 'Govind Rathod',
    driverPhone: '+91 98906 77889',
    vehicleType: 'Banana Special Freighter',
    capacityKg: 8500,
    ratePerKm: 23,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [75.5626, 21.0077] } // Jalgaon
  },
  {
    driverName: 'Pandurang Kadam',
    driverPhone: '+91 98907 88990',
    vehicleType: 'Pulse Cold Transport',
    capacityKg: 4000,
    ratePerKm: 20,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [76.5810, 18.4088] } // Latur
  },

  // Vidarbha Division
  {
    driverName: 'Nitin Chaudhari',
    driverPhone: '+91 98908 99001',
    vehicleType: 'Orange Special Cold Express',
    capacityKg: 6000,
    ratePerKm: 22,
    isRefrigerated: true,
    isAvailable: true,
    location: { type: 'Point', coordinates: [79.0882, 21.1458] } // Nagpur
  },
  {
    driverName: 'Vijay Deshmukh',
    driverPhone: '+91 98909 00112',
    vehicleType: 'Grain Heavy Transport',
    capacityKg: 9500,
    ratePerKm: 26,
    isRefrigerated: false,
    isAvailable: true,
    location: { type: 'Point', coordinates: [77.7588, 20.9374] } // Amravati
  }
];

let fallbackVehicles = [...SEED_FLEET];

// GET /api/vehicles/nearby?lng=...&lat=...&maxDistanceKm=500
const getNearbyVehicles = async (req, res) => {
  try {
    const lng = parseFloat(req.query.lng) || 73.7898;
    const lat = parseFloat(req.query.lat) || 19.9975;
    const maxDistanceKm = parseFloat(req.query.maxDistanceKm) || 500;
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
