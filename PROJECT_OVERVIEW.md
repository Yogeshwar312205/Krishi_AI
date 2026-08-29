# KrishiFlow — Complete End-to-End Project Reference

> Single-file master reference for the whole system. Written to be exported to
> PDF and used as project context. Everything important — architecture, stack,
> data sources, the ML model, the VRP, the RAG assistant, i18n, the design
> system, the API surface, data models, environment, sample accounts, run
> instructions, CI and known limits — is here.
>
> Companion docs (kept for depth, all consistent with this file):
> `README.md`, `CLAUDE.md`, `VRP.md`, `prediction.md`, `BUYER_FEATURES.md`,
> `BLACKOUT.md` (data-loss detection & recovery subsystem),
> `SAMPLE_USERS.md`, and `backend/src/rag/knowledgeBase/*.md`.

---

## 1. What KrishiFlow is

KrishiFlow is a three-service web platform that helps smallholder farmers in
Maharashtra decide **where to sell a harvested lot, whether to sell now or wait,
and how to get it there cheaply** — and gives fleet owners a capacitated
vehicle-routing dispatch board to serve those farmers.

It connects three roles:

| Role | Who | Core job in the app |
| --- | --- | --- |
| **Farmer** | Grows the crop, raises pickup requests | Compare mandis by *net* take-home, get sell/hold advice, agree a rate with a trader, ask for a pickup, track the lot |
| **Logistics** (fleet owner) | Owns the trucks, runs Dispatch | Rank own vehicles against the pending farmer queue by extra road-km (cheapest-insertion VRP), approve one, move the job through its statuses, share live location |
| **APMC Buyer** | Trader / commission agent at a mandi | Post procurement rates, receive farmer enquiries in an inbound list, quote an agreed rate back |

There is deliberately **no Driver role** — a driver is a name and a phone number
on a vehicle. Legacy `Driver` / `Transporter` accounts still log in and are
normalised to Logistics.

### Design philosophy (the properties that shape every decision)

1. **Everything degrades instead of failing.** Every external boundary (Mongo,
   the Python engine, the Agmarknet feed, OSRM, OpenWeather, Gemini) has a
   fallback, and every response names its data source (`aiEngineSource`,
   `source`, `isLiveGovtData`, `dataSource`) so the UI can be honest about what
   the user is looking at.
2. **The "AI" is mostly transparent arithmetic, and the code says so.** Market
   ranking is haversine distance × road factor and net-profit math; spoilage is
   a Q10 exponential decay formula; the VRP is a cheapest-insertion heuristic.
   The one genuinely trained model (XGBoost price forecast) is guarded and its
   availability is reported live.
3. **Never synthesise a coordinate or a phone number.** Distance drives freight,
   freight drives net profit, net profit is the number a farmer acts on — so a
   market or request that cannot be located is dropped/flagged, never given a
   plausible-looking position. We hold no phone numbers for the ~290 mandi
   yards, so we never invent one.
4. **Show the working.** Every headline number opens into the arithmetic that
   produced it (`MandiRow`, `WhyFurther`, dispatch `workings`, the advice
   `working` block).
5. **A truck may not be booked without an agreed price.** The vehicle panel is
   gated on an agreed mandi deal for the currently loaded crop.

---

## 2. Architecture at a glance

```text
                         ┌─────────────────────────────┐
   Browser (SPA)  ───────▶  frontend/  React 18 + Vite  │  :3000
                         │  Zustand · Tailwind · MapLibre│
                         └──────────────┬──────────────┘
                                        │ REST + Socket.io  (the ONLY thing the
                                        │                    frontend talks to)
                         ┌──────────────▼──────────────┐
                         │  backend/  Node + Express    │  :5000
                         │  JWT · RBAC · Helmet · rate  │
                         │  limit · Winston · Socket.io │
                         │  RAG agent (Gemini)          │
                         └───┬───────────┬───────────┬──┘
                             │           │           │
             ┌───────────────▼──┐  ┌─────▼──────┐  ┌─▼───────────────────────┐
             │ MongoDB (Mongoose)│  │ ai-engine/ │  │ External feeds:          │
             │ 2dsphere geo      │  │ FastAPI    │  │ • data.gov.in Agmarknet  │
             │ degrades to warn  │  │ :8000      │  │ • OpenWeather            │
             └───────────────────┘  │ price/VRP/ │  │ • OSRM (road geometry)   │
                                    │ spoilage   │  │ • Google Gemini (RAG)    │
                                    └────────────┘  └─────────────────────────┘
```

- **One repo, three deployables.** `backend/` (Node), `ai-engine/` (Python),
  `frontend/` (static SPA).
- **The Node backend is the only thing the frontend talks to.** It orchestrates
  MongoDB, the Python engine, and every third-party feed.
- **No backend watcher.** `npm run dev` is plain `node src/server.js` — new
  routes require a manual restart. The ai-engine's `--reload` does pick up
  Python changes.

### Degradation map

| Boundary | Primary | Fallback | How you can tell |
| --- | --- | --- | --- |
| MongoDB | Atlas / local `MONGODB_URI` | App runs with `isConnected === false`; controllers `try/catch` every query | `/health` → `dbConnected` |
| Python engine | axios-retry 3× exp backoff, 5s timeout | `fallbackOptimization()` — JS reimplementation of the same profit math | `aiEngineSource` in the response |
| Agmarknet feed | data.gov.in resource `35985678-…` with your key | Shared sample key (hard rate-limited) → then `demoMarket.js`, stamped `<DemoStamp/>` | `isLiveGovtData`, `MarketStatusStamp` |
| Road geometry | OSRM (`OSRM_URL`) | Straight legs, drawn dashed and captioned as straight | `source: 'osrm' \| 'straight-line'` |
| OpenWeather | `OPENWEATHER_API_KEY` | Weather term dropped from the price context score | advice response says so |
| Gemini (RAG + explanations) | `GEMINI_API_KEY`, current model id | Deterministic grounded synthesizer over the same fact set, visibly labelled | answer text / `hasApiKey` |
| Gemini embeddings | `embedContent` API | Local 128-dim TF-IDF / hashing vectoriser | embedding `source` |
| Auth (frontend) | Real backend login | Synthetic demo session **only when server unreachable** (`!err.response`) — a real 401 stays an error | — |
| Dispatch suggestions | Backend cheapest-insertion engine | **NONE, on purpose** — screen shows "dispatch engine unreachable" | — |

---

## 3. Technology stack

### 3.1 Frontend — `frontend/` (port 3000, Vite dev server)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **React 18** (`react`, `react-dom` ^18.2) | SPA, no router library — one Zustand store drives screen selection |
| Build | **Vite ^5.2** + `@vitejs/plugin-react` | `optimizeDeps.exclude: ['maplibre-gl']` is **required** (pre-bundling breaks its tile worker's `import.meta.url` → silent blank map). Dev proxy `/api` → `:5000` |
| State | **Zustand ^4.5** (`src/store/useAppStore.js`) | One store, no context providers. Auth rehydrated from `localStorage` (`user` + `token` must both exist or both are cleared) |
| Styling | **Tailwind CSS ^3.4** + PostCSS + Autoprefixer | `tailwind.config.js` **replaces** (not extends) `borderRadius` and `fontSize` — the visual language is a painted APMC rate board: square corners, ruled rows, numeral-first, no shadows |
| Maps | **MapLibre GL ^6.4** | ~970 kB, lazy-loaded in its own chunk via `React.lazy`; CARTO Positron style retinted to the rate-board palette before construction. Whole map layer is `src/shared/map/` |
| Icons | **lucide-react** | |
| Realtime | **socket.io-client ^4.7** | one shared connection (`src/services/socket.js`) |
| HTTP | **axios ^1.6** | `src/services/api.js` |
| i18n | Custom (`src/i18n/`) — **no library** | English / Hindi / Marathi, build-enforced by `scripts/check-i18n.mjs` |
| Voice | Web Speech API (`src/shared/voice/`) | `SpeechRecognition` + `speechSynthesis`, trilingual; voices loaded async |
| Tests / lint | **None.** `npm run build` (runs `check:i18n` first) is the only gate | |

**Frontend layout:**

- `src/app/routes.js` — single source of tab ids, per-role tab lists, role
  normalisation. Max **four tabs per role** (hard constraint: 56px mobile bottom
  bar with Devanagari labels).
- `src/features/**` — current architecture (auth, farmer, logistics, buyer,
  profile, rag). `src/components/**` — legacy, lazy-loaded, still backs some
  buyer screens and the old map view.
- `src/design/primitives/` — React wrappers over the `@layer components`
  classes in `index.css` (`btn-*`, `field`, `docket`, `rule-strong`, `furrow`,
  `stamp-demo`).
- `src/data/marketCache.js` — one shared 10-min TTL cache with in-flight
  de-duplication and a background refresh timer; screens read it via
  `useSyncExternalStore`. Cache keys are **crop only** — distance/profit are
  recomputed client-side so changing quantity or farm location never re-fetches.

### 3.2 Backend — `backend/` (port 5000)

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | **Node.js 18**, **Express ^4.19** | `npm run dev` === `npm start` === `node src/server.js` (no watcher) |
| DB / ODM | **MongoDB** + **Mongoose ^8.3** | `config/db.js` — failed connect logged as a warning, never thrown |
| Auth | **jsonwebtoken ^9**, **bcryptjs ^2.4** | `middlewares/auth.js` `protect` + `authorize(...roles)` |
| Security | **helmet ^7** (CSP off), **cors** (`origin: '*'`), **express-rate-limit ^7** | `middlewares/rateLimiter.js`: `authLimiter` (tight, for login + password change), `apiLimiter`, `dispatchLimiter` |
| Realtime | **socket.io ^4.7** | `sockets/trackingSocket.js` + `sockets/bus.js` |
| HTTP client | **axios ^1.6** + **axios-retry ^4** | Python engine calls: 3 retries, exponential backoff, 5s timeout |
| Logging | **winston ^3.13** | `utils/logger.js` |
| RAG LLM | **Google Gemini** via REST (`generativelanguage.googleapis.com`) | no SDK — plain axios; model `gemini-flash-lite-latest` by default |
| Config | **dotenv ^16** | reads `MONGODB_URI`, `PYTHON_ENGINE_URL` (compose still sets the ignored older `MONGO_URI` / `AI_ENGINE_URL`) |

**Backend layout:** `src/config` · `src/controllers` · `src/middlewares` ·
`src/models` · `src/routes` · `src/services` · `src/sockets` · `src/data` ·
`src/rag` (the whole RAG subsystem) · `src/utils`. Scripts:
`seedAccounts.js`, `clearRequests.js`, `indexKnowledge.js`, `evaluateRAG.js`.

### 3.3 AI engine — `ai-engine/` (port 8000, uvicorn `--reload`)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **FastAPI 0.110** + **uvicorn 0.29** | `python -m uvicorn app.main:app --port 8000 --reload` |
| Validation | **pydantic 2.6** | `app/schemas/models.py`, `app/core/config.py` (`BaseModel` + `load_dotenv()`) |
| ML runtime | **xgboost 2.1.4** + **joblib 1.5.3** | Loads `mandi_price_model.ubj` (+ `.meta.json`); `.pkl` fallback with byte-level intercept recovery |
| Numerics | **numpy 1.26.4**, **pandas 2.2.1** | |
| Declared-but-unused | **ortools 9.9**, **lightgbm 4.3**, **scikit-learn 1.4** | In `requirements.txt`, imported nowhere. The README/older strings overstate this; the code does not |
| Weather | OpenWeather "Current Weather Data" REST (`app/services/weather_service.py`) | key optional |

**AI engine layout:** `app/main.py` (3 routers + `/health`) ·
`app/api/endpoints/{predict,spoilage,optimize}.py` ·
`app/services/{price_service,forecast_model,spoilage_service,vrp_service,weather_service}.py` ·
`app/data/crop_weather_profiles.py` · `app/models/` (`.ubj`, `.meta.json`,
`.pkl`, training notebook) · `scripts/export_price_model.py`.

---

## 4. External data sources

| Source | Used for | Key / env | Reality check |
| --- | --- | --- | --- |
| **data.gov.in Agmarknet** resource `35985678-0d79-46b4-9ed6-6f13308a1d24` | Live Maharashtra mandi modal prices, per commodity | `AGMARKNET_API_KEY` (backend) | Capitalised field names (`Modal_Price`, `Market`, `Arrival_Date`); per-quintal string prices; multi-year archive in no useful order → must `sort[Arrival_Date]=desc`; **no arrivals column, no coordinates**. Sample key is hard rate-limited → the reason for TTL caching |
| **`backend/src/data/mandiGeo.js`** | Real mandi coordinates in 3 honest tiers | — | `geoPrecision`: exact market yard / taluka town matched by name / district HQ. Unresolved → `coordinates: null`, dropped from ranking. District hauls floored (`DISTRICT_MIN_HAUL_KM = 30 km`) and flagged `distanceApprox` |
| **OpenWeather** | Rule-based price context scorer (weather × per-crop friendliness) | `OPENWEATHER_API_KEY` (ai-engine) | Absent key → weather term dropped, everything else works |
| **OSRM** (public demo router) | Road geometry for map drawing only | `OSRM_URL` (backend) | The VRP still ranks on haversine × 1.3, never the routed line. Unreachable → straight dashed legs |
| **Google Gemini** | RAG answer generation, embeddings, grounded price explanations | `GEMINI_API_KEY`, `GEMINI_MODEL`, `EMBEDDING_MODEL` (backend) | Retired model ids (`gemini-1.5-flash`, `gemini-2.x`) 404; `-latest` aliases stay valid. Absent → deterministic synthesizer |

**Crop coverage (frontend `CROP_OPTIONS`, 19 first-class translated crops):**
Onion, Tomato, Potato, Wheat, Soyabean, Jowar(Sorghum),
Bajra(Pearl Millet/Cumbu), Maize, Bengal Gram(Gram)(Whole),
Red gram/Arhar/Tur(whole), Groundnut, Rice, Green Chilli, Brinjal, Cabbage,
Cauliflower, Pomegranate, Banana, Mango. Each string is the **exact** feed
`Commodity` value. The crop picker also offers the full ~119 live commodities
from `/api/agmarknet/commodities`.

---

## 5. Price intelligence (`ai-engine/app/services/price_service.py`)

Organised in four labelled sections:

1. **Static ₹/kg reference table** — hand-maintained baseline per crop/city
   (Nashik / Mumbai / Pune / Surat / Default), 10 crops. A lookup, not a
   forecast; it is the baseline SECTION 2 adjusts and the fallback when no live
   rate is passed.
2. **Rule-based context scorer** — OpenWeather crossed with per-crop
   weather-friendliness (`crop_weather_profiles.py` — 10 tuned crops: Tomato,
   Onion, Potato, Rice, Wheat, Mango, Banana, Grapes, Soyabean, Maize; generic
   default otherwise) **plus a demand/supply read**. Produces a price
   adjustment and a call: `SELL_NOW` / `SELL_SOON` / `HOLD` / `HOLD_STRONG`.
   The demand/supply signal is **price momentum only** (today's modal vs its
   ~14-day trailing average from real Agmarknet history) — it does **not** use
   feed "arrivals" (`agmarknetService.js` synthesises those).
3. **Trained ML model** — see §6.
4. **Orchestrator** `predict_crop_price()` — ties the available signals
   together and names which were used.

**AI-engine price endpoints:**

| Endpoint | Returns |
| --- | --- |
| `POST /predict-price` | baseline + context adjustment + sell/hold call, model forecast blended in (weight 0.5) when healthy and history supplied |
| `POST /price-context` | advice only, for a price the caller already has |
| `POST /price-forecast` | model 7-period point + a chart series (solid history → dashed straight projection with a widening display band) |
| `GET /model-info` | model status + crop coverage |
| `GET /price-reference` | raw static-table baseline (debug) |

**Node side:**

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/prices/sell-advice` | rule-based advice + trained forecast + a **deterministic combined recommendation** (`priceSuggestionService.buildPriceDecision`). A model move ≥ 5% can soften `SELL_SOON`→`HOLD` (predicted rise) or `HOLD`/`HOLD_STRONG`→`SELL_SOON` (predicted fall). `SELL_NOW` is **never** overridden (quality risk is time-critical). Degrades to prices-only. Carries a `working` block (`_build_working`: numbered `steps` + flat `transcript`). When `GEMINI_API_KEY` is set, Gemini gets only the computed fact set and writes a ≤3-reason explanation (JSON, no new facts/prices, cannot change the recommendation); otherwise a labelled deterministic explanation from the same inputs |
| `GET /api/prices/model-forecast` | model chart series + crop coverage for the UI NOTE; degrades to `forecast.available: false` |
| `GET /api/prices/forecast`, `GET /api/demand/analysis` | trend chart + demand read |

---

## 6. The trained forecast model

| Item | Detail |
| --- | --- |
| Algorithm | **XGBoost regressor** (gradient-boosted trees) |
| Target | Modal mandi price, **~7 reporting periods ahead** |
| Training data | Agmarknet daily archive **2023-06-06 → 2025-06-06** |
| Geography | **Maharashtra only** |
| Crops | **Onion, Potato, Rice, Tomato, Wheat** (5) |
| Unit | Predicts ₹/quintal internally; API + UI show ₹/kg |
| Inputs | crop, optional market/district, recent price lags, 7/14-period rolling stats, current min/max range, calendar fields |
| Runtime artifact | `ai-engine/app/models/mandi_price_model.ubj` + `.meta.json` (feature order, encoder classes as plain lists — no joblib/sklearn at runtime) |

**Why `.ubj`, not the pickle.** Pickling the XGBoost sklearn wrapper is not
version-portable: the training run wrote the fitted intercept in array form
(`base_score: [2.424006E3]`), XGBoost 2.1.x cannot parse that, silently resets
it to 0.5, and every prediction lands ~₹2424/quintal low (negative for cheap
crops). `scripts/export_price_model.py` reads the true value out of the pickle's
own bytes and re-exports the `.ubj` + `.meta.json`. Re-run it if the model is
retrained. `forecast_model.py` loads that pair first and falls back to the
`.pkl` with the same byte-level intercept recovery.

**Two load-bearing honesty guards:**

1. **Load-time health check** — flat series in → near-flat out, per crop; a
   broken artifact **disables the model** rather than serving nonsense.
2. **Unknown categoricals are `NaN`, never index 0** — an unrecognised mandi
   encoded as `0` would silently be priced as 'Achalpur'. NaN is XGBoost's
   missing-value branch. `/api/prices/model-forecast` therefore sends **no
   market at all** unless one is asked for — it is a **state-level** forecast
   (`scope: 'state'`), and `price_range` is the **median** min/max across
   reporting markets.
3. **`MAX_PLAUSIBLE_CHANGE_PCT` = ±35%** — fed a price outside its training
   range the model regresses toward the intercept and can return +200%. Such a
   prediction is **withheld with its reason**, never clamped into a number
   nothing supports.

**When the UI falls back to a plain history trend instead of the model:** crop
outside the five; no usable recent history; artifact fails the health check or
the engine is down; implied 7-period change exceeds ±35%. `ForecastNote.jsx`
distinguishes the three states (model used / model running but nothing to say
for this crop / model unavailable) and never captions a model line with
"guessed from past mandi rates".

---

## 7. Spoilage model (`ai-engine/app/services/spoilage_service.py`)

Exponential (Q10) perishability decay:

```
spoilage% = min(100, (1 − e^(−k · travel_hours · temp_factor)) · 100)
temp_factor = 2 ^ ((effective_temp − 20) / 10)     # decay doubles per +10°C
effective_temp = 4°C if refrigerated else ambient_temp
```

Per-hour decay constants `k` at 25°C: Tomato 0.035, Mango 0.045, Banana 0.038,
Potato 0.008, Onion 0.005, Rice/Wheat 0.001, default 0.02. Endpoint
`POST /calculate-spoilage` → `{ spoilageRiskPercent, usableCropRatio,
effectiveTempCelsius, … }`. Used by the farmer net-profit math and by the RAG
transport-risk tool.

---

## 8. Logistics — the capacitated VRP (see `VRP.md` for the full spec)

**Status:** implemented, rule-based, human-in-the-loop, persisted in MongoDB.
**Where:** `backend/src/services/insertionService.js` ·
`controllers/{dispatch,request,fleet}Controller.js` ·
`models/{Vehicle,PickupRequest}.js` · `frontend/src/features/logistics/`.

### The problem

A fleet owner runs a few trucks, each with a capacity and already part-way
through an **open route** (a committed stop sequence, no return-to-depot leg).
Farmers, having agreed a price with a trader, raise pickup requests (farm
location, quantity, crop, destination mandi, time window). **Which vehicle
should serve which farmer?** — a Capacitated VRP with pickup-and-delivery pairs.

### The algorithm — cheapest-insertion heuristic

- For every `(vehicle, request)` pair, compute the **extra road km** to slot
  that farmer into the route the vehicle is already driving. Reject pairs that
  break capacity. Rank the rest by that cost. **The system proposes; a human
  confirms.** Nothing auto-assigns.
- **A request is two stops** — a pickup `(i)` and a drop `(j)`, `i < j`,
  inserted as an ordered pair. Every ordered position pair is tried: `O(n²)` per
  `(vehicle, request)`, `n` = a handful of stops.
- **Capacity is the peak load across the whole sequence** (`loadProfile()`),
  not `capacity − currentLoad`. `loadDeltaKg` is `+qty` at a pickup, `−qty` at a
  drop. `remainingCapacityAfterKg` is derived from the peak so the card shows
  the number that was tested.
- **`currentRoute[0]` is where the vehicle is now** and is never displaced —
  insertion positions start at index 1.
- **Time windows are shown, never enforced.** ETA hours resolve in
  `Asia/Kolkata` explicitly; a vehicle with no `routeStartAt` returns
  `verdict: 'unknown'` (an ETA invented from an unknown departure is worse than
  none).
- **`infeasible` and `unrankable` are returned, not filtered away**, each with
  its reason. A request missing a coordinate is `unrankable` — never given a
  guessed position (same rule as `mandiGeo.js`; vehicle bases come from
  `features/logistics/baseLocations.js` rather than typed).
- **Pending requests are not scoped to one fleet.** Every owner sees them; the
  claim is a conditional update on `status: 'pending'`, so the second owner to
  approve gets a **409**, not a double booking.

### Constants

| Constant | Value | Why |
| --- | --- | --- |
| `ROAD_FACTOR` | 1.3 | straight-line × 1.3, standard Indian-road planning approximation (imported from `mandiGeo.js`) |
| `AVG_SPEED_KMH` | 45 | loaded truck on Maharashtra state highways incl. mandi-approach crawl |
| `SERVICE_MINUTES_PER_STOP` | 20 | time on the ground at a farm gate or mandi yard |
| `DEFAULT_TOP_N` | 3 | suggestions per vehicle |

### API contract (all authenticated, all caller-scoped)

| Route | Role | Purpose |
| --- | --- | --- |
| `POST /api/requests` | Farmer | Raise a pickup request |
| `GET /api/requests/mine` | Farmer | Own requests + assigned vehicle + timeline |
| `POST /api/requests/:id/cancel` | Farmer | Withdraw one nobody has taken |
| `GET /api/requests/inbound` | Buyer | Enquiries + shipments for this buyer's postings |
| `GET /api/dispatch/suggestions` | Fleet owner | The ranked queue (takes **no fleet payload** — reads the caller's own vehicles + open queue from Mongo; `topN` the only param) |
| `POST /api/requests/:id/assign` | Fleet owner | Claim a request, commit the exact `proposedRoute` shown |
| `GET /api/requests/queue` | Fleet owner | Pending + this owner's own jobs |
| `POST /api/requests/:id/status` | Fleet owner | `collected` → `in_transit` → `delivered` |
| `GET` / `POST /api/fleet` | Fleet owner | Own vehicles |
| `POST /api/fleet/:id/location` | Fleet owner | Report a position (see §10) |

`GET /api/dispatch/suggestions` response names itself:
`"source": "Cheapest Insertion Heuristic (rule-based, no solver)"`, with
`params`, `counts`, `suggestions[]`, `infeasible[]`, `unrankable[]`. **This one
endpoint deliberately has no client-side fallback** — two copies of a ranking
algorithm can drift and a dispatcher acting on the wrong one commits a real
truck; the screen says "unreachable" instead.

### The dispatcher screen

Role **Logistics**, tabs **Dispatch · Jobs · Fleet · Routes**. Each suggestion
card shows insertion cost as +km / +min / +₹, a segmented capacity bar
(existing load │ this request │ free), produce compatibility (perishable on a
non-refrigerated deck = amber warning, never a filter), requested window vs
computed ETA, a `RouteDiagram` (sequence before/after), a `MapPanel` (geography,
proposed route on roads + old route dashed), "show the working" (removed leg +
added legs in km), and Approve / Reject. Rejecting a suggestion dismisses the
pair, not the request.

### Limits / where a real solver goes

Cheapest insertion is **greedy and order-dependent** — it never revisits an
assignment; approve A then B and you can end up worse than B then A. Ignores
driver hours, road classes, tolls, real traffic, gate timings. Distances are
haversine × 1.3 (~±15% on highways, wrong in hills). The correct upgrade is an
OR-Tools `RoutingModel` (`AddDimensionWithVehicleCapacity`,
`AddPickupAndDelivery`, time-window dimensions, guided local search over the
whole fleet) — not built, on purpose: a heuristic whose every number can be
justified to a dispatcher beats a solver nobody in the room can explain.

> `ai-engine/app/services/vrp_service.py` still calls itself "Google OR-Tools
> Multi-Objective VRP" and is **not** one — it round-robins vehicles with
> `idx % len(...)` over a market list. It is out of scope and unused by the
> dispatch path; `VRP.md` §2 records the overstatement rather than patching the
> string.

---

## 9. The deal gate

`TransportScreen` runs three panels in a fixed order: **Mandi deal → Book a
vehicle → My bookings**. The vehicle panel is **gated on an agreed deal for the
currently loaded crop** — a product invariant, so a farmer can't hire a truck to
a mandi where nobody agreed to receive the lot at a quoted price.

- `store.deals[]` carries `agreedRatePerKg` (what the farmer actually gets).
  The Agmarknet modal price (`boardRatePerKg`) is only a reason to *choose* a
  mandi, never a quote. Bookings, waybills and the buyer's inbound list all read
  the agreed rate.
- `data/traders.js` decides who the farmer can talk to. `sameMandi()`
  reconciles feed names ("Mumbai APMC") with buyer-typed ones ("Vashi Wholesale
  APMC") via noise-word stripping + a small alias table. Match → in-app thread;
  no match → we say so and offer the Kisan Call Centre. **Never invent a phone
  number for a mandi.**
- The Prices screen hands its selection over via `store.pendingMandi`.
- Deals filter by crop (`deal.cropType === cropDetails.cropType`).
- `BuyerInboundScreen` is the other half: enquiries above shipments, with a
  reply + a quote action that writes `agreedRatePerKg` back.

---

## 10. Real-time tracking

`backend/src/sockets/trackingSocket.js` + `sockets/bus.js` +
`frontend/src/services/socket.js` (one shared connection) +
`frontend/src/hooks/useVehicleTracking.js`.

**A position enters the system only through an authenticated REST call.**
`POST /api/fleet/:id/location` proves ownership, writes the last known point,
**then** broadcasts `vehicle:location_changed` via `sockets/bus.js`. The socket
layer has no auth, so nothing a client could emit can move another owner's
truck. Fixes carry `source`: `'report'` is real; anything else (the simulator
sends `'simulation'`) is stamped on the map. `TrackingMap` always prints the
**age of the fix** — a stale position shown as live is how a farmer ends up
waiting at a gate.

Events: `driver_location_update` (rebroadcast as `vehicle:location_changed`),
`simulation:start_tracking` (server-side 2s interpolation Nashik→Vashi),
`dev_simulate_traffic` → `dev:traffic_reroute_event` (scripted demo reroute,
hardcoded metrics).

**Coordinates are `[longitude, latitude]` everywhere** — API, store, Mongo —
except `trackingSocket.js`'s `newPolylineWaypoints`, which are `[lat, lng]`.

---

## 11. RAG assistant (`backend/src/rag/`)

A retrieval-augmented, tool-using, trilingual assistant behind
`POST /api/rag/chat` (JWT-protected). Rendered by
`frontend/src/features/rag/RAGAssistantModal.jsx`.

### Pipeline (`rag/agent/ragAgent.js`)

1. **Sanitize** — `security/promptInjection.js` strips jailbreak patterns
   ("ignore all previous instructions", `system:`, HTML tags).
2. **Query processing** — `agent/queryProcessor.js`: language detection
   (en/hi/mr via Devanagari + distinctive Marathi keywords) + entity extraction
   (commodity, market, state). An explicit client language toggle wins over
   detection and is re-pinned after the session merge.
3. **Intent classification** — `agent/intentClassifier.js` → one of
   `LIVE_MARKET_PRICE`, `USER_VEHICLES`, `USER_TRIPS`, `AVAILABLE_FLEET`,
   `TRANSPORT_RISK`, `PRICE_FORECAST`, `COMBINED`, `PROFIT_CALCULATION`,
   `KNOWLEDGE`, `UNKNOWN`.
4. **Multi-turn session context** — `agent/sessionManager.js`, keyed by
   conversationId or user id; enforces zero cross-session leakage. Clarifies
   when a market is named without a commodity.
5. **Routing** — `agent/router.js` picks a mode:
   - `TOOL_ONLY` — pure live/DB tool (market prices, user's vehicles, trips,
     available fleet).
   - `COMBINED` — tool result + RAG knowledge chunks (spoilage risk, price
     forecast, net-profit).
   - `RAG_ONLY` — pure knowledge-base retrieval.
6. **Retrieval** — `retrieval/retriever.js` → `hybridSearch.js` (vector 0.7 +
   keyword 0.3) → `reranker.js`; `security/accessFilter.js` drops chunks the
   caller's role may not see. Thresholds `RAG_RELEVANCE_THRESHOLD` (0.42),
   `RAG_TOP_K` (5).
7. **Generation** — `service/geminiService.js` calls Gemini
   `generateContent` with a mandatory-language directive, temperature 0.2,
   `maxOutputTokens` 2048. Retries once on a current model if the configured id
   is retired. No key / unavailable / rate-limited → `synthesizeGroundedFallback`
   extracts exact facts from the context XML blocks (trilingual).
8. **Output guards** —
   - `security/outputGuard.js` scrubs secrets (`krishi@2026`, Mongo SRV URIs,
     `AIzaSy…` keys, `JWT_SECRET=…`, `admin123`).
   - **Strict market validation** — if the answer mentions a market other than
     the one asked for, it is overridden with a deterministic backend line.
   - **Refusal safety net** — if a computed tool succeeded but the model
     returned a refusal-shaped answer, the deterministic synthesizer is served
     instead.
9. **Citations** — `citations/citationBuilder.js` from the chunks + tool result.

### Tools (`rag/tools/`, via `toolRegistry.js`)

`getLiveMandiPrices` (Agmarknet), `getUserVehicles` (Mongo, owner-scoped),
`getUserTrips` (Mongo), `getAvailableVehicles` (Mongo),
`getTransportSpoilageRisk` (Q10 model + OpenWeather), `getPriceForecast`
(XGBoost + rule-based).

### Knowledge base (`rag/knowledgeBase/*.md`)

Markdown with YAML frontmatter (`documentId`, `title`, `accessLevel`, `roles`,
`sensitivity`). Indexed on server start (`ingestion/indexer.js`:
`documentLoader` → `chunker` → `embeddingService` → `mongoVectorStore`;
`mockVectorStore` when Mongo is down).

| File | Access | Roles |
| --- | --- | --- |
| `farmer_guide.md` — net-profit calculation | public | all |
| `apmc_buyer_guide.md` — buyer workflow & agreed deals | public | all |
| `faqs_and_troubleshooting.md` — FAQs, credentials, troubleshooting | public | all |
| `vehicle_registration.md` — fleet operations | public | all |
| `logistics_vrp_guide.md` — VRP insertion algorithm | role | logistics, admin |
| `technical_architecture.md` — system architecture | role | admin, logistics |

### Vector store & embeddings

- `embeddingService.js` — Gemini `embedContent` (tries `embedding-001`,
  `gemini-embedding-001`, `gemini-embedding-2`, `text-embedding-004`); local
  fallback is a deterministic **128-dim TF-IDF / hashing vector**, L2-normalised,
  cosine similarity.
- `vectorStore/` — `mongoVectorStore.js` (real) / `mockVectorStore.js`
  (in-memory) behind `vectorStore.js`.

### RAG endpoints

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/rag/health` | public | model id, `hasApiKey`, `totalChunksIndexed` |
| `POST /api/rag/chat` | JWT | ask (`{ message, conversationId?, language? }`) |
| `GET /api/rag/sources` | JWT | list indexed KB documents |
| `POST /api/rag/index` | JWT + Admin | re-index the KB |

Evaluation harness: `node backend/scripts/evaluateRAG.js` (indexes, then runs
role-scoped test cases checking intent, keywords, refusal behaviour).

---

## 12. Full HTTP API surface (Node backend, `/api`)

### Auth (`/api/auth`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/register` | roles: Farmer, Logistics, Trader, Buyer, APMC Buyer. Validates Indian mobile (`^[6-9]\d{9}$` after stripping +91), strong password (8+, letter+digit). Village string → address; coordinates only if a real pair is supplied |
| POST | `/login` | returns JWT + user |
| GET | `/me` · PATCH `/me` · POST `/me/password` | self-service; no id in the path (identity from `protect`); password change under the tighter `authLimiter` |

### Markets, weather, logistics feeds

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/agmarknet/live-rates` | every reporting Maharashtra APMC for a crop; 15-min cache; no client `limit` |
| GET | `/agmarknet/commodities` | what the state is actually reporting (~119) |
| GET | `/agmarknet/history` | recent daily history for trend charts (`days`, default 14) |
| GET | `/markets` | same feed ranked by **net** take-home when `originLng/originLat/quantityKg` given, else by rate; names its `source` and `rankedBy` |
| GET | `/weather/live` | OpenWeather passthrough by lat/lon |
| GET | `/logistics/fuel-rates` | fuel / freight reference |
| GET | `/prices/forecast`, `/demand/analysis`, `/prices/sell-advice`, `/prices/model-forecast` | see §5 |
| POST | `/recommend` | orchestrator: Python engine with retry → `fallbackOptimization()`; response carries `aiEngineSource` |
| POST | `/alerts/send-sms` | SMS alert trigger |

### Vehicles / dispatch / requests / fleet — see §8

### Buyer postings (`/api/buyer/postings`)

| Method | Path | Role |
| --- | --- | --- |
| POST | `/` | Buyer / APMC Buyer / Trader — `expiresAt` computed server-side from `expiresInDays` |
| GET | `/` | any authenticated user; filters `cropType` / `mandiName` / `status`; expired auto-excluded |
| GET | `/mine` | owner (includes expired, for history) |
| DELETE | `/:id` | owner only |
| PATCH | `/:id/received` | owner — bumps `receivedQuantityKg`, status auto-advances |

### Maps

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/routing/route?path=lng,lat;lng,lat;…` | OSRM proxy, drawing only; `source: 'osrm' \| 'straight-line'`; `MAX_WAYPOINTS` cap; TTL-cached |

### Health

`GET /health` → `{ status, dbConnected, aiEngineStatus, pythonDetails }`.
`GET /api/rag/health`. AI engine `GET /health` → `{ services[], priceModel }`.

---

## 13. Data models (MongoDB, Mongoose)

**`User`** — `name`, `email` (unique, lowercased), `password` (bcrypt, `select:false`),
`phone` (stored as typed), `role` (enum incl. legacy `Driver`/`Transporter`),
`location{address, coordinates:[lng,lat]}`, `primaryCrop` (account's crop, not
the current consignment), `buyerAddress` + `buyerCoordinates` (buyer delivery
point). `matchPassword()` method; pre-save hash.

**`Vehicle`** — `owner` (ref User, indexed), `vehicleNo`, `driverName/Phone`,
`vehicleType` (Mini Truck / Refrigerated Van / Heavy Freighter / E-Pickup),
`capacityKg`, `currentLoadKg` (deck load *before* the route runs), `ratePerKm`,
`isRefrigerated`, `baseLocation`, `status` (Idle / Loading / En route /
Unavailable), `routeStartAt` (anchors ETAs), `currentRoute: [StopSchema]`
(`kind: depot|pickup|drop`, `label`, `coordinates:[lng,lat]`, `loadDeltaKg`,
`requestId`), `location` (GeoJSON Point) + `locationUpdatedAt`. Indexes:
`{location: '2dsphere'}`, `{owner, vehicleNo}` unique.

**`PickupRequest`** — `farmer` (ref, indexed), `farmerName/Phone`, `cropType`,
`quantityKg` (min 1), `origin{label, coordinates}`, `destination{label,
coordinates}` (both **required** — no request stored without coordinates),
`agreedRatePerKg`, `buyerPosting` + `buyer` refs, `pickupDate` (ISO string as
picked), `window{startHour, endHour, label}` (hours, because the label is
translated), `status` (pending / assigned / collected / in_transit / delivered /
cancelled, indexed), `assignedVehicle/Owner/At`, `dispatch{insertionCostKm,
addedFreightCost, estimatedAddedMinutes, pickupPosition, dropPosition}`,
`timeline: [{status, at, note}]` (appended server-side on every status change).
Index `{status, createdAt:-1}`.

**`BuyerPosting`** — `buyer` (ref, indexed), `cropType` (indexed), `grade`,
`offeredPricePerKg`, `requiredQuantityKg`, `receivedQuantityKg`, `mandiName`
(indexed), `buyerLocation{address, coordinates:[lng,lat]}` (optional — per
posting, so one buyer can procure at several points), `status` (Active
Procurement / Partial / Fulfilled / Expired / Cancelled, indexed), `expiresAt`
(indexed, server-controlled). Compound indexes `{cropType, mandiName, status}`,
`{expiresAt, status}`. Virtuals `traderName` / `traderPhone` from the buyer ref.

**`Order`** — legacy end-to-end order doc (`cropDetails`, `farmLocation`,
`selectedMarket`, `assignedVehicle`, `optimizationResult{netProfit,
transportCost, spoilageRiskPercent, routeDistanceKm, travelTimeHours}`, status
enum). Still present; superseded by the deal + `PickupRequest` flow.

---

## 14. Frontend design system & i18n

### Design language — "painted APMC rate board"

- `tailwind.config.js` **replaces** `borderRadius` and `fontSize` at the root:
  square corners, ruled rows, numeral-first, no shadows. Replacing (not
  extending) squares off legacy `rounded-3xl` markup without touching those
  files.
- Every `fontSize`/`lineHeight` step resolves through a CSS variable
  (`--lh-slab`, `--lh-display`, `--lh-head`, `--lh-body`,
  `--lh-none/tight/snug/normal`), redefined in `index.css` under
  `:root:lang(hi)` / `:lang(mr)`. **Hardcoding a numeric line-height anywhere
  clips Devanagari matras** in two of the three languages.
- Reusable classes in `index.css` `@layer components`: `btn-*`, `field`,
  `docket`, `rule-strong`, `furrow`, `stamp-demo`. Primitives in
  `src/design/primitives/` wrap them.
- `<DemoStamp />` marks anything rendered from fallback demo data;
  `MarketStatusStamp` picks the stamp from the hook's `status`;
  `LiveStamp` marks live data.

### i18n — three languages, build-enforced

- Never write a bare user-facing string. `useT()` gives `t`, `tCount`, and
  formatters (`money`, `rate`, `number`, `percent`, `shortDate`).
- Add keys to `en.json` first (the checker's reference), then `hi.json` and
  `mr.json` with **identical `{{placeholders}}`**.
- `scripts/check-i18n.mjs` fails the build on a missing key, an extra key, a
  placeholder mismatch, or a value left identical to English (whitelist
  `ALLOWED_IDENTICAL`). Runs as part of `npm run build` — the real CI gate.
- **All numbers format through `en-IN` regardless of UI language**, Latin
  digits (`mr-IN` emits Devanagari digits and Western grouping even with
  `numberingSystem: 'latn'`). Only dates use the language locale. Do not
  simplify `i18n/format.js`.
- `src/i18n/GLOSSARY.md` records register decisions (spoken word over
  government-form word, which loanwords stay, why "cold chain" → "ठंडी गाडी").

---

## 15. Environment variables

### `backend/.env` (copy from `.env.example`)

| Var | Purpose |
| --- | --- |
| `PORT` | default 5000 |
| `NODE_ENV` | |
| `MONGODB_URI` | Atlas SRV or `mongodb://localhost:27017/krishiflow`. Absent/unreachable → app runs disconnected |
| `JWT_SECRET` | token signing |
| `PYTHON_ENGINE_URL` | default `http://localhost:8000` |
| `AGMARKNET_API_KEY` | data.gov.in key; absent → hard-rate-limited sample key |
| `OSRM_URL` | default public OSRM demo; not for production load |
| `GEMINI_API_KEY` | RAG + embeddings + price explanations; absent → deterministic fallbacks |
| `GEMINI_MODEL` | default `gemini-flash-lite-latest` (older ids 404) |
| `EMBEDDING_MODEL` | default `embedding-001` |
| `RAG_RELEVANCE_THRESHOLD` | default 0.42 |
| `RAG_TOP_K` | default 5 |

> `docker-compose.yml` still sets the older `MONGO_URI` / `AI_ENGINE_URL` names,
> which the current code **ignores**.

### `ai-engine/.env` (copy from `.env.example`)

| Var | Purpose |
| --- | --- |
| `PORT` / `HOST` | default 8000 / 0.0.0.0 |
| `OPENWEATHER_API_KEY` | rule-based price context scorer only; blank → weather term dropped |
| `PRICE_MODEL_PATH` | escape hatch — only if the `.ubj` pair is missing |
| `PRICE_MODEL_BASE_SCORE` | escape hatch — force a different intercept for the `.pkl` path |

### `frontend/.env` (copy from `.env.example`)

| Var | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | default `http://localhost:5000` |
| `VITE_SOCKET_URL` | default `http://localhost:5000` |

---

## 16. Running the stack

```bash
# Backend (Node/Express, :5000) — `dev` and `start` are both plain node, NO watcher
cd backend && npm install && npm run dev

# AI engine (FastAPI, :8000) — --reload DOES pick up Python changes
cd ai-engine && pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Vite, :3000)
cd frontend && npm install && npm run dev
npm run check:i18n     # dictionary drift check (also part of `npm run build`)
npm run build          # check:i18n && vite build  ← the only real gate

# Seed the demo LOGINS (idempotent; not demo content)
node backend/scripts/seedAccounts.js
node backend/scripts/clearRequests.js   # empty the dispatch queue between demos
node backend/scripts/indexKnowledge.js  # (re)index the RAG knowledge base
node backend/scripts/evaluateRAG.js     # RAG evaluation suite

# Whole stack
docker compose up
# NOTE: compose references backend/Dockerfile, ai-engine/Dockerfile,
# frontend/Dockerfile — none of which exist in the repo yet.
```

**CI** (`.github/workflows/ci.yml`): three jobs — backend `npm install`,
ai-engine `pip install -r requirements.txt`, frontend `npm install && npm run
build`. Only the frontend build actually gates (and it fails on any i18n
inconsistency). There is **no test suite and no linter**.

**Deployment note (README):** frontend → Vercel/Netlify; backend →
Render/Railway (`package.json`); ai-engine → Render/Railway (`requirements.txt`).

---

## 17. Sample accounts

Real MongoDB accounts from `backend/scripts/seedAccounts.js` (idempotent,
existing accounts untouched). **They are logins, not demo content** — an empty
dispatch queue is an empty queue. **Password for every account: `krishi@2026`.**

### Farmers (each has a real farm coordinate)

| Name | Email | Farm | Coordinates `[lng, lat]` |
| --- | --- | --- | --- |
| Ramesh Singh | `ramesh.farmer@krishiflow.ai` | Nashik Central Farm HQ | 73.7898, 19.9975 |
| Kiran Thorat | `kiran.farmer@krishiflow.ai` | Lasalgaon, Niphad | 74.2400, 20.1400 |
| Anand Kulkarni | `anand.farmer@krishiflow.ai` | Pimpalgaon Baswant | 73.9850, 20.1750 |
| Savita Pawar | `savita.farmer@krishiflow.ai` | Junnar block, Pune | 73.8750, 19.2090 |

### Fleet owners

**Vikram Jadhav — Sahyadri Transport, Nashik** · `vikram.fleet@krishiflow.ai`

| Vehicle | Driver | Type | Capacity | Rate | Cold | Base |
| --- | --- | --- | --- | --- | --- | --- |
| MH 15 GH 4921 | Suresh Shinde | Refrigerated Van | 3,500 kg | ₹52/km | yes | Nashik APMC Hub |
| MH 31 CB 7810 | Sunita Patil | Heavy Freighter | 10,000 kg | ₹78/km | yes | Nashik depot |
| MH 15 DK 2204 | Balu Wagh | Mini Truck | 2,000 kg | ₹38/km | no | Pimpalgaon Baswant |

**Farida Shaikh — Deccan Carriers, Pune** · `farida.fleet@krishiflow.ai`

| Vehicle | Driver | Type | Capacity | Rate | Cold | Base |
| --- | --- | --- | --- | --- | --- | --- |
| MH 12 AB 9910 | Aniket Deshmukh | E-Pickup | 1,500 kg | ₹34/km | no | Pune depot |
| MH 12 QR 6633 | Imran Sayyad | Refrigerated Van | 4,000 kg | ₹58/km | yes | Gultekdi APMC, Pune |

The two fleets are deliberately different in shape — a Mumbai-bound lot should
cost Sahyadri far less than Deccan, and the dispatch screen shows exactly why.

### Buyer

| Name | Email | Mandi |
| --- | --- | --- |
| Rajesh Mehta | `rajesh.buyer@krishiflow.ai` | Mumbai APMC, Vashi |

### The whole loop

1. **Farmer** (`kiran.farmer@…`) → Price → pick a mandi → Vehicle tab → agree a
   rate with the trader → **Ask for a pickup**. No truck is chosen here.
2. **Fleet owner** (`vikram.fleet@…`) → Dispatch. The request is ranked against
   Vikram's three trucks by extra road km. Open *show the working*. Approve one.
   (Sign in as `farida.fleet@…` instead to see it ranked against a Pune fleet —
   same arithmetic, worse numbers. First to approve wins; the other gets a 409.)
3. **Both** → Tracking. Farmer sees which truck/driver is coming; fleet owner
   moves the job collected → in transit → delivered off one shared timeline.

---

## 18. Buyer rate / crop / location work (see `BUYER_FEATURES.md`)

- Buyer rate postings moved from the Zustand store to MongoDB (`BuyerPosting`)
  — survive refresh, browser restart, backend restart.
- Farmer crop selection persists in `localStorage` (`cropDetails`); farmers see
  only postings for their selected crop (backend filters by `cropType`,
  re-fetch on change).
- Postings carry the buyer's real pickup coordinates (`buyerLocation`), threaded
  into the deal so vehicle matching + freight use the actual delivery point;
  falls back to the mandi centre when absent (`isBuyerLocation: false`).
- Mandi picker went from 4 hardcoded options to **150+ searchable Maharashtra
  APMCs** (`data/mandiList.js` on both sides, `SearchableSelect` primitive).
  Coverage by region: Mumbai & Konkan 10, Pune 16, Nashik 16, Nagpur & Vidarbha
  23, Marathwada 19, Khandesh 11, Ahilyanagar 10, Western Maharashtra 21,
  Buldhana & Washim 8, Yavatmal 5.

Known limits: coordinates entered manually (no geocoding); distance is haversine
× 1.3; rate updates need a refresh (no WebSocket push).

---

## 19. Consolidated "known limits / honest overstatements"

| Area | Reality |
| --- | --- |
| `ai-engine/app/services/vrp_service.py` | Calls itself "Google OR-Tools Multi-Objective VRP"; is a round-robin market-ranker. Unused by the dispatch path |
| `requirements.txt` | `ortools`, `lightgbm`, `scikit-learn` present, imported nowhere |
| README top section | Describes React-Leaflet, "Google OR-Tools VRP Solver", "LightGBM Price Predictor", a Driver role — all superseded (MapLibre; cheapest-insertion heuristic; XGBoost; no Driver role) |
| `docker-compose.yml` | References Dockerfiles that don't exist; sets env var names the code ignores |
| Dispatch ranking | Greedy, order-dependent, single-insertion; haversine × 1.3, not routed; ignores driver hours / tolls / traffic / gate timings |
| Forecast model | Maharashtra + 5 crops only; 7-period point, not a per-day series; predictions outside ±35% withheld |
| Price "demand/supply" | Price momentum only (modal vs 14-day trailing avg); feed "arrivals" are synthesised and not used in scoring |
| Distances / freight | Straight-line × 1.3 everywhere; ~±15% on highways, worse in hills |
| Auth CORS | `origin: '*'`; socket layer has no auth (positions only enter via authenticated REST) |
| Tests | None. `frontend` `npm run build` (+ `check:i18n`) is the only gate |

---

*Generated as a single-file project reference. Keep it in sync with `CLAUDE.md`,
`VRP.md`, `prediction.md`, `BUYER_FEATURES.md` and `SAMPLE_USERS.md` when any of
those change.*
