# Fix "Failed to load daily logs data" Error

## Problem
The Daily Logs page shows an alert: **"Failed to load daily logs data"** and the table is empty.

## Most Likely Causes

### 1. Vercel Environment Variables Missing (Most Common)

**Check:**
1. Go to **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. Verify these exist for **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://nucpcapooeatttnshjkt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_secret_HL45wfJkweDa2k_rGWh-dg_AJzwSjdJ`

**If missing:**
1. Click **"Add New"**
2. Add each variable (select **Production** environment)
3. **Redeploy** after adding (Deployments → Latest → Redeploy)

### 2. Row Level Security (RLS) Enabled

**Check in Supabase:**
1. Open **Supabase Dashboard** → **Table Editor** → `daily_logs`
2. Look for a lock icon or "RESTRICTED" tag (should show "UNRESTRICTED")

**Fix:**
Run in **Supabase SQL Editor**:
```sql
ALTER TABLE daily_logs DISABLE ROW LEVEL SECURITY;
```

### 3. Table Doesn't Exist

**Check:**
1. Supabase → **Table Editor** → Look for `daily_logs` in the list

**Fix:**
Run the SQL from `scripts/supabase-tables-run-once.sql` (the `daily_logs` CREATE TABLE section)

---

## Quick Diagnostic Steps

### Step 1: Check Browser Console
1. Open the Daily Logs page
2. Press **F12** → **Console** tab
3. Look for:
   - `[FarmManager] Fetch failed: daily_logs...` (shows the actual error)
   - `Missing Supabase environment variables` (env vars not set)
   - Network errors (CORS, 404, 401, etc.)

### Step 2: Check Network Tab
1. **F12** → **Network** tab
2. Filter by **Fetch/XHR**
3. Look for requests to `nucpcapooeatttnshjkt.supabase.co`
4. Check status:
   - ✅ **200 OK** = Working
   - ❌ **404** = Table missing
   - ❌ **401/403** = RLS/permission issue
   - ❌ **CORS error** = Config issue

### Step 3: Verify Supabase Table
1. **Supabase Dashboard** → **Table Editor** → `daily_logs`
2. Click the table → Should see columns and any existing rows
3. If table is empty but exists, that's fine (no logs added yet)
4. If table doesn't exist, run the CREATE TABLE SQL

---

## Fix Checklist

- [ ] Vercel env vars set (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Vercel deployment redeployed after adding env vars
- [ ] `daily_logs` table exists in Supabase
- [ ] RLS disabled: `ALTER TABLE daily_logs DISABLE ROW LEVEL SECURITY;`
- [ ] Browser console shows no errors (or shows specific error message)
- [ ] Network tab shows 200 OK for Supabase requests

---

## After Fixing

1. **Refresh** the Daily Logs page
2. The error should disappear
3. You should see "No daily logs recorded yet" (if no logs exist) or your logs list
4. Try adding a test log to verify it saves

---

## Still Not Working?

Check the browser console error message and share:
- The exact error text
- Network tab status code
- Whether env vars are set in Vercel
- Whether the table exists and RLS is disabled
