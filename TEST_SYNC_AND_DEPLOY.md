# 🧪 Test Mobile ↔ Laptop Sync & Verify Vercel Deployment

## Step 1: Verify Local Setup

### Check Environment Variables
Your `.env.local` should have:
```
NEXT_PUBLIC_SUPABASE_URL=https://nucpcapooeatttnshjkt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_HL45wfJkweDa2k_rGWh-dg_AJzwSjdJ
```

✅ **Status:** Already set (confirmed from your files)

### Start Local Dev Server
```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Step 2: Test Local → Supabase Connection

### Test 1: Add a Daily Log
1. **Browser:** Sign in (e.g., `ravi@gmail.com` / `raviteja`)
2. Navigate to **Daily Logs**
3. Click **"Add Daily Log"**
4. Fill in:
   - **House:** Select any house
   - **Date:** Today's date
   - **Mortality:** `5`
   - **Feed Type:** Select any feed type
   - Click **"Save"**

### Verify in Supabase
1. Open **Supabase Dashboard** → **Table Editor**
2. Click **`daily_logs`** table
3. ✅ **Expected:** You should see the new row you just added

### Test 2: Add a Sale
1. Navigate to **Sales**
2. Click **"Add Sale"**
3. Fill in:
   - **Buyer:** Select any buyer (or create one in Master Data first)
   - **Date:** Today
   - **Birds:** `100`
   - **Avg Weight (kg):** `2.5`
   - **Rate per kg:** `150`
   - Click **"Save"**

### Verify in Supabase
1. **Table Editor** → **`sales`** table
2. ✅ **Expected:** New sale row appears

---

## Step 3: Test Mobile ↔ Laptop Sync (Simulated)

Since you may not have both devices handy, simulate with two browser windows:

### Window 1 (Simulates Mobile)
1. Open **http://localhost:3000** in **Incognito/Private** window
2. Sign in with same credentials
3. Go to **Daily Logs** → Add a log with a unique remark like "Test from Window 1"
4. Note the time/date

### Window 2 (Simulates Laptop)
1. Open **http://localhost:3000** in **Regular** window (or another browser)
2. Sign in with same credentials
3. Go to **Daily Logs** → **Refresh the page** (F5)
4. ✅ **Expected:** The log from Window 1 appears

### Verify Both Windows See Same Data
- **Window 1:** Refresh → Should see both logs
- **Window 2:** Refresh → Should see both logs
- **Supabase:** Table Editor → `daily_logs` → Should show both rows

---

## Step 4: Verify Vercel Environment Variables

### Check Vercel Dashboard
1. Go to **https://vercel.com/dashboard**
2. Open your **FarmManager** (or **poultry-farm**) project
3. **Settings** → **Environment Variables**
4. Verify these exist for **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://nucpcapooeatttnshjkt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_secret_HL45wfJkweDa2k_rGWh-dg_AJzwSjdJ`

### If Missing
1. Click **"Add New"**
2. Add each variable:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** `https://nucpcapooeatttnshjkt.supabase.co`
   - **Environment:** Select **Production** (and **Preview** if you use it)
   - Click **"Save"**
3. Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Important:** After adding, go to **Deployments** → Click **"..."** on latest → **Redeploy** (or push a new commit)

---

## Step 5: Deploy to Vercel

### Commit and Push
```bash
git add .
git commit -m "Supabase tables created - mobile/laptop sync ready"
git push origin main
```

### Monitor Deployment
1. **Vercel Dashboard** → **Deployments**
2. Wait for build to complete (status: **Ready**)
3. Click the deployment → **Visit** to open production URL

---

## Step 6: Test Production Sync

### Test on Production URL
1. **Mobile/Device 1:** Open **https://poultry-farm.vercel.app** (or your Vercel URL)
2. Sign in → **Daily Logs** → Add a log with remark "Test from Mobile"
3. **Laptop/Device 2:** Open same URL
4. Sign in → **Daily Logs** → **Refresh**
5. ✅ **Expected:** Log from Device 1 appears

### Verify in Supabase
- **Table Editor** → `daily_logs` → Should show production test rows

---

## Step 7: Browser Console Check (Debug)

### Check for Errors
1. Open browser **Developer Tools** (F12)
2. Go to **Console** tab
3. Look for:
   - ✅ **Good:** No red errors, or only harmless warnings
   - ❌ **Bad:** `[FarmManager] Fetch failed: ...` warnings (means table missing or RLS issue)
   - ❌ **Bad:** `Missing Supabase environment variables` (means env vars not set)

### Check Network Tab
1. **Network** tab → Filter by **Fetch/XHR**
2. Look for requests to `nucpcapooeatttnshjkt.supabase.co`
3. ✅ **Expected:** Requests return `200 OK` status
4. ❌ **Bad:** `404` (table missing) or `401/403` (RLS/permission issue)

---

## Troubleshooting

### Issue: "Fetch failed" warnings
**Cause:** Table missing or RLS enabled  
**Fix:** 
1. Supabase → **Table Editor** → Verify table exists
2. Supabase → **SQL Editor** → Run: `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`

### Issue: Data not syncing
**Cause:** Different Supabase projects or env vars mismatch  
**Fix:**
1. Verify both local `.env.local` and Vercel env vars point to **same Supabase project**
2. Check Supabase URL matches: `https://nucpcapooeatttnshjkt.supabase.co`

### Issue: Production shows blank data
**Cause:** Vercel env vars not set or wrong  
**Fix:**
1. Vercel → **Settings** → **Environment Variables** → Add/verify both vars
2. **Redeploy** after adding env vars

### Issue: "Missing Supabase environment variables" error
**Cause:** Env vars not loaded  
**Fix:**
- **Local:** Ensure `.env.local` exists and has both vars
- **Vercel:** Add env vars and redeploy

---

## ✅ Success Checklist

- [ ] Local dev server runs without errors
- [ ] Can add daily log → appears in Supabase `daily_logs` table
- [ ] Can add sale → appears in Supabase `sales` table
- [ ] Two browser windows see same data after refresh
- [ ] Vercel env vars are set (both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Production deployed successfully
- [ ] Production URL works (no console errors)
- [ ] Mobile and laptop both see same data (after refresh)

**Once all checked, your mobile ↔ laptop sync is working!** 🎉
