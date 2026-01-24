# FarmManager – Public URL & Vercel Dashboard

## 1. Your deployment setup

- **Framework:** Next.js (App Router)
- **Host:** Vercel
- **Git:** Connected to GitHub (`farm-manager` repo); pushes to `main` trigger production deploys.
- **Config:** No `vercel.json`; standard Next.js build. No custom domain configured in repo.

---

## 2. Your public URL(s)

### Main URL to share (production)

From your project docs, the **production** app is:

**https://poultry-farm.vercel.app**

Use this as the **main public link** for users. It shows the homepage first; login is at `/login` when they click “Sign In”.

---

### If the project name differs in Vercel

Vercel URLs use the **project name** in the dashboard. Your `package.json` uses `farm-manager`, so you might also have:

- **https://farm-manager.vercel.app**

**Check the dashboard** (see below) to see which one is actually assigned. Use whichever appears as **Production** there.

---

### Preview URLs (for PRs/branches)

- Each **branch** and **pull request** gets its own preview, e.g.  
  `https://<project-name>-<branch-or-pr>-<team>.vercel.app`
- Use these for **testing only**. **Do not** share them as the main public link.

---

### Custom domain (if you add one)

- If you add a custom domain in Vercel (e.g. `farmmanager.com`), that becomes your **primary** public URL.
- It’s not set in this repo; you’d configure it in the Vercel project settings.

---

## 3. Where to see and copy the URL in the Vercel dashboard

1. Go to **https://vercel.com/dashboard** and sign in.
2. Open your **FarmManager** (or **farm-manager** / **poultry-farm**) project.
3. **Production URL:**
   - On the **Project** overview, the **production** deployment is usually at the top.
   - The **domain** is shown there (e.g. `poultry-farm.vercel.app` or `farm-manager.vercel.app`).
   - Click the **domain** or the **“Visit”** / **“Open”** link to open it.
   - Copy the full URL from the browser address bar, or use the **copy** icon next to the domain if Vercel shows one.
4. **All domains (including custom):**
   - Go to **Project → Settings → Domains**.
   - You’ll see:
     - The default **`.vercel.app`** domain (your main public URL).
     - Any **custom domains** you’ve added.
   - Copy whichever you use as the main public link.
5. **Preview URLs:**
   - **Project → Deployments**.
   - Open a **Preview** deployment (e.g. from a branch or PR).
   - Use the **“Visit”** / **“Open”** link or the deployment URL shown there.

---

## 4. Quick summary

| Purpose              | URL / Where to find it                                      |
|----------------------|-------------------------------------------------------------|
| **Main public link** | `https://poultry-farm.vercel.app` (or your Production domain in Vercel) |
| **Preview links**    | Project → Deployments → each Preview deployment             |
| **Custom domain**    | Project → Settings → Domains                                |

Use the **Production** domain from **Settings → Domains** (or the Project overview) as the link you share with others.
