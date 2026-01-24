# FarmManager → Vercel Deploy Checklist

## ✅ Done (by Cursor)

1. **Git status** – Working tree was clean; added deploy trigger
2. **package.json** – Updated to `farm-manager` v1.0.0
3. **Commit** – `5aa8e48` – "Final Cursor deploy: FarmManager v1.0.0 production-ready"

## ⏳ Run locally (git push fails from Cursor due to proxy)

**In your terminal (PowerShell):**

```powershell
cd "c:\Users\91996\Desktop\Farm - Vercel version"

# Push to GitHub (triggers Vercel)
git push origin main
```

**If push is rejected (remote has new commits):**
```powershell
git pull origin main
git push origin main
```

**If you need to overwrite remote (use only if you're sure):**
```powershell
git push --force-with-lease origin main
```

## After push

1. **Vercel** – https://vercel.com/dashboard  
   - Open your Farm Manager project → Deployments  
   - Wait for new build (triggered by push) → status **Ready**

2. **Live URL (public starting page)** – **https://poultry-farm.vercel.app**  
   - Use this as the main link for the app. Visitors see the **homepage** (Hero, Features, etc.) first.  
   - **Do not** use `.../login` as the app’s entry link. Login is only for “Sign In” from the homepage.

3. **Smoke test**
   - Login → Dashboard matches local
   - Sales → Add a test row (e.g. Chinna)
   - Refresh → Row still there (Supabase persist)
   - Check Supabase Table Editor → `sales` table has the new row

## Supabase (already done)

- Tables: `sales`, `inventory`, `purchases`, `daily_logs`
- Env in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RLS disabled on those tables

## Production-ready for 5 managers

- Login (no changes)
- Master data (localStorage, no changes)
- Sales, Inventory, Daily Logs → Supabase CRUD
- Dashboard aggregates from contexts (batches, logs, etc.)

Run `git push origin main` in your project folder to finish the deploy.
