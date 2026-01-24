# 🚨 Mobile ↔ Laptop Sync Fix (Supabase)

## Bug

**Mobile adds log → Laptop shows blank.** Data lived in `localStorage` per device, so each phone/laptop had its own copy. No sharing.

## Goal

**5 managers share logs, sales, and inventory live.** Same Supabase backend for all devices.

---

## Fix: Run Supabase SQL once

1. Open **Supabase Dashboard** → **SQL Editor**.
2. Copy the full contents of **`scripts/supabase-tables-run-once.sql`**.
3. Paste into the editor and **Run**.
4. Confirm in **Table Editor** that these exist:  
   `sales`, `inventory`, `purchases`, `issues`, `transactions`, `daily_logs`,  
   `farms`, `houses`, `suppliers`, `buyers`, `feed_types`,  
   `batches`, `workers`, `weekly_feeds`, `batch_sections`.

All tables use `DISABLE ROW LEVEL SECURITY` so the app can read/write with the anon key.

---

## Env vars

- **Local:** ` .env.local`  
  `NEXT_PUBLIC_SUPABASE_URL`  
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Vercel:** Project → Settings → Environment Variables  
  Same two vars for Production (and Preview if you use preview deployments).

---

## What uses Supabase now (shared data)

| Data            | Table(s)                    | Sync across devices |
|-----------------|-----------------------------|----------------------|
| Daily logs      | `daily_logs`                | ✅                   |
| Sales           | `sales`                     | ✅                   |
| Inventory       | `inventory`, `purchases`, `issues` | ✅           |
| Finance         | `transactions`              | ✅                   |
| Master data     | `farms`, `houses`, `suppliers`, `buyers`, `feed_types` | ✅ |
| Batches         | `batches`                   | ✅                   |
| Workers         | `workers`                   | ✅                   |
| Weekly feeds    | `weekly_feeds`              | ✅                   |
| Batch sections  | `batch_sections`            | ✅                   |

**Login** still uses `localStorage` (per device). Each manager signs in on their own phone/laptop; **data** is shared via Supabase.

---

## How to test sync

1. **Mobile:** Open app → sign in → Daily Logs → add a log (e.g. mortality, feed).
2. **Laptop:** Open app → sign in → Daily Logs → **refresh** (or reopen the page).
3. **Expect:** The log added on mobile appears on laptop.

Repeat for **Sales** (add sale on mobile → check on laptop) and **Inventory** if you use it.

---

## Deploy

After running the SQL and setting env vars:

```bash
git add .
git commit -m "Mobile–laptop sync: Supabase tables run-once script + docs"
git push origin main
```

Vercel will redeploy. Use the same Supabase project for local and production so mobile/laptop both hit the same DB.
