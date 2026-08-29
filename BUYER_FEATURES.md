# Buyer Rates, Crop Selection & Buyer Location

Consolidated implementation + testing notes for the buyer-facing work. This file
merges what used to live in `FIXES_SUMMARY.md`, `BUYER_LOCATION_FIXES.md`,
`SESSION_SUMMARY.md`, `TESTING_GUIDE.md` and `BUYER_LOCATION_TESTING.md`.

Two work-streams are covered:

- **Part 1 — Rate persistence & crop selection.** Buyer rate postings moved from
  the Zustand store to MongoDB; farmer crop selection persists; farmers see only
  postings for their selected crop.
- **Part 2 — Buyer location & mandi selection.** Postings carry the buyer's
  actual pickup/delivery coordinates (not just a mandi name), and the mandi
  picker went from 4 hardcoded options to 150+ searchable Maharashtra APMCs.

### Issues resolved (6)

| # | Problem | Fix |
| --- | --- | --- |
| 1 | Buyer rate vanished on page refresh | `BuyerPosting` MongoDB model + CRUD API |
| 2 | Farmers couldn't see newly added buyer rates | Frontend fetches postings from API on mount |
| 3 | Farmer crop selection reset on refresh | `localStorage` persistence for `cropDetails` |
| 4 | Farmers saw rates for every crop | Backend filters by `cropType`, re-fetch on change |
| 5 | Farmers couldn't route to the buyer's real location | `buyerLocation` coords on posting + User, threaded into deals |
| 6 | Only 4 mandi options when posting | `mandiList.js` (150+ APMCs) + `SearchableSelect` |

---

## Part 1 — Rate persistence & crop selection

### Backend

#### New model: `BuyerPosting` — `backend/src/models/BuyerPosting.js`

```javascript
{
  buyer: ObjectId (ref User),
  cropType: String (indexed),
  grade: String,
  offeredPricePerKg: Number,
  requiredQuantityKg: Number,
  receivedQuantityKg: Number,
  mandiName: String (indexed),
  status: String (enum),
  expiresAt: Date (indexed),
  timestamps: true
}
```

Indexes:

```javascript
{ buyer: 1 }
{ cropType: 1 }
{ mandiName: 1 }
{ status: 1 }
{ expiresAt: 1 }
{ cropType: 1, mandiName: 1, status: 1 }  // compound — farmer queries
{ expiresAt: 1, status: 1 }               // compound — expiry filtering
```

#### New controller: `buyerController` — `backend/src/controllers/buyerController.js`

- `createPosting` — create a new buyer rate posting. Expiry date is calculated
  server-side from `expiresInDays`, never trusted from the client.
- `getPostings` — list all active, non-expired postings, with optional
  `cropType` / `mandiName` / `status` filters.
- `getMyPostings` — the authenticated buyer's own postings (includes expired,
  for history).
- `deletePosting` — owner-only.
- `updateReceivedQuantity` — bumps `receivedQuantityKg`; status auto-advances
  based on the received-vs-required ratio.

#### Routes — `backend/src/routes/apiRoutes.js`

```
POST   /api/buyer/postings              create           (Buyer / APMC Buyer / Trader)
GET    /api/buyer/postings              list active       (any authenticated user)
GET    /api/buyer/postings/mine         own postings      (Buyer / APMC Buyer / Trader)
DELETE /api/buyer/postings/:id          delete            (owner only)
PATCH  /api/buyer/postings/:id/received update received   (Buyer / APMC Buyer / Trader)
```

### Frontend

#### API service — `frontend/src/services/api.js`

New functions: `createBuyerPosting(posting)`, `fetchBuyerPostings(filters)`,
`fetchMyBuyerPostings()`, `deleteBuyerPosting(id)`,
`updateBuyerPostingReceived(id, quantity)`.

#### `BuyerRatesScreen.jsx`

Dropped the Zustand dependency. Now fetches on mount via `fetchMyBuyerPostings()`
into local state, with loading/error states and dynamic expiry-date display.

```javascript
// before
const buyerPostings = useAppStore((s) => s.buyerPostings);
const addBuyerPosting = useAppStore((s) => s.addBuyerPosting);

// after
const [buyerPostings, setBuyerPostings] = useState([]);
const [isLoading, setIsLoading] = useState(true);
useEffect(() => { loadPostings(); }, []);
const loadPostings = async () => setBuyerPostings(await fetchMyBuyerPostings());
```

#### `TodayScreen.jsx`

Fetches postings filtered by the farmer's crop, and re-fetches whenever the crop
changes:

```javascript
useEffect(() => {
  const loadBuyerPostings = async () => {
    const postings = await fetchBuyerPostings({ cropType: cropDetails.cropType });
    setBuyerPostings(postings);
  };
  loadBuyerPostings();
}, [cropDetails.cropType]);
```

#### `useAppStore.js`

- **Crop persistence:** `cropDetails` is read from `localStorage` on init and
  written back on every `setCropDetails`. `readStoredCropDetails()` swallows
  parse errors and falls back to `defaultCropDetails`.

  ```javascript
  cropDetails: storedCropDetails || defaultCropDetails,
  setCropDetails: (details) => {
    const updated = { ...get().cropDetails, ...details };
    localStorage.setItem('cropDetails', JSON.stringify(updated));
    set({ cropDetails: updated });
  }
  ```

- **Removed** `buyerPostings` array + `addBuyerPosting` / `deleteBuyerPosting`.
  Buyer postings are now component-level state fed by the API.

### Data flow

```
Buyer posts rate:
  BuyerRatesScreen → createBuyerPosting(data) → POST /api/buyer/postings
    → buyerController.createPosting → BuyerPosting.save() → response → local state

Farmer views rates:
  TodayScreen mount / crop change → fetchBuyerPostings({ cropType: 'Tomato' })
    → GET /api/buyer/postings?cropType=Tomato
    → BuyerPosting.find({ cropType, status: 'Active Procurement', expiresAt: { $gt: now } })
    → filtered postings rendered

Crop selection persistence:
  setCropDetails({ cropType: 'Onion' }) → localStorage.setItem('cropDetails', …)
    → TodayScreen useEffect detects change → re-fetch for 'Onion'

Page refresh:
  App init → readStoredCropDetails() → restore cropDetails
    → TodayScreen fetches postings for the restored crop
```

---

## Part 2 — Buyer location & mandi selection

### Backend

#### `User` model — `backend/src/models/User.js`

```javascript
buyerAddress: { type: String, trim: true, default: '' },
buyerCoordinates: { type: [Number], default: undefined }, // [lng, lat]
```

Store the buyer's default warehouse/office location for routing.

#### `BuyerPosting` model — added `buyerLocation`

```javascript
buyerLocation: {
  address: { type: String, trim: true, default: '' },
  coordinates: { type: [Number], default: undefined }, // [lng, lat]
},
```

Per-posting location, so one buyer can procure at different delivery points.

#### `buyerController.createPosting` — capture location

```javascript
buyerLocation: {
  address: req.user.buyerAddress || req.body.buyerAddress || '',
  coordinates: req.user.buyerCoordinates || req.body.buyerCoordinates || undefined,
},
```

All response formatters (`createPosting`, `getPostings`, `getMyPostings`) now
include `buyerLocation`.

#### `backend/src/data/mandiList.js` *(new)*

150+ Maharashtra APMC markets, extracted from `mandiGeo.js`, grouped by district:

```javascript
const MAHARASHTRA_MANDIS = [
  { value: 'Mumbai APMC', label: 'Mumbai APMC (Vashi, Navi Mumbai)', district: 'Mumbai' },
  { value: 'Pune APMC',   label: 'Pune APMC (Gultekdi)',            district: 'Pune' },
  { value: 'Nashik APMC', label: 'Nashik APMC (Main Mandi)',        district: 'Nashik' },
  // … 147 more
];
```

Coverage: Mumbai & Konkan (10), Pune (16), Nashik (16), Nagpur & Vidarbha (23),
Marathwada (19), Khandesh (11), Ahilyanagar (10), Western Maharashtra (21),
Buldhana & Washim (8), Yavatmal (5).

### Frontend

#### `frontend/src/data/mandiList.js` *(new)*

Same list as the backend, plus `MANDIS_BY_DISTRICT` and `POPULAR_MANDIS` helpers.

#### `frontend/src/design/primitives/SearchableSelect.jsx` *(new)*

- Live search — matches label, value or district.
- Keyboard nav — ↑/↓ move, Enter selects, Escape closes.
- Click-outside closes.
- Selected option shows a checkmark; each option shows its district; filtered
  count shown at the bottom.
- ARIA roles/labels.

```jsx
<SearchableSelect
  label="Select Mandi"
  value={form.mandiName}
  onChange={(value) => setForm((c) => ({ ...c, mandiName: value }))}
  options={MAHARASHTRA_MANDIS}
  placeholder="Select APMC Mandi"
  searchPlaceholder="Search mandis by name or district..."
/>
```

#### `BuyerRatesScreen.jsx`

Replaced the 4-option `<select>` (`['Vashi Wholesale APMC', 'Nashik Main APMC',
'Gultekdi APMC (Pune)', 'Nagpur APMC']`) with `SearchableSelect` over the full
`MAHARASHTRA_MANDIS` list.

#### `TodayScreen.jsx` — `handleDealWithBuyer`

```javascript
const handleDealWithBuyer = (posting) => {
  const hasLocation = posting.buyerLocation?.coordinates?.length === 2;
  setPendingMandi({
    id: posting.mandiName,
    name: posting.mandiName,
    ratePerKg: posting.offeredPricePerKg,
    net: posting.offeredPricePerKg * cropDetails.quantityKg,
    coordinates: hasLocation ? posting.buyerLocation.coordinates : null,
    isBuyerLocation: hasLocation,
    buyerAddress: posting.buyerLocation?.address || null,
    traderName: posting.traderName,
    traderPhone: posting.traderPhone,
  });
  setActiveTab('transport');
};
```

If the posting has coordinates they are used for routing; otherwise the deal
falls back to the generic mandi centre and `isBuyerLocation` stays `false`.

#### `DealPanel.jsx`

Every `createDeal` call now carries:

```javascript
mandiCoords: mandi.coordinates || null,
isBuyerLocation: mandi.isBuyerLocation || false,
buyerAddress: mandi.buyerAddress || null,
```

### Data flow

```
Buyer posts rate with location:
  BuyerRatesScreen → SearchableSelect (150+ options) → createBuyerPosting({ …, buyerLocation })
    → POST /api/buyer/postings → BuyerPosting.save() with buyerLocation → MongoDB

Farmer deals with buyer:
  TodayScreen → "Deal with Buyer" → handleDealWithBuyer(posting)
    → setPendingMandi({ coordinates, isBuyerLocation, buyerAddress })
    → TransportScreen → DealPanel.createDeal() → deal.mandiCoords = buyer coordinates
    → vehicle matching + freight use the buyer's actual point
```

### UI/UX before → after

```
Mandi picker:   [Dropdown, 4 options ▼]   →   [Search by name or district 🔍, 150 options]

Farmer deal:    Mandi: Nashik APMC (generic centre)      Delivery: Warehouse 5, APMC Yard, Lasalgaon
                Distance: ~45 km (to centre)        →    Distance: 38 km (to buyer location)
                Freight: ₹810 (generic)                  Freight: ₹684 (accurate)
                                                         Contact: Rajesh Mehta · +91 98200 55443
```

---

## Combined reference

### Database schema

#### `BuyerPosting` collection

```javascript
{
  _id: ObjectId,
  buyer: ObjectId,              // ref User
  cropType: "Tomato",           // indexed
  grade: "Grade-A Premium Red",
  offeredPricePerKg: 46,
  requiredQuantityKg: 5000,
  receivedQuantityKg: 2500,
  mandiName: "Lasalgaon APMC",  // indexed
  buyerLocation: {              // Part 2 — optional
    address: "Warehouse 5, APMC Yard, Lasalgaon",
    coordinates: [74.24, 20.14] // [lng, lat]
  },
  status: "Active Procurement", // enum
  expiresAt: ISODate,           // indexed
  createdAt: ISODate,
  updatedAt: ISODate
}
```

#### `User` collection — added fields

```javascript
{
  // … existing
  primaryCrop: String,
  buyerAddress: String,         // NEW — Part 2
  buyerCoordinates: [Number],   // NEW — [lng, lat]
}
```

### API examples

**Create**

```bash
POST /api/buyer/postings
Authorization: Bearer <token>
Content-Type: application/json

{
  "cropType": "Tomato",
  "grade": "Grade-A Premium Red",
  "offeredPricePerKg": 46,
  "requiredQuantityKg": 5000,
  "mandiName": "Lasalgaon APMC",
  "buyerAddress": "Warehouse 5, APMC Yard, Lasalgaon",
  "buyerCoordinates": [74.24, 20.14],
  "expiresInDays": 7
}
```

```json
{
  "success": true,
  "message": "Buyer posting created successfully",
  "posting": {
    "id": "66cf1234567890abcdef1234",
    "cropType": "Tomato",
    "grade": "Grade-A Premium Red",
    "offeredPricePerKg": 46,
    "requiredQuantityKg": 5000,
    "receivedQuantityKg": 0,
    "mandiName": "Lasalgaon APMC",
    "traderName": "Rajesh Mehta (Mehta Produce Corp)",
    "traderPhone": "+91 98200 55443",
    "buyerLocation": { "address": "Warehouse 5, APMC Yard, Lasalgaon", "coordinates": [74.24, 20.14] },
    "status": "Active Procurement",
    "expiresAt": "2026-09-04T10:00:00.000Z",
    "createdAt": "2026-08-28T10:00:00.000Z"
  }
}
```

**List (farmer view, filtered)**

```bash
GET /api/buyer/postings?cropType=Tomato
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "count": 2,
  "postings": [
    {
      "id": "66cf1234567890abcdef1234",
      "cropType": "Tomato",
      "offeredPricePerKg": 46,
      "mandiName": "Lasalgaon APMC",
      "buyerLocation": { "address": "Warehouse 5, APMC Yard, Lasalgaon", "coordinates": [74.24, 20.14] },
      "status": "Active Procurement",
      "expiresAt": "2026-09-04T10:00:00.000Z"
    }
  ]
}
```

**Own postings** — `GET /api/buyer/postings/mine`
**Delete** — `DELETE /api/buyer/postings/:id` → `{ "success": true, "message": "Posting deleted successfully" }`
**Update received** — `PATCH /api/buyer/postings/:id/received`

### Files changed

**New (5)**

1. `backend/src/models/BuyerPosting.js`
2. `backend/src/controllers/buyerController.js`
3. `backend/src/data/mandiList.js`
4. `frontend/src/data/mandiList.js`
5. `frontend/src/design/primitives/SearchableSelect.jsx`

**Modified (8)**

1. `backend/src/models/User.js` — `buyerAddress`, `buyerCoordinates`
2. `backend/src/routes/apiRoutes.js` — 5 buyer-posting routes
3. `frontend/src/services/api.js` — 5 buyer-posting functions
4. `frontend/src/features/buyer/BuyerRatesScreen.jsx` — API-backed + `SearchableSelect`
5. `frontend/src/features/farmer/today/TodayScreen.jsx` — filtered fetch + buyer coords
6. `frontend/src/features/farmer/transport/DealPanel.jsx` — buyer location in deals
7. `frontend/src/store/useAppStore.js` — crop persistence, buyer-posting state removed
8. (`buyerController.js` also listed under new — extended across both parts)

### Security

- Every buyer-posting endpoint requires JWT.
- Create / delete / update restricted to Buyer / APMC Buyer / Trader; delete is
  owner-scoped. Farmers can only read (filtered) active postings.
- Numeric fields validated for minimums; crop / grade / mandi required.
- `expiresAt` and status transitions are server-controlled, never client-set.
- `buyer` reference enforced via Mongoose ref; expired postings auto-excluded
  from farmer queries.

### Performance

- Compound indexes `(cropType, mandiName, status)` and `(expiresAt, status)`
  back the farmer and expiry queries; `(buyer)` backs "my postings".
- Buyer postings are component-level state, not global Zustand — re-fetch only on
  crop change, not every render.
- Crop selection restores instantly from `localStorage`; rate data is never
  cached (rates are real-time).

### Backward compatibility

- Postings and deals without `buyerLocation` keep working — routing falls back to
  the mandi centre and `isBuyerLocation` is `false`.
- No required new fields, no breaking API contract changes.

### Known limitations

1. Coordinates are entered manually — no geocoding from address yet.
2. Distance is haversine × 1.3, not real road distance.
3. Vehicle matching is proximity-based; capacity optimisation lives in the
   dispatch VRP, not here.
4. Rate updates need a refresh — no WebSocket push.

### Future enhancements

Geocoding API and a map picker for coordinates; location verification against
mandi bounds; multiple warehouses per buyer; a distance-matrix API for road
distances; rate history per mandi/crop; a bid/counter-offer system; push
notifications when a new rate matches a farmer's crop; expiry alerts for buyers.

---

## Testing guide

### Prerequisites

```bash
cd backend   && npm install && npm run dev                                   # :5000
cd ai-engine && pip install -r requirements.txt && \
                python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # :8000
cd frontend  && npm install && npm run dev                                   # :3000
```

MongoDB must be reachable at `MONGODB_URI` in `backend/.env` (local
`mongodb://localhost:27017/krishiflow` or an Atlas SRV URI). Seed the demo
logins with `node backend/scripts/seedAccounts.js` (idempotent) — see
`SAMPLE_USERS.md`. Password for every seeded account: `krishi@2026`.

### Scenario 1 — Rate persistence

1. Sign in as a buyer (`rajesh.buyer@krishiflow.ai`).
2. Buyer Rates → Post New Rate: Tomato / Grade-A Premium Red / ₹46 / 5000 kg /
   Mumbai APMC → submit.
3. Rate appears immediately with trader name, phone, expiry.
4. Refresh (F5) → still there. Close browser, reopen, sign in → still there.
5. Restart backend → still there.
6. DB check: `mongosh krishiflow` → `db.buyerpostings.find().pretty()`.

### Scenario 2 — Farmer sees buyer rates

1. As buyer, post rates for Tomato (Mumbai APMC) and Onion (Nashik APMC).
2. Sign in as a farmer in another browser.
3. Crop tab → select Tomato. Today tab → "Direct Buyer Rates" shows the Tomato
   posting with trader name, price, quantity, mandi.
4. Buyer posts another rate → farmer refreshes → new rate appears.

### Scenario 3 — Crop selection persistence

1. As farmer, Crop tab → change Tomato → Onion; UI updates.
2. Refresh → Onion still selected. Close/reopen browser → still Onion.
3. DevTools → Application → Local Storage → `cropDetails` contains
   `{"cropType":"Onion",…}`.

### Scenario 4 — Crop filtering

Setup: buyer has posted Tomato ₹46 (Mumbai), Onion ₹34 (Nashik), Potato ₹28
(Pune).

1. Farmer selects Tomato → Today shows only the ₹46 Tomato rate; no Onion/Potato.
2. Switch to Onion → Today shows only the ₹34 Onion rate.
3. Switch to Potato → only the ₹28 Potato rate.
4. Select a crop with no postings (e.g. Mango) → empty state
   ("No buyer rates available for Mango").

### Scenario 5 — Rate deletion

1. As buyer, Buyer Rates → trash icon on a posting → disappears immediately.
2. Refresh → still gone.
3. Sign in as farmer → Today → the rate is gone there too.

### Scenario 6 — Expiry handling

1. Create a posting with `expiresInDays: 0` via the API (browser console, logged
   in as buyer):

   ```javascript
   fetch('http://localhost:5000/api/buyer/postings', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') },
     body: JSON.stringify({ cropType: 'Tomato', grade: 'Test Grade',
       offeredPricePerKg: 50, requiredQuantityKg: 1000,
       mandiName: 'Test APMC', expiresInDays: 0 })
   })
   ```

2. Force it into the past:

   ```javascript
   db.buyerpostings.updateOne({ grade: 'Test Grade' },
     { $set: { expiresAt: new Date('2020-01-01') } })
   ```

3. Refresh the farmer's Today screen → the expired rate is not shown (still
   visible in the buyer's own list for history).

### Scenario 7 — Expanded mandi selection

1. As buyer, Buyer Rates → Post New Rate → open "Select Mandi".
2. Verify: search box present; type "Nashik" → ~16 Nashik-region mandis, each
   labelled "Nashik District", count reads "16 options matching 'Nashik'".
3. Type "Lasalgaon" → "Lasalgaon (Niphad) APMC · Nashik District", count "1".
4. Type "xyz123" → "No matches found", count "0 options".
5. Keyboard: ↓/↑ move focus, Enter selects and closes, Escape closes without
   selecting, click-outside closes. Selected option shows a checkmark.

### Scenario 8 — Buyer location in a deal

1. As buyer, post a Tomato rate at Pune APMC with warehouse coordinates
   (e.g. `[73.85, 18.52]`).
2. As farmer, select Tomato → Today → "Deal with Buyer" on that posting.
3. Redirected to the Transport screen; the deal panel opens on the buyer's mandi
   and you can proceed to vehicle selection. No console errors.
4. Inspect the deal / `pendingMandi`: `coordinates` = `[73.85, 18.52]`,
   `isBuyerLocation` = `true`, `buyerAddress` present; vehicle matching uses the
   buyer coordinates.

### Scenario 9 — Fallback to mandi centre

1. Buyer posts a rate **without** coordinates.
2. Farmer deals with it → `isBuyerLocation` = `false`, generic mandi-centre
   coordinates used, no errors.

### Scenario 10 — Multiple buyers / crops

Setup: Buyer A Tomato ₹46 (Mumbai), Buyer B Tomato ₹44 (Pune), Buyer C Onion ₹34
(Nashik).

1. Farmer selects Tomato → Today shows 2 postings (A and B), not C.
2. "Deal with Buyer" on A → Transport, deal shows Mumbai APMC.
3. Back, "Deal with Buyer" on B → Transport, deal shows Pune APMC.

### Scenario 11 — Deal persistence

1. Farmer creates a deal with a buyer (Scenario 8).
2. Refresh (F5) → Transport → deal still present with correct mandi name, buyer
   details; can continue to booking.

### Scenario 12 — API response verification

1. DevTools → Network → filter `buyer/postings`.
2. On POST, response `posting` includes `mandiName` and `buyerLocation`
   (`{ address, coordinates }`, or empty when not provided).
3. On the farmer's Today load, `GET /api/buyer/postings?cropType=Tomato` returns
   a `postings` array, every entry carrying `buyerLocation`, all filtered by
   `cropType`.

### Scenario 13 — Backward compatibility

1. With old postings (pre-`buyerLocation`) in the DB, the farmer's Today screen
   still renders them; "Deal with Buyer" works via mandi name; no errors.

### Edge cases

- **Empty / whitespace search** → all 150+ mandis shown.
- **Long names** — "Chhatrapati Sambhajinagar" renders without overflow.
- **Punctuation** — "Pune(Moshi)" finds "Pune (Moshi) APMC".
- **Case-insensitive** — "NASHIK" and "nashik" give the same results.
- **District search** — "Pune" lists every mandi in Pune district, each labelled
  "Pune District".

### Quick smoke checklist (~2 min)

- [ ] BuyerRatesScreen has the searchable dropdown
- [ ] Can search and find "Lasalgaon APMC"
- [ ] Buyer can post a rate with the selected mandi; it appears in their list
- [ ] Farmer (matching crop) sees the posting on Today
- [ ] "Deal with Buyer" navigates to the Transport screen
- [ ] Deal panel shows the correct mandi
- [ ] Crop filtering works (only the selected crop's rates show)
- [ ] Rate persists across refresh; deletion persists across refresh
- [ ] Expired rates hidden from farmers
- [ ] No console errors anywhere

### Expected results summary

| Aspect | Before | After |
| --- | --- | --- |
| Buyer rate persistence | Lost on refresh | MongoDB-backed |
| Crop filtering | All crops shown | Backend-filtered by `cropType` |
| Crop selection | Reset on refresh | `localStorage`-persisted |
| Vehicle matching w/ buyer postings | Failed | Works via buyer coords |
| Mandi options | 4 | 150+, searchable |
| Deal destination | Mandi name only | Buyer coordinates + address |
| Freight calculation | Generic to mandi centre | Accurate to buyer location |

### Time estimates

Smoke test ~5 min · core (Scenarios 1–4, 7) ~15 min · full pass ~30 min ·
full regression incl. edge cases ~45 min.

---

## Troubleshooting

**"Cannot reach KrishiFlow server"** — backend not on :5000, CORS origin, or a
network error in the console.

**Rates not appearing for the farmer** — check the posting's `cropType` matches
exactly (case-sensitive), `status` is `"Active Procurement"`, `expiresAt` is in
the future, and MongoDB is connected.

**Crop selection not persisting** — `localStorage` disabled/blocked, or
`setCropDetails` called with a partial object; `readStoredCropDetails` must
handle parse errors.

**"Posting not found or you do not have permission"** — invalid JWT, wrong role,
or the posting isn't owned by the signed-in user.

**SearchableSelect won't open** — component import, `mandiList.js` load, console
errors.

**Deal creation fails** — verify `deal.mandiCoords` is populated (or a clean
fallback to mandi name), `isBuyerLocation` set correctly, coordinates in
`[lng, lat]` order.

**Old postings not visible** — the API must still return `buyerLocation` (may be
empty) and the frontend must tolerate missing coordinates.

### Debug snippets

Browser console:

```javascript
localStorage.getItem('cropDetails');
localStorage.getItem('user');
localStorage.getItem('token');
// Network tab → filter "buyer/postings"
```

MongoDB:

```javascript
db.buyerpostings.find().pretty()
db.buyerpostings.find({ cropType: 'Tomato' })
db.buyerpostings.find({ expiresAt: { $gt: new Date() }, status: 'Active Procurement' })
db.buyerpostings.aggregate([{ $group: { _id: '$cropType', count: { $sum: 1 } } }])
db.buyerpostings.getIndexes()
```

Expected indexes: `_id_`, `buyer_1`, `cropType_1`,
`cropType_1_mandiName_1_status_1`, `expiresAt_1_status_1`.

### Rollback

```bash
git status
git diff
git checkout -- <file>     # uncommitted
git revert <commit-hash>    # committed
```
