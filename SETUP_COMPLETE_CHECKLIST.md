# ✅ Supabase Setup Complete — Verification Checklist

## ✅ Step 1: Tables Created (DONE)

You've successfully created all 15 tables in Supabase:
- ✅ `sales`
- ✅ `inventory`
- ✅ `purchases`
- ✅ `issues`
- ✅ `transactions`
- ✅ `daily_logs` ← **Critical for mobile ↔ laptop sync**
- ✅ `farms`
- ✅ `houses`
- ✅ `suppliers`
- ✅ `buyers`
- ✅ `feed_types`
- ✅ `batches`
- ✅ `workers`
- ✅ `weekly_feeds`
- ✅ `batch_sections`

**Verify in Supabase:** Dashboard → **Table Editor** → You should see all 15 tables listed.

---

## ✅ Step 2: Local Environment Variables (DONE)

Your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://nucpcapooeatttnshjkt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_HL45wfJkweDa2k_rGWh-dg_AJzwSjdJ
```

✅ **Local app is ready.**

---

## ⏳ Step 3: Vercel Environment Variables (CHECK)

**Action required:** Ensure Vercel has the same env vars.

1. Go to **https://vercel.com/dashboard**
2. Open your **FarmManager** project
3. **Settings** → **Environment Variables**
4. Add/verify these two variables for **Production** (and **Preview** if you use it):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://nucpcapooeatttnshjkt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_secret_HL45wfJkweDa2k_rGWh-dg_AJzwSjdJ`
5. **Redeploy** if you just added them (Vercel → Deployments → Redeploy latest)

---

## 🧪 Step 4: Test Mobile ↔ Laptop Sync

### Test 1: Daily Logs
1. **Mobile:** Open app → Sign in → **Daily Logs** → Add a new log (mortality, feed, etc.)
2. **Laptop:** Open app → Sign in → **Daily Logs** → **Refresh page**
3. ✅ **Expected:** The log you added on mobile appears on laptop immediately.

### Test 2: Sales
1. **Mobile:** **Sales** page → Add a sale (e.g., buyer "Chinna", 100 birds)
2. **Laptop:** **Sales** page → **Refresh**
3. ✅ **Expected:** Sale appears on laptop.

### Test 3: Verify in Supabase
1. Open **Supabase Dashboard** → **Table Editor** → `daily_logs` (or `sales`)
2. ✅ **Expected:** You see the rows you added from mobile/laptop.

---

## 🚀 Step 5: Deploy to Production

If everything works locally:

```bash
git add .
git commit -m "Supabase tables created - mobile/laptop sync ready"
git push origin main
```

Vercel will auto-deploy. After deployment:
- **Mobile:** Use production URL (https://poultry-farm.vercel.app)
- **Laptop:** Use production URL
- Both hit the **same Supabase database** → **shared data** ✅

---

## 🐛 Troubleshooting

### "Fetch failed" warnings in console
- **Cause:** Table missing or RLS enabled
- **Fix:** Re-run the SQL script, ensure `DISABLE ROW LEVEL SECURITY` ran for all tables

### Data not syncing
- **Check:** Both devices use the same Supabase project (same URL in env vars)
- **Check:** Vercel env vars match local `.env.local`
- **Check:** Browser console for errors (F12)

### Tables exist but app shows blank
- **Check:** Supabase Table Editor → Do you see any rows? If yes, it's a fetch issue.
- **Check:** Browser console → Look for `[FarmManager] Fetch failed: ...` warnings
- **Fix:** Ensure RLS is disabled: `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`

---

## ✅ Success Criteria

- ✅ All 15 tables exist in Supabase
- ✅ Local `.env.local` has Supabase credentials
- ✅ Vercel env vars match local
- ✅ Mobile adds log → Laptop sees it (after refresh)
- ✅ Sales/inventory sync across devices
- ✅ Production deployed and working

**You're ready for 5 managers to share data live!** 🎉
