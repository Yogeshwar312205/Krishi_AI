---
documentId: farmer-workflow-guide
title: KrishiFlow Farmer Workflow & Net Profit Calculation Guide
source: krishiflow-docs
url: /farmer/profit-calculator
language: en
accessLevel: public
roles: ["farmer", "logistics", "buyer", "admin"]
sensitivity: public
---

# Farmer Workflow & Net Profit Calculation Guide

## Overview of KrishiFlow for Farmers
KrishiFlow empowers smallholder farmers across Maharashtra (and India) to maximize their crop revenue by providing real-time APMC market intelligence, dynamic profit estimation, trader deal negotiations, and seamless vehicle pickup dispatch.

## Net Profit Calculation Equation
KrishiFlow calculates the expected net profit for a farmer selling a crop consignment using the following exact mathematical model:

```text
Net Profit (₹) = Total Revenue - Haul Transport Cost - Perishability Spoilage Cost
```

Where:
1. **Total Revenue (₹)** = `Quantity (kg) × Board Rate or Agreed Rate (₹/kg)`
2. **Haul Transport Cost (₹)** = `Haul Distance (km) × Vehicle Rate per km (₹/km)`
   - Haul distance is calculated using 2dsphere geolocation matching from the farmer's coordinates to the APMC market.
   - For district-level centroid approximations, haversine distance is multiplied by a circuitous factor of `1.3` (minimum haul floor applied).
3. **Perishability Spoilage Cost (₹)** = `Total Revenue × (1 - exp(- decay_constant × transit_hours))`
   - Non-refrigerated ambient transit incurs standard temperature-dependent decay.
   - Cold-chain refrigerated transit reduces the decay constant by up to `70%`.

## Step-by-Step Farmer Workflow
1. **Explore Live Mandi Prices**:
   - The farmer views live Agmarknet market rates pulled directly from `data.gov.in`.
   - Rates update dynamically and display modal rates for Maharashtra APMCs (Vashi, Nashik, Pimpalgaon, Pune, etc.).
2. **Compare Net Revenue**:
   - KrishiFlow ranks mandis not by highest board price alone, but by **Net Profit after Freight and Spoilage**.
   - A distant mandi offering ₹2/kg higher rate may yield lower net profit due to fuel costs and transit spoilage.
3. **Negotiate & Agree on Trader Deal**:
   - A farmer must connect with an APMC buyer and agree on an `agreedRatePerKg` before booking transport.
   - Board rates represent yesterday's market midpoint; agreed rates represent binding commercial quotes.
4. **Raise Pickup Request**:
   - Once a deal is agreed upon, the farmer creates a `PickupRequest` specifying farm location, target mandi, quantity, and preferred time window.
   - The pickup request enters the open dispatch queue for fleet owners to insert into optimized vehicle routes.
5. **Track Vehicle in Real-Time**:
   - Upon fleet assignment, the farmer tracks the assigned vehicle's GPS position, arrival ETA, and timeline milestones (`Assigned`, `Collected`, `In Transit`, `Delivered`).
