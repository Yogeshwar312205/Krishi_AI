---
documentId: technical-architecture-guide
title: KrishiFlow System Architecture & Technical Specifications Guide
source: krishiflow-docs
url: /docs/architecture
language: en
accessLevel: role
roles: ["admin", "logistics"]
sensitivity: internal
---

# KrishiFlow System Architecture & Technical Specifications

## Architecture Overview
KrishiFlow is built as a microservices monorepo designed with zero single point of failure and pervasive graceful degradation:

```text
frontend (React 18 + Vite) <--- REST/Socket.io ---> backend (Node.js + Express)
                                                          |
                                                          +---> MongoDB 2dsphere
                                                          +---> ai-engine (FastAPI)
```

## Service Components
1. **Node.js Core Backend (`backend/`)**:
   - Port 5000. Express server managing JWT authentication, RBAC authorization, Agmarknet feed caching, VRP insertion logic, Socket.io tracking bus, and MongoDB connection.
   - **MongoDB Fallback**: If MongoDB connection fails or authentication fails, backend seamlessly operates with an in-memory mock storage engine for demo continuity.
2. **Python AI Engine (`ai-engine/`)**:
   - Port 8000. FastAPI service hosting endpoints for Agmarknet price trend inference, perishability exponential decay models, and route computation.
   - **Axios-Retry Fallback**: Backend calls AI engine with exponential backoff (3 attempts, 5s timeout). On failure, backend executes native JS math implementation (`fallbackOptimization()`).
3. **React Vite Frontend (`frontend/`)**:
   - Port 3000. React 18 SPA with Zustand store, Tailwind CSS rate-board theme, MapLibre/Leaflet mapping, and full `check:i18n` verified English, Hindi, and Marathi translations.

## Data Ingestion & Geolocation Precision
- **Agmarknet Live API Feed**: Ingests daily market records for ~119 crops across Maharashtra APMCs, deduplicating within 3-day windows.
- **Mandi Geo Precision Tiers**:
  1. *Exact Market Yard*: Coordinates tied to specific APMC yard location.
  2. *Taluka Town Match*: Resolved town center.
  3. *District HQ Match*: District center with minimum haul floor applied (`DISTRICT_MIN_HAUL_KM = 30km`).
- Markets without resolvable coordinates are safely dropped from spatial distance ranking.

## Real-Time Socket Architecture
- REST API endpoint (`POST /api/fleet/:id/location`) authenticates vehicle position updates and broadcasts `vehicle:location_changed` events over Socket.io.
- Includes a built-in Dev Simulator (`dev_simulate_traffic`) generating simulated GPS trajectories between Nashik and Vashi APMC.
