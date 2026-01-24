# Fix "Unable to Add Mortality" + "null value in column id" Error

## Problems Fixed

1. **Mortality not saving**: When batch has no sections, `formData.mortality` wasn't being used
2. **ID is null**: The `id` field wasn't being explicitly included in the insert row

---

## ✅ Code Fixes Applied

### 1. Mortality Fix (`app/dashboard/daily-logs/page.tsx`)
- Added `finalMortality` that uses:
  - `totalMortality` (from sections) if sections exist
  - `formData.mortality` (from single input) if no sections
- Updated validation and submit to use `finalMortality`

### 2. ID Fix (`lib/daily-logs-context.tsx`)
- Generate unique ID: `Date.now().toString() + random string`
- Explicitly preserve `id` in `recalculateBatchLogs`
- Explicitly include `id` in insert row with fallback
- Added console logging to debug ID issues

---

## 🚀 Deploy to Production

**The fixes are in your local code but need to be deployed to Vercel:**

```bash
git add .
git commit -m "Fix: Mortality input and daily log ID generation"
git push origin main
```

**Then:**
1. **Vercel** → **Deployments** → Wait for new build
2. **Test** on production URL after deployment completes

---

## 🧪 Test After Deployment

1. Go to **Daily Logs** → **Add Daily Log**
2. Select a house (with or without sections)
3. Enter mortality: **10** (or any number)
4. Fill other required fields
5. Click **Save Log**
6. ✅ **Expected:** Log saves successfully, no errors

---

## 🐛 If Still Failing

**Check browser console (F12):**
- Look for `[DailyLogs] Saving log with ID: ...` message
- Check if ID is present in the log
- Share the console output if error persists

**Common issues:**
- Code not deployed yet → Wait for Vercel build
- ID still null → Check console logs for "Inserting row with ID:"
- Other error → Share the exact error message

---

## 📋 Summary

- ✅ Mortality input now works (with or without sections)
- ✅ ID is explicitly generated and included in insert
- ✅ Added defensive checks and logging
- ⏳ **Deploy to production** to apply fixes
