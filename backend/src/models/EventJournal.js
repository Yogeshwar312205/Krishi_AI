const mongoose = require('mongoose');

/**
 * The black box.
 *
 * Every mutating operation on an in-scope entity (User / Vehicle / PickupRequest
 * / BuyerPosting) is written here as an immutable event, in addition to the
 * normal document write. If the primary collection is corrupted or wiped, the
 * current state of every entity can be rebuilt by folding its events on top of
 * the last good snapshot.
 *
 * This collection is only ONE of the two journal sinks. The other is an
 * append-only file (`backend/data/journal.ndjson`) written by
 * `services/journal.js`, which survives even a full database drop. The two are
 * kept byte-for-byte identical per event; recovery prefers the file.
 *
 * Events are hash-chained: `hash = sha256(prevHash + canonicalBody)`. A broken
 * chain means the journal itself was tampered with or truncated, and the health
 * scan reports it rather than trusting it.
 */
const EventJournalSchema = new mongoose.Schema({
  // Monotonic, gap-free, assigned by services/journal.js. The ordering key for
  // replay and the thing a snapshot pins itself to.
  seq: { type: Number, required: true, unique: true, index: true },
  eventId: { type: String, required: true },

  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Vehicle', 'PickupRequest', 'BuyerPosting'],
    index: true,
  },
  entityId: { type: String, required: true, index: true },

  eventType: {
    type: String,
    required: true,
    // CREATE carries the full document; the rest carry only the changed fields.
    enum: ['CREATE', 'UPDATE', 'STATUS', 'ASSIGN', 'LOCATION', 'ROUTE_SET', 'DELETE'],
  },

  // The changed fields (full doc on CREATE). Stored loose — this is a log, not
  // a typed record.
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Who caused it: a User _id string, or 'system' / 'drill' / 'recovery'.
  actorId: { type: String, default: 'system' },

  // Set on events produced by the Blackout drill so a reset can find them and
  // so the demo can show "drill scope: N".
  drill: { type: Boolean, default: false, index: true },

  at: { type: Date, default: Date.now },

  prevHash: { type: String, default: '' },
  hash: { type: String, required: true },
}, { timestamps: true, minimize: false });

EventJournalSchema.index({ entityType: 1, entityId: 1, seq: 1 });

module.exports = mongoose.model('EventJournal', EventJournalSchema);
