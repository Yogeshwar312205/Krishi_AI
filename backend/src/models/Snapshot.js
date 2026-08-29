const mongoose = require('mongoose');

/**
 * A point-in-time copy of every in-scope collection, pinned to the journal
 * `seq` it was taken at.
 *
 * Recovery loads the newest snapshot and then only replays journal events with
 * `seq > snapshot.atSeq` — so replay stays cheap no matter how long the journal
 * grows. Without snapshots, a wipe on day 400 would mean folding 400 days of
 * events.
 *
 * The full collection dump also lives on disk at
 * `backend/data/snapshots/<iso>.json`; this document holds the same bytes plus
 * the metadata the health scan needs (age, seq, per-collection counts).
 */
const SnapshotSchema = new mongoose.Schema({
  atSeq: { type: Number, required: true, index: true },
  takenAt: { type: Date, default: Date.now, index: true },
  reason: { type: String, default: 'scheduled' }, // 'boot' | 'scheduled' | 'manual' | 'pre-drill'

  // { User: [...docs], Vehicle: [...], PickupRequest: [...], BuyerPosting: [...] }
  // Passwords are journalled as a hash and kept here too, so a recovered account
  // can still sign in. Nothing else is redacted.
  collections: { type: mongoose.Schema.Types.Mixed, default: {} },

  counts: { type: mongoose.Schema.Types.Mixed, default: {} },
  fileName: { type: String, default: '' },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('Snapshot', SnapshotSchema);
