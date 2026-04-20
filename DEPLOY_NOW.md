# Deploy PiggyTech Sentiment — Complete Walkthrough

> Follow these steps top to bottom. Every command is copy-paste ready.
> Estimated time: 20–30 minutes.

---

## Your generated CRON_SECRET (save this somewhere safe)

```
7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894
```

You will use this string in Step 3 (Railway env vars) and Step 5 (cron-job.org URL).

---

## Step 1 — Commit the new files and push to GitHub

New files were added to your project. Push them now:

```bash
cd ~/piggytech-sentiment   # or wherever your project folder is

git add .
git commit -m "Add cron route, seed script, persistent data path"
git push
```

You should see Railway automatically start a new deploy (if you've already connected it in the next step).

---

## Step 2 — Create the Railway Project

1. Go to **[railway.app](https://railway.app)** and sign in with GitHub
2. Click **"New Project"** (top right)
3. Choose **"Deploy from GitHub repo"**
4. Find and click **`piggytech-sentiment`**
5. Click **"Deploy Now"**

Railway will start building your app. This takes about 2–3 minutes.
You can watch the build logs in the **"Deployments"** tab.

---

## Step 3 — Set Environment Variables

While the build is running, add your API keys:

1. Click on your service (the box labelled `piggytech-sentiment`)
2. Go to the **"Variables"** tab
3. Click **"New Variable"** and add each of these, one at a time:

| Variable | Value |
|----------|-------|
| `APIFY_API_TOKEN` | Your token from [console.apify.com](https://console.apify.com) → Settings → API tokens |
| `GEMINI_API_KEY` | Your key from [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `CRON_SECRET` | `7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894` |
| `NODE_ENV` | `production` |
| `DATA_FILE_PATH` | `/data/labelled_tweets_gemini.csv` |

> **What DATA_FILE_PATH does:** This tells your app to read/write tweets from the persistent volume
> instead of the git folder. Without it, new tweets added by the cron job would disappear on redeploy.

After adding all variables, click **"Deploy"** (Railway may do this automatically).

---

## Step 4 — Add the Persistent Volume

This is what keeps your tweet data safe across redeploys.

1. In your Railway service, go to the **"Volumes"** tab
2. Click **"Add Volume"**
3. Fill in:
   - **Mount Path:** `/data`
   - **Size:** 1 GB (the default is fine)
4. Click **"Add"**

Railway will redeploy automatically. When it comes back up, the seed script runs and copies
your 1,229 existing tweets into the volume. You'll see this in the deploy logs:

```
[seed] ✅ Seeded volume with 1229 rows from committed CSV
```

From this point on, all new tweets collected by the cron job accumulate in `/data/labelled_tweets_gemini.csv`
and survive forever — redeploys, restarts, everything.

---

## Step 5 — Get Your Public URL and Test

1. In Railway, go to the **"Settings"** tab of your service
2. Under **"Networking"**, click **"Generate Domain"**
3. You'll get a URL like: `https://piggytech-sentiment-production.up.railway.app`

**Test your dashboard:**
Open that URL in your browser — you should see the PiggyTech Sentiment Dashboard with your existing data.

**Test the cron endpoint:**
Open a new browser tab and go to:
```
https://piggytech-sentiment-production.up.railway.app/api/cron?secret=7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894
```

You should see a JSON response like:
```json
{
  "ok": true,
  "scraped": 18,
  "new": 14,
  "labelled": 12,
  "saved": 24,
  "log": ["Scraping ...", "Scraped 18 tweets", "...Done in 38.4s"],
  "elapsed_ms": 38400
}
```

If you see `"ok": true` — everything is working. 🎉

> **If you see an error about Apify:** Double-check `APIFY_API_TOKEN` in your Railway variables.
> **If you see "Unauthorized":** The secret in the URL doesn't match `CRON_SECRET` in Railway variables.

---

## Step 6 — Set Up the 30-Minute Cron Job

This is the piece that makes it fully automatic.

1. Go to **[cron-job.org](https://cron-job.org)** and create a free account (just email + password)

2. After logging in, click **"CREATE CRONJOB"**

3. Fill in the form exactly like this:

   **Title:**
   ```
   PiggyTech Scrape
   ```

   **URL:**
   ```
   https://piggytech-sentiment-production.up.railway.app/api/cron?secret=7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894
   ```
   *(Replace the domain with your actual Railway URL if it's different)*

   **Schedule:** Choose **"Every hour"**, then switch to **"Custom"** and type:
   ```
   */30 * * * *
   ```

   **Request method:** GET

4. Expand the **"Advanced"** section → **"Headers"** and add:
   - Header name: `x-cron-secret`
   - Value: `7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894`

5. Click **"CREATE"**

That's it. cron-job.org will call your endpoint every 30 minutes from now on.

---

## Step 7 — Verify It's Running

After 30 minutes, go to cron-job.org → your job → **"History"** tab.

You should see entries like:
```
✅  2026-04-20 14:30:00   HTTP 200   38.4s
✅  2026-04-20 15:00:00   HTTP 200   41.2s
```

And on your dashboard, the tweet count will grow over time as new tweets are collected.

---

## Summary of What You've Built

```
Every 30 minutes:
  cron-job.org  →  hits /api/cron on Railway
                →  Apify scrapes X for PiggyTech mentions
                →  Gemini labels each tweet (aspect + sentiment + intent)
                →  New rows appended to /data/labelled_tweets_gemini.csv
                →  Dashboard auto-reflects new data on next page load
```

Your historical data (1,229 rows) is preserved in the volume from day one.
No Colab needed for ongoing data collection — ever.

---

## Ongoing Usage

**Retraining your model (still use Colab for this):**
When you want to retrain with fresh data, download the latest CSV by visiting:
```
https://piggytech-sentiment-production.up.railway.app/api/data
```
Save the JSON → convert to CSV → retrain in Colab.

**Pushing code changes:**
Just `git push` from your terminal. Railway redeploys automatically in ~2 minutes,
and the seed script skips seeding since the volume already has data.

**Checking logs:**
Railway dashboard → your service → **"Logs"** tab. You can watch cron runs in real time.
