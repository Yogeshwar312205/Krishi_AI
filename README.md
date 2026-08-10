# KrishiFlow: AI-Powered Agricultural Logistics & VRP Optimization Platform 🌾🚚

**KrishiFlow** is an end-to-end, production-grade microservices system designed to solve agricultural crop spoilage and transit inefficiencies. It connects smallholder farmers with optimal regional agricultural mandis (APMCs) and nearby 2dsphere-indexed vehicle fleets.

---

## 🏗️ Monorepo Architecture Overview

- **`backend/`** (Node.js + Express + Mongoose + Socket.io):
  - MongoDB 2dsphere geospatial driver matching (`$near`).
  - Orchestrates calls to the Python AI engine with exponential backoff (`axios-retry`).
  - JWT Authentication, RBAC (Farmer, Driver, Admin), Helmet security headers, `express-rate-limit`, and Winston logger.
  - Socket.io server for real-time truck tracking and the **Dev Trigger: Traffic Jam Simulator**.

- **`ai-engine/`** (Python + FastAPI + Google OR-Tools):
  - **LightGBM / Agmarknet Price Predictor** (`/predict-price`).
  - **Exponential Perishability Spoilage Model** (`/calculate-spoilage`).
  - **Google OR-Tools Multi-Objective VRP Solver** (`/optimize-route`).

- **`frontend/`** (React + Vite + Tailwind CSS + React-Leaflet + Zustand):
  - Modern, agriculture-themed UI.
  - Step-by-step Crop Logistics Wizard.
  - AI Recommendation Cards with Gold/Silver/Bronze badges and profit breakdown.
  - Interactive React-Leaflet Map with dynamic route polylines and animated vehicle movement.

---

## 🚀 Running Locally (Non-Dockerized)

### 1. Start Node.js Core Backend
```bash
cd backend
npm install
npm run dev
# Server running on http://localhost:5000
```

### 2. Start Python FastAPI AI Engine
```bash
cd ai-engine
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# AI Engine running on http://localhost:8000
```

### 3. Start React Vite Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend running on http://localhost:3000
```

---

## ☁️ Direct PaaS Deployment (Vercel, Render, Railway)

- **Frontend Deployment**: Connect `frontend/` directory to **Vercel** or **Netlify**.
- **Backend Node.js**: Deploy `backend/` to **Render** or **Railway** (uses `package.json`).
- **Python AI Engine**: Deploy `ai-engine/` to **Render** or **Railway** (uses `requirements.txt`).
