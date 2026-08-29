/**
 * The four collections the Blackout drill protects, in one place.
 *
 * `snapshot.js`, `recovery.js` and the `/api/system/health` scan all read this
 * so the "what counts as in-scope" knowledge lives once. Adding a fifth
 * protected collection is a matter of adding a row here plus a `journal.record`
 * call at its write sites.
 *
 * Order matters: `User` is first because `middlewares/auth.js` does
 * `User.findById` on every authenticated request — restore users before
 * anything else or the rest of the app stays locked out during recovery.
 */
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const BuyerPosting = require('../models/BuyerPosting');

/**
 * Cheap semantic checks run against a live document during the health scan, on
 * top of Mongoose `validateSync()`. These catch the kinds of corruption the
 * drill injects (NaN numbers, nulled coordinate pairs, dangling refs) that a
 * plain schema validation would wave through.
 */
const isCoordPair = (c) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite);

const ENTITIES = [
  {
    type: 'User',
    model: User,
    label: 'Farmer / fleet / buyer accounts',
    semanticCheck: (doc) => {
      if (!doc.email || !doc.name) return 'missing name or email';
      if (!doc.role) return 'missing role';
      return null;
    },
  },
  {
    type: 'Vehicle',
    model: Vehicle,
    label: 'Fleet vehicles & routes',
    semanticCheck: (doc) => {
      if (!Number.isFinite(doc.capacityKg) || doc.capacityKg <= 0) return 'capacityKg is not a valid number';
      if (!Number.isFinite(doc.ratePerKm)) return 'ratePerKm is not a valid number';
      if (doc.location && !isCoordPair(doc.location.coordinates)) return 'vehicle location coordinates are broken';
      return null;
    },
  },
  {
    type: 'PickupRequest',
    model: PickupRequest,
    label: 'Farmer pickup requests',
    semanticCheck: (doc) => {
      if (!isCoordPair(doc.origin && doc.origin.coordinates)) return 'origin coordinates are missing or broken';
      if (!isCoordPair(doc.destination && doc.destination.coordinates)) return 'destination coordinates are missing or broken';
      if (!Number.isFinite(doc.quantityKg) || doc.quantityKg < 1) return 'quantityKg is not a valid number';
      return null;
    },
  },
  {
    type: 'BuyerPosting',
    model: BuyerPosting,
    label: 'Buyer rate postings',
    semanticCheck: (doc) => {
      if (!Number.isFinite(doc.offeredPricePerKg) || doc.offeredPricePerKg < 0) return 'offeredPricePerKg is not a valid number';
      if (!doc.cropType || !doc.mandiName) return 'missing cropType or mandiName';
      return null;
    },
  },
];

const byType = Object.fromEntries(ENTITIES.map((e) => [e.type, e]));

module.exports = { ENTITIES, byType, isCoordPair };
