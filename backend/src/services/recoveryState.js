const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const journal = require('./journal');
const logger = require('../utils/logger');

/**
 * The system's resilience mode, and the queue of writes accepted while the
 * primary store was unavailable.
 *
 *   idle       — normal operation. `guardWrites` is a pass-through.
 *   blackout   — corruption detected / DB unavailable. In-scope writes are
 *                accepted, journalled, and parked in the queue; the caller gets
 *                202 { mode: 'recovery', queued: true } instead of a 503.
 *   recovering — the recovery engine is running. Same queue behaviour; the
 *                queue is drained at the end of the run.
 *
 * The queue is a file (`backend/data/recovery-queue.ndjson`) for the same
 * reason the journal is: it has to outlive the process and the database.
 */

const QUEUE_FILE = path.join(journal.DATA_DIR, 'recovery-queue.ndjson');

let mode = 'idle';
let changedAt = new Date().toISOString();
let opsDuringOutage = 0; // reset when a blackout begins

const get = () => ({ mode, changedAt, opsDuringOutage });
const isDegraded = () => mode !== 'idle';

const set = (next) => {
  if (next === mode) return;
  logger.warn(`[recovery] mode ${mode} -> ${next}`);
  mode = next;
  changedAt = new Date().toISOString();
  if (next === 'blackout') opsDuringOutage = 0;
};

/**
 * Park an accepted write. `op` is { method, routePath, params, body, actorId }.
 * It is both journalled (so the black box has it) and queued (so it can be
 * applied to the DB once recovery finishes).
 */
const enqueue = async (op) => {
  const entry = {
    queueId: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...op,
  };
  try {
    await fsp.mkdir(journal.DATA_DIR, { recursive: true });
    await fsp.appendFile(QUEUE_FILE, JSON.stringify(entry) + '\n', 'utf8');
    opsDuringOutage += 1;
  } catch (err) {
    logger.error(`[recovery] could not queue op: ${err.message}`);
  }
  return entry;
};

const readQueue = async () => {
  try {
    const raw = await fsp.readFile(QUEUE_FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn(`[recovery] readQueue failed: ${err.message}`);
    return [];
  }
};

const clearQueue = async () => {
  try { await fsp.unlink(QUEUE_FILE); } catch { /* already gone */ }
};

const queueDepth = async () => (await readQueue()).length;

module.exports = { get, set, isDegraded, enqueue, readQueue, clearQueue, queueDepth, QUEUE_FILE };
