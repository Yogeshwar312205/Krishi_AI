/**
 * Empties the pickup-request queue and puts every vehicle back at its base.
 *
 * For clearing out test runs before a demo. It touches nothing else — accounts,
 * fleets and their details are left exactly as they are.
 *
 *   node backend/scripts/clearRequests.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const PickupRequest = require('../src/models/PickupRequest');
const Vehicle = require('../src/models/Vehicle');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const { deletedCount } = await PickupRequest.deleteMany({});
  console.log(`removed ${deletedCount} pickup requests`);

  // Every route back to its first stop — the depot the vehicle is based at.
  const vehicles = await Vehicle.find({});
  for (const v of vehicles) {
    v.currentRoute = v.currentRoute.slice(0, 1);
    v.currentLoadKg = 0;
    v.status = 'Idle';
    await v.save();
  }
  console.log(`reset ${vehicles.length} vehicles to their base`);

  await mongoose.disconnect();
};

run().catch((e) => { console.error(e.message); process.exit(1); });
