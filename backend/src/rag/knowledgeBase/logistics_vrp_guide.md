---
documentId: logistics-vrp-guide
title: KrishiFlow Logistics Fleet & VRP Insertion Algorithm Guide
source: krishiflow-docs
url: /logistics/dispatch
language: en
accessLevel: role
roles: ["logistics", "admin"]
sensitivity: internal
---

# Logistics Fleet & Capacitated VRP Insertion Guide

## Overview of Fleet Operations
In KrishiFlow, fleet owners (Logistics role) manage vehicle fleets, assign incoming farmer pickup requests to active trucks, and monitor real-time vehicle dispatch. There is no individual "Driver" login account; drivers are registered attributes (name and phone number) attached to specific vehicles owned by a fleet manager.

## Capacitated Vehicle Routing Problem (VRP) Insertion Algorithm
KrishiFlow uses an incremental Capacitated VRP (Vehicle Routing Problem) insertion algorithm to evaluate how a new farmer pickup request fits into an existing vehicle route.

### Key Rules of VRP Insertion:
1. **Two-Stop Pair Insertion**:
   - Each farmer request consists of an ordered pair `(pickup_stop, drop_stop)`.
   - Insertion evaluates all possible position pairs `(i, j)` where `i < j` within the vehicle's current route sequence.
2. **Peak Load Capacity Validation**:
   - Capacity constraint is validated against the **peak payload profile** across the entire route, not simple `capacity - currentLoad`.
   - If payload at any leg exceeds the vehicle's maximum rated capacity (e.g. 3,500 kg for refrigerated van), the candidate insertion is rejected as `INFEASIBLE_CAPACITY`.
3. **Open Route Optimization**:
   - Routes are open sequences originating from the truck's current real-time GPS location (`currentRoute[0]`).
   - Vehicles do not require a mandatory return-to-depot leg unless explicitly queued.
4. **Marginal Road Distance Cost Ranking**:
   - For every candidate vehicle and route sequence, insertion service calculates the added distance:
     `Added Distance = New Route Length - Original Route Length`
   - Logistics dispatch ranks candidate trucks strictly by lowest additional haul kilometers.

## Dispatch Screen Features for Fleet Managers
- **Open Request Queue**: Displays all pending pickup requests submitted by farmers across the region.
- **VRP Suggestions Engine**: Shows "Show Working" metrics detailing candidate vehicles, peak payload percentage, extra detour distance, and net profitability.
- **Approval Lock**: Approval executes a conditional atomic database update (`status: 'pending' -> 'assigned'`). If another fleet owner approves simultaneously, the second attempt receives a 409 Conflict.
- **Telemetry & Status Propagation**: Fleet managers advance trip milestones (`Collected`, `In Transit`, `Delivered`). Position updates via `POST /api/fleet/:id/location` are authenticated and broadcasted live to the farmer via Socket.io.
