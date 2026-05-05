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
from groq import Groq

import torch

# Python 3.14 changed pickle.Pickler._batch_setitems to accept (self, items, obj).
# dill still defines it as (self, items) — patch it to swallow the extra arg.
try:
    import dill._dill as _dill_mod
    import pickle as _pickle_mod
    _c_batch = _pickle_mod.Pickler._batch_setitems  # original C method, takes (self, items)
    def _py314_batch_setitems(self, items, obj=None):
        _c_batch(self, items)
    _dill_mod.Pickler._batch_setitems = _py314_batch_setitems
    print('🔧 Python 3.14 dill._batch_setitems patch applied')
except Exception as _e:
    print(f'⚠️ dill patch failed: {_e}')

# Also disable HF datasets caching to avoid any other fingerprint-related issues
try:
    import datasets as _ds
    _ds.disable_caching()
    print('🔧 HF datasets caching disabled')
except ImportError:
    pass

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
GROQ_API_KEY    = os.environ.get('GROQ_API_KEY')

if not APIFY_API_TOKEN:
    print('⚠️  APIFY_API_TOKEN not set — Step 4 (scraping) will fail until you add it to ml/.env')
if not GROQ_API_KEY:
    print('⚠️  GROQ_API_KEY not set  — Step 6 (labelling) will fail until you add it to ml/.env')

# ── API clients ────────────────────────────────────────────────────────────
apify_client = ApifyClient(APIFY_API_TOKEN) if APIFY_API_TOKEN else None
groq_client  = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

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
      f'Groq={"ready" if groq_client else "missing token"}')

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

# ── cell 9c4ad60f ─────────────
BATCH_SIZE = 10

_ABSA_INSTRUCTIONS = """You are an expert annotation system for aspect-based sentiment analysis of Nigerian fintech tweets.
Your job is to analyse tweets about PiggyTech products and return structured labels.

PRODUCTS:
- PiggyVest: savings, investments, withdrawals app
- PiggyVest_for_Business (PVB): business payments and collections
- Pocket: checkout and wallet app

PRODUCT ALIASES:
- PiggyVest: "piggyvest", "piggy", "@PiggyVest", "piggy vest", "safelock", "investify", "piggypoints", "flex dollar", "flex naira", "savings report", "piggyvest report"
- PiggyVest_for_Business: "pvb", "piggyvest for business", "@PVB", "bulk transfer", "salary disbursement"
- Pocket: "pocket app", "@usepocket", "usepocket", "pocket wallet", "pocket transfer", "payment link"

ASPECTS:
- Shared (any product): customer_support, app_performance, payments_transfers, notifications, trust_security, brand_perception, inquiry, suggestion
- PiggyVest only: savings_plans, withdrawals, investments, savings_report
- PiggyVest_for_Business only: merchant_onboarding, settlements, collections
- Pocket only: checkout_payments, wallet_funding, transfers

SPECIAL ASPECT RULES:
- Use "inquiry" as the aspect when the tweet is asking a question about the product
- Use "suggestion" as the aspect when the tweet is recommending a feature or improvement
- A tweet can have BOTH a regular aspect AND inquiry/suggestion if applicable
- inquiry and suggestion tweets still get a sentiment score

SENTIMENT OPTIONS: very_negative, slightly_negative, neutral, slightly_positive, very_positive

INTENT OPTIONS (for the intent field):
- opinion: user sharing their experience, viewpoint, or review
- complaint: user reporting a problem, bug, or expressing frustration
- inquiry: user asking a question
- suggestion: user recommending a feature or improvement
- spam: irrelevant, promotional, or bot-generated content

RULES:
1. Only detect products clearly mentioned
2. Only label aspects clearly discussed
3. overall_sentiment = general tone of whole tweet
4. aspect_sentiment = sentiment toward that specific aspect
5. One entry per aspect detected
6. If no PiggyTech product mentioned, return empty products_detected and empty aspects lists
7. intent = what the user is trying to do with this tweet
8. For inquiry/suggestion tweets, ALWAYS include inquiry or suggestion as one of the aspects"""


def _result_to_rows(tweet_id, tweet_text, author_username, author_name, result):
    intent = result.get('intent', 'opinion')
    if intent not in intent_labels:
        intent = 'opinion'
    rows = []
    for aspect_info in result.get('aspects', []):
        rows.append({
            'tweet_id': tweet_id, 'tweet_text': tweet_text,
            'author_username': author_username, 'author_name': author_name,
            'products_detected': result['products_detected'],
            'overall_sentiment': result['overall_sentiment'],
            'intent': intent,
            'aspect_product': aspect_info['aspect_product'],
            'aspect': aspect_info['aspect'],
            'aspect_sentiment': aspect_info['aspect_sentiment'],
        })
    if not rows and result.get('products_detected'):
        rows.append({
            'tweet_id': tweet_id, 'tweet_text': tweet_text,
            'author_username': author_username, 'author_name': author_name,
            'products_detected': result['products_detected'],
            'overall_sentiment': result['overall_sentiment'],
            'intent': intent,
            'aspect_product': None, 'aspect': None, 'aspect_sentiment': None,
        })
    return rows


def _strip_fence(text):
    text = text.strip()
    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
    return text.strip()


def _groq_call(prompt, retries=3):
    """Call Groq chat completions and return the response text."""
    for attempt in range(retries):
        try:
            resp = groq_client.chat.completions.create(
                model='llama-3.1-8b-instant',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.0,
            )
            return resp.choices[0].message.content
        except Exception as e:
            if attempt < retries - 1:
                wait = 30 if '429' in str(e) or 'rate' in str(e).lower() else 2 ** attempt
                print(f'⚠️ Groq attempt {attempt+1} failed, retrying in {wait}s... ({e})')
                time.sleep(wait)
            else:
                raise


def label_tweet_single(tweet_id, tweet_text, author_username='', author_name='', retries=3):
    assert groq_client is not None, 'GROQ_API_KEY missing — set it in ml/.env'
    prompt = f"""{_ABSA_INSTRUCTIONS}

Tweet: "{tweet_text}"

Return ONLY valid JSON, no explanation, no markdown, no backticks:
{{
  "products_detected": ["product_name"],
  "overall_sentiment": "sentiment",
  "intent": "intent_label",
  "aspects": [
    {{"aspect_product": "product_name", "aspect": "aspect_name", "aspect_sentiment": "sentiment"}}
  ]
}}"""
    try:
        result = json.loads(_strip_fence(_groq_call(prompt, retries)))
        return _result_to_rows(tweet_id, tweet_text, author_username, author_name, result)
    except (json.JSONDecodeError, Exception):
        return []


def label_tweets_batch(batch, retries=3):
    """Send up to BATCH_SIZE tweets in one Groq call. Falls back to single on JSON error."""
    assert groq_client is not None, 'GROQ_API_KEY missing — set it in ml/.env'
    numbered = '\n'.join(
        f'{i+1}. [TWEET_ID:{t["tweet_id"]}] {t["tweet_text"]}'
        for i, t in enumerate(batch)
    )
    prompt = f"""{_ABSA_INSTRUCTIONS}

Analyse each tweet below and return a JSON array with one object per tweet, in the SAME ORDER.

{numbered}

Return ONLY a valid JSON array, no explanation, no markdown, no backticks:
[
  {{
    "tweet_id": "id_from_tweet",
    "products_detected": ["product_name"],
    "overall_sentiment": "sentiment",
    "intent": "intent_label",
    "aspects": [
      {{"aspect_product": "product_name", "aspect": "aspect_name", "aspect_sentiment": "sentiment"}}
    ]
  }}
]"""
    meta = {str(t['tweet_id']): t for t in batch}
    try:
        results = json.loads(_strip_fence(_groq_call(prompt, retries)))
        if not isinstance(results, list):
            results = [results]
        rows = []
        for result in results:
            tid = str(result.get('tweet_id', ''))
            t = meta.get(tid)
            if t is None:
                continue
            rows.extend(_result_to_rows(tid, t['tweet_text'],
                                        t.get('author_username', ''), t.get('author_name', ''),
                                        result))
        return rows
    except json.JSONDecodeError as e:
        print(f'❌ Batch JSON error (falling back to single): {e}')
        rows = []
        for t in batch:
            rows.extend(label_tweet_single(t['tweet_id'], t['tweet_text'],
                                           t.get('author_username', ''), t.get('author_name', '')))
            time.sleep(2.5)
        return rows
    except Exception as e:
        print(f'❌ Batch failed: {e}')
        return []

print('✅ label_tweets_batch() ready')

# ── cell 876c6262 ─────────────
# Label tweets — resumes from existing labelled_tweets_*.csv files
all_df = pd.read_csv(DATA_DIR / 'filtered_tweets_all.csv')

already_done = set()
existing_labels = pd.DataFrame()

for name in ['labelled_tweets_unified.csv', 'labelled_tweets_v2.csv', 'labelled_tweets_gemini.csv', 'labelled_tweets_checkpoint.csv']:
    path = DATA_DIR / name
    if path.exists():
        temp = pd.read_csv(path)
        already_done.update(temp['tweet_id'].astype(str).unique())
        existing_labels = pd.concat([existing_labels, temp], ignore_index=True)
        print(f'Loaded {name}: {temp["tweet_id"].nunique()} unique tweets')

if len(existing_labels) > 0:
    existing_labels = existing_labels.drop_duplicates(subset=['tweet_id', 'aspect'], keep='last')

all_df['tweet_id'] = all_df['tweet_id'].astype(str)
remaining = [t for t in all_df.to_dict('records') if str(t['tweet_id']) not in already_done]
n_batches = (len(remaining) + BATCH_SIZE - 1) // BATCH_SIZE

print(f'\nAlready labelled: {len(already_done)} tweets')
print(f'Remaining to label: {len(remaining)} tweets')
print(f'Batches of {BATCH_SIZE}: ~{n_batches} calls (~{int(n_batches * 2.5 // 60)} min)')

new_labels = []
checkpoint_path = DATA_DIR / 'labelled_tweets_checkpoint.csv'

for b_idx, batch_start in enumerate(range(0, len(remaining), BATCH_SIZE)):
    batch = remaining[batch_start:batch_start + BATCH_SIZE]
    rows = label_tweets_batch(batch)
    new_labels.extend(rows)
    done = min(batch_start + BATCH_SIZE, len(remaining))
    if (b_idx + 1) % 5 == 0:
        print(f'  Labelled {done}/{len(remaining)} tweets ({b_idx+1}/{n_batches} batches)...')
        pd.DataFrame(new_labels).to_csv(checkpoint_path, index=False)
    time.sleep(2.5)  # Groq free tier = 30 RPM; 2.5s = 24 req/min with headroom

new_labels_df = pd.DataFrame(new_labels)
unified_df = pd.concat([existing_labels, new_labels_df], ignore_index=True)
unified_df = unified_df.drop_duplicates(subset=['tweet_id', 'aspect'], keep='last').reset_index(drop=True)

# Merge second-precision timestamps from filtered CSV so unified always has them
_ts_cols = ['posted_at_utc', 'posted_at_lagos', 'posted_date',
            'posted_hour_utc', 'posted_hour_lagos', 'posted_dow', 'posted_week', 'created_at']
_fdf = pd.read_csv(DATA_DIR / 'filtered_tweets_all.csv')
_ts_map = _fdf.set_index(_fdf['tweet_id'].astype(str))[[c for c in _ts_cols if c in _fdf.columns]]
unified_df['tweet_id'] = unified_df['tweet_id'].astype(str)
unified_df = unified_df.drop(columns=[c for c in _ts_cols if c in unified_df.columns], errors='ignore')
unified_df = unified_df.merge(_ts_map, left_on='tweet_id', right_index=True, how='left')

unified_df.to_csv(DATA_DIR / 'labelled_tweets_unified.csv', index=False)
unified_df.to_csv(DATA_DIR / 'labelled_tweets_v2.csv', index=False)

print(f'\n✅ Labelled {len(remaining)} new tweets → {len(new_labels_df)} new rows')
print(f'   Unified total: {len(unified_df)} rows ({unified_df["tweet_id"].nunique()} unique tweets)')
print(f'\n📊 Aspect distribution:')
print(unified_df['aspect'].value_counts())
print(f'\n📊 Intent distribution:')
print(unified_df['intent'].value_counts())

# ── cell 9a7c57ff ─────────────
df = pd.read_csv(DATA_DIR / 'labelled_tweets_unified.csv')
filtered_df = pd.read_csv(DATA_DIR / 'filtered_tweets_all.csv')

# Backfill full timestamp suite onto the labelled CSV.
# Check for missing columns OR columns that are entirely NaN (previous partial backfill).
ts_cols = ['posted_at_utc', 'posted_at_lagos', 'posted_date',
           'posted_hour_utc', 'posted_hour_lagos', 'posted_dow', 'posted_week']
need_backfill = any(
    c not in df.columns or df[c].isna().any()
    for c in ts_cols
)
if need_backfill:
    df['tweet_id'] = df['tweet_id'].astype(str)
    ts_map = filtered_df.set_index(filtered_df['tweet_id'].astype(str))[ts_cols]
    # Drop stale/NaN timestamp columns before re-merging
    df = df.drop(columns=[c for c in ts_cols if c in df.columns], errors='ignore')
    df = df.merge(ts_map, left_on='tweet_id', right_index=True, how='left')
    df.to_csv(DATA_DIR / 'labelled_tweets_unified.csv', index=False)
    print(f'✅ Backfilled timestamp columns into labelled_tweets_unified.csv')
else:
    print('✅ Timestamp columns already present')

# Convenience datetime column for pandas groupby (not saved — just for this cell)
df['_posted_dt_lagos'] = pd.to_datetime(df['posted_at_lagos'], errors='coerce', utc=True).dt.tz_convert('Africa/Lagos')
df['_month']           = df['_posted_dt_lagos'].dt.to_period('M')

print(f'Total rows: {len(df)}')
print(f'Date range (Lagos): {df["posted_date"].min()} → {df["posted_date"].max()}')

print(f'\n📊 Tweets per month:')
print(df.groupby('_month')['tweet_id'].nunique())

print(f'\n📊 Sentiment by month:')
print(df.groupby(['_month', 'overall_sentiment'])['tweet_id'].nunique().unstack(fill_value=0))

print(f'\n📊 Tweets by hour-of-day (Lagos local) — spot peak complaint windows:')
print(df.groupby('posted_hour_lagos')['tweet_id'].nunique().sort_index())

print(f'\n📊 Tweets by day-of-week (Lagos local):')
dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
print(df.groupby('posted_dow')['tweet_id'].nunique().reindex(dow_order).fillna(0).astype(int))

print(f'\n📊 Top aspects by month:')
print(df.dropna(subset=['aspect']).groupby(['_month', 'aspect']).size().unstack(fill_value=0))

# ── cell 6016bee1 ─────────────
# Prepare training data — one row per aspect
df_train = df.dropna(subset=['aspect', 'aspect_sentiment']).copy()
df_train['label'] = df_train['aspect_sentiment']
df_train['input_text'] = df_train['tweet_text'] + ' [ASPECT] ' + df_train['aspect']

print(f'Training rows: {len(df_train)}')
print('\nLabel distribution:')
print(df_train['label'].value_counts())

label2id = {
    'very_negative': 0,
    'slightly_negative': 1,
    'neutral': 2,
    'slightly_positive': 3,
    'very_positive': 4,
}
id2label = {v: k for k, v in label2id.items()}

df_train['label_id'] = df_train['label'].map(label2id)
df_train = df_train.dropna(subset=['label_id'])
df_train['label_id'] = df_train['label_id'].astype(int)

print(f'\nFinal training rows: {len(df_train)}')
df_train.to_csv(DATA_DIR / 'train_ready_unified.csv', index=False)
print('✅ Saved train_ready_unified.csv')

# ── cell 969e38b7 ─────────────
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from torch.utils.data import Dataset as TorchDataset

class TweetDataset(TorchDataset):
    """Pre-tokenizes a list of texts into tensors — no HF datasets/dill involved."""
    def __init__(self, texts, labels, tokenizer, label_dtype=torch.long, max_len=128):
        enc = tokenizer(texts, truncation=True, padding='max_length',
                        max_length=max_len, return_tensors='pt')
        self.input_ids      = enc['input_ids']
        self.attention_mask = enc['attention_mask']
        self.labels         = torch.tensor(labels, dtype=label_dtype)
    def __len__(self):
        return len(self.labels)
    def __getitem__(self, idx):
        return {
            'input_ids':      self.input_ids[idx],
            'attention_mask': self.attention_mask[idx],
            'labels':         self.labels[idx],
        }

df_train = pd.read_csv(DATA_DIR / 'train_ready_unified.csv')

train_df, val_df = train_test_split(
    df_train, test_size=0.2, random_state=42, stratify=df_train['label_id']
)
print(f'Train: {len(train_df)} | Val: {len(val_df)}')

model_name = 'cardiffnlp/twitter-roberta-base-sentiment-latest'
tokenizer  = AutoTokenizer.from_pretrained(model_name)

train_dataset = TweetDataset(train_df['input_text'].tolist(), train_df['label_id'].tolist(), tokenizer)
val_dataset   = TweetDataset(val_df['input_text'].tolist(),   val_df['label_id'].tolist(),   tokenizer)

print('✅ Data ready for training')

# ── cell 60f22abb ─────────────
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=5,
    id2label=id2label,
    label2id=label2id,
    ignore_mismatched_sizes=True,
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return {
        'accuracy': accuracy_score(labels, predictions),
        'f1':       f1_score(labels, predictions, average='weighted'),
    }

training_args = TrainingArguments(
    output_dir=str(CHECKPOINT_DIR / 'classification'),
    num_train_epochs=5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    warmup_steps=50,
    weight_decay=0.01,
    logging_dir=str(CHECKPOINT_DIR / 'logs_classification'),
    logging_steps=20,
    eval_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    metric_for_best_model='f1',
    report_to='none',
    fp16=False,     # MPS is fp32 only
    use_cpu=False,  # let Trainer pick MPS/CUDA
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics,
)

print('🚀 Starting training...')
trainer.train()
print('✅ Training complete')

# ── cell 480791f9 ─────────────
save_path = MODEL_DIR / 'final_model_v2'
trainer.save_model(str(save_path))
tokenizer.save_pretrained(str(save_path))
print(f'✅ Classification model saved to {save_path}')

# ── cell 97132264 ─────────────
import torch.nn as nn
from transformers import AutoModel

label2score = {
    'very_negative': 1.0,
    'slightly_negative': 2.0,
    'neutral': 3.0,
    'slightly_positive': 4.0,
    'very_positive': 5.0,
}

df_train = pd.read_csv(DATA_DIR / 'train_ready_unified.csv')
df_train['score'] = df_train['label'].map(label2score)

train_df, val_df = train_test_split(
    df_train, test_size=0.2, random_state=42, stratify=df_train['label_id']
)
print(f'Train: {len(train_df)} | Val: {len(val_df)}')

tokenizer = AutoTokenizer.from_pretrained(model_name)

train_dataset = TweetDataset(train_df['input_text'].tolist(), train_df['score'].tolist(),
                             tokenizer, label_dtype=torch.float)
val_dataset   = TweetDataset(val_df['input_text'].tolist(),   val_df['score'].tolist(),
                             tokenizer, label_dtype=torch.float)

print('✅ Regression data ready')

# ── cell bd595b45 ─────────────
class RoBERTaRegression(nn.Module):
    def __init__(self, model_name):
        super().__init__()
        self.roberta = AutoModel.from_pretrained(model_name)
        self.dropout = nn.Dropout(0.1)
        self.regressor = nn.Linear(768, 1)

    def forward(self, input_ids, attention_mask, labels=None):
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        cls_output = outputs.last_hidden_state[:, 0, :]
        cls_output = self.dropout(cls_output)
        logits = self.regressor(cls_output).squeeze(-1)
        loss = None
        if labels is not None:
            loss = nn.MSELoss()(logits, labels.float())
        return (loss, logits) if loss is not None else logits

reg_model = RoBERTaRegression(model_name)

def compute_regression_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = predictions.flatten()
    mae  = mean_absolute_error(labels, predictions)
    rmse = np.sqrt(mean_squared_error(labels, predictions))
    pred_classes  = np.clip(np.round(predictions), 1, 5)
    label_classes = np.clip(np.round(labels), 1, 5)
    accuracy = float(np.mean(pred_classes == label_classes))
    return {'mae': mae, 'rmse': rmse, 'accuracy': accuracy}

training_args = TrainingArguments(
    output_dir=str(CHECKPOINT_DIR / 'regression'),
    num_train_epochs=5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    warmup_steps=50,
    weight_decay=0.01,
    logging_dir=str(CHECKPOINT_DIR / 'logs_regression'),
    logging_steps=20,
    eval_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    metric_for_best_model='mae',
    greater_is_better=False,
    report_to='none',
    fp16=False,
    use_cpu=False,
)

trainer = Trainer(
    model=reg_model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_regression_metrics,
)

print('🚀 Starting regression training...')
trainer.train()
print('✅ Regression training complete')

# ── cell 70aedc88 ─────────────
save_path = MODEL_DIR / 'regression_model_v2'
trainer.save_model(str(save_path))
tokenizer.save_pretrained(str(save_path))
print(f'✅ Regression model saved to {save_path}')
