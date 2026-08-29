# Quick Testing Guide - Buyer Location & Mandi Selection Fixes

## Prerequisites
```powershell
# Ensure all services running:
cd backend && npm run dev      # Port 5000
cd ai-engine && python -m uvicorn app.main:app --reload  # Port 8000
cd frontend && npm run dev     # Port 3000
```

---

## Test 1: Expanded Mandi Selection (5 min)

### Goal: Verify 150+ mandis available in searchable dropdown

**Steps:**
1. Login as APMC Buyer
2. Go to "Buyer Rates" tab
3. Click "Post New Rate"
4. Click on "Select Mandi" dropdown

**Verify:**
- ✅ Dropdown opens with search box
- ✅ Type "Nashik" → see multiple Nashik mandis
- ✅ Type "Lasalgaon" → see "Lasalgaon (Niphad) APMC · Nashik District"
- ✅ Arrow keys navigate through options
- ✅ Enter key selects focused option
- ✅ Escape closes dropdown
- ✅ Click outside closes dropdown
- ✅ Selected mandi shows checkmark

**Before Fix:** Only 4 mandis available
**After Fix:** 150+ mandis searchable

---

## Test 2: Buyer Location in Deals (10 min)

### Goal: Farmer can deal with buyer at their actual location

**Setup:**
1. Create buyer account (role: "APMC Buyer")
2. Create farmer account (role: "Farmer")

**Part A: Buyer Posts Rate**
1. Login as Buyer
2. Go to "Buyer Rates"
3. Post rate:
   - Crop: Tomato
   - Grade: Grade-A Premium
   - Price: ₹46/kg
   - Quantity: 5000 kg
   - Mandi: Search and select "Pune APMC"
4. Submit

**Part B: Farmer Sees and Deals**
1. Login as Farmer
2. Select crop "Tomato" in Crop tab
3. Go to "Today" tab
4. Scroll to "Direct Buyer Rates" section
5. **Verify:** See buyer's Tomato posting
6. Click "Deal with Buyer" button
7. Navigate to Transport screen

**Verify:**
- ✅ Farmer redirected to Transport screen
- ✅ Deal panel opens with buyer's mandi
- ✅ Can proceed to vehicle selection
- ✅ No errors in console

**Before Fix:** Could only select mandi, vehicles couldn't be matched
**After Fix:** Buyer location passed, vehicle matching works

---

## Test 3: Crop Filtering Still Works (3 min)

### Goal: Farmers only see rates for their selected crop

**Setup:**
- Buyer has posted rates for: Tomato, Onion, Potato

**Steps:**
1. Login as Farmer
2. Select "Tomato" in Crop tab
3. Go to Today screen
4. Check "Direct Buyer Rates" section

**Verify:**
- ✅ Only Tomato rates visible
- ❌ Onion and Potato rates NOT visible

5. Change crop to "Onion" in Crop tab
6. Return to Today screen

**Verify:**
- ✅ Only Onion rates visible now
- ❌ Tomato and Potato rates NOT visible

---

## Test 4: SearchableSelect Keyboard Navigation (2 min)

**Steps:**
1. BuyerRatesScreen → Post Rate form
2. Click mandi dropdown
3. Press ↓ arrow key multiple times
4. **Verify:** Focus moves down through options
5. Press ↑ arrow key
6. **Verify:** Focus moves back up
7. Press Enter on focused option
8. **Verify:** Option selected, dropdown closes
9. Reopen dropdown, press Escape
10. **Verify:** Dropdown closes without selection

---

## Test 5: Search Filtering (2 min)

**Steps:**
1. Open mandi dropdown in BuyerRatesScreen
2. Type "Nashik"

**Verify:**
- ✅ Shows ~16 Nashik-region mandis
- ✅ Each shows "Nashik District" label
- ✅ Count shows "16 options matching 'Nashik'"

3. Clear search, type "Lasalgaon"

**Verify:**
- ✅ Shows only Lasalgaon options
- ✅ Count updates to "1 option matching 'Lasalgaon'"

4. Type "xyz123"

**Verify:**
- ✅ Shows "No matches found"
- ✅ Count shows "0 options"

---

## Test 6: Multiple Buyers, Multiple Crops (5 min)

**Setup:**
- Buyer A posts: Tomato ₹46/kg at Mumbai APMC
- Buyer B posts: Tomato ₹44/kg at Pune APMC
- Buyer C posts: Onion ₹34/kg at Nashik APMC

**Steps:**
1. Login as Farmer
2. Select Tomato
3. Go to Today screen

**Verify:**
- ✅ See 2 Tomato postings (Buyer A and B)
- ❌ Don't see Onion posting (Buyer C)

4. Click "Deal with Buyer" on Buyer A's posting

**Verify:**
- ✅ Navigate to Transport
- ✅ Deal shows Mumbai APMC
- ✅ Can proceed

5. Go back, click "Deal with Buyer" on Buyer B's posting

**Verify:**
- ✅ Navigate to Transport
- ✅ Deal shows Pune APMC (different from Buyer A)
- ✅ Can proceed

---

## Test 7: Deal Persistence (3 min)

**Steps:**
1. Farmer creates deal with buyer (follow Test 2)
2. Refresh page (F5)
3. Go to Transport screen
4. Check DealPanel

**Verify:**
- ✅ Deal still exists
- ✅ Mandi name correct
- ✅ Buyer details present
- ✅ Can continue to book vehicle

---

## Test 8: API Response Verification (2 min)

**Steps:**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Buyer posts new rate
4. Find POST request to `/api/buyer/postings`
5. Check response

**Verify Response Includes:**
```json
{
  "success": true,
  "posting": {
    "id": "...",
    "mandiName": "Lasalgaon APMC",  // ✅ Selected mandi
    "buyerLocation": {               // ✅ NEW FIELD
      "address": "...",
      "coordinates": [lng, lat]      // ✅ or [] if not provided
    },
    ...
  }
}
```

6. Farmer loads Today screen
7. Find GET request to `/api/buyer/postings?cropType=Tomato`
8. Check response

**Verify:**
- ✅ `postings` array contains entries
- ✅ Each posting has `buyerLocation` field
- ✅ Filtered by cropType

---

## Test 9: Backward Compatibility (3 min)

### Goal: Old postings without buyerLocation still work

**Steps:**
1. If you have old postings in database (before this fix)
2. Login as Farmer
3. Go to Today screen

**Verify:**
- ✅ Old postings still display
- ✅ Can click "Deal with Buyer"
- ✅ No errors (graceful fallback)
- ✅ System uses mandi name instead of coordinates

---

## Test 10: Edge Cases (5 min)

### Empty Search
1. Open mandi dropdown
2. Type spaces only
3. **Verify:** Shows all 150+ mandis

### Long Mandi Names
1. Search for "Chhatrapati Sambhajinagar"
2. **Verify:** Displays correctly without overflow

### Special Characters
1. Type "Pune(Moshi)"
2. **Verify:** Finds "Pune (Moshi) APMC"

### Case Insensitive
1. Type "NASHIK"
2. **Verify:** Finds Nashik mandis
3. Type "nashik"
4. **Verify:** Same results

### District Search
1. Type "Pune" in search
2. **Verify:** Shows all mandis in Pune district
3. Each shows "Pune District" label

---

## Quick Verification Checklist

Run through this in 2 minutes to verify core functionality:

- [ ] BuyerRatesScreen has searchable dropdown
- [ ] Can search and find "Lasalgaon APMC"
- [ ] Buyer can post rate with selected mandi
- [ ] Posting appears in buyer's rate list
- [ ] Farmer (with matching crop) sees posting on Today
- [ ] Farmer can click "Deal with Buyer"
- [ ] Farmer navigates to Transport screen
- [ ] Deal panel shows correct mandi
- [ ] No console errors anywhere
- [ ] Crop filtering works (only matching crop rates visible)

---

## Expected Results Summary

| Test | Before Fix | After Fix |
|------|-----------|-----------|
| Mandi Options | 4 mandis | 150+ mandis |
| Mandi Search | No search | Live search with filter |
| Buyer Location | Not captured | Coordinates stored |
| Deal Destination | Mandi name only | Buyer coordinates + address |
| Vehicle Matching | Failed | Works correctly |
| Freight Calculation | Generic | Accurate to buyer location |

---

## Troubleshooting

### Issue: Dropdown doesn't open
**Fix:** Check console for errors, verify SearchableSelect component loaded

### Issue: Search not working
**Fix:** Verify mandiList.js imported correctly, check filter logic

### Issue: Can't create deal with buyer
**Fix:** 
1. Check buyer posting has coordinates
2. Verify pendingMandi includes coordinates
3. Check console for errors

### Issue: Old postings not visible
**Fix:** 
1. Verify API returns buyerLocation (can be empty)
2. Check frontend handles missing coordinates gracefully

### Issue: Vehicle matching fails
**Fix:**
1. Verify deal.mandiCoords populated
2. Check isBuyerLocation flag set correctly
3. Ensure coordinates in [lng, lat] format

---

## Success Criteria

✅ **All tests pass** = Both issues are fixed:
1. Buyer location selection works → Farmers can complete deals
2. 150+ mandis available → Buyers can select any APMC

✅ **No regressions** = Old functionality still works:
1. Existing deals without coordinates work
2. Crop filtering still accurate
3. Deal persistence intact

✅ **Good UX** = Smooth user experience:
1. Search is fast and responsive
2. Keyboard navigation smooth
3. No UI glitches or errors

---

## Time Estimates

- **Quick Smoke Test:** 5 minutes (checklist only)
- **Core Functionality:** 15 minutes (Tests 1, 2, 3)
- **Comprehensive Test:** 30 minutes (all 10 tests)
- **Full Regression:** 45 minutes (all tests + edge cases)

---

## Test Data Setup

**Buyer Account:**
```
Email: rajesh.buyer@krishiflow.ai
Role: APMC Buyer
Name: Rajesh Mehta
Phone: +91 98200 55443
Company: Mehta Produce Corp
```

**Farmer Account:**
```
Email: ramesh.farmer@krishiflow.ai
Role: Farmer
Name: Ramesh Singh
Phone: +91 98765 43210
Location: Nashik, Maharashtra
Primary Crop: Tomato
```

**Test Postings:**
```
1. Tomato, ₹46/kg, 5000kg, Mumbai APMC
2. Tomato, ₹44/kg, 3000kg, Pune APMC
3. Onion, ₹34/kg, 10000kg, Nashik APMC
4. Potato, ₹28/kg, 8000kg, Solapur APMC
```

---

Happy Testing! 🎉
