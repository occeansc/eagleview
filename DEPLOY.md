# Eagleview — Deployment Guide

Stack: **Next.js 14** (Vercel) + **Supabase** (Postgres) + **GitHub Actions** (data sync)

All free. Takes ~20 minutes end-to-end.

---

## Step 1 — Supabase Setup

1. Go to **https://supabase.com** → Sign up → **New project**
2. Give it a name (e.g. `eagleview`) and save your DB password
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** → **New query**, run `supabase/schema.sql` → click **Run**
5. In the same editor, run `supabase/add_benchmarks.sql` → click **Run**
6. Go to **Settings → API** and note:
   - **Project URL** → `https://abcdef.supabase.co`
   - **anon / public key** → `eyJ...` (read-only, goes on Vercel)
   - **service_role key** → `eyJ...` (write access, goes on GitHub — keep secret)

---

## Step 2 — Push to GitHub

> The repo must be **public** for unlimited free Actions minutes.

```bash
git init
git add .
git commit -m "feat: Eagleview initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/eagleview.git
git push -u origin main
```

---

## Step 3 — Add GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name            | Value                              |
|------------------------|------------------------------------|
| `SUPABASE_URL`         | Your Supabase project URL          |
| `SUPABASE_SERVICE_KEY` | Your Supabase **service_role** key |

---

## Step 4 — First Data Sync

1. GitHub repo → **Actions** tab
2. Click **"Update Sector Data"** → **Run workflow** → **Run workflow**
3. Wait ~3 minutes — check the run log

You should see 3 benchmarks + 20 sectors processed.
Verify in Supabase **Table Editor → benchmarks** and **→ sectors** — all rows should have numbers.

---

## Step 5 — Deploy to Vercel

1. **https://vercel.com** → **Add New Project** → import your GitHub repo
2. Framework: **Next.js** (auto-detected)
3. Add environment variables:

   | Name                            | Value                      |
   |---------------------------------|----------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL  |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase **anon** key |

4. Click **Deploy** — live in ~1 minute

---

## What you'll see

- **Market Pulse bar** at the top: S&P 500, Nasdaq, Dow — updates with each period toggle
- **Sector grid** sorted by selected period (1W / 1M / 3M / YTD)
- **Tap any card** → modal shows:
  - Top 10 holdings with animated weight bars
  - **vs Market** section: diverging bar chart + alpha (%) vs each benchmark

---

## Update Schedule

GitHub Actions cron: **Mon, Wed, Fri at 22:00 UTC** (after US market close).

To sync manually: GitHub → Actions → "Update Sector Data" → Run workflow.

---

## Local Development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase values
npm run dev                         # http://localhost:3000

# Python sync locally
pip install yfinance supabase pandas
export SUPABASE_URL="..."
export SUPABASE_SERVICE_KEY="..."
python scripts/update_sectors.py
```
