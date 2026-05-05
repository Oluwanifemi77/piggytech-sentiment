# ── cell afead7d4 ─────────────
# NOTE: install dependencies *outside* the notebook with:
#   python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
# Do NOT run `!pip install` inside the notebook — it can install into the wrong env.

import os
import re
import json
import time
import random
from datetime import date, datetime, timezone, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv

from apify_client import ApifyClient
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    mean_absolute_error, mean_squared_error,
)
import google.generativeai as genai

import torch

# Python 3.14 changed pickle._Pickler._batch_setitems to accept (items, obj).
# dill (used by HuggingFace datasets for fingerprinting) hasn't been updated yet.
# Patch generate_fingerprint so a TypeError falls back to a random fingerprint.
try:
    import datasets.fingerprint as _hf_fp
    _orig_gen_fp = _hf_fp.generate_fingerprint
    def _safe_generate_fingerprint(dataset):
        try:
            return _orig_gen_fp(dataset)
        except TypeError:
            import hashlib, uuid
            return hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()
    _hf_fp.generate_fingerprint = _safe_generate_fingerprint
    print('🔧 Python 3.14 datasets fingerprint patch applied')
except ImportError:
    pass  # datasets not installed yet — patch will be applied when Step 8 imports it

print('✅ Imports loaded')


# ── cell 8ce3c49c ─────────────
# ── paths ──────────────────────────────────────────────────────────────────
NOTEBOOK_DIR = Path.cwd()                   # = .../piggytech-sentiment/ml
DATA_DIR       = NOTEBOOK_DIR / 'data'
MODEL_DIR      = NOTEBOOK_DIR / 'models'
CHECKPOINT_DIR = NOTEBOOK_DIR / 'checkpoints'
for p in (DATA_DIR, MODEL_DIR, CHECKPOINT_DIR):
    p.mkdir(parents=True, exist_ok=True)

# ── secrets from ml/.env (see ml/.env.example) ─────────────────────────────
load_dotenv(NOTEBOOK_DIR / '.env')

APIFY_API_TOKEN = os.environ.get('APIFY_API_TOKEN')
GEMINI_API_KEY  = os.environ.get('GEMINI_API_KEY')

if not APIFY_API_TOKEN:
    print('⚠️  APIFY_API_TOKEN not set — Step 4 (scraping) will fail until you add it to ml/.env')
if not GEMINI_API_KEY:
    print('⚠️  GEMINI_API_KEY not set  — Step 6 (labelling) will fail until you add it to ml/.env')

# ── API clients ────────────────────────────────────────────────────────────
apify_client = ApifyClient(APIFY_API_TOKEN) if APIFY_API_TOKEN else None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini = genai.GenerativeModel('gemini-2.5-flash')
else:
    gemini = None

# ── device: MPS (Apple Silicon) > CUDA > CPU ───────────────────────────────
if torch.backends.mps.is_available():
    DEVICE = torch.device('mps')
elif torch.cuda.is_available():
    DEVICE = torch.device('cuda')
else:
    DEVICE = torch.device('cpu')

print(f'📁 Data dir:       {DATA_DIR}')
print(f'📁 Model dir:      {MODEL_DIR}')
print(f'📁 Checkpoint dir: {CHECKPOINT_DIR}')
print(f'🖥  Torch device:   {DEVICE}')
print(f'✅ API clients: Apify={"ready" if apify_client else "missing token"}, '
      f'Gemini={"ready" if gemini else "missing token"}')


# ── cell c5897dcb ─────────────
# Sentiment labels (5-point scale)
sentiment_labels = [
    'very_negative',
    'slightly_negative',
    'neutral',
    'slightly_positive',
    'very_positive',
]

# Intent labels — used as aspect categories, not for filtering
intent_labels = ['opinion', 'complaint', 'inquiry', 'suggestion', 'spam']

# Products
products = ['piggyvest', 'piggyvest for business', 'pocket']

# Aspects per product (v2: inquiry and suggestion added as shared aspects)
aspects = {
    'shared': [
        'customer_support', 'app_performance',
        'payments_transfers', 'notifications', 'trust_security', 'brand_perception',
        'inquiry', 'suggestion',
    ],
    'PiggyVest': ['savings_plans', 'withdrawals', 'investments', 'savings_report'],
    'PiggyVest_for_Business': ['merchant_onboarding', 'settlements', 'collections'],
    'Pocket': ['checkout_payments', 'wallet_funding', 'transfers'],
}

# Product aliases (used by filtering + Gemini prompt)
product_aliases = {
    'PiggyVest': [
        'piggyvest', 'piggy vest', 'piggy', '@PiggyVest',
        'piggyvest app', 'piggyvestapp', 'safelock', 'safe lock',
        'piggybank', 'autosave', 'target savings', 'flex naira',
        'flex dollar', 'investify', 'piggypoints', 'savings_report',
        'piggyvest report', 'savings summary',
    ],
    'PiggyVest_for_Business': [
        'pvb', 'piggyvest for business', 'piggyvest business',
        'piggytech business', '@PVB', 'business safelock',
        'bulk transfer', 'salary disbursement',
    ],
    'Pocket': [
        'pocket app', 'pocket by piggyvest', '@usepocket',
        'usepocket', 'pocket payment', 'pocket wallet',
        'pocket transfer', 'pocket bill', 'payment link',
    ],
}

# Dataset schema — what every row in the labelled CSV looks like
schema = {
    'tweet_id': '',
    'tweet_text': '',
    # Dashboard timestamp suite — all second-precision, all derived from the tweet's snowflake ID
    # or Scweet's native date field (whichever is present)
    'posted_at_utc': '',       # '2025-09-15T14:32:07Z'   canonical UTC (ISO 8601 with Z)
    'posted_at_lagos': '',     # '2025-09-15T15:32:07+01:00'  Lagos WAT
    'posted_date': '',         # '2025-09-15'  Lagos-local day for filters
    'posted_hour_utc': 0,      # 14
    'posted_hour_lagos': 0,    # 15 — peak-complaint-hour charts use this
    'posted_dow': '',          # 'Monday'
    'posted_week': '',         # '2025-W37'
    'created_at': '',          # legacy alias of posted_at_utc (kept for old queries)
    'collected_at': '',        # when Scweet scraped it, NOT when posted
    # Author
    'author_username': '',
    'author_name': '',
    'author_followers': 0,
    # Labels (filled by Gemini in Step 6)
    'products_detected': [],
    'overall_sentiment': '',
    'intent': '',
    'aspect_product': '',
    'aspect': '',
    'aspect_sentiment': '',
}

print('✅ Schema and taxonomy defined')
print(f'   Aspects (shared): {aspects["shared"]}')
print(f'   Intent labels:    {intent_labels}')


# ── cell 7d16eb4f ─────────────
# Row validator
def validate_row(row: dict) -> bool:
    valid_products   = set(product_aliases.keys())
    valid_sentiments = set(sentiment_labels)
    valid_intents    = set(intent_labels)
    all_aspects = (
        aspects['shared'] + aspects['PiggyVest']
        + aspects['PiggyVest_for_Business'] + aspects['Pocket']
    )
    errors = []

    if row.get('overall_sentiment') and row['overall_sentiment'] not in valid_sentiments:
        errors.append(f"Invalid overall_sentiment: {row['overall_sentiment']}")
    if row.get('intent') and row['intent'] not in valid_intents:
        errors.append(f"Invalid intent: {row['intent']}")
    for p in (row.get('products_detected') or []):
        if p not in valid_products:
            errors.append(f'Unknown product: {p}')
    if row.get('aspect_product') and row['aspect_product'] not in valid_products:
        errors.append(f"Invalid aspect_product: {row['aspect_product']}")
    if row.get('aspect') and row['aspect'] not in all_aspects:
        errors.append(f"Unknown aspect: {row['aspect']}")
    if row.get('aspect_sentiment') and row['aspect_sentiment'] not in valid_sentiments:
        errors.append(f"Invalid aspect_sentiment: {row['aspect_sentiment']}")

    if errors:
        print(f"❌ Row {row.get('tweet_id', '?')} errors: {errors}")
        return False
    return True

print('✅ validate_row() ready')


# ── cell 3745282f ─────────────
# Brand keywords for search queries and filtering
brand_keywords = [
    'piggyvest', 'piggy vest', '@piggyvest',
    'pocket app', '@usepocket', 'usepocket',
    'pocket by piggyvest', 'pvb', 'piggyvest for business',
    'investify', 'piggypoints',
    'flex dollar piggyvest', 'flex naira piggyvest',
    'savings report', 'piggyvest report',
    'piggyvest savings report', 'savings summary',
]

# Official product accounts
product_profiles = ['@PiggyVest', '@usepocket']


# Nigeria uses WAT (UTC+1, no DST). Dashboard users think in Lagos time.
LAGOS_TZ = timezone(timedelta(hours=1))

# Fields Scweet may use for the tweet's posted-at timestamp, in preference order.
# Different Scweet actor versions rename these; we try them all.
TWEET_DATE_FIELDS = (
    'posted_at_utc', 'datetime', 'date', 'created_at', 'timestamp', 'posted_at',
)


def tweet_id_to_datetime_utc(tweet_id):
    """Decode a Twitter snowflake ID to a UTC-aware datetime (second precision).
    Returns None when the ID isn't a valid snowflake."""
    try:
        clean_id = str(tweet_id).replace('tweet-', '').strip()
        if not clean_id.isdigit() or len(clean_id) < 10:
            return None
        timestamp_ms = (int(clean_id) >> 22) + 1288834974657
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
    except Exception:
        return None


def _parse_iso_utc(value):
    """Parse an ISO-8601-ish string to a UTC-aware datetime. Returns None on failure."""
    if not value or not isinstance(value, str):
        return None
    s = value.strip().replace('Z', '+00:00')
    dt = None
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%a %b %d %H:%M:%S %z %Y'):
            try:
                dt = datetime.strptime(s, fmt)
                break
            except ValueError:
                continue
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def extract_posted_at(item, tweet_id):
    """Get the tweet's creation time as a UTC-aware datetime down to the second.
    Tries Scweet's native date fields first, falls back to snowflake ID decode.
    Returns None only if both strategies fail — which should be rare."""
    for key in TWEET_DATE_FIELDS:
        dt = _parse_iso_utc(item.get(key))
        if dt is not None:
            return dt
    return tweet_id_to_datetime_utc(tweet_id)


def timestamp_columns(posted_at_utc_dt):
    """Given a UTC datetime (or None), build the full set of dashboard columns.
    All derived from the same source so filter dimensions never disagree."""
    if posted_at_utc_dt is None:
        return {
            'posted_at_utc': '', 'posted_at_lagos': '',
            'posted_date': '', 'posted_hour_utc': '',
            'posted_hour_lagos': '', 'posted_dow': '', 'posted_week': '',
        }
    utc = posted_at_utc_dt
    lagos = utc.astimezone(LAGOS_TZ)
    return {
        # Canonical: ISO-8601 UTC with Z — unambiguous in every BI tool
        'posted_at_utc':    utc.strftime('%Y-%m-%dT%H:%M:%SZ'),
        # Lagos local ISO-8601 with offset — "when did this actually happen locally?"
        'posted_at_lagos':  lagos.strftime('%Y-%m-%dT%H:%M:%S+01:00'),
        # Pre-derived filter keys (Lagos-local so days line up with Nigerian users)
        'posted_date':      lagos.strftime('%Y-%m-%d'),
        'posted_hour_utc':  utc.hour,
        'posted_hour_lagos': lagos.hour,      # "peak complaint hour" lives here
        'posted_dow':       lagos.strftime('%A'),    # Monday, Tuesday, …
        'posted_week':      lagos.strftime('%Y-W%V'),  # ISO week (e.g. 2025-W37)
    }


def build_search_query(extra_terms=None):
    core_keywords = [
        'piggyvest', 'piggy vest', '@PiggyVest',
        'safelock', 'investify', 'piggypoints',
        'pocket app', '@usepocket', 'usepocket',
        'pvb', 'piggyvest for business',
        'piggyvest report', 'savings report',
        'piggy savings', 'piggy app',
    ]
    if extra_terms:
        core_keywords.extend(extra_terms)
    or_clause = ' OR '.join(f'"{kw}"' if ' ' in kw else kw for kw in core_keywords)
    return f'({or_clause}) -filter:retweets lang:en'


def _tweet_from_item(item, scrape_source):
    user = item.get('user', {}) or {}
    tweet_id = str(item.get('id', ''))
    ts = timestamp_columns(extract_posted_at(item, tweet_id))
    return {
        'tweet_id': tweet_id,
        'tweet_text': item.get('text', ''),
        # ── full timestamp suite (all derived from the SAME source) ──────
        **ts,
        # legacy alias — keeps old dashboard queries / Looker Studio fields working
        'created_at': ts['posted_at_utc'],
        'collected_at': item.get('collected_at_utc', ''),
        # ── author ───────────────────────────────────────────────────────
        'author_username': item.get('handle', '') or user.get('handle', ''),
        'author_name': user.get('name', ''),
        'author_followers': user.get('followers_count', 0),
        # ── engagement ───────────────────────────────────────────────────
        'favorite_count': item.get('favorite_count', 0),
        'retweet_count': item.get('retweet_count', 0),
        'reply_count': item.get('reply_count', 0),
        'tweet_url': item.get('tweet_url', ''),
        'scrape_source': scrape_source,
    }


def run_search_scrape(label, since, until, sort='Latest', max_items=100_000):
    assert apify_client is not None, 'APIFY_API_TOKEN missing — set it in ml/.env'
    query = build_search_query()
    run_input = {
        'source_mode': 'search',
        'search_query': query,
        'since': since,
        'until': until,
        'search_sort': sort,
        'max_items': max_items,
    }
    print(f'🔍 [{label}] Search ({sort}) from {since} to {until}...')
    run = apify_client.actor('altimis/scweet').call(run_input=run_input)
    tweets = [
        _tweet_from_item(item, f'search_{sort.lower()}')
        for item in apify_client.dataset(run['defaultDatasetId']).iterate_items()
    ]
    print(f'  ✅ Got {len(tweets)} tweets')
    return tweets


def run_profile_scrape(label, profiles, max_items=100_000):
    assert apify_client is not None, 'APIFY_API_TOKEN missing — set it in ml/.env'
    run_input = {
        'source_mode': 'profiles',
        'profile_urls': profiles,
        'max_items': max_items,
    }
    print(f'👤 [{label}] Profile timelines: {profiles}...')
    run = apify_client.actor('altimis/scweet').call(run_input=run_input)
    tweets = [
        _tweet_from_item(item, 'profile_timeline')
        for item in apify_client.dataset(run['defaultDatasetId']).iterate_items()
    ]
    print(f'  ✅ Got {len(tweets)} tweets')
    return tweets

print('✅ Scraping functions ready')
print(f'   Query preview: {build_search_query()[:80]}...')


# ── cell 81808020 ─────────────
# =============================================================
# STRATEGY 1: Search (Latest) — dynamic quarterly windows to today
# =============================================================
all_raw_tweets = []
today = date.today()

# Detect last date already saved so we don't re-scrape it
last_date = None
raw_csv_path = DATA_DIR / 'raw_tweets_all.csv'
if raw_csv_path.exists():
    _ex = pd.read_csv(raw_csv_path)
    if 'posted_date' in _ex.columns:
        _dates = _ex['posted_date'].dropna().astype(str)
        _dates = _dates[_dates.str.match(r'\d{4}-\d{2}-\d{2}')]
        if not _dates.empty:
            last_date = datetime.strptime(_dates.max(), '%Y-%m-%d').date()

DEFAULT_START = date(2025, 4, 1)
window_start = (last_date + timedelta(days=1)) if last_date else DEFAULT_START
# Force start from 2026-01-01 — scraping the new year's data
window_start = max(window_start, date(2026, 1, 1))

if window_start > today:
    print(f'✅ Already up to date — last scraped date: {last_date}')
else:
    # Build calendar-quarter windows between window_start and today
    def _quarter_end(d):
        if d.month <= 3:  return date(d.year, 3, 31)
        if d.month <= 6:  return date(d.year, 6, 30)
        if d.month <= 9:  return date(d.year, 9, 30)
        return date(d.year, 12, 31)

    quarters = []
    d = window_start
    while d <= today:
        end = min(_quarter_end(d), today)
        quarters.append((d.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d')))
        d = _quarter_end(d) + timedelta(days=1)

    print(f'📅 Scraping {len(quarters)} quarter(s): {quarters[0][0]} → {quarters[-1][1]}')
    for i, (q_since, q_until) in enumerate(quarters):
        tweets = run_search_scrape(f'Latest {q_since}→{q_until}', q_since, q_until, sort='Latest')
        all_raw_tweets.extend(tweets)
        if i < len(quarters) - 1:
            time.sleep(65)

print(f'\n📊 After Latest search: {len(all_raw_tweets)} total tweets')


# ── cell d42820c8 ─────────────
# =============================================================
# STRATEGY 2: Search (Top) — high-engagement tweets, full range to today
# =============================================================
time.sleep(65)

today_str = date.today().strftime('%Y-%m-%d')
_top_start = date(2026, 1, 1)
tweets_top = run_search_scrape(
    f'Top {_top_start}→{today_str}',
    _top_start.strftime('%Y-%m-%d'),
    today_str,
    sort='Top',
)
all_raw_tweets.extend(tweets_top)

print(f'\n📊 After Top search: {len(all_raw_tweets)} total tweets (before dedup)')


# ── cell f5f79307 ─────────────
# =============================================================
# STRATEGY 3: Profile timelines — @PiggyVest and @usepocket
# =============================================================
time.sleep(65)

tweets_profiles = run_profile_scrape('Product profiles', product_profiles)
all_raw_tweets.extend(tweets_profiles)

print(f'\n📊 After profile scrape: {len(all_raw_tweets)} total tweets (before dedup)')


# ── cell 0c0f887d ─────────────
# =============================================================
# DEDUPLICATE & SAVE — APPEND to existing data/raw_tweets_all.csv
# =============================================================
raw_csv = DATA_DIR / 'raw_tweets_all.csv'
new_df = pd.DataFrame(all_raw_tweets)
print(f'New tweets scraped: {len(new_df)}')

if raw_csv.exists():
    existing_df = pd.read_csv(raw_csv)
    print(f'Existing tweets on disk: {len(existing_df)}')
    combined_df = pd.concat([existing_df, new_df], ignore_index=True)
else:
    print('No existing file — starting fresh')
    existing_df = pd.DataFrame()
    combined_df = new_df

combined_df = combined_df.drop_duplicates(subset='tweet_id').reset_index(drop=True)

print(f'\n📊 Breakdown by scrape source:')
print(combined_df['scrape_source'].value_counts())

combined_df.to_csv(raw_csv, index=False)

print(f'\nBefore: {len(existing_df)} | New unique: {len(combined_df) - len(existing_df)}')
print(f'✅ Total unique tweets saved: {len(combined_df)}')

# ── Timestamp coverage diagnostic — CRITICAL for the dashboard ─────────────
ts_col = combined_df['posted_at_utc'] if 'posted_at_utc' in combined_df.columns else combined_df.get('created_at', pd.Series(dtype=str))
ts_filled = ts_col.astype(str).replace('nan', '').ne('').sum()
pct = 100 * ts_filled / max(len(combined_df), 1)
print(f'\n⏱  Timestamp coverage: {ts_filled}/{len(combined_df)} ({pct:.1f}%)')
if ts_filled < len(combined_df):
    missing = combined_df[ts_col.astype(str).replace('nan', '').eq('')].head(5)
    print('\n⚠️  Sample tweets WITHOUT a timestamp — inspect these (Scweet may have changed field names):')
    for _, t in missing.iterrows():
        print(f"   id={t['tweet_id']} source={t.get('scrape_source','')} text={t['tweet_text'][:60]!r}")

# ── Tweet date range & daily cadence (what the dashboard will show) ────────
if 'posted_date' in combined_df.columns and combined_df['posted_date'].astype(str).ne('').any():
    dates = combined_df['posted_date'].astype(str).replace('', pd.NA).dropna()
    print(f'\n📅 Date range (Lagos local): {dates.min()} → {dates.max()}')
    print(f'📊 Tweets per day (top 10 busiest days):')
    print(combined_df['posted_date'].value_counts().head(10).to_string())

print(f'\n--- Sample tweets ---')
for _, t in combined_df.sample(min(5, len(combined_df))).iterrows():
    print(f"  @{t['author_username']}: {t['tweet_text'][:100]}...")
    print(f"    📅 {t.get('posted_at_lagos', t.get('created_at', ''))} | "
          f"Source: {t['scrape_source']} | ❤️ {t['favorite_count']}\n")


# ── cell 7de5af00 ─────────────
def clean_tweets(raw_tweets):
    """Dedupe + text-clean. Also **upgrades old-schema rows**: if a tweet came
    from an older CSV that only had `created_at` (space-separated, no TZ), we
    re-derive the full timestamp column set so the dashboard sees uniform data."""
    cleaned, seen_ids = [], set()
    for tweet in raw_tweets:
        tweet_id = str(tweet.get('tweet_id', ''))
        text = tweet.get('tweet_text', '')
        if not tweet_id or tweet_id in seen_ids:
            continue
        seen_ids.add(tweet_id)
        text = re.sub(r'http\S+', '', text.strip())
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) < 15:
            continue

        # Figure out the tweet's posted-at UTC datetime from whatever we have.
        posted_at_dt = (
            _parse_iso_utc(tweet.get('posted_at_utc'))
            or _parse_iso_utc(tweet.get('created_at'))
            or tweet_id_to_datetime_utc(tweet_id)
        )
        ts = timestamp_columns(posted_at_dt)

        cleaned.append({
            'tweet_id': tweet_id,
            'tweet_text': text,
            **ts,
            'created_at': ts['posted_at_utc'],  # legacy alias
            'collected_at': tweet.get('collected_at', ''),
            'author_username': tweet.get('author_username', ''),
            'author_name': tweet.get('author_name', ''),
            'author_followers': tweet.get('author_followers', 0),
            'favorite_count': tweet.get('favorite_count', 0),
            'retweet_count': tweet.get('retweet_count', 0),
            'reply_count': tweet.get('reply_count', 0),
            'tweet_url': tweet.get('tweet_url', ''),
            'scrape_source': tweet.get('scrape_source', ''),
        })
    print(f'Raw: {len(raw_tweets)} → Cleaned: {len(cleaned)} (removed {len(raw_tweets) - len(cleaned)})')
    # Coverage check — warn if anything lost its timestamp during cleaning
    with_ts = sum(1 for c in cleaned if c['posted_at_utc'])
    if with_ts < len(cleaned):
        print(f'⚠️  {len(cleaned) - with_ts} cleaned tweets have no timestamp')
    else:
        print(f'✅ All {len(cleaned)} cleaned tweets have ISO 8601 UTC timestamps (second precision)')
    return cleaned


def filter_tweets(cleaned_tweets):
    filtered = []
    for tweet in cleaned_tweets:
        text = tweet['tweet_text'].lower()
        if len(tweet['tweet_text']) < 30:
            continue
        if not any(kw in text for kw in brand_keywords):
            continue
        filtered.append(tweet)
    print(f'Cleaned: {len(cleaned_tweets)} → Filtered: {len(filtered)} (removed {len(cleaned_tweets) - len(filtered)})')
    return filtered

print('✅ clean_tweets() and filter_tweets() ready')


# ── cell 3f7ba432 ─────────────
# Clean + filter the full raw set
raw_df = pd.read_csv(DATA_DIR / 'raw_tweets_all.csv')
raw_tweets = raw_df.to_dict('records')
print(f'Loaded {len(raw_tweets)} raw tweets')

cleaned = clean_tweets(raw_tweets)
filtered = filter_tweets(cleaned)

all_df = pd.DataFrame(filtered)
all_df.to_csv(DATA_DIR / 'filtered_tweets_all.csv', index=False)

print(f'\n📊 Final filtered tweets: {len(all_df)}')
print(f'   Columns: {list(all_df.columns)}')
print(f'   Authors captured:      {(all_df["author_username"].astype(str) != "").sum()} / {len(all_df)}')
print(f'   UTC timestamps:        {(all_df["posted_at_utc"].astype(str) != "").sum()} / {len(all_df)}')
print(f'   Lagos local timestamps: {(all_df["posted_at_lagos"].astype(str) != "").sum()} / {len(all_df)}')

if (all_df['posted_at_utc'].astype(str) != '').any():
    dates = all_df[all_df['posted_at_utc'].astype(str) != '']['posted_at_utc'].sort_values()
    print(f'   Earliest tweet: {dates.iloc[0]}')
    print(f'   Latest tweet:   {dates.iloc[-1]}')

print('\n--- Sample tweets (showing Lagos local time) ---')
for _, t in all_df.sample(min(5, len(all_df))).iterrows():
    print(f"  @{t['author_username']}: {t['tweet_text'][:80]}...")
    print(f"    📅 {t['posted_at_lagos']} ({t['posted_dow']}) | "
          f"❤️ {t['favorite_count']} | 🔁 {t['retweet_count']}\n")

