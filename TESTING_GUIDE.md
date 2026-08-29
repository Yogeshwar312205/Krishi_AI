# Testing Guide - Buyer Rates & Crop Selection Fixes

## Prerequisites

Ensure all three services are running:

```powershell
# Terminal 1 - Backend
cd backend
npm install
npm run dev
# Running on http://localhost:5000

# Terminal 2 - AI Engine
cd ai-engine
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Running on http://localhost:8000

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

## MongoDB Setup

Ensure MongoDB is running and accessible at the URI in `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/krishiflow
# OR
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/krishiflow
```

---

## Test Scenario 1: Buyer Rate Persistence

### Steps:
1. **Create Buyer Account**
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Select role: "APMC Buyer"
   - Fill details and register

2. **Post a Rate**
   - Navigate to "Buyer Rates" tab
   - Click "Post New Rate"
   - Fill form:
     - Crop: Tomato
     - Grade: Grade-A Premium Red
     - Price: ₹46/kg
     - Quantity: 5000 kg
     - Mandi: Mumbai APMC
   - Submit

3. **Verify Immediate Display**
   - ✅ Rate should appear in list immediately
   - ✅ Shows trader name, phone, expiry date

4. **Test Persistence**
   - Refresh the page (F5)
   - ✅ Rate should still be visible
   - Close browser completely
   - Reopen and login
   - ✅ Rate should still be there

5. **Backend Verification**
   ```powershell
   # Check MongoDB directly
   mongosh krishiflow
   db.buyerpostings.find().pretty()
   ```

### Expected Result:
- Rate persists across refreshes
- Stored in MongoDB with correct fields
- Buyer can see their own postings

---

## Test Scenario 2: Farmer Sees Buyer Rates

### Steps:
1. **Login as Buyer** (if not already)
   - Post rates for multiple crops:
     - Tomato: ₹46/kg at Mumbai APMC
     - Onion: ₹34/kg at Nashik APMC

2. **Login as Farmer**
   - Sign up new account with role "Farmer"
   - OR use existing farmer account

3. **Check Today Screen**
   - Navigate to "Today" tab
   - Scroll to "Direct Buyer Rates" section
   - ✅ Should see buyer postings
   - ✅ Shows trader name, price, quantity, mandi

4. **Test Real-time Updates**
   - Open two browsers:
     - Browser A: Buyer logged in
     - Browser B: Farmer logged in
   - Buyer posts new rate in Browser A
   - Farmer refreshes Browser B
   - ✅ New rate should appear

### Expected Result:
- Farmer sees all active buyer rates
- Rates include complete information
- New rates appear after refresh

---

## Test Scenario 3: Crop Selection Persistence

### Steps:
1. **Login as Farmer**
   - Navigate to "Crop" tab
   - Current selection: Tomato (default)

2. **Change Crop**
   - Select "Onion" from dropdown
   - ✅ UI updates to show Onion

3. **Test Persistence**
   - Refresh page (F5)
   - ✅ Onion should still be selected
   - Close browser completely
   - Reopen and login
   - ✅ Onion should still be selected

4. **Verify localStorage**
   - Open browser DevTools (F12)
   - Go to Application → Local Storage → http://localhost:3000
   - Find key: `cropDetails`
   - ✅ Should contain: `{"cropType":"Onion",...}`

### Expected Result:
- Crop selection persists across refreshes
- Stored in localStorage
- Restores on app initialization

---

## Test Scenario 4: Crop Filtering

### Setup:
Ensure buyer has posted rates for multiple crops:
- Tomato: ₹46/kg at Mumbai APMC
- Onion: ₹34/kg at Nashik APMC
- Potato: ₹28/kg at Pune APMC

### Steps:
1. **Login as Farmer**
   - Navigate to "Crop" tab
   - Select "Tomato"
   - Go to "Today" tab

2. **Verify Tomato Filtering**
   - Scroll to "Direct Buyer Rates"
   - ✅ Should see ONLY Tomato rate (₹46/kg)
   - ❌ Should NOT see Onion or Potato rates

3. **Change to Onion**
   - Navigate back to "Crop" tab
   - Select "Onion"
   - Return to "Today" tab

4. **Verify Onion Filtering**
   - Check "Direct Buyer Rates" section
   - ✅ Should see ONLY Onion rate (₹34/kg)
   - ❌ Should NOT see Tomato or Potato rates

5. **Change to Potato**
   - Select Potato in "Crop" tab
   - Return to "Today" tab
   - ✅ Should see ONLY Potato rate (₹28/kg)

6. **Test with No Rates**
   - Select a crop with no posted rates (e.g., Mango)
   - ✅ Should show: "No buyer rates available for Mango"

### Expected Result:
- Farmer sees ONLY rates for selected crop
- Rates update automatically when crop changes
- Empty state shown when no rates match

---

## Test Scenario 5: Rate Deletion

### Steps:
1. **Login as Buyer**
   - Navigate to "Buyer Rates" tab
   - See list of posted rates

2. **Delete a Rate**
   - Click trash icon on any posting
   - ✅ Rate disappears immediately

3. **Verify Deletion Persists**
   - Refresh page
   - ✅ Deleted rate still gone

4. **Verify Farmer Side**
   - Login as farmer
   - Navigate to "Today" tab
   - ✅ Deleted rate no longer visible

### Expected Result:
- Deletion reflects immediately
- Persists across refreshes
- Removed from farmer's view

---

## Test Scenario 6: Expiry Handling

### Manual Test (Requires Date Manipulation):

1. **Create Posting via API**
   ```javascript
   // In browser console while logged in as buyer
   fetch('http://localhost:5000/api/buyer/postings', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + localStorage.getItem('token')
     },
     body: JSON.stringify({
       cropType: 'Tomato',
       grade: 'Test Grade',
       offeredPricePerKg: 50,
       requiredQuantityKg: 1000,
       mandiName: 'Test APMC',
       expiresInDays: 0  // Expires today
     })
   })
   ```

2. **Wait or Manually Update DB**
   ```javascript
   // Set expiry to past
   db.buyerpostings.updateOne(
     { grade: 'Test Grade' },
     { $set: { expiresAt: new Date('2020-01-01') } }
   )
   ```

3. **Verify Filtering**
   - Refresh farmer's Today screen
   - ✅ Expired rate should NOT appear

### Expected Result:
- Expired postings automatically filtered out
- Not visible to farmers
- Still visible in buyer's own list (for history)

---

## API Testing with Postman/Thunder Client

### Get All Postings (Farmer View)
```
GET http://localhost:5000/api/buyer/postings?cropType=Tomato
Authorization: Bearer <farmer_jwt_token>
```

### Get My Postings (Buyer View)
```
GET http://localhost:5000/api/buyer/postings/mine
Authorization: Bearer <buyer_jwt_token>
```

### Create Posting
```
POST http://localhost:5000/api/buyer/postings
Authorization: Bearer <buyer_jwt_token>
Content-Type: application/json

{
  "cropType": "Tomato",
  "grade": "Grade-A",
  "offeredPricePerKg": 48,
  "requiredQuantityKg": 5000,
  "mandiName": "Mumbai APMC",
  "expiresInDays": 7
}
```

### Delete Posting
```
DELETE http://localhost:5000/api/buyer/postings/<posting_id>
Authorization: Bearer <buyer_jwt_token>
```

---

## Common Issues & Solutions

### Issue: "Cannot reach KrishiFlow server"
**Solution:**
- Check backend is running on port 5000
- Verify CORS settings allow frontend origin
- Check browser console for network errors

### Issue: Rates not appearing
**Solution:**
- Verify buyer posting status is "Active Procurement"
- Check expiresAt is in the future
- Ensure cropType matches exactly (case-sensitive)
- Check MongoDB connection

### Issue: Crop selection not persisting
**Solution:**
- Clear browser cache and localStorage
- Check browser allows localStorage
- Verify setCropDetails is called correctly

### Issue: "Posting not found or you do not have permission"
**Solution:**
- Verify JWT token is valid
- Check user role is Buyer/APMC Buyer/Trader
- Ensure posting belongs to logged-in user

---

## Browser DevTools Debugging

### Check localStorage:
```javascript
// In browser console
console.log(localStorage.getItem('cropDetails'));
console.log(localStorage.getItem('user'));
console.log(localStorage.getItem('token'));
```

### Monitor Network Requests:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Watch for:
   - `GET /api/buyer/postings?cropType=...`
   - `POST /api/buyer/postings`
   - `DELETE /api/buyer/postings/...`

### Check React State:
1. Install React DevTools extension
2. Open Components tab
3. Find TodayScreen or BuyerRatesScreen
4. Inspect hooks (buyerPostings, isLoading, etc.)

---

## Database Verification

### Check Postings in MongoDB:
```javascript
mongosh krishiflow

// All postings
db.buyerpostings.find().pretty()

// Active postings only
db.buyerpostings.find({ 
  status: 'Active Procurement',
  expiresAt: { $gt: new Date() }
}).pretty()

// Postings by crop
db.buyerpostings.find({ cropType: 'Tomato' }).pretty()

// Count by crop
db.buyerpostings.aggregate([
  { $group: { _id: '$cropType', count: { $sum: 1 } } }
])
```

### Verify Indexes:
```javascript
db.buyerpostings.getIndexes()
```

Expected indexes:
- `_id` (default)
- `buyer_1`
- `cropType_1`
- `cropType_1_mandiName_1_status_1` (compound)
- `expiresAt_1_status_1` (compound)

---

## Performance Testing

### Load Test Scenario:
1. Create 50+ buyer postings across different crops
2. Login as farmer
3. Navigate to Today screen
4. Measure load time:
   - Should fetch and render < 500ms
   - No UI blocking
   - Smooth scrolling

### Memory Leak Check:
1. Open Performance Monitor in DevTools
2. Navigate between tabs repeatedly
3. Check memory usage
4. Should not continuously increase

---

## Success Criteria

✅ **All tests pass if:**

1. Buyer can post rates that persist in database
2. Farmer sees buyer rates on Today screen
3. Rates filter correctly by farmer's selected crop
4. Crop selection survives page refresh
5. Rate deletion reflects immediately and persists
6. Expired rates automatically hidden from farmers
7. No console errors
8. UI responds smoothly (no lag)
9. Real-time updates work (with refresh)
10. MongoDB contains correct data structure

---

## Rollback Plan

If issues arise, revert changes:

```powershell
# Check git status
git status

# View changes
git diff

# Discard changes (if not committed)
git checkout -- <file>

# Revert commit (if committed)
git log
git revert <commit-hash>
```

Modified files to potentially rollback:
- `backend/src/models/BuyerPosting.js`
- `backend/src/controllers/buyerController.js`
- `backend/src/routes/apiRoutes.js`
- `frontend/src/services/api.js`
- `frontend/src/features/buyer/BuyerRatesScreen.jsx`
- `frontend/src/features/farmer/today/TodayScreen.jsx`
- `frontend/src/store/useAppStore.js`

---

## Support

For issues or questions:
1. Check backend logs for error messages
2. Check browser console for frontend errors
3. Verify MongoDB connection and data
4. Review FIXES_SUMMARY.md for implementation details

Happy Testing! 🎉
