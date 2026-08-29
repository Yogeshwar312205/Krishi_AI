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

## Price Forecast & Sell-or-Wait Timing

KrishiFlow answers "should I sell now or wait?" by combining two engines and reconciling them into one call:

1. **Trained forecast model** — an XGBoost regressor trained on the Agmarknet daily archive (2023-06 to 2025-06), Maharashtra, for **Onion, Potato, Rice, Tomato and Wheat**. It predicts the modal price about **7 reporting periods ahead** and reports a percent change against the last known price. Two honesty guards apply: an unrecognised mandi is treated as missing (never priced as some default market), and a predicted move larger than ±35% is **withheld with its reason** rather than shown, because outside its training range the model regresses toward its intercept. For any other crop, or when the model fails its load-time health check, the forecast is reported as unavailable and the screen falls back to a plain recent-trend line.
2. **Rule-based context scorer** — weather (OpenWeather, crossed with per-crop weather-friendliness) plus price momentum (today's modal vs its ~14-day trailing average from real Agmarknet history). It produces a `SELL_NOW`, `SELL_SOON`, `HOLD` or `HOLD_STRONG` call and a bounded price adjustment. It does **not** use feed "arrivals".
3. **Combined recommendation** — deterministic. A model move of 5% or more can soften a `SELL_SOON` to `HOLD` (predicted rise) or push a `HOLD` toward `SELL_SOON` (predicted fall). `SELL_NOW` is never overridden. An optional plain-language explanation is generated from the computed facts only — it may not add numbers or change the recommendation.

This is decision support, not a sale quote or a price guarantee, and the farmer should still confirm a buyer's offered rate.

## Spoilage in Transit & Weather

The spoilage term in the net-profit equation is a Q10 exponential decay model:

```text
spoilage_fraction = 1 - exp(-k × transit_hours × 2^((T - 20) / 10))
```

- `k` is a per-crop decay constant per hour. Soft, fast-spoiling crops have a high `k` (tomato ≈ 0.035, mango ≈ 0.045, banana ≈ 0.038); staples are near zero (wheat and rice ≈ 0.001), so spoilage never moves the ranking for them.
- `transit_hours` is the haul distance divided by an average loaded-truck speed of 45 km/h.
- `T` is the air temperature. KrishiFlow uses the **live temperature at the farm** (Open-Meteo) when it is available, and a default road temperature of 32 °C otherwise. The `2^((T-20)/10)` factor is the Q10 rule: decay roughly doubles for every 10 °C above 20 °C, so a hot day makes a soft crop lose value on the road much faster.
- A **refrigerated van** holds the deck at about 4 °C regardless of the weather outside, which collapses the temperature factor and typically cuts transit spoilage by well over half for perishables on a long haul.

The Prices screen shows this as its own line in every mandi's cost breakdown (gross → freight → commission → spoilage → net) and, for perishables, a "a refrigerated van saves about ₹X" comparison. The Today screen shows the current weather at the farm and, on a hot day, names the rupees per hour a soft crop loses in an open truck.

## Choosing a Refrigerated Van

A refrigerated van costs more per km than an open mini-truck or freighter. It is worth it only when the spoilage it prevents is larger than the extra freight. KrishiFlow gives the farmer both numbers — the spoilage saved by cold transport, and the added freight cost — so the choice is a comparison, not a guess. For a short haul or a non-perishable crop, an open truck is normally the right call.

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
