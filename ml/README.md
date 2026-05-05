# PiggyTech Sentiment — Local ML workspace

This folder holds the Python / ML side of the project (scraping, labelling, fine-tuning). The Next.js app in the repo root is untouched.

```
ml/
├─ PiggyTech_Sentiment_Analysis_local.ipynb   ← the one you run
├─ PiggyTech_Sentiment_Analysis_colab_original.ipynb   ← original, kept for reference
├─ requirements.txt
├─ .env.example            → copy to .env and fill in keys
├─ .gitignore
├─ data/                   → CSVs (gitignored)
├─ models/                 → fine-tuned weights (gitignored)
└─ checkpoints/            → training checkpoints (gitignored)
```

## One-time setup

### 1. Open VS Code in the `ml/` folder

From a terminal in the repo root:

```bash
code ml
```

(Or open the repo root and use the file explorer to open the notebook — both work.) If VS Code prompts you, install the **Python** and **Jupyter** extensions from Microsoft.

### 2. Create a virtualenv and install deps

From inside `ml/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

On Apple Silicon, the default `torch` wheel already includes MPS — no extra install needed.

### 3. Select the kernel in the notebook

Open `PiggyTech_Sentiment_Analysis_local.ipynb`. Top-right of the notebook view, click the kernel selector and pick the interpreter from `ml/.venv/bin/python`. If it doesn't appear, run this once so VS Code registers the kernel:

```bash
python -m ipykernel install --user --name piggytech-ml --display-name "Python 3 (piggytech-ml)"
```

### 4. Add your secrets

```bash
cp .env.example .env
# then edit .env and paste your real APIFY_API_TOKEN and GEMINI_API_KEY
```

Both keys are needed:
- `APIFY_API_TOKEN` for Step 4 (scraping via the Scweet actor)
- `GEMINI_API_KEY` for Step 6 (auto-labelling)

### 5. Bring over your existing Drive data (optional)

If you've already been running this in Colab, grab these from your Google Drive `piggytech_sentiment/` folder and drop them into `ml/data/`:

```
raw_tweets_all.csv                ← skips re-scraping work you've done
filtered_tweets_all.csv           ← skips cleaning
labelled_tweets_unified.csv       ← skips Gemini labelling you've paid for
(optionally) train_ready_unified.csv
```

The notebook's scraping + labelling cells detect existing files and **resume** from them — nothing is re-scraped or re-labelled unless it's new. Same story for trained models: drop your existing `final_model_v2/` and `regression_model_v2/` into `ml/models/` if you want to keep using them.

## Running the notebook

Run cells top to bottom. The first two cells set up paths, device, and API clients — they should print something like:

```
📁 Data dir:       .../ml/data
🖥  Torch device:   mps
✅ API clients: Apify=ready, Gemini=ready
```

If Torch device shows `cpu` on an M-series Mac, check that you installed `torch` from PyPI (not a CPU-only build) and that macOS is ≥ 12.3.

## Training expectations on Apple Silicon (M1-M4)

- ~5-15 min per epoch for the classification model on ~2-5k training rows (MPS, batch size 16)
- RoBERTa-base ≈ 500MB on disk per saved model — don't commit them (already in `.gitignore`)
- If training is painfully slow (e.g. older Intel Mac), jump back to Colab for Steps 8-9 only, then download the final model into `ml/models/`.

## Dashboard-ready timestamps

Every scraped row gets a full suite of time columns, written once at scrape time so Looker Studio / Metabase / any BI tool can filter without runtime parsing:

| Column | Example | What it's for |
|---|---|---|
| `posted_at_utc` | `2025-09-15T14:32:07Z` | Canonical ISO 8601 UTC — unambiguous in every tool |
| `posted_at_lagos` | `2025-09-15T15:32:07+01:00` | Nigerian local time — "when did this actually happen" |
| `posted_date` | `2025-09-15` | Lagos-local day (YYYY-MM-DD) — fast filter key |
| `posted_hour_utc` | `14` | UTC hour (0-23) |
| `posted_hour_lagos` | `15` | Lagos hour — drives "peak complaint hours" charts |
| `posted_dow` | `Monday` | Day-of-week name |
| `posted_week` | `2025-W37` | ISO week — weekly trend rollups |
| `created_at` | (alias) | Legacy alias of `posted_at_utc` so existing dashboards keep working |

The extractor tries Scweet's native date field first (most accurate), falls back to decoding the tweet's snowflake ID (seconds precision), and only gives up if both strategies fail. Every scraping cell prints a timestamp-coverage diagnostic so you'll see immediately if any tweets came through without a timestamp — and which `scrape_source` they came from.

**Why Lagos-local dates?** If a tweet is posted at 23:45 UTC on Sep 14, it's already 00:45 Sep 15 in Lagos. For a Nigerian-user dashboard, bucketing into Lagos-local days matches how humans actually experience the timeline. Both UTC and Lagos versions are stored, so you can filter either way.

## Key changes from the Colab version

- `google.colab.drive` → local `ml/data/` and `ml/models/` paths
- `userdata.get('X')` → `os.environ.get('X')` loaded from `ml/.env` via `python-dotenv`
- Training args: `fp16=False` and `use_cpu=False` so HuggingFace `Trainer` picks up MPS cleanly
- No `!pip install` inside the notebook — use the venv + `requirements.txt`
- **New timestamp schema** (above) — replaces the single ambiguous `created_at` column. Old CSVs from your Drive still work: when `clean_tweets()` sees an old-schema row, it backfills the full column set from the original `created_at` or the snowflake ID.

The logic (scrape strategies, Gemini prompt, aspect schema, model architecture, loss) is identical.
