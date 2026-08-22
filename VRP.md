# Capacitated VRP — Cheapest-Insertion Dispatch

**Status:** implemented, rule-based, human-in-the-loop, persisted in MongoDB.
**Where:** `backend/src/services/insertionService.js` · `backend/src/controllers/{dispatch,request,fleet}Controller.js` · `backend/src/models/{Vehicle,PickupRequest}.js` · `frontend/src/features/logistics/`

**There is no driver role.** A driver is a name and a phone number on a vehicle.
The person who decides where a truck goes is the fleet owner, and giving drivers
their own logins made this a ride-hailing app — a farmer hailing individual
trucks that each accept or decline. Nobody is optimising a fleet in that model,
so there is no capacitated VRP to solve. Old `Driver`/`Transporter` accounts
still log in and are read as fleet owners.

**Nothing is seeded in the app.** Vehicles belong to a fleet owner and pickup
requests are raised by a farmer, both persisted and both owner-scoped. An empty
dispatch queue means an empty dispatch queue — sample rows on that screen are
rows somebody might send a real truck against. The only seeded thing in the
system is a set of *logins*: see `SAMPLE_USERS.md`.

---

## 1. The problem

A logistics provider runs a small fleet. Each vehicle has a capacity and is
already part-way through a route — a sequence of stops it is committed to.
Farmers, having agreed a price with a mandi trader, raise pickup requests: a
farm location, a quantity, a produce type, a destination mandi, and a preferred
time window.

The question the dispatcher has to answer, many times a day, is:

> **Which vehicle should serve which farmer?**

This is a Capacitated Vehicle Routing Problem with pickup-and-delivery pairs.
We solve it with a **cheapest-insertion heuristic**: for every (vehicle,
request) pair, work out what it would actually cost in extra road kilometres to
slot that farmer into the route the vehicle is already driving, reject the pairs
that break capacity, and rank the rest by that cost.

**The system proposes. A human confirms.** Nothing auto-assigns. This is a
product decision, not an unfinished feature: the dispatcher knows things the
model does not — that a particular farmer will wait, that a driver knows that
road, that a trader closes early on Thursdays. Ranking is the machine's job;
committing a truck is not.

---

## 2. Why the old `vrp_service.py` was not a VRP

`ai-engine/app/services/vrp_service.py` returns `"solver": "Google OR-Tools
Multi-Objective VRP"`. `ai-engine/app/main.py` lists `"Google OR-Tools VRP
Solver"` under `modelsLoaded`. `backend/src/controllers/orchestratorController.js`
reports `aiEngineSource: 'FastAPI OR-Tools Engine'`.

None of that is true. The whole of its vehicle logic is:

```python
for idx, market in enumerate(markets):
    dist_km = haversine_distance(farmer_origin, market.coordinates)
    matching_vehicle = available_vehicles[idx % len(available_vehicles)]
```

It iterates **markets**, not routes. It assigns a vehicle by `idx % len(...)` —
round-robin, in arbitrary order. There is no stop sequence, no insertion, no
route to insert into, and no capacity feasibility (its one capacity line,
`v.capacityKg >= qty * 0.8`, falls back to *every* vehicle when nothing fits).
It then sorts markets by net profit and awards them Gold/Silver/Bronze badges.

That is a market-ranking tool. It is also a redundant one: the farmer-facing
Prices screen already ranks mandis by net profit, on live Agmarknet data,
showing its full arithmetic. `ortools` sits in `requirements.txt` and is
imported nowhere.

**This document does not fix those strings.** `ai-engine/` is deliberately out
of scope for this work, and the overstatement is recorded here rather than
quietly patched. What is new is a real CVRP, in the Node backend, that says
plainly in every response what it is:

```json
"source": "Cheapest Insertion Heuristic (rule-based, no solver)"
```

---

## 3. Data model

Implemented in `backend/src/services/insertionService.js`. Coordinates are
`[longitude, latitude]` everywhere, matching the rest of the API, the store and
Mongo.

### Vehicle

```js
{
  id, vehicleNo, driverName, driverPhone,
  vehicleType, capacityKg, currentLoadKg, ratePerKm,
  isRefrigerated,
  status: 'Idle' | 'Loading' | 'En route' | 'Unavailable',
  routeStartAt,          // ISO — anchors every ETA. Absent => ETA is 'unknown', never guessed.
  currentRoute: [
    { id, kind: 'depot' | 'pickup' | 'drop', label,
      coordinates: [lng, lat],
      loadDeltaKg }      // +qty at a pickup, −qty at a drop
  ]
}
```

`currentRoute[0]` is the vehicle's current position and is **never displaced** —
insertion positions start at index 1.

Routes are **open**: there is no return-to-depot leg. A transporter running
three trucks out of Nashik does not send one home empty between hires, and a
phantom return leg would inflate every insertion cost by kilometres nobody
drives.

### PickupRequest

A farmer states what they have, where it is, where it is sold and when it can be
collected. **They do not choose a truck.** They cannot see the routes those
trucks are already driving, so they cannot know that the nearest truck is often
the most expensive way to move their lot — which is the whole finding this
system exists to surface.

```js
{
  farmer, farmerName, farmerPhone,                   // refs the User
  origin:      { label, coordinates: [lng, lat] },   // the farm gate
  destination: { label, coordinates: [lng, lat] },   // the agreed mandi
  quantityKg, cropType,
  agreedRatePerKg,                                   // settled with a trader, not the board rate
  pickupDate,
  window: { startHour, endHour, label },             // hours, because the label is translated
  status: 'pending' | 'assigned' | 'collected' | 'in_transit' | 'delivered' | 'cancelled',
  assignedVehicle, assignedOwner, assignedAt,
  dispatch: { insertionCostKm, addedFreightCost, estimatedAddedMinutes, pickupPosition, dropPosition },
  timeline: [{ status, at, note }]                   // what both sides read on the tracking screen
}
```

The server refuses a request that is missing either coordinate rather than
storing something no fleet owner can act on. `timeline` is appended server-side
on every status change, so the farmer and the fleet owner are never looking at
two different accounts of the same lot.

**Pending requests are not scoped to one fleet.** Every owner sees them and the
first to approve gets it — the claim is a conditional update on `status:
'pending'`, so a second owner attempting the same lot gets a 409 rather than a
double booking.

### InsertionSuggestion

```js
{
  vehicleId, vehicleNo, driverName, vehicleType, requestId,

  insertionCostKm,            // THE RANK KEY: extra road km
  baselineRouteKm, newRouteKm,
  bestInsertionPosition,      // index the pickup goes to
  dropPosition,               // index the drop goes to (always after the pickup)

  capacityKg, currentLoadKg,
  requestQuantityKg,          // this farmer's lot
  committedLoadKg,            // promised further up the route, not yet aboard
  peakLoadKg,                 // heaviest the truck gets anywhere on the new route
  remainingCapacityAfterKg,   // capacity − peak, not capacity − current

  estimatedAddedMinutes,      // travel at AVG_SPEED_KMH + service time for two stops
  addedFreightCost,           // insertionCostKm × ratePerKm — the cost in rupees

  produceCompatibility: 'ok' | 'warn-not-refrigerated' | 'n/a',
  timeWindow: { etaAtPickup, verdict: 'ok' | 'late' | 'early' | 'unknown' },
  warnings: [...],

  workings: { removedLegs, addedLegs },   // the arithmetic, leg by leg
  proposedRoute: [ ...stops ]             // the exact sequence being approved
}
```

`workings` is not decoration. Every other number in this app opens into its
arithmetic — see `MandiRow.jsx` and `WhyFurther.jsx` on the farmer side. A
dispatch suggestion a dispatcher cannot audit is the black box the brief asks us
to avoid, and it is also the one they will not act on.

`proposedRoute` is passed back to the store on approval, so the route that gets
written is exactly the route that was shown.

---

## 4. The algorithm

### 4.1 A request is two stops, not one

Textbook cheapest insertion places a single node. A farmer request is a
**pickup at the farm and a drop at the mandi**. Inserting only the pickup, and
letting the vehicle's existing terminal mandi stand as the drop, would offer a
truck bound for Pune to collect a lot that was sold to a trader in Vashi.

So this is a paired pickup-and-delivery insertion: every ordered pair of
positions `(i, j)` with `i < j`. `O(n²)` per (vehicle, request) pair, where `n`
is a handful of stops — nothing at this scale, and it stays explainable.

### 4.2 Capacity is not one subtraction

Load rises at each pickup and falls at each drop. A lot that "fits" by
`quantityKg <= capacityKg − currentLoadKg` can still overload the truck between
two pickups if its drop comes later. The real test is the **peak load across the
whole sequence**.

This is not hypothetical, and it is checkable. A **5,000 kg** truck carrying
1,000 kg, already routed `depot → Pimpalgaon (+3,000) → Mumbai APMC (−4,000)`,
has 4,000 kg "free" by the naive rule. Insert a 1,500 kg lot before the Mumbai
drop and the peak becomes **5,500 kg** — 500 kg over, on a route the naive rule
waves straight through.

`loadProfile()` rejects every position before that drop. The only feasible
arrangement left is *after* it, which the engine prices honestly at +459 km, and
which the dispatcher then correctly refuses. The truck is never quietly
overloaded, and the dispatcher is never quietly denied the option.

`remainingCapacityAfterKg` is derived from the peak, not the total, so the number
on the card is the number that was actually tested.

### 4.3 Time windows are shown, never enforced

The requested window is reported against a computed ETA and flagged when it
clashes. It **does not filter**. Filtering would empty the suggestion list
without saying why, and the dispatcher is the one who knows whether a farmer
will wait an hour.

The ETA hour is computed in `Asia/Kolkata` explicitly, not read off the server
clock — a container running UTC would otherwise declare every morning slot
missed by five and a half hours. A vehicle with no `routeStartAt` returns
`verdict: 'unknown'`; an ETA invented from an unknown departure time is worse
than no ETA, because the dispatcher would plan a farmer's morning around it.

### 4.4 Pseudocode

```
routeDistanceKm(stops) = Σ legKm(stops[k], stops[k+1])        for k = 0 .. n-2
legKm(a, b)            = haversine(a, b) × ROAD_FACTOR

capacityFeasible(stops, vehicle):
    load = vehicle.currentLoadKg ; peak = load
    for s in stops:
        load += s.loadDeltaKg
        peak  = max(peak, load)
    return peak <= vehicle.capacityKg

bestInsertion(vehicle, request):
    route = vehicle.currentRoute
    base  = routeDistanceKm(route)
    best  = null
    for i in 1 .. len(route):               # pickup before index i (0 is never displaced)
      for j in i+1 .. len(route)+1:         # drop always after the pickup
        cand = route with pickup@i, drop@j
        if not capacityFeasible(cand, vehicle): continue
        cost = routeDistanceKm(cand) - base
        if best == null or cost < best.cost: best = {cost, i, j, cand}
    return best                              # null when no position is feasible

suggestInsertions(vehicles, requests, topN):
    for r in requests:
        if r has no pickup or drop coordinate: unrankable.push(r, reason) ; skip
    for v in vehicles where v.status != 'Unavailable':
      for r in rankable requests:
        if r.quantityKg > v.capacityKg - v.currentLoadKg:
            infeasible.push({v, r, 'capacity'}) ; continue
        ins = bestInsertion(v, r)
        if ins == null: infeasible.push({v, r, 'no-feasible-position'}) ; continue
        suggestions.push(buildSuggestion(v, r, ins))
    sort suggestions by insertionCostKm ASC
    keep at most topN per vehicle
    return { suggestions, infeasible, unrankable }
```

The return is a **flat** ranked list. The dispatch screen groups it by request,
the fleet screen groups it by vehicle — one contract, two renderings, and no
second copy of the ranking rule.

`infeasible` and `unrankable` are **returned, not filtered away**, for the same
reason the farmer's `TransportScreen` shows a too-small truck with the reason
written on it: a dispatcher who sees four vehicles out of six and no explanation
assumes the software is broken.

### 4.5 Never a synthesised coordinate

A request missing a pickup or drop coordinate goes to `unrankable` with the
reason. It is never given a plausible-looking position. This is the same rule
`backend/src/data/mandiGeo.js` exists to enforce, and for the same reason:
distance drives insertion cost, and insertion cost is the entire answer.

### 4.6 Constants

| Constant | Value | Why |
| --- | --- | --- |
| `ROAD_FACTOR` | 1.3 | Straight-line × 1.3, the usual planning approximation for Indian roads. Imported from `mandiGeo.js`, not redefined. |
| `AVG_SPEED_KMH` | 45 | A loaded truck on Maharashtra state highways, with the mandi-approach crawl included. |
| `SERVICE_MINUTES_PER_STOP` | 20 | Time on the ground at a farm gate or a mandi yard. |
| `DEFAULT_TOP_N` | 3 | Suggestions per vehicle. Options, not an oracle. |

---

## 5. Worked example

Every number below is **copied from an actual run** of
`POST /api/dispatch/suggestions`, not written by hand.

**Fleet**

| Vehicle | Capacity | Load | Rate | Cold | Current route |
| --- | --- | --- | --- | --- | --- |
| MH 31 CB 7810 Heavy Freighter | 10,000 kg | 4,000 kg | ₹78/km | yes | Nashik depot → Pimpalgaon Baswant (+3,000) → Mumbai APMC (−7,000) |
| MH 15 GH 4921 Refrigerated Van | 3,500 kg | 0 kg | ₹52/km | yes | Nashik APMC Hub (idle) |
| MH 12 AB 9910 E-Pickup | 1,500 kg | 0 kg | ₹34/km | no | Pune depot (idle) |

**Request `UBER-503`** — Kiran Thorat, 2,500 kg Tomato, Lasalgaon farm →
Mumbai APMC, morning window 06:00–10:00.

**Result** (exactly what the seeded app produces — `UBER-503` is in the store)

| Rank | Vehicle | Extra km | Extra time | Extra cost | Slots in at | Free after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | MH 31 CB 7810 | **+55.4 km** | +114 min | ₹4,322 | stop 2 & 3 | 500 kg |
| 2 | MH 15 GH 4921 | +292.5 km | +430 min | ₹15,208 | stop 1 & 2 | 1,000 kg |
| — | MH 12 AB 9910 | not offered — `capacity`, 1,000 kg over | | | | |

**Why rank 1 wins**, from its `workings`:

```
route was 244.4 km       Nashik depot -> Pimpalgaon -> Mumbai APMC
  leg dropped   Pimpalgaon Baswant -> Mumbai APMC            207.5 km
  leg added     Pimpalgaon Baswant -> Lasalgaon farm          35.0 km
  leg added     Lasalgaon farm     -> Mumbai APMC            228.0 km
                                                  -----------------
  35.0 + 228.0 - 207.5                            =          +55.4 km
route becomes 299.8 km
```

The freighter is already driving to Mumbai APMC. Lasalgaon is very nearly on the
way, so collecting 2,500 kg costs it 55 km. The refrigerated van is idle in
Nashik and would drive all 292 km from scratch — **five times the cost for the
same delivery.** That gap is the entire point of the product, and it is not
visible from a list of nearest vehicles: the van is *closer to the farm* than
the freighter's next stop, and it is still the worse answer.

The capacity bar on the winning card reads 4,000 on board · 3,000 promised ·
2,500 this lot · 500 free. The middle band matters: 3,000 kg is waiting at
Pimpalgaon, not yet aboard, and it is neither the current load nor this
farmer's lot.

The E-Pickup is not ranked at all: 2,500 kg against a 1,500 kg deck.

---

## 6. API contract

All of it is authenticated and scoped to the caller.

| Route | Role | What it does |
| --- | --- | --- |
| `POST /api/requests` | Farmer | Raise a pickup request |
| `GET /api/requests/mine` | Farmer | Own requests, with the assigned vehicle and timeline |
| `POST /api/requests/:id/cancel` | Farmer | Withdraw one nobody has taken |
| `GET /api/dispatch/suggestions` | Fleet owner | The ranked queue |
| `POST /api/requests/:id/assign` | Fleet owner | Claim a request and commit the route |
| `GET /api/requests/queue` | Fleet owner | Pending, plus this owner's own jobs |
| `POST /api/requests/:id/status` | Fleet owner | collected → in_transit → delivered |
| `GET`/`POST /api/fleet` | Fleet owner | Own vehicles |

### `GET /api/dispatch/suggestions`

Takes **no fleet payload**. The server reads the caller's own vehicles and the
open request queue straight out of Mongo, because a caller who could post their
own vehicles could rank a fleet they do not own against requests they cannot
see. `topN` is the only parameter.

**Response**

```json
{
  "success": true,
  "source": "Cheapest Insertion Heuristic (rule-based, no solver)",
  "params":  { "roadFactor": 1.3, "avgSpeedKmH": 45, "serviceMinutesPerStop": 20, "topN": 3 },
  "generatedAt": "2026-08-20T06:45:39.880Z",
  "counts":  { "vehicles": 3, "requests": 1, "suggestions": 2, "infeasible": 1, "unrankable": 0 },
  "suggestions": [ InsertionSuggestion, ... ],
  "infeasible":  [ { vehicleId, vehicleNo, requestId, reason, shortfallKg, freeCapacityKg } ],
  "unrankable":  [ { requestId, reason } ]
}
```

`source` follows the house convention (`aiEngineSource` on `/api/recommend`,
`source` on `/api/markets`): the response names what produced it, so the UI can
be honest about what the dispatcher is looking at. Here it says *no solver* on
purpose.

**No client-side fallback.** Every other boundary in this system degrades to a
local reimplementation; this one does not, deliberately. Two copies of a ranking
algorithm can silently disagree, and a dispatcher acting on the wrong one commits
a real truck. The screen shows an explicit "dispatch engine unreachable" panel
instead. This adds no new fragility — the Prices screen already goes dark without
the backend, since the Agmarknet feed proxies through it.

---

## 7. The dispatcher screen

Role: **Logistics** — the fleet owner, and the only transport role there is.
Tabs: **Dispatch · Jobs · Fleet · Routes**.

`DispatchScreen` lists pending farmer requests. Each opens into its ranked
vehicle suggestions, and each suggestion card carries:

- **insertion cost** as +km, +min and +₹ — the rank key first and largest
- **capacity** as a segmented bar: existing load │ this request │ free, with kg beside it
- **produce compatibility** — a perishable crop on a non-refrigerated deck is an amber warning, never a filter
- **requested window vs computed ETA**, amber when they clash
- **route diagram** — the stop sequence before and after, with the two inserted stops marked
- **show the working** — the removed leg and the added legs, in kilometres
- **the map** — the proposed route drawn on the road network, the old route dashed
  underneath, and the two inserted stops ringed
- **Approve** / **Reject**, one tap each

The diagram and the map answer different questions and neither replaces the
other. The diagram answers *where in the sequence* — third stop or fifth — which
is the ordering decision. The map answers *how far off the road it already
drives*, which a sequence strip cannot show: a detour that reads as one extra
box in the strip can be an hour down a different valley.

**The map draws roads; the ranking still measures haversine × 1.3.** Routing
every (vehicle, request) pair over a road network would be hundreds of calls to
answer one screen, so the geometry is fetched once per stop sequence, only when
a dispatcher opens a map, and only to draw. Because the two numbers differ, the
map caption prints both — "Drawn on the road network · 181 km" above "Ranked on
an estimate of 190 km" — so nobody reads a road-shaped line as proof the
ranking was road-measured. When the router is unreachable the legs are drawn
straight, dashed, and captioned as straight. See
`backend/src/services/routingService.js`.

Below the ranked list sit the two honest tails: requests that **cannot be
ranked** (no coordinate) and pairs where **no vehicle fits** (from `infeasible`),
each with its reason.

**Rejecting a suggestion is not rejecting the request.** The pair is dismissed,
the request stays pending, and every other vehicle still offers it. Conflating
the two would make one careless tap look like a farmer being turned away — and
keeping them distinct is what human-in-the-loop actually means here.

---

## 8. Limits, and where a real solver goes

Cheapest insertion is **greedy and order-dependent**. It never revisits an
assignment. Approve A then B and you can end up with a worse fleet-wide total
than approving B then A, and neither the engine nor the dispatcher is told.
It optimises one insertion at a time, not the fleet.

It also ignores driver hours, road classes, tolls, real traffic, and mandi gate
timings. Distances are haversine × 1.3, not routed — good to roughly ±15% on
Maharashtra highways, and wrong in the hills. The map is now the cheapest
available check on that: opening one prints the routed length beside the
estimate the ranking used, and Nashik → Vashi comes out 160.5 km routed against
170.9 km estimated. Routing every pair instead of drawing one line is the
upgrade; it belongs with the solver below, not on its own.

**Where OR-Tools would replace this:** a `RoutingModel` with
`AddDimensionWithVehicleCapacity` for load, `AddPickupAndDelivery` for the
paired stops, time-window dimensions for the slots, and guided local search over
the whole fleet — re-optimising every route together rather than accepting one
insertion at a time. That is the correct upgrade and it is not built here, on
purpose: a greedy heuristic whose every number can be justified to a dispatcher
beats a solver nobody in the room can explain.

Vehicle positions are **reported, then broadcast**. `POST /api/fleet/:id/location`
proves ownership, writes the vehicle's last known point, and only then pushes
`vehicle:location_changed` to every watcher through `sockets/bus.js`. The
position never travels *into* the system over the socket, because the socket
layer has no authentication at all and a client that could emit its own fix
could move somebody else's truck across a farmer's map.

What that gives both sides is a marker with a timestamp beside it, never
without: `TrackingMap` prints the age of the fix, and a position from four hours
ago that looked live is how a farmer ends up waiting at a gate. The fleet owner
starts and stops sharing from the Jobs screen, per job, off by default.

The scripted Nashik → Vashi simulator in `trackingSocket.js` still exists and
still emits against a hardcoded vehicle id. It now says `source: 'simulation'`
on the wire, and anything not marked `source: 'report'` is stamped on the map —
same rule as `DemoStamp`. An invented lorry must never slide onto a farmer's
tracking screen looking like their own.

Mandi deals still live in the zustand store, on purpose — they are a
conversation between a farmer and a trader, not fleet state. The pickup request
a deal produces *is* persisted, and that is the thing a fleet owner acts on.
