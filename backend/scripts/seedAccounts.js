/**
 * Seeds the demo accounts listed in SAMPLE_USERS.md, and the fleet owners'
 * vehicles.
 *
 * Idempotent: an account or vehicle that already exists is left exactly as it
 * is, so running this twice never duplicates a fleet or resets a password
 * somebody changed. Nothing else in the database is touched.
 *
 * These are LOGINS, not demo content. The app itself seeds nothing any more —
 * an empty dispatch queue means an empty dispatch queue. Every pickup request
 * in the system was raised by a real farmer account against a real mandi deal.
 *
 *   node backend/scripts/seedAccounts.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');

const PASSWORD = 'krishi@2026';

const FARMERS = [
  { name: 'Ramesh Singh',    email: 'ramesh.farmer@krishiflow.ai',  phone: '+91 98765 43210',
    address: 'Nashik Central Farm HQ, Maharashtra', coordinates: [73.7898, 19.9975] },
  { name: 'Kiran Thorat',    email: 'kiran.farmer@krishiflow.ai',   phone: '+91 94211 77665',
    address: 'Lasalgaon farm, Niphad, Nashik',      coordinates: [74.2400, 20.1400] },
  { name: 'Anand Kulkarni',  email: 'anand.farmer@krishiflow.ai',   phone: '+91 94220 99881',
    address: 'Pimpalgaon Baswant orchard, Nashik',  coordinates: [73.9850, 20.1750] },
  { name: 'Savita Pawar',    email: 'savita.farmer@krishiflow.ai',  phone: '+91 99204 31188',
    address: 'Junnar block farm, Pune',             coordinates: [73.8750, 19.2090] },
];

const BUYERS = [
  { name: 'Rajesh Mehta', email: 'rajesh.buyer@krishiflow.ai', phone: '+91 98200 55443',
    role: 'APMC Buyer', address: 'Mumbai APMC, Vashi', coordinates: [73.0044, 19.0760] },
];

/*
 * Two fleets, deliberately different in shape, so the ranking has something
 * real to say. Sahyadri runs out of Nashik with a big freighter that is already
 * committed to a Mumbai run; Deccan runs out of Pune with smaller trucks. A lot
 * bound for Mumbai should cost Sahyadri far less than Deccan, and the dispatch
 * screen should be able to show exactly why.
 */
const FLEETS = [
  {
    owner: { name: 'Vikram Jadhav', email: 'vikram.fleet@krishiflow.ai', phone: '+91 98600 12345',
             address: 'Sahyadri Transport, Nashik', coordinates: [73.7898, 19.9975] },
    vehicles: [
      { vehicleNo: 'MH 15 GH 4921', driverName: 'Suresh Shinde',  driverPhone: '+91 98230 11223',
        vehicleType: 'Refrigerated Van', capacityKg: 3500, ratePerKm: 52, isRefrigerated: true,
        baseLocation: 'Nashik APMC Hub', baseCoords: [73.7898, 19.9975] },
      { vehicleNo: 'MH 31 CB 7810', driverName: 'Sunita Patil',   driverPhone: '+91 94221 88990',
        vehicleType: 'Heavy Freighter', capacityKg: 10000, ratePerKm: 78, isRefrigerated: true,
        baseLocation: 'Nashik depot', baseCoords: [73.7898, 19.9975] },
      { vehicleNo: 'MH 15 DK 2204', driverName: 'Balu Wagh',      driverPhone: '+91 90280 44557',
        vehicleType: 'Mini Truck', capacityKg: 2000, ratePerKm: 38, isRefrigerated: false,
        baseLocation: 'Pimpalgaon Baswant', baseCoords: [73.9850, 20.1750] },
    ],
  },
  {
    owner: { name: 'Farida Shaikh', email: 'farida.fleet@krishiflow.ai', phone: '+91 97300 88221',
             address: 'Deccan Carriers, Pune', coordinates: [73.8567, 18.5204] },
    vehicles: [
      { vehicleNo: 'MH 12 AB 9910', driverName: 'Aniket Deshmukh', driverPhone: '+91 98901 44556',
        vehicleType: 'E-Pickup', capacityKg: 1500, ratePerKm: 34, isRefrigerated: false,
        baseLocation: 'Pune depot', baseCoords: [73.8567, 18.5204] },
      { vehicleNo: 'MH 12 QR 6633', driverName: 'Imran Sayyad',    driverPhone: '+91 90110 22447',
        vehicleType: 'Refrigerated Van', capacityKg: 4000, ratePerKm: 58, isRefrigerated: true,
        baseLocation: 'Gultekdi APMC, Pune', baseCoords: [73.8757, 18.4938] },
    ],
  },
];

const upsertUser = async ({ name, email, phone, address, coordinates, role }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  = ${email} already exists (${existing.role}) — left alone`);
    return existing;
  }
  // `password` is hashed by the model's pre-save hook, so create() not insert().
  const user = await User.create({
    name, email, password: PASSWORD, phone, role,
    location: { address, coordinates },
  });
  console.log(`  + ${email} created (${role})`);
  return user;
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set — check backend/.env');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`connected to ${mongoose.connection.name}\n`);

  console.log('Farmers');
  for (const f of FARMERS) await upsertUser({ ...f, role: 'Farmer' });

  console.log('\nBuyers');
  for (const b of BUYERS) await upsertUser(b);

  console.log('\nFleet owners');
  for (const fleet of FLEETS) {
    const owner = await upsertUser({ ...fleet.owner, role: 'Logistics' });

    for (const v of fleet.vehicles) {
      const already = await Vehicle.findOne({ owner: owner._id, vehicleNo: v.vehicleNo });
      if (already) {
        console.log(`    = ${v.vehicleNo} already in ${owner.name}'s fleet`);
        continue;
      }
      await Vehicle.create({
        owner: owner._id,
        vehicleNo: v.vehicleNo,
        driverName: v.driverName,
        driverPhone: v.driverPhone,
        vehicleType: v.vehicleType,
        capacityKg: v.capacityKg,
        currentLoadKg: 0,
        ratePerKm: v.ratePerKm,
        isRefrigerated: v.isRefrigerated,
        baseLocation: v.baseLocation,
        status: 'Idle',
        routeStartAt: new Date(new Date().setHours(6, 0, 0, 0)),
        // One stop: where it is now. Insertions build the rest of the route.
        currentRoute: [{
          kind: 'depot', label: v.baseLocation, coordinates: v.baseCoords, loadDeltaKg: 0,
        }],
        location: { type: 'Point', coordinates: v.baseCoords },
        locationUpdatedAt: new Date(),
      });
      console.log(`    + ${v.vehicleNo} added to ${owner.name}'s fleet`);
    }
  }

  console.log('\ndone. Password for every seeded account: ' + PASSWORD);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('seed failed:', err.message);
  process.exit(1);
});
