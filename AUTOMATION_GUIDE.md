# PiggyTech Sentiment — Automation & Hosting Guide

> **Goal:** Run the scrape → label → dashboard pipeline automatically every 30 minutes,
> without you needing to touch Google Colab again.

---

## Why Google Colab Can't Do This

Colab is a notebook environment meant for interactive development. It has three hard limits that make it unsuitable for automation:

- **Session timeout:** Colab disconnects after ~90 minutes of inactivity and kills all running code
- **No always-on server:** You can't leave a Colab notebook running 24/7; Google will eventually reclaim the runtime
- **No cron support:** There is no built-in scheduler — you'd have to manually click "Run All" every 30 minutes

Your trained model and pipeline code are perfect as-is. What you need is a **server** that runs continuously and calls the pipeline on a schedule. That's exactly what this guide sets up.

---

## What Was Built

A new API route lives at `app/api/cron/route.ts`. When called, it runs the full pipeline in one HTTP request:

```
GET /api/cron?secret=YOUR_CRON_SECRET
```

```
Apify scrapes X  →  Clean & dedup  →  Gemini labels  →  Appended to CSV  →  Dashboard updates
```

The dashboard (`/api/data`) already reads from the same CSV, so new tweets appear automatically on the next page load.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR SERVER                              │
│                                                                 │
│   Next.js App                                                   │
│   ├── / (Dashboard)          ← reads CSV, shows charts         │
│   ├── /tweets               ← tweet browser                    │
│   ├── /api/data             ← serves CSV to dashboard          │
│   ├── /api/scrape           ← one-off manual scrape            │
│   └── /api/cron             ← ★ NEW: full pipeline             │
│                                                                 │
│   public/                                                       │
│   └── labelled_tweets_gemini.csv   ← data store (persistent)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP GET every 30 min
                ┌──────────┴──────────┐
                │   External Cron     │
                │   cron-job.org      │  ← free, no account needed
                │   (or Vercel Cron)  │
                └─────────────────────┘
```

---

## Recommended Hosting: Railway

Railway is the best fit for this project because:
- Persistent disk — your CSV survives deployments and restarts
- Always-on Node.js server — no function timeouts
- Free trial ($5 credit), then ~$5–10/month for a small app
- Deploys directly from GitHub

---

## Step-by-Step: Railway Deployment

### Prerequisites
- A [GitHub](https://github.com) account (free)
- A [Railway](https://railway.app) account (free, sign up with GitHub)
- Your project pushed to a GitHub repository

---

### 1. Push Your Project to GitHub

If you haven't already:

```bash
# In your project folder (piggytech-sentiment/)
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/piggytech-sentiment.git
git push -u origin main
```

> **Note:** Before pushing, create a `.gitignore` file (if you don't have one) and make sure `public/labelled_tweets_gemini.csv` is NOT ignored — Railway needs it.

---

### 2. Create a Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `piggytech-sentiment` repository
5. Railway will auto-detect it as a Next.js project

---

### 3. Add a Persistent Volume for Your CSV

This is the most important step — without it, your CSV resets every time Railway restarts the app.

1. In your Railway project, click on your service
2. Go to **"Volumes"** tab → **"Add Volume"**
3. Set the **Mount Path** to: `/app/public`
4. Click **"Add"**

This mounts a persistent disk at `/app/public`, which is exactly where Next.js looks for your CSV (`public/labelled_tweets_gemini.csv`).

> **First deploy:** After mounting, upload your existing CSV to Railway using their CLI:
> ```bash
> npm install -g @railway/cli
> railway login
> railway up
> railway shell
> # You're now inside the Railway container
> # Upload your CSV via the Railway dashboard file browser, or use the CLI
> ```
> Alternatively, just let the cron job populate it fresh from X — it will create the file automatically.

---

### 4. Set Environment Variables

In Railway → your service → **"Variables"** tab, add:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `APIFY_API_TOKEN` | `apify_api_...` | [console.apify.com](https://console.apify.com) → Settings → Integrations → API tokens |
| `GEMINI_API_KEY` | `AIza...` | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `CRON_SECRET` | Any random string | Run `openssl rand -hex 32` in your terminal, or just make something up |
| `NODE_ENV` | `production` | Type this literally |

---

### 5. Deploy

Railway will build and deploy automatically when you push to GitHub. Every future `git push` triggers a redeploy.

Once deployed, your app will have a public URL like:
```
https://piggytech-sentiment-production.up.railway.app
```

Test it works by visiting the URL in your browser — you should see your dashboard.

---

### 6. Set Up the 30-Minute Cron Job (cron-job.org)

cron-job.org is a free external service that calls your URL on a schedule. No account required beyond an email.

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Click **"Create Cronjob"**
3. Fill in:
   - **Title:** `PiggyTech Scrape`
   - **URL:** `https://YOUR_APP.up.railway.app/api/cron?secret=YOUR_CRON_SECRET`
   - **Schedule:** Every 30 minutes (use custom: `*/30 * * * *`)
   - **Request method:** GET
4. Under **"Headers"**, optionally add: `x-cron-secret: YOUR_CRON_SECRET`
5. Click **"Create"**

That's it. cron-job.org will now call your endpoint every 30 minutes, automatically, forever.

> **Security:** The `CRON_SECRET` prevents anyone else from triggering your pipeline by guessing the URL. Keep it secret.

---

## Alternative Hosting: Vercel

Vercel is the company behind Next.js and the easiest platform to deploy it on. The downside is that Vercel's free tier uses **serverless functions** — there is no persistent file system. You'll need to use a database instead of a CSV.

### Option A: Vercel + Vercel Cron (simplest Vercel approach)

Vercel's built-in cron requires a **Pro plan ($20/month)**. If you're okay with that:

1. Add a `vercel.json` file to your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

2. Deploy to Vercel:
```bash
npm install -g vercel
vercel --prod
```

3. Set environment variables in the Vercel dashboard (same as the Railway table above)

**Problem:** Vercel serverless functions can't write to disk. You'll need to swap the CSV storage for a database. See "Switching to a Database" below.

### Option B: Vercel Free + GitHub Actions Cron

If you want Vercel free tier + external scheduling:

1. Deploy to Vercel (no `vercel.json` cron needed)
2. Create `.github/workflows/scrape.yml`:

```yaml
name: Auto Scrape

on:
  schedule:
    - cron: '*/30 * * * *'   # every 30 minutes
  workflow_dispatch:           # also allows manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron endpoint
        run: |
          curl -f -X GET \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "https://YOUR_APP.vercel.app/api/cron"
```

3. Add `CRON_SECRET` to your GitHub repo → Settings → Secrets and variables → Actions

**Still has the file persistence problem on Vercel.** Use Railway to avoid this entirely.

---

## Switching to a Database (if using Vercel)

If you go the Vercel route, swap the CSV storage for **Neon Postgres** (free tier: 512 MB):

1. Create a free database at [neon.tech](https://neon.tech)
2. Add `DATABASE_URL` to your Vercel env vars (Neon gives you this)
3. Replace the CSV read/write in `app/api/data/route.ts` and `app/api/cron/route.ts` with SQL queries

The schema would be:
```sql
CREATE TABLE tweets (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT,
  author_username TEXT,
  author_name TEXT,
  products_detected TEXT,
  overall_sentiment TEXT,
  intent TEXT,
  aspect_product TEXT,
  aspect TEXT,
  aspect_sentiment TEXT,
  created_at TEXT,
  scraped_at TIMESTAMP DEFAULT NOW()
);
```

**Recommendation:** Stick with Railway + CSV. It's simpler and directly mirrors how you've been working in Colab.

---

## Apify Plan Requirements

> **Important:** The Apify free plan has a limit of **10 actor runs per day**. Running every 30 minutes = 48 runs/day — which exceeds the free limit.

Your options:

| Option | Cost | Runs/day | Notes |
|--------|------|----------|-------|
| **Apify Free** | $0 | 10 | Only supports scraping ~every 3 hours |
| **Apify Starter** | ~$49/month | Unlimited | Supports every 30 minutes |
| **Reduce frequency** | $0 | 8–10 | Every 3 hours stays within free tier |

**For the free tier,** change the cron schedule from `*/30 * * * *` to `0 */3 * * *` (every 3 hours = 8 runs/day). You'll still capture trends throughout the day.

If you want true 30-minute granularity, you'll need to upgrade Apify.

---

## Gemini API Usage

The Gemini API (via Google AI Studio) has a **free tier** that should comfortably handle this pipeline:

- Free: 1,500 requests/day on the free tier
- Each cron run labels up to ~50 tweets = 50 Gemini calls
- 48 runs/day × 50 calls = 2,400 calls/day — slightly over the free limit

At 3-hour intervals (8 runs/day × 50 calls = 400 calls/day), you're comfortably within the free tier.

If you need 30-minute intervals, Gemini pricing is very cheap (~$0.075 per 1M tokens). 50 tweets × 30 days at ~200 tokens each = ~$0.02/month. Essentially free.

---

## Environment Variables Summary

Set these everywhere your app runs (Railway/Vercel dashboard + local `.env.local` for development):

```bash
# .env.local (for local development — never commit this file)
APIFY_API_TOKEN=apify_api_YOUR_TOKEN_HERE
GEMINI_API_KEY=AIzaSyYOUR_KEY_HERE
CRON_SECRET=some-long-random-string-you-choose
```

---

## Testing the Cron Endpoint Locally

Before deploying, you can test the pipeline runs correctly:

```bash
# Start your dev server
npm run dev

# In another terminal, call the cron endpoint
curl "http://localhost:3000/api/cron?secret=YOUR_CRON_SECRET"
```

You should see a JSON response like:
```json
{
  "ok": true,
  "scraped": 23,
  "new": 18,
  "labelled": 15,
  "saved": 31,
  "log": [
    "Scraping 2026-04-19 → 2026-04-19",
    "Scraped 23 relevant tweets from Apify",
    "18 new tweets after dedup (skipped 5 already seen)",
    "Gemini labelled 15 tweets, skipped 3 (no product detected)",
    "Appended 31 rows to CSV",
    "Done in 42.1s"
  ],
  "elapsed_ms": 42100
}
```

---

## Monitoring

After deployment, check **cron-job.org → your job → "History"** tab to see:
- Whether each run succeeded (HTTP 200) or failed
- How long each run took
- The JSON response from your endpoint

You can also watch Railway logs in real time: Railway dashboard → your service → **"Logs"** tab.

---

## Quick Reference: What Goes Where

| What | Where |
|------|-------|
| Your model (trained weights) | Google Drive (stays there — not needed for the live pipeline) |
| Training / retraining | Google Colab (still great for this) |
| Live tweet scraping | `/api/cron` route on Railway |
| Dashboard | Railway (always on, accessible via public URL) |
| Schedule | cron-job.org (free, hits your Railway URL) |
| Data storage | `public/labelled_tweets_gemini.csv` on Railway's persistent volume |

---

## Recommended Next Steps

1. Push your project to GitHub
2. Deploy to Railway (follow steps above)
3. Confirm the dashboard loads at your Railway URL
4. Set up cron-job.org pointing to your Railway URL
5. Wait 30 minutes and check that new tweets appear in the dashboard

If you want to keep using Colab for periodic retraining (e.g., monthly), you can still do that — download the updated CSV from Railway, retrain in Colab, and the improved model will apply to all future labeling automatically since labeling uses Gemini (not your trained model directly in the live pipeline).
