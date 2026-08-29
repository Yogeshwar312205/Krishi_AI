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

**The "AI" is arithmetic, and the code says so.** `ai-engine` has `ortools`, `lightgbm`, and `scikit-learn` in `requirements.txt` but imports none of them. `vrp_service.py` enumerates all markets with haversine distance and sorts by net profit; `spoilage_service.py` is a Q10 exponential decay formula. The README and several response strings overstate this. Don't propagate the claim into new code, and don't "fix" it by inventing numbers — see the DemoStamp convention below.

`price_service.py` is organised into four labelled sections: (1) a static ₹/kg reference table, (2) a **rule-based context scorer** — weather (OpenWeather, via `weather_service.py`, `OPENWEATHER_API_KEY`) crossed with per-crop weather-friendliness (`app/data/crop_weather_profiles.py` — 10 tuned crops, generic default otherwise) plus a demand/supply read, producing a price adjustment and a `SELL_NOW/SELL_SOON/HOLD/HOLD_STRONG` call, (3) the **trained ML model** — `forecast_model.py` loads `app/models/mandi_price_model.pkl` (XGBoost, 7-period-ahead modal price, Maharashtra, 5 crops: Onion/Potato/Rice/Tomato/Wheat), health-checks it on first use, and `blend_prices()` folds it into the point price at weight 0.5 when healthy, (4) the orchestrator `predict_crop_price()`. Endpoints: `POST /predict-price` (baseline + context + model blend), `POST /price-context` (advice only), `POST /price-forecast` (model series for the chart), `GET /model-info`, `GET /price-reference`. The demand/supply signal is **price momentum only** (today's modal vs its ~14-day trailing average — real Agmarknet history); it does **not** use feed "arrivals", which `agmarknetService.js` synthesises. Node side: `GET /api/prices/sell-advice` (rule-based advice, degrades to prices-only) and `GET /api/prices/model-forecast` (model chart series + crop coverage for the UI NOTE, degrades to `forecast.available:false`). Every response names its sources and the ML status; keep it that way. The advice payload carries a `working` block (`_build_working`) — numbered `steps` plus a flat `transcript` — so a recommendation traces back to its arithmetic; `working` explains, never changes.

**The model artifact is a `.ubj`, not the pickle, and that is deliberate.** Pickling the XGBoost sklearn wrapper is not version-portable: the training run wrote the fitted intercept in array form (`base_score: [2.424006E3]`), XGBoost 2.1.x cannot parse that, silently resets it to 0.5, and every prediction lands ~₹2424/quintal low — negative for the cheap crops. `scripts/export_price_model.py` reads the true value back out of the pickle's own bytes and re-exports `mandi_price_model.ubj` + `.meta.json` (feature order, encoder classes as plain lists — no joblib/sklearn at runtime). Re-run it if the model is retrained. `forecast_model.py` loads that pair first and falls back to the `.pkl` with the same byte-level intercept recovery; either way a **load-time health check** (flat series in → near-flat out, per crop) disables the model rather than let a broken artifact through.

Two guards keep model output honest, and both are load-bearing:
- **Unknown categoricals are NaN, never index 0.** An unrecognised mandi encoded as `0` would silently be priced as 'Achalpur'. NaN is what XGBoost's missing-value branch is for. Since `getAgmarknetHistory` averages across markets by design, `/api/prices/model-forecast` sends **no market at all** unless one is asked for — it is a *state-level* forecast (`scope: 'state'`), and `price_range` is the **median** min/max across reporting markets, not whichever market tops the rate-sorted list.
- **`MAX_PLAUSIBLE_CHANGE_PCT` (±35%).** Fed a price outside its training range (tomato at ₹11/kg against a ₹24 training mean) the model regresses toward the intercept and returns +200%. Such a prediction is **withheld with its reason**, never clamped into a number nothing supports.

Frontend: the forecast chart draws the model series when available and the history-trend line otherwise. `ForecastChart` takes a `note` prop — its idle caption must not say "guessed from past mandi rates" under a model line. `ForecastNote.jsx` distinguishes three states (model used / model running but nothing to say for this crop / model unavailable), names each engine's crop coverage from `/model-info`, and states that the chart is the Maharashtra-wide average while the headline above it is the best-paying mandi. Model artifacts + training notebook live in `ai-engine/app/models/`; `xgboost` + `joblib` are in `requirements.txt`.

**The backend has no watcher** (`npm run dev` is plain `node src/server.js`), so new routes only appear after a manual restart — the usual reason a finished change "isn't showing on the page". The ai-engine's `--reload` does pick Python changes up.

`ai-engine/app/core/config.py` is now valid (`pydantic.BaseModel`, `load_dotenv()`) and **is** imported (config + weather service). Copy `ai-engine/.env.example` → `ai-engine/.env` for `OPENWEATHER_API_KEY`; an absent key just drops the weather term from the score.

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

### Maps — one component, one theme, and a line that admits what drew it

`frontend/src/shared/map/` is the whole map layer: `mapTheme.js`, `RouteMap.jsx`, `MapPanel.jsx`, `useRouteGeometry.js`. Nothing else constructs a map.

- **Themed, not stock.** `mapTheme.js` fetches CARTO's Positron style once per session and retints it to the rate-board palette *before* the map is constructed — paper ground, ink roads, POIs hidden — so a map never flashes somebody else's grey. It matches on layer **role** (`is this a road line / a water fill / a POI label`), never on a hardcoded list of CARTO layer ids, which get renamed between releases. Basemap unreachable → `PAPER_ONLY_STYLE`: paper, and our own marks still correctly positioned.
- **Lazy.** MapLibre is ~970 kB and lives in its own chunk. `MapPanel` is a disclosure that `React.lazy`-loads `RouteMap` and fetches geometry only once opened. A farmer who never opens a map never downloads one. **`vite.config.js` must keep `optimizeDeps.exclude: ['maplibre-gl']`** — pre-bundling breaks its tile worker's `import.meta.url`, and the failure mode is a silent blank rectangle with `load` never firing.
- **The map draws roads; the VRP still ranks on haversine × 1.3.** `backend/src/services/routingService.js` proxies OSRM (keyless demo server, `OSRM_URL` to override), TTL-cached with in-flight de-duplication, and falls back to straight legs measured exactly the way the ranking measures. `source` is `'osrm' | 'straight-line'`, the straight case is drawn **dashed** as well as captioned, and where both numbers exist the caption prints them side by side. Never let a road-shaped line imply the ranking was road-measured.
- Stops with no coordinate are **dropped and counted** on the caption, never nudged onto a nearby town — the `mandiGeo.js` rule, applied to drawing.

### Real-time

`backend/src/sockets/trackingSocket.js` + `frontend/src/services/socket.js` (one shared connection) + `frontend/src/hooks/useVehicleTracking.js`. Events: `driver_location_update` (rebroadcast as `vehicle:location_changed`), `simulation:start_tracking` (server-side 2s interpolation Nashik→Vashi), and `dev_simulate_traffic` → `dev:traffic_reroute_event`, a scripted demo reroute with hardcoded metrics.

**A position enters the system only through an authenticated REST call.** `POST /api/fleet/:id/location` proves ownership, writes it, and only then broadcasts via `sockets/bus.js` — the socket layer has no auth, so anything a client could emit could move another owner's truck across a farmer's map. Fixes carry `source`: `'report'` is real, anything else (the simulator sends `'simulation'`) is stamped by the map. `TrackingMap` always prints the age of the fix; a stale position shown as live is how a farmer ends up waiting at a gate. `useSocket.js` is the older per-component connection and is unused.

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
- Tracking is one record read by both sides: the server appends to `PickupRequest.timeline` on every status change, and `TrackingTimeline.jsx` + `TrackingMap.jsx` render it for the farmer and the fleet owner alike, so the two can never see different accounts of the same lot.
- `RouteDiagram` (sequence) and `MapPanel` (geography) both sit under "show the working" and neither replaces the other: the strip answers *where in the sequence* the farmer slots in, the map answers *how far off the route it already drives*.
- **This endpoint deliberately has no client-side fallback**, unlike every other boundary here. Two copies of a ranking algorithm can drift apart, and a dispatcher acting on the wrong one commits a real truck; the screen says it is unreachable instead.
- `ai-engine/app/services/vrp_service.py` still calls itself an OR-Tools VRP and is not one — it round-robins vehicles with `idx % len(...)`. It is out of scope and unused by this path; `VRP.md` §2 records the overstatement rather than patching the string.
