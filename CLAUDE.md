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

- `src/app/routes.js` is the **single source of tab ids**, per-role tab lists, and role normalisation (`Transporter`→`Driver`, `Trader`→`APMC Buyer`). Nav lists and render branches both derive from it; adding a destination means editing this file, not the nav components. Roles get at most four tabs — that is a hard constraint from the 56px mobile bottom bar with Devanagari labels.
- `src/store/useAppStore.js` — one zustand store, no context providers. Auth is rehydrated from localStorage (`user` + `token` must both be present or both are cleared). Most domain state (bookings, driver jobs, buyer postings, registered vehicles) is seeded in-store and never hits the backend.
- `src/features/**` is the current architecture; `src/components/**` is legacy, lazy-loaded, and still backs the driver and buyer screens.

### Design system — read the comments before changing tokens

`tailwind.config.js` **replaces** (not extends) `borderRadius` and `fontSize`. The visual language is a painted APMC rate board: square corners, ruled rows, numeral-first, no shadows. Replacing the scales at the root is deliberate — it squares off legacy `rounded-3xl` markup without touching those files.

Every `fontSize` and `lineHeight` step resolves through a CSS variable (`--lh-slab`, `--lh-display`, `--lh-head`, `--lh-body`, and `--lh-none/tight/snug/normal`), redefined in `index.css` under `:root:lang(hi)` / `:lang(mr)`. Hardcoding a numeric line-height anywhere clips Devanagari matras in two of the app's three languages. Reusable classes (`btn-*`, `field`, `docket`, `rule-strong`, `furrow`, `stamp-demo`) live in `index.css` `@layer components`; primitives in `src/design/primitives/` wrap them.

### i18n — three languages, enforced

- Never write a bare user-facing string. `useT()` gives `t`, `tCount`, and the formatters (`money`, `rate`, `number`, `percent`, `shortDate`).
- Add to `en.json` first — it is the checker's reference — then `hi.json` and `mr.json` with identical `{{placeholders}}`. `scripts/check-i18n.mjs` fails the build on a missing key, an extra key, a placeholder mismatch, or a value left identical to English (whitelist in `ALLOWED_IDENTICAL`).
- All **numbers** format through `en-IN` regardless of UI language, with Latin digits. This is not an oversight: `mr-IN` emits Devanagari digits, and even with `numberingSystem: 'latn'` it emits Western grouping (`₹111,500` instead of `₹1,11,500`). Only dates use the language locale. Do not simplify `format.js`.
- `src/i18n/GLOSSARY.md` records the register decisions (spoken word over government-form word, which loanwords stay, why "cold chain" became "ठंडी गाडी"). Read it before rewording Hindi/Marathi copy.

### Demo data is quarantined and stamped

Fabricated frontend figures live only in `src/data/demoMarket.js`, and anything rendered from it must carry `<DemoStamp />`. Both files carry `TODO(data):` comments naming the intended real source (data.gov.in Agmarknet for rates, e-NAM for arrivals). The backend already has a live Agmarknet/Open-Meteo client in `backend/src/services/agmarknetService.js`. If you replace a demo number, wire it to a source and remove the stamp — never hand-write a fresher-looking constant.

### Real-time

`backend/src/sockets/trackingSocket.js` + `frontend/src/hooks/useSocket.js`. Three events: `driver_location_update` (rebroadcast as `vehicle:location_changed`), `simulation:start_tracking` (server-side 2s interpolation Nashik→Vashi), and `dev_simulate_traffic` → `dev:traffic_reroute_event`, a scripted demo reroute with hardcoded metrics.

Coordinates are `[longitude, latitude]` throughout the API, store, and Mongo — except `trackingSocket.js`'s `newPolylineWaypoints`, which are `[lat, lng]`.
