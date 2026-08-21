# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (Node/Express, port 5000)
cd backend && npm install && npm run dev        # `dev` and `start` are both plain `node src/server.js` — no watcher

# AI engine (FastAPI, port 8000)
cd ai-engine && pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Vite, port 3000)
cd frontend && npm install && npm run dev
npm run check:i18n     # dictionary drift check — also runs as part of `npm run build`
npm run build          # check:i18n && vite build

# Whole stack
docker compose up      # NOTE: compose references backend/Dockerfile, ai-engine/Dockerfile,
                       # frontend/Dockerfile — none of which exist in the repo yet.
```

There is no test suite and no linter. CI (`.github/workflows/ci.yml`) only installs deps and runs the frontend build, so `npm run build` in `frontend/` is the only real gate — and it fails on any i18n inconsistency.

Env: copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env`. Note the backend reads `MONGODB_URI` and `PYTHON_ENGINE_URL`; `docker-compose.yml` still sets the older `MONGO_URI` / `AI_ENGINE_URL` names, which the code ignores.

## Architecture

Three services, one repo. The Node backend is the only thing the frontend talks to; it orchestrates MongoDB and the Python engine.

**Everything degrades instead of failing.** This is the single most important property of the system and it exists at every boundary:

- `backend/src/config/db.js` — a failed Mongo connect is logged as a warning, not thrown. The app runs with `isConnected === false` and controllers `try/catch` every query.
- `orchestratorController.recommendLogistics` — calls the Python engine via `aiEngineService` (axios-retry, 3 attempts, exponential backoff, 5s timeout). On failure it falls back to `fallbackOptimization()`, a JS reimplementation of the same profit math, and reports which path ran via `aiEngineSource` in the response.
- `frontend/src/services/api.js` — `loginUser`/`registerUser` fall back to a synthetic demo session **only when the server is unreachable** (`!err.response`). A real 401 must stay an error; do not widen that condition.
- Vehicle lookup uses a Mongo `$near` 2dsphere query, falling back to `vehicleController.fallbackVehicles`.

When adding a backend path, follow this shape: the response always includes a field naming the data source (`aiEngineSource`, `source`) so the UI can be honest about what the user is looking at.

**The "AI" is arithmetic, and the code says so.** `ai-engine` has `ortools`, `lightgbm`, and `scikit-learn` in `requirements.txt` but imports none of them. `vrp_service.py` enumerates all markets with haversine distance and sorts by net profit; `price_service.py` is a lookup table that labels itself "LightGBM + LSTM Agmarknet V2"; `spoilage_service.py` is a Q10 exponential decay formula. The README and several response strings overstate this. Don't propagate the claim into new code, and don't "fix" it by inventing numbers — see the DemoStamp convention below.

Note `ai-engine/app/core/config.py` contains a syntax error (`from pydantic_settings import BaseSettings if False else object`) and is never imported. It will crash anything that imports it.

### Frontend

`App.jsx` gates on `useAppStore().user` — no user means the auth screen and nothing else. `AppShell` renders one screen at a time from `screenFor(activeTab)`.

- `src/app/routes.js` is the **single source of tab ids**, per-role tab lists, and role normalisation. Three roles: Farmer, **Logistics** (the fleet owner) and APMC Buyer. There is deliberately **no Driver role** — a driver is a name and a phone number on a vehicle; `Driver`/`Transporter` normalise to Logistics so legacy accounts still work. Nav lists and render branches both derive from this file. Roles get at most four tabs — a hard constraint from the 56px mobile bottom bar with Devanagari labels.
- `src/store/useAppStore.js` — one zustand store, no context providers. Auth is rehydrated from localStorage (`user` + `token` must both be present or both are cleared). Buyer postings and mandi deals are still store-only; **vehicles and pickup requests are not** — they are persisted, owner-scoped and fetched through `services/api.js`.
- `src/features/**` is the current architecture; `src/components/**` is legacy, lazy-loaded, and still backs the buyer screens and the map.

### Design system — read the comments before changing tokens

`tailwind.config.js` **replaces** (not extends) `borderRadius` and `fontSize`. The visual language is a painted APMC rate board: square corners, ruled rows, numeral-first, no shadows. Replacing the scales at the root is deliberate — it squares off legacy `rounded-3xl` markup without touching those files.

Every `fontSize` and `lineHeight` step resolves through a CSS variable (`--lh-slab`, `--lh-display`, `--lh-head`, `--lh-body`, and `--lh-none/tight/snug/normal`), redefined in `index.css` under `:root:lang(hi)` / `:lang(mr)`. Hardcoding a numeric line-height anywhere clips Devanagari matras in two of the app's three languages. Reusable classes (`btn-*`, `field`, `docket`, `rule-strong`, `furrow`, `stamp-demo`) live in `index.css` `@layer components`; primitives in `src/design/primitives/` wrap them.

### i18n — three languages, enforced

- Never write a bare user-facing string. `useT()` gives `t`, `tCount`, and the formatters (`money`, `rate`, `number`, `percent`, `shortDate`).
- Add to `en.json` first — it is the checker's reference — then `hi.json` and `mr.json` with identical `{{placeholders}}`. `scripts/check-i18n.mjs` fails the build on a missing key, an extra key, a placeholder mismatch, or a value left identical to English (whitelist in `ALLOWED_IDENTICAL`).
- All **numbers** format through `en-IN` regardless of UI language, with Latin digits. This is not an oversight: `mr-IN` emits Devanagari digits, and even with `numberingSystem: 'latn'` it emits Western grouping (`₹111,500` instead of `₹1,11,500`). Only dates use the language locale. Do not simplify `format.js`.
- `src/i18n/GLOSSARY.md` records the register decisions (spoken word over government-form word, which loanwords stay, why "cold chain" became "ठंडी गाडी"). Read it before rewording Hindi/Marathi copy.

### Market data is live; demo data is the fallback, quarantined and stamped

The farmer screens run on the real data.gov.in Agmarknet feed. `demoMarket.js` is now only what shows when the feed is unreachable, and anything rendered from it carries `<DemoStamp />` (`MarketStatusStamp` picks the stamp from the hook's `status`). Never hand-write a fresher-looking constant; wire it to a source instead.

- `backend/src/services/agmarknetService.js` — resource `35985678-…`, capitalised field names, per-quintal string prices, approximate `sort[Arrival_Date]`. Pulls 1500 rows per commodity, keeps the newest posting per market inside a 3-day window, and returns **every** reporting Maharashtra APMC (40–160 of them), not a shortlist. TTL-cached in-process with in-flight de-duplication — the sample data.gov.in key is rate-limited hard.
- `backend/src/data/mandiGeo.js` — real coordinates in three honest tiers, reported as `geoPrecision`: an exact market yard, a taluka town matched by name inside the feed's market string, or the district HQ. A market that resolves to none gets `coordinates: null` and is dropped from ranking. **Never** synthesise a coordinate: distance drives freight, freight drives net profit, and net profit is the answer the farmer acts on. District-precision hauls are floored (`DISTRICT_MIN_HAUL_KM`) and flagged `distanceApprox`.
- `/api/agmarknet/commodities` lists what the state is actually reporting (~119 commodities). `utils/constants.js` `CROP_OPTIONS` holds the translated shortlist; the Crop screen offers the rest under their published Agmarknet names, and `translate()` falls back to the bare name for any `crops.*` key with no dictionary entry.
- `frontend/src/data/marketCache.js` — one shared TTL cache (10 min) with in-flight de-duplication, a background refresh timer that only runs while something is subscribed, and `prefetch()` called once from `App.jsx`. Screens read it through `useSyncExternalStore`, so moving between Today / Prices / landing costs no network. Cache keys are **crop only**: distance and profit are recomputed client-side (`data/geo.js`) so changing quantity or farm location never re-fetches.
- `useLiveMarket` returns `comparison` (all mandis by net), `best`, `topRate` (highest headline rate — used by the landing board, where there's no farm to measure a haul from), and `advantage`, the arithmetic proving the top mandi beats the *nearest* one. That last object is the product's whole claim; `WhyFurther.jsx` renders it, and `MandiRow.jsx` shows every row's full working.

### The deal gate — a truck may not be booked without an agreed price

`TransportScreen` runs three panels in a fixed order: **Mandi deal → Book a vehicle → My bookings**, and the vehicle panel is gated on an agreed deal for the *currently loaded crop*. This is a product invariant, not a layout preference: the screen used to open on vehicle search, so a farmer could hire a truck to a mandi where nobody had agreed to receive the lot, at a price nobody had quoted them.

- `store.deals[]` carries `agreedRatePerKg`, which is what the farmer actually gets. The Agmarknet modal price (`boardRatePerKg`) is the market's midpoint for yesterday's arrivals — a reason to *choose* a mandi, never a quote. Bookings, waybills and the buyer's inbound list all read the agreed rate.
- `data/traders.js` decides who the farmer can talk to. `sameMandi()` reconciles feed names ("Mumbai APMC") with buyer-typed ones ("Vashi Wholesale APMC") by dropping noise words and applying a small alias table. A match means an in-app thread; no match means we say so and offer the Kisan Call Centre. **Never invent a phone number for a mandi** — we hold none for the ~290 yards in the feed, and a wrong number on a screen a farmer is about to act on is worse than no number.
- The Prices screen hands its selection over via `store.pendingMandi`, so the deal panel opens on the mandi the farmer tapped. The deal panel lists *every* reporting mandi, not a shortlist.
- Deals filter by crop (`deal.cropType === cropDetails.cropType`). An agreed tomato price must never be attached to an onion consignment.
- `BuyerInboundScreen` is the other half: enquiries above shipments, with reply and a quote action that writes `agreedRatePerKg` back.

### Real-time

`backend/src/sockets/trackingSocket.js` + `frontend/src/hooks/useSocket.js`. Three events: `driver_location_update` (rebroadcast as `vehicle:location_changed`), `simulation:start_tracking` (server-side 2s interpolation Nashik→Vashi), and `dev_simulate_traffic` → `dev:traffic_reroute_event`, a scripted demo reroute with hardcoded metrics.

Coordinates are `[longitude, latitude]` throughout the API, store, and Mongo — except `trackingSocket.js`'s `newPolylineWaypoints`, which are `[lat, lng]`.

### Dispatch — the capacitated VRP, and the one place nothing falls back

`backend/src/services/insertionService.js` ranks every (vehicle, pending request) pair by the extra road km it would cost to insert that farmer into the route a vehicle is already driving, and `GET /api/dispatch/suggestions` serves it to the Logistics role. **Read `VRP.md` before changing any of it.**

- **No driver role, and the farmer does not pick a truck.** They raise a `PickupRequest`; the fleet owner's Dispatch screen ranks their *own* vehicles and approves one. The old flow — a farmer choosing from a vehicle list with fares — made this ride-hailing and made the fleet-wide optimisation meaningless, since a farmer cannot see the routes those trucks are already driving.
- **Nothing in this flow is seeded on the client.** `Vehicle` and `PickupRequest` are Mongo documents, every query scoped to `req.user._id`. An empty queue is an empty queue. The only seeded thing is a set of logins — `backend/scripts/seedAccounts.js`, documented in `SAMPLE_USERS.md`; `backend/scripts/clearRequests.js` empties the queue between demos.
- Every pending request is visible to **every** fleet owner; the claim is a conditional update on `status: 'pending'`, so the second owner to approve gets a 409 instead of a double booking.

- A farmer request is **two stops**, a pickup and a drop, inserted as an ordered pair `(i, j)`, `i < j`. Inserting only the pickup would offer a Pune-bound truck a lot sold in Vashi.
- Capacity is the **peak load across the sequence**, not `capacity − currentLoad`. `loadProfile()` is the gate; `remainingCapacityAfterKg` is derived from the peak so the card shows the number that was tested.
- `currentRoute[0]` is where the vehicle is now and is never displaced. Routes are **open** — no return-to-depot leg. `currentLoadKg` is what is on the deck *before* the route runs; a pickup inside `currentRoute` must not also be added to it (that double-count pushed the Routes screen past capacity once already).
- **Time windows are shown, never enforced.** ETA hours resolve in `Asia/Kolkata` explicitly, and `slotHours` travels on the booking because the slot label is translated — parsing it back out only works in English.
- `infeasible` and `unrankable` are returned and rendered with their reason. A request missing a coordinate is never given a guessed one; the server refuses to store one at all. Same rule as `mandiGeo.js` — and it is why a vehicle's base is picked from `features/logistics/baseLocations.js` rather than typed.
- Tracking is one record read by both sides: the server appends to `PickupRequest.timeline` on every status change and `TrackingTimeline.jsx` renders it for the farmer and the fleet owner alike, so the two can never see different accounts of the same lot.
- **This endpoint deliberately has no client-side fallback**, unlike every other boundary here. Two copies of a ranking algorithm can drift apart, and a dispatcher acting on the wrong one commits a real truck; the screen says it is unreachable instead.
- `ai-engine/app/services/vrp_service.py` still calls itself an OR-Tools VRP and is not one — it round-robins vehicles with `idx % len(...)`. It is out of scope and unused by this path; `VRP.md` §2 records the overstatement rather than patching the string.
