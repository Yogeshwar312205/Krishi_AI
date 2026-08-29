const mongoose = require('mongoose');

const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const BuyerPosting = require('../models/BuyerPosting');

const { getIsConnected } = require('../config/db');
const journal = require('./journal');
const snapshot = require('./snapshot');
const recovery = require('./recovery');
const recoveryState = require('./recoveryState');
const logger = require('../utils/logger');

/**
 * The Blackout drill — a bounded, honest way to prove the recovery path on a
 * live system.
 *
 * Every document it creates carries `drill: true`. The blackout only ever
 * deletes or corrupts `{ drill: true }` rows, so a real account, vehicle,
 * request or posting is physically out of its reach.
 *
 *   seed()      — snapshot the real system, plant one record OUTSIDE the black
 *                 box (raw driver insert, no journal), then plant a set of
 *                 normal journalled drill records mid-lifecycle.
 *   blackout()  — really delete ~60% of the drill set and corrupt fields on the
 *                 rest. Flip the system into recovery mode.
 *   reset()     — remove every drill record and drill journal entry; back to idle.
 *   load gen    — while blacked out, keep raising drill pickup requests so the
 *                 console shows them queueing, not failing.
 */

const NASHIK = [73.7898, 19.9975];
const LASALGAON = [74.2400, 20.1400];
const VASHI = [73.0012, 19.0760];
const PUNE = [73.8567, 18.5204];

let loadTimer = null;
let loadCount = 0;

const jitter = (base, spread) => base + (Math.random() - 0.5) * spread;

/** Create a drill vehicle through the model + journal (the normal path). */
const makeVehicle = async (owner, patch) => {
  const base = {
    owner,
    vehicleNo: patch.vehicleNo,
    driverName: patch.driverName,
    driverPhone: '+91 90000 00000',
    vehicleType: patch.vehicleType || 'Refrigerated Van',
    capacityKg: patch.capacityKg,
    currentLoadKg: patch.currentLoadKg || 0,
    ratePerKm: patch.ratePerKm,
    isRefrigerated: !!patch.isRefrigerated,
    baseLocation: patch.baseLocation || 'Nashik depot',
    status: patch.status || 'Idle',
    routeStartAt: new Date(new Date().setHours(6, 0, 0, 0)),
    currentRoute: patch.currentRoute || [{ kind: 'depot', label: patch.baseLocation || 'Nashik depot', coordinates: patch.coords || NASHIK, loadDeltaKg: 0 }],
    location: { type: 'Point', coordinates: patch.coords || NASHIK },
    locationUpdatedAt: new Date(),
    drill: true,
  };
  const doc = await Vehicle.create(base);
  await journal.record({ entityType: 'Vehicle', entityId: doc._id, eventType: 'CREATE', payload: doc.toObject(), actorId: 'drill', drill: true });
  return doc;
};

const makeRequest = async (farmer, patch) => {
  const doc = await PickupRequest.create({
    farmer,
    farmerName: patch.farmerName || 'Drill Farmer',
    farmerPhone: '+91 90000 00000',
    cropType: patch.cropType || 'Tomato',
    quantityKg: patch.quantityKg || 2000,
    origin: { label: patch.originLabel || 'Lasalgaon farm', coordinates: patch.origin || LASALGAON },
    destination: { label: patch.destLabel || 'Mumbai APMC, Vashi', coordinates: patch.dest || VASHI },
    agreedRatePerKg: patch.agreedRatePerKg ?? 24,
    pickupDate: new Date().toISOString().split('T')[0],
    window: patch.window || { startHour: 6, endHour: 10, label: 'Morning 6–10' },
    status: patch.status || 'pending',
    timeline: patch.timeline || [{ status: 'pending', note: 'Request raised' }],
    drill: true,
  });
  await journal.record({ entityType: 'PickupRequest', entityId: doc._id, eventType: 'CREATE', payload: doc.toObject(), actorId: 'drill', drill: true });
  return doc;
};

const seed = async () => {
  if (!getIsConnected()) throw new Error('database not connected');
  await reset({ silent: true }); // start from a clean scope every run

  // 1. Snapshot the real system BEFORE any drill data exists. This is what the
  //    "1 unrecoverable" record will be measured against — it is created after
  //    this line, so it is in neither the snapshot nor (below) the journal.
  await snapshot.take('pre-drill');

  const seededIds = { User: [], Vehicle: [], PickupRequest: [], BuyerPosting: [] };
  const outOfBandIds = [];

  // 2. The out-of-band record: a raw driver insert. No Mongoose hooks, no
  //    journal event. Represents a row that predates the black box. Recovery
  //    will correctly report it as a permanent loss.
  const orphanId = new mongoose.Types.ObjectId();
  await PickupRequest.collection.insertOne({
    _id: orphanId,
    farmer: new mongoose.Types.ObjectId(),
    farmerName: 'Legacy Farmer (pre-journal record)',
    farmerPhone: '+91 90000 11111',
    cropType: 'Onion',
    quantityKg: 1800,
    origin: { label: 'Pimpalgaon farm', coordinates: [73.9850, 20.1750] },
    destination: { label: 'Pune APMC', coordinates: PUNE },
    agreedRatePerKg: 21,
    pickupDate: new Date().toISOString().split('T')[0],
    window: { startHour: 7, endHour: 11, label: 'Morning 7–11' },
    status: 'assigned',
    timeline: [{ status: 'pending', at: new Date(), note: 'Request raised' }],
    drill: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    __v: 0,
  });
  seededIds.PickupRequest.push(String(orphanId));
  outOfBandIds.push(String(orphanId));

  // 3. A fleet owner + 3 vehicles, mid-route.
  let owner = await User.findOne({ email: 'drill.fleet@krishiflow.ai' });
  if (!owner) {
    owner = await User.create({
      name: 'Drill Fleet Owner', email: 'drill.fleet@krishiflow.ai', password: 'krishi@2026',
      phone: '9000000001', role: 'Logistics', drill: true,
    });
    await journal.record({ entityType: 'User', entityId: owner._id, eventType: 'CREATE', payload: (await User.findById(owner._id).select('+password').lean()), actorId: 'drill', drill: true });
  }
  seededIds.User.push(String(owner._id));

  const freighter = await makeVehicle(owner._id, {
    vehicleNo: 'MH 40 DR 1001', driverName: 'Drill Driver A', vehicleType: 'Heavy Freighter',
    capacityKg: 10000, currentLoadKg: 4000, ratePerKm: 78, isRefrigerated: true, status: 'En route',
    coords: NASHIK,
    currentRoute: [
      { kind: 'depot', label: 'Nashik depot', coordinates: NASHIK, loadDeltaKg: 0 },
      { kind: 'pickup', label: 'Pimpalgaon Baswant', coordinates: [73.9850, 20.1750], loadDeltaKg: 3000 },
      { kind: 'drop', label: 'Mumbai APMC', coordinates: VASHI, loadDeltaKg: -7000 },
    ],
  });
  const reefer = await makeVehicle(owner._id, {
    vehicleNo: 'MH 40 DR 1002', driverName: 'Drill Driver B', vehicleType: 'Refrigerated Van',
    capacityKg: 3500, ratePerKm: 52, isRefrigerated: true, status: 'Idle', coords: NASHIK,
  });
  const mini = await makeVehicle(owner._id, {
    vehicleNo: 'MH 40 DR 1003', driverName: 'Drill Driver C', vehicleType: 'Mini Truck',
    capacityKg: 2000, ratePerKm: 38, status: 'Idle', coords: [73.9850, 20.1750],
  });
  seededIds.Vehicle.push(String(freighter._id), String(reefer._id), String(mini._id));

  // 4. Pickup requests across the lifecycle.
  const farmer = new mongoose.Types.ObjectId();
  const r1 = await makeRequest(farmer, { farmerName: 'Kiran (drill)', cropType: 'Tomato', quantityKg: 2500, status: 'pending' });
  const r2 = await makeRequest(farmer, { farmerName: 'Anand (drill)', cropType: 'Onion', quantityKg: 3000, status: 'pending' });
  const r3 = await makeRequest(farmer, {
    farmerName: 'Savita (drill)', cropType: 'Potato', quantityKg: 1500, status: 'assigned',
    timeline: [
      { status: 'pending', note: 'Request raised' },
      { status: 'assigned', note: 'Assigned to MH 40 DR 1001' },
    ],
  });
  const r4 = await makeRequest(farmer, {
    farmerName: 'Ramesh (drill)', cropType: 'Tomato', quantityKg: 2200, status: 'in_transit',
    timeline: [
      { status: 'pending', note: 'Request raised' },
      { status: 'assigned', note: 'Assigned to MH 40 DR 1002' },
      { status: 'collected', note: 'Picked up at the farm gate' },
      { status: 'in_transit', note: 'On the way to Vashi' },
    ],
  });
  seededIds.PickupRequest.push(String(r1._id), String(r2._id), String(r3._id), String(r4._id));

  // 5. A buyer posting.
  let buyer = await User.findOne({ email: 'drill.buyer@krishiflow.ai' });
  if (!buyer) {
    buyer = await User.create({ name: 'Drill Buyer', email: 'drill.buyer@krishiflow.ai', password: 'krishi@2026', phone: '9000000002', role: 'APMC Buyer', drill: true });
    await journal.record({ entityType: 'User', entityId: buyer._id, eventType: 'CREATE', payload: (await User.findById(buyer._id).select('+password').lean()), actorId: 'drill', drill: true });
  }
  seededIds.User.push(String(buyer._id));
  const posting = await BuyerPosting.create({
    buyer: buyer._id, cropType: 'Tomato', grade: 'Grade-A', offeredPricePerKg: 26,
    requiredQuantityKg: 8000, mandiName: 'Mumbai APMC', expiresAt: new Date(Date.now() + 7 * 864e5),
    status: 'Active Procurement', drill: true,
  });
  await journal.record({ entityType: 'BuyerPosting', entityId: posting._id, eventType: 'CREATE', payload: posting.toObject(), actorId: 'drill', drill: true });
  seededIds.BuyerPosting.push(String(posting._id));

  const manifest = {
    seededIds, outOfBandIds,
    lastSeedAt: new Date().toISOString(),
    lastBlackoutAt: null,
  };
  await recovery.writeManifest(manifest);

  const total = Object.values(seededIds).reduce((n, a) => n + a.length, 0);
  logger.info(`[drill] seeded ${total} records (1 out-of-band)`);
  return { seeded: total, outOfBand: outOfBandIds.length, byType: Object.fromEntries(Object.entries(seededIds).map(([k, v]) => [k, v.length])) };
};

/** Really corrupt the drill set. */
const blackout = async () => {
  if (!getIsConnected()) throw new Error('database not connected');
  const manifest = await recovery.readManifest();
  const scoped = manifest.seededIds || {};
  const model = { User, Vehicle, PickupRequest, BuyerPosting };

  let deleted = 0;
  let corrupted = 0;

  for (const [type, ids] of Object.entries(scoped)) {
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      // ~60% hard-deleted, the rest field-mangled.
      if (i % 5 < 3) {
        await model[type].collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        deleted += 1;
      } else {
        const mangle = {
          User: { name: '', email: '' },
          Vehicle: { capacityKg: Number.NaN, 'location.coordinates': [] },
          PickupRequest: { 'origin.coordinates': null, quantityKg: Number.NaN },
          BuyerPosting: { offeredPricePerKg: Number.NaN, cropType: '' },
        }[type];
        await model[type].collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: mangle });
        corrupted += 1;
      }
    }
  }

  manifest.lastBlackoutAt = new Date().toISOString();
  await recovery.writeManifest(manifest);
  recoveryState.set('blackout');

  logger.warn(`[drill] BLACKOUT — ${deleted} deleted, ${corrupted} corrupted`);
  return { deleted, corrupted, affected: deleted + corrupted };
};

const reset = async ({ silent = false } = {}) => {
  stopLoad();
  if (getIsConnected()) {
    await Promise.all([
      User.deleteMany({ drill: true }),
      Vehicle.deleteMany({ drill: true }),
      PickupRequest.deleteMany({ drill: true }),
      BuyerPosting.deleteMany({ drill: true }),
    ]);
  }
  await journal.purgeDrillEvents();
  await recoveryState.clearQueue();
  recoveryState.set('idle');
  try { await recovery.writeManifest({ seededIds: {}, outOfBandIds: [], lastSeedAt: null, lastBlackoutAt: null }); } catch { /* ignore */ }
  if (!silent) logger.info('[drill] reset — drill scope cleared, state idle');
  return { ok: true };
};

const startLoad = () => {
  if (loadTimer) return { running: true, raised: loadCount };
  loadCount = 0;
  loadTimer = setInterval(async () => {
    try {
      const payload = {
        farmer: new mongoose.Types.ObjectId(),
        farmerName: `Load-test farmer ${loadCount + 1}`,
        farmerPhone: '+91 90000 22222',
        cropType: ['Tomato', 'Onion', 'Potato'][loadCount % 3],
        quantityKg: Math.round(jitter(2000, 800)),
        origin: { label: 'Lasalgaon farm', coordinates: [jitter(74.24, 0.05), jitter(20.14, 0.05)] },
        destination: { label: 'Mumbai APMC, Vashi', coordinates: VASHI },
        agreedRatePerKg: 24,
        pickupDate: new Date().toISOString().split('T')[0],
        window: { startHour: 6, endHour: 10, label: 'Morning 6–10' },
        status: 'pending',
        timeline: [{ status: 'pending', note: 'Raised during the blackout' }],
        drill: true,
      };

      if (recoveryState.isDegraded()) {
        // The system is down — the request is accepted and parked, not lost.
        await recoveryState.enqueue({ kind: 'createPickupRequest', payload, actorId: 'load-gen' });
      } else {
        const doc = await PickupRequest.create(payload);
        await journal.record({ entityType: 'PickupRequest', entityId: doc._id, eventType: 'CREATE', payload: doc.toObject(), actorId: 'load-gen', drill: true });
      }
      loadCount += 1;
    } catch (err) {
      logger.warn(`[drill] load gen tick failed: ${err.message}`);
    }
  }, 4000);
  logger.info('[drill] load generator started (1 request / 4s)');
  return { running: true, raised: loadCount };
};

const stopLoad = () => {
  if (loadTimer) { clearInterval(loadTimer); loadTimer = null; }
  return { running: false, raised: loadCount };
};

const loadStatus = () => ({ running: !!loadTimer, raised: loadCount });

module.exports = { seed, blackout, reset, startLoad, stopLoad, loadStatus };
