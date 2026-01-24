# 🚨 Fix "Forbidden use of secret key" Error

## Problem

The error shows:
```
Forbidden use of secret API key in browser
Secret API keys can only be used in a protected environment... browser.
Delete this secret API key immediately!
```

**Cause:** You're using a **secret key** (`sb_secret_...`) in the browser. Secret keys are for server-side only.

---

## ✅ Solution: Use Anon Key Instead

### Step 1: Get the Correct Anon Key from Supabase

1. Go to **Supabase Dashboard** → Your project
2. Click **Settings** (gear icon) → **API**
3. Under **Project API keys**, find:
   - **`anon` `public`** key (this is what you need)
   - It starts with `eyJ...` (a JWT token)
   - **NOT** the `service_role` `secret` key

### Step 2: Update Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Edit** (or delete and recreate)
4. Replace the value with the **anon public key** from Supabase (starts with `eyJ...`)
5. Make sure it's set for **Production** (and Preview if needed)
6. Click **Save**

### Step 3: Update Local `.env.local`

1. Open `.env.local` in your project
2. Replace the `NEXT_PUBLIC_SUPABASE_ANON_KEY` value:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (the anon public key from Supabase)
   ```
3. Save the file

### Step 4: Redeploy

1. **Vercel** → **Deployments** → Latest
2. Click **"..."** → **Redeploy**
3. Wait for build to complete

---

## 🔑 Key Types Explained

| Key Type | Starts With | Use Case | Where to Use |
|----------|-------------|----------|--------------|
| **anon** `public` | `eyJ...` | Browser/client-side | ✅ Use this in `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** `secret` | `sb_secret_...` | Server-side only | ❌ Never in browser! Only in API routes/server functions |

---

## ✅ Quick Fix Checklist

- [ ] Go to Supabase → Settings → API
- [ ] Copy the **anon public** key (starts with `eyJ...`)
- [ ] Update Vercel env var `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the anon key
- [ ] Update local `.env.local` with the anon key
- [ ] Redeploy in Vercel
- [ ] Test: Refresh Daily Logs page → Error should be gone

---

## 🎯 After Fixing

1. The `401 Unauthorized` error will disappear
2. Daily logs will load successfully
3. You can add/view logs normally

**The secret key should be deleted or kept only for server-side use (API routes), never in browser code!**
