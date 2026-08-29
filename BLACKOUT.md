# The Blackout — Data-Loss Detection & Recovery

**Status:** implemented, rule-based, human-in-the-loop, verified end-to-end
against the live database.
**Where:** `backend/src/services/{journal,snapshot,recovery,recoveryState,drill,entityRegistry}.js` ·
`backend/src/middlewares/guardWrites.js` ·
`backend/src/controllers/systemController.js` ·
`backend/src/routes/systemRoutes.js` ·
`backend/src/models/{EventJournal,Snapshot}.js` ·
`frontend/src/features/system/{BlackoutConsoleScreen,RecoveryAnimation,useSystemHealth}.jsx`

This is KrishiFlow's answer to *"your primary data store is corrupted or wiped
mid-operation, people are still using it, show what the system actually does."*
It is an extension of the property the whole codebase already has —
**everything degrades instead of failing, and every response names its data
source** — not a bolted-on framework.

---

## 1. The problem

MongoDB (via Mongoose) is the only store. `config/db.js` already degrades a
failed *connect* to `isConnected === false`; controllers `try/catch` every query
and answer `503`. But that only covers "the database is unreachable". It does
**not** cover:

- a collection dropped or partially deleted while the process keeps running
- documents corrupted in place (a `NaN` number, a nulled coordinate pair, a
  dangling reference) that a plain read returns without complaint
- the need to keep **accepting new work** while the store is being rebuilt

The four collections that carry real operational state, and that this system
protects:

| Collection | Why it matters | Lifecycle events |
| --- | --- | --- |
| `User` | accounts; `middlewares/auth.js` does `User.findById` on **every** authenticated request | `CREATE`, `UPDATE` |
| `Vehicle` | fleet, routes, capacity, last known position | `CREATE`, `ROUTE_SET`, `LOCATION` |
| `PickupRequest` | the demand side of the VRP; already had a `timeline[]` event log | `CREATE`, `ASSIGN`, `STATUS` |
| `BuyerPosting` | buyer procurement rates | `CREATE`, `UPDATE`, `DELETE` |

**Auth is coupled to the DB.** If `users` is wiped, `protect` can no longer look
anyone up and every guarded route `503`s. So the recovery console and its
endpoints are **unauthenticated by design** (gated instead by `NODE_ENV` / a
drill token), and recovery **restores `User` first** so sign-in returns before
anything else.

---

## 2. Design principles

1. **The primary DB is never the only copy of an important operation.** Every
   mutation is also written to an append-only journal, on disk *and* in Mongo.
2. **Detect against the black box, don't guess.** Corruption is found by
   comparing the live DB to the journal + snapshots, per entity.
3. **Rebuild, then write back — accounts first.** Current state is the fold of
   journal events over the last snapshot. Users are restored before the rest.
4. **Unrecoverable is reported, never faked.** A record with no `CREATE` event
   and no snapshot row has nothing to rebuild it from; it is named as a
   permanent loss with the reason.
5. **Stay up.** While degraded, writes are queued and answered `202
   { mode: 'recovery', queued: true }`, then replayed — the same "tell the user
   what they're looking at" convention as `aiEngineSource` and `<DemoStamp/>`.
6. **The drill is real and bounded.** `POST /api/system/drill/blackout` really
   `deleteOne`s and corrupts documents — but only ones tagged `drill: true`.
   Real data is physically out of its reach.

---

## 3. The event journal — the "black box"

`backend/src/services/journal.js`, model `backend/src/models/EventJournal.js`.

### 3.1 Two sinks per event

Every `journal.record()` writes the **same event object** to:

1. **`backend/data/journal.ndjson`** — one JSON object per line, appended with
   `fs.promises.appendFile`. This is the copy that survives a full collection
   drop; recovery reads it **first**.
2. the **`eventjournals` MongoDB collection** — best-effort, for the health scan
   to query by entity. A failure here does not lose the event (the file already
   has it).

The file sink is advanced *before* the in-process chain head moves, so a crash
between the two sinks can only ever lose the Mongo copy, never the durable one.

### 3.2 Event shape

```js
{
  seq,           // monotonic, gap-free; recovered from the file on boot
  eventId,       // crypto.randomUUID()
  entityType,    // 'User' | 'Vehicle' | 'PickupRequest' | 'BuyerPosting'
  entityId,      // the Mongo _id, as a string
  eventType,     // 'CREATE' | 'UPDATE' | 'STATUS' | 'ASSIGN' | 'LOCATION' | 'ROUTE_SET' | 'DELETE'
  payload,       // the FULL document (doc.toObject()) on every event except DELETE ({})
  actorId,       // a User _id, or 'system' | 'drill' | 'load-gen' | 'recovery' | 'console'
  drill,         // true for events produced by the resilience drill
  at,            // ISO timestamp
  prevHash,      // hash of the previous event
  hash           // sha256(prevHash + canonicalJSON(body))
}
```

**Full-document payloads, not deltas.** Every non-`DELETE` event carries the
whole `doc.toObject()`. Reconstruction is then trivial and bug-proof: the newest
event for an entity *is* its current state. The journal is larger for it; at
demo scale (dozens–hundreds of events) that is irrelevant, and the
simplicity is worth more than the bytes. `User` events additionally carry the
bcrypt `password` hash (re-read with `.select('+password')`) so a recovered
account can still sign in.

### 3.3 The hash chain

`hash = sha256(prevHash + canonical(body))`, where `body` is the event minus its
own `prevHash`/`hash`, and `canonical()`:

1. JSON round-trips the object first — a fresh Mongoose doc carries `ObjectId` /
   `Date` / `Buffer` instances, but the same event re-read from the file is
   plain JSON. Normalising both to JSON primitives makes an event's hash
   **identical before and after it is persisted**. *(Skipping this step made
   every chain verify as "broken" — the one bug that mattered in testing.)*
2. sorts object keys at every depth, so the serialisation is deterministic.

`verifyChain(events)` walks the list checking `evt.prevHash === prev` and
`hashEvent(evt, prev) === evt.hash`. A mismatch returns `{ ok: false,
brokenAtSeq }`. **A broken chain is surfaced on the health screen, not trusted
silently** — it means the black box itself was truncated or tampered with.

### 3.4 Write sites (`journal.record()` calls)

Added right beside the existing DB write in each controller — the same
discipline the code already applied to `PickupRequest.timeline`:

| File | Function → event |
| --- | --- |
| `authController.js` | `register` → `CREATE`, `updateMe` → `UPDATE`, `changePassword` → `UPDATE` (via `journalUser()` which re-reads with the hash) |
| `requestController.js` | `createRequest` → `CREATE`, `assignRequest` → `ASSIGN` (+ Vehicle `ROUTE_SET`), `updateStatus` → `STATUS` (+ Vehicle `ROUTE_SET` on delivered/cancelled), `cancelRequest` → `STATUS` |
| `fleetController.js` | `addVehicle` → `CREATE`, `reportLocation` → `LOCATION` |
| `buyerController.js` | `createPosting` → `CREATE`, `updateReceivedQuantity` → `UPDATE`, `deletePosting` → `DELETE` |

`journal.record()` **never throws into the caller** — a sink failure is logged.
Journalling must not be the reason a farmer's request fails.

---

## 4. Snapshots

`backend/src/services/snapshot.js`, model `backend/src/models/Snapshot.js`.

`snapshot.take(reason)` dumps all four collections to
`backend/data/snapshots/<iso>.json` **and** a `snapshots` document, tagged with
`atSeq` = the journal `seq` at that moment. `User` is dumped with `+password`.
The last 10 are kept on disk and in Mongo; older ones are pruned.

Recovery loads the newest snapshot and only replays events with
`seq > snapshot.atSeq`, so replay stays cheap no matter how long the journal
grows.

Triggers:

- **boot** — `snapshot.ensureFresh()` takes one if none in the last hour
  (`server.js` waits up to 15 s for Mongo to connect first)
- **every 15 minutes** — `setInterval`, unref'd
- **on demand** — `POST /api/system/snapshot`
- **`pre-drill`** — `drill.seed()` takes one *before* planting any drill data;
  this is what the "1 unrecoverable" record is measured against (§7.2)
- **`post-recovery`** — `recovery.run()` takes one at the end so the system has
  a current restore point

---

## 5. Detection — `GET /api/system/health`

`systemController.getHealth` → `recovery.scan()`. Unauthenticated (read is
always open).

`scan()` compares the DB against the black box, per entity type:

```
events            = journal.readAll()                 // file, falling back to collection
latestById        = fold events by entityId (last wins)
snapIds[type]     = _id set from the latest snapshot
manifest          = drill-manifest.json               // { seededIds, outOfBandIds, writtenOff }

expected(type)    = { ids alive in the journal (last event ≠ DELETE) }
                  ∪ { manifest.seededIds[type] }
                  \ { manifest.writtenOff }            // permanent losses already acknowledged

for each expected id:
  doc = model.findById(id)
  rebuildable = (id has a CREATE event) OR (id in the latest snapshot)
  if !doc                       -> affected { kind: 'missing' }
  else if validateSync() fails
       or semanticCheck() fails -> affected { kind: 'corrupt', reason }
  if affected and !rebuildable  -> also unrecoverable, with the reason
```

`semanticCheck` (per type, `entityRegistry.js`) catches the corruption a schema
check waves through: `Number.isNaN(capacityKg)`, `origin.coordinates` not a
2-array, missing `email`/`role`, etc.

**Response** (abridged):

```json
{
  "db": "online | degraded | down",
  "mode": "idle | blackout | recovering",
  "mongoConnected": true,
  "journal":  { "status": "intact|broken", "events": 42, "lastSeq": 42, "chainOk": true },
  "snapshot": { "at": "...", "ageSec": 12, "atSeq": 30, "counts": { ... } },
  "scan": {
    "byType": { "PickupRequest": { "inDb": 30, "expected": 5, "missing": 3, "corrupt": 1 }, ... },
    "affected": [ { "entityType", "entityId", "kind", "reason", "recoverable" } ],
    "affectedCount": 4, "recoverable": 3,
    "unrecoverable": [ { "entityType", "entityId", "reason" } ], "unrecoverableCount": 1
  },
  "queue":  { "pending": 2 },
  "load":   { "running": true, "raised": 7 },
  "drill":  { "scopeCount": 11, "lastSeedAt": "...", "lastBlackoutAt": "..." },
  "counts": { "User": 17, "Vehicle": 11, "PickupRequest": 30, "BuyerPosting": 4 }
}
```

`db` = `down` if Mongo is not connected, `degraded` if `affectedCount > 0` or
the chain is broken, else `online`. `GET /health` also carries a small
`resilience: { mode, journal, journalEvents, queued }` block.

---

## 6. Recovery — `POST /api/system/recover`

`backend/src/services/recovery.js`. `systemController.recoverNow` stops the load
generator first (so the queue it reads is stable), then calls `recovery.run()`.

Eight steps, each broadcast on the socket bus as
`system:recovery_progress { step, status, detail, counts }` — the frontend
animates against **real** backend progress, nothing scripted:

| # | step | what it does |
| --- | --- | --- |
| 1 | `detect` | re-run `scan()`, freeze the affected set |
| 2 | `snapshot` | load the newest snapshot JSON |
| 3 | `replay` | read `journal.ndjson`, keep events `seq > snapshot.atSeq` for the affected ids |
| 4 | `reconstruct` | per entity: `reconstructEntity()` — last non-`DELETE` event's payload **is** the current doc; a trailing `DELETE` → tombstone (stays gone, correctly); no events → fall back to the snapshot row; neither → unrecoverable |
| 5 | `validate` | build a Mongoose doc, `validateSync()` + `semanticCheck()`; failures drop to `unrecoverable` with a reason |
| 6 | `restore` | `bulkWrite` `replaceOne … upsert` keyed on `_id`, **`User` first** (ENTITIES is ordered), so `protect`/login work again immediately |
| 7 | `replay-queue` | apply the offline write queue (§8) in `seq` order, journalling each as it lands |
| 8 | `complete` | report the totals |

**Report:**

```json
{
  "recovered": 10,
  "unrecoverable": [ { "entityType", "entityId", "reason" } ],
  "unrecoverableCount": 1,
  "opsDuringOutage": 4,
  "queuedReplayed": 4,
  "queuedTotal": 4,
  "consistencyPct": 90.9,        // recovered / (recovered + unrecoverable) × 100
  "tookMs": 7229
}
```

After the run, the unrecoverable ids are written to `manifest.writtenOff` so the
next `scan()` stops flagging the system as `degraded` over records nothing can
rebuild. They remain listed as permanent losses in the report and the console.

---

## 7. The drill — `POST /api/system/drill/*`

`backend/src/services/drill.js`. Gated by `drillGuard`
(`NODE_ENV !== 'production'`, or an `x-drill-token` header matching
`RESILIENCE_DRILL_TOKEN`).

### 7.1 `drill` flag

`User`, `Vehicle`, `PickupRequest`, `BuyerPosting` each gained
`drill: { type: Boolean, default: false, index: true }`. **The blackout only
ever touches `{ drill: true }` rows.** Real accounts, vehicles, requests and
postings cannot be reached by it.

### 7.2 `drill/seed` — order matters

1. `snapshot.take('pre-drill')` — capture the real system *before* any drill data
   exists.
2. **The out-of-band record.** One `PickupRequest` inserted via
   `PickupRequest.collection.insertOne` — raw driver, **no Mongoose hook, no
   journal event**, back-dated 30 days. It is in *neither* the pre-drill
   snapshot *nor* the journal.
3. ~10 normal drill records through the models + `journal.record()`: a fleet
   owner + 3 vehicles mid-route, 4 pickup requests across the lifecycle
   (pending → assigned → in_transit), a buyer posting.

Written to `backend/data/drill-manifest.json`:
`{ seededIds: {type:[ids]}, outOfBandIds: [id], writtenOff: [] }`.

### 7.3 `drill/blackout`

On the `drill:true` set: `deleteOne` ~60 %, and on the rest `$set` a mangle
(`capacityKg: NaN`, `location.coordinates: []`, `origin.coordinates: null`,
`offeredPricePerKg: NaN`, `name/email/cropType: ''`). Sets `recoveryState` →
`blackout`.

### 7.4 The honest "1 unrecoverable"

After the blackout, `scan()` sees the out-of-band id in `manifest.seededIds` but
finds **no `CREATE` event** and **no snapshot row** for it → it is classified
`unrecoverable`, reason *"written outside the event journal and not in the last
snapshot — nothing to rebuild it from."* Recovery cannot and does not fake it.
Every other affected record comes back. This contrast — 10 rebuilt, 1
genuinely, explainably lost — is the point of the demo.

### 7.5 Load generator — `drill/load/start|stop`

A server-side `setInterval` (1 request / 4 s). While `recoveryState.isDegraded()`
it writes each request to the **offline queue** (`kind: 'createPickupRequest'`);
otherwise it creates + journals directly. It is server-driven because a real
farmer cannot log in during a `users` wipe.

### 7.6 `drill/reset`

`deleteMany({ drill: true })` on all four collections, `journal.purgeDrillEvents()`
(rewrites `journal.ndjson` without the `drill` lines and **re-chains** the
remainder so real data's chain stays valid), clears the queue and manifest,
`recoveryState` → `idle`.

---

## 8. Recovery mode & the offline write queue

`backend/src/services/recoveryState.js` — a module flag (`idle` | `blackout` |
`recovering`) plus `backend/data/recovery-queue.ndjson`.

`backend/src/middlewares/guardWrites.js` is mounted on every mutating route for a
protected entity (`apiRoutes.js`). While the mode is **not** `idle`:

- the intended op is appended to the queue as `{ kind: 'http', method,
  originalUrl, body, actorId }`
- the caller gets **`202 { success: true, mode: 'recovery', queued: true,
  queueId, message }`** instead of a `503`

While `idle` it is a zero-cost pass-through.

`recovery.run()` step 7 drains the queue: `kind: 'createPickupRequest'` (from the
load generator) is applied directly; `kind: 'http'` for `POST /api/requests` is
rebuilt into a `PickupRequest`. Anything it does not recognise is counted in
`queuedTotal` but not `queuedReplayed`, so the report stays honest.

---

## 9. The console & the animation

Pre-auth reachable (like the VRP walk-through): landing page →
*"Run the Blackout resilience drill"* → `App.jsx` `Gate` stage `blackout` →
`features/system/BlackoutConsoleScreen.jsx`.

- **`useSystemHealth.js`** — polls `GET /api/system/health` every 2 s (the
  `data/marketCache.js` interval pattern) and subscribes to
  `system:recovery_progress` on the shared socket (the
  `hooks/useVehicleTracking.js` pattern), accumulating the ordered step list.
- **Status lights** — DATABASE / EVENT STORE / RECOVERY, restyled from
  `MarketStatusStamp` + the terracotta `dispatch.offline` panel.
- **Metrics** — pickup requests, vehicles, journal events, snapshot age, queued
  ops, drill scope.
- **Controls** — Seed drill data · 💥 Simulate blackout · ▶/■ load generator ·
  🔄 Recover system · Take snapshot · Reset drill.
- **`RecoveryAnimation.jsx`** — an SVG schematic driven entirely by `health` +
  `progress`, no script:
  - three zones: **Snapshot** (stacked platters, `seq` label) → **Event journal**
    (26 ticks; filled = has event, green = lit during replay) → **Database**
    (a grid of tiles sized to the drill scope)
  - `idle` — every tile green with a ✓
  - `blackout` — the affected tiles jitter and shatter to hollow dashed clay
    outlines (`wipe` eased over ~650 ms)
  - `recovering` — journal ticks light left→right on `replay`; green particles
    stream journal→DB on a quadratic bezier during `reconstruct`; tiles refill
    (green, via a turmeric "healing" flash) in index order as `restore`
    progresses; the snapshot block pulses while it loads
  - `recovered` — all green except the permanent loss, marked with an ✕ and an
    *"N beyond recovery"* caption
  - honours `prefers-reduced-motion` by holding each phase's end state
- **Progress checklist** — the 8 steps with tick / spinner / pending, plus the
  `detail` string from each event.
- **Result card** — recovered · unrecoverable · ops during outage · queued
  replayed · consistency %.

New i18n under `blackout.*` (en/hi/mr, build-enforced by `check-i18n.mjs`).

---

## 10. API surface

All under `/api/system`, unauthenticated; mutations pass `drillGuard`.

| Route | Purpose |
| --- | --- |
| `GET  /api/system/health` | the full scan + state payload (always open) |
| `POST /api/system/snapshot` | take a snapshot now |
| `POST /api/system/recover` | run the recovery engine |
| `POST /api/system/drill/seed` | plant the bounded drill data (incl. 1 out-of-band) |
| `POST /api/system/drill/blackout` | really delete + corrupt the `drill:true` set |
| `POST /api/system/drill/reset` | remove all drill data + drill journal entries |
| `POST /api/system/drill/load/start` · `/stop` | the request generator |

---

## 11. Limits, and what a production version would add

- **Full-document journal payloads** are simple but not compact; a real system
  would store deltas + periodic full snapshots per entity, or use MongoDB change
  streams / an oplog tail as the event source instead of controller hooks.
- **In-process `seq` / chain head.** Fine for one Node process; a horizontally
  scaled backend needs the sequence in a shared store (Redis `INCR`, or a
  capped Mongo collection) and an idempotent writer.
- **`guardWrites` sits after `protect`.** During a *full* DB wipe `protect`
  itself `503`s, so real user traffic could not be queued — only the
  server-side load generator can. The demo runs with `users` intact
  (the drill never touches real accounts), so this is not exercised; a
  production version would move the queue ahead of auth for a bounded set of
  routes and reconcile the actor later.
- **Reconstruction trusts the newest event.** If corruption reached the journal
  *file* (not just the DB) and passed the hash chain, replay would faithfully
  rebuild the corrupt state. The chain detects tampering/truncation, not a
  semantically-wrong-but-well-formed payload; `validate` (step 5) is the only
  backstop.
- **No PITR.** Recovery restores *current* state, not "the state at 14:03". A
  real RPO/RTO story needs timestamped snapshots + the ability to replay to an
  arbitrary `seq`.
- **The drill is destructive by design.** It is gated to non-production (or a
  token) and scoped to `drill:true`, but it does issue real `deleteOne`s. Do
  not point `RESILIENCE_DRILL_TOKEN` at a production deployment casually.
