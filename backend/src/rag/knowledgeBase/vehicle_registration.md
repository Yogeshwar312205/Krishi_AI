---
title: "Vehicle Registration & Fleet Operations Guide"
documentId: "vehicle-registration-guide"
source: "krishiflow-docs/fleet"
url: "/docs/logistics/fleet"
accessLevel: "public"
roles: ["Farmer", "Logistics", "Transporter", "Driver", "Buyer", "Admin"]
sensitivity: "public"
topic: "VEHICLE_REGISTRATION"
language: "en"
version: "1.0"
---

# KrishiFlow Vehicle Registration & Fleet Operations

KrishiFlow connects farmers with verified regional logistics providers, fleet owners, and independent vehicle operators across Maharashtra and India.

## Supported Vehicle Types & Specifications

KrishiFlow supports four core commercial vehicle categories for agricultural crop transit:

1. **Mini Trucks** (Payload: 1.0 – 2.5 Tons)
   - *Models*: Tata Ace, Mahindra Bolero Pik-Up, Ashok Leyland Dost.
   - *Best For*: Local mandi transport, smallholder farmer harvests, intra-district delivery.
   - *Cost Efficiency*: High fuel economy (10–14 km/L).

2. **Heavy Freighters** (Payload: 8.0 – 16.0 Tons)
   - *Models*: Eicher Pro 3019, BharatBenz 1617, Tata LPT 1618.
   - *Best For*: Bulk commodity shipping (Onion, Wheat, Soybeans) to major wholesale APMC hubs like Vashi (Mumbai) or Azadpur (Delhi).
   - *Cost Efficiency*: Low per-ton-km cost on long-haul highways.

3. **Refrigerated Vans (Cold Chain)** (Payload: 3.5 – 9.0 Tons)
   - *Models*: Tata Ultra Reefer, Mahindra Furio Cold Chain.
   - *Best For*: Perishable produce (Tomatoes, Grapes, Strawberries, Pomegranates).
   - *Spoilage Protection*: Equipped with active temperature control (2°C – 8°C). Reduces spoilage decay rate by up to 70%.

4. **E-Pickups (Electric Transporters)** (Payload: 0.8 – 1.5 Tons)
   - *Models*: Mahindra Zor Grand, Tata Ace EV.
   - *Best For*: Zero-emission short-haul farm-to-collection center trips within 50 km.

---

## Vehicle Registration Workflow

Fleet owners, transporters, and drivers can register vehicles on KrishiFlow through the following steps:

1. **Account Registration**: Sign up with role `Logistics` / `Transporter` / `Driver`.
2. **Fleet Onboarding**: Navigate to the `Fleet Management` tab in the KrishiFlow application.
3. **Vehicle Details Entry**:
   - Vehicle Registration Number (e.g. `MH-15-EG-4421`).
   - Vehicle Category (Mini Truck, Heavy Freighter, Refrigerated Van, E-Pickup).
   - Maximum Payload Capacity (in Metric Tons or Kilograms).
   - Base Station Location (City/APMC Mandi).
4. **Verification & Audit**: Submit RC (Registration Certificate), Commercial Permit, and Fitness Certificate.
5. **Driver Assignment**: Pair registered drivers with specific vehicles for dispatch tracking.

---

## Dispatch & Capacitated Vehicle Routing (VRP)

Once registered, vehicles participate in KrishiFlow's automated Capacitated Vehicle Routing Problem (VRP) insertion algorithm:
- Vehicles are assigned pickup requests based on road proximity, available weight capacity, and route compatibility.
- Farmers requesting pickup on a vehicle's existing route are slotted in dynamically, reducing empty return trips and lowering transport freight costs for farmers.
