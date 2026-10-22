#!/usr/bin/env python3
"""
Backfill H1 2026 (Jan 1 – Jun 30) into Supabase.

  scrape  → Apify kaito tweet scraper (PiggyTech per day, competitors per brand per 3 days)
  clean   → keyword filter, strip links, min length, dedup vs Supabase
  label   → Gemini (batched, 10 tweets/call), Groq fallback on rate limits
  insert  → Supabase ingest_tweets() RPC

Every stage checkpoints to ml/data/h1_2026/, so re-running resumes where it stopped.
Env (from .env.local / ml/.env): APIFY_API_TOKEN, GEMINI_API_KEY, GROQ_API_KEY + USE_GROQ=1 (optional fallback),
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_INGEST_SECRET.

Usage:  python3 -u ml/backfill_h1.py [scrape|clean|label|insert|all]
"""
import datetime as dt, json, os, re, sys, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'ml', 'data', 'h1_2026')
RAW = os.path.join(OUT, 'raw')
START, END = dt.date(2026, 1, 1), dt.date(2026, 7, 1)   # END exclusive
ACTOR = 'CJdippxWmn9uRfooo'

def load_env(path):
    if os.path.exists(path):
        for line in open(path):
            m = re.match(r'^([A-Z_]+)=(.*)$', line.strip())
            if m and not os.environ.get(m.group(1)):
                os.environ[m.group(1)] = m.group(2).strip().strip('"')
load_env(os.path.join(ROOT, '.env.local')); load_env(os.path.join(ROOT, 'ml', '.env'))
E = os.environ.get

PIGGY_QUERY = ('piggyvest OR "piggy vest" OR @PiggyVest OR usepocket OR @usepocket OR "pocket app" '
               'OR safelock OR investify OR piggypoints OR "piggyvest for business"')
PIGGY_KEYWORDS = ['piggyvest', 'piggy vest', '@piggyvest', 'pocket app', '@usepocket', 'usepocket', 'pvb',
                  'piggyvest for business', 'investify', 'piggypoints', 'flex dollar', 'flex naira',
                  'safelock', 'savings report']
EXTERNAL = {  # brand: (query, keywords)
    'Cowrywise':  ('cowrywise OR @cowrywise', ['cowrywise']),
    'OPay':       ('opay OR @opay_ng', ['opay']),
    'Moniepoint': ('moniepoint OR @moniepoint', ['moniepoint']),
    'PalmPay':    ('palmpay OR @palmpay_ng', ['palmpay']),
    'FairMoney':  ('fairmoney OR @fairmoney_ng', ['fairmoney']),
    'Bamboo':     ('investbamboo OR "bamboo invest" OR @investbamboo', ['investbamboo', 'bamboo invest']),
}
EXTERNAL_PRODUCTS = list(EXTERNAL)
SENT = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive']
INTENTS = ['opinion', 'complaint', 'inquiry', 'suggestion', 'spam']

def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)

def http(url, data=None, headers=None, timeout=120):
    req = urllib.request.Request(url, json.dumps(data).encode() if data is not None else None,
                                 {'Content-Type': 'application/json', 'User-Agent': 'piggytech-sentiment/1.0', **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

# ─── scrape ──────────────────────────────────────────────────────────────────
def windows(step):
    d = START
    while d < END:
        e = min(d + dt.timedelta(days=step), END)
        yield d, e
        d = e

def scrape_task(task):
    target, brand, query, since, until, cap = task
    path = os.path.join(RAW, f'{target}_{brand}_{since}.json')
    if os.path.exists(path):
        return 0
    inp = {'twitterContent': query, 'maxItems': cap, 'queryType': 'Latest', 'lang': 'en',
           'since': f'{since}_00:00:00_UTC', 'until': f'{until}_00:00:00_UTC'}
    T = E('APIFY_API_TOKEN')
    for attempt in range(4):
        try:
            run = http(f'https://api.apify.com/v2/acts/{ACTOR}/runs?token={T}&waitForFinish=60', inp)['data']
            while run['status'] in ('READY', 'RUNNING'):
                time.sleep(5)
                run = http(f"https://api.apify.com/v2/actor-runs/{run['id']}?token={T}&waitForFinish=60")['data']
            if run['status'] != 'SUCCEEDED':
                raise RuntimeError(run['status'])
            items = http(f"https://api.apify.com/v2/datasets/{run['defaultDatasetId']}/items?token={T}&clean=1")
            tweets = [t for t in items if t.get('type') == 'tweet' and t.get('text')]
            json.dump({'task': [target, brand, str(since), str(until)], 'run': run['id'], 'items': tweets}, open(path + '.tmp', 'w'))
            os.replace(path + '.tmp', path)
            if len(tweets) >= cap * 0.9 and target == 'piggytech':
                log(f'  note: {brand} {since} hit cap ({len(tweets)})')
            return len(tweets)
        except Exception as ex:
            log(f'  retry {brand} {since}: {ex}')
            time.sleep(10 * (attempt + 1))
    log(f'  FAILED {brand} {since}')
    return 0

def scrape():
    os.makedirs(RAW, exist_ok=True)
    tasks = [('piggytech', 'PiggyTech', PIGGY_QUERY, a, b, 300) for a, b in windows(1)]
    for brand, (q, _) in EXTERNAL.items():
        tasks += [('external', brand, q, a, b, 20) for a, b in windows(3)]
    todo = [t for t in tasks if not os.path.exists(os.path.join(RAW, f'{t[0]}_{t[1]}_{t[3]}.json'))]
    log(f'scrape: {len(tasks)} windows, {len(todo)} to do')
    done = [0]; total = [0]; lock = threading.Lock()
    def work(t):
        n = scrape_task(t)
        with lock:
            done[0] += 1; total[0] += n
            if done[0] % 25 == 0 or done[0] == len(todo):
                log(f'  scraped {done[0]}/{len(todo)} windows, {total[0]} tweets')
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(work, todo))

# ─── clean ───────────────────────────────────────────────────────────────────
def snowflake_iso(tid):
    ms = (int(tid) >> 22) + 1288834974657
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def existing_ids():
    ids, frm = set(), 0
    h = {'apikey': E('SUPABASE_ANON_KEY'), 'Authorization': 'Bearer ' + E('SUPABASE_ANON_KEY')}
    while True:
        req = urllib.request.Request(f"{E('SUPABASE_URL')}/rest/v1/tweets?select=tweet_id&order=id",
                                     headers={**h, 'Range': f'{frm}-{frm + 999}'})
        rows = json.load(urllib.request.urlopen(req, timeout=60))
        ids.update(r['tweet_id'] for r in rows)
        if len(rows) < 1000:
            return ids
        frm += 1000

def clean():
    have = existing_ids()
    log(f'clean: {len(have)} tweet_ids already in Supabase')
    seen, out = set(), []
    for f in sorted(os.listdir(RAW)):
        if not f.endswith('.json'):
            continue
        d = json.load(open(os.path.join(RAW, f)))
        target, brand = d['task'][0], d['task'][1]
        kws = PIGGY_KEYWORDS if target == 'piggytech' else EXTERNAL[brand][1]
        for t in d['items']:
            raw_id = str(t.get('id') or '').replace('tweet-', '')
            if not raw_id.isdigit():
                continue
            tid = f'tweet-{raw_id}'
            text = re.sub(r'\s+', ' ', re.sub(r'http\S+', '', t.get('text') or '')).strip()
            created = snowflake_iso(raw_id)
            if tid in seen or tid in have or len(text) < 30 or not any(k in text.lower() for k in kws):
                continue
            if not (START.isoformat() <= created[:10] < END.isoformat()):
                continue
            seen.add(tid)
            a = t.get('author') or {}
            out.append({'tweet_id': tid, 'tweet_text': text, 'created_at': created, 'target': target,
                        'author_username': a.get('userName') or '', 'author_name': a.get('name') or ''})
    json.dump(out, open(os.path.join(OUT, 'clean.json'), 'w'))
    from collections import Counter
    log(f'clean: {len(out)} new tweets', dict(Counter(o['target'] for o in out)))

# ─── label ───────────────────────────────────────────────────────────────────
PIGGY_RULES = '''PRODUCTS:
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
- Pocket only: checkout_payments, wallet_funding, transfers'''
EXT_RULES = '''PRODUCTS (use these exact names):
- Cowrywise: savings and investment app
- OPay: payments, wallet, transfers, POS
- Moniepoint: business banking, POS, transfers
- PalmPay: payments and wallet app
- FairMoney: loans and digital banking
- Bamboo: stock investing app (aliases: "investbamboo", "bamboo invest")
ASPECTS:
customer_support, app_performance, payments_transfers, savings_plans, withdrawals,
investments, loans, fees_charges, trust_security, brand_perception, inquiry, suggestion'''

def prompt(batch, target):
    rules = PIGGY_RULES if target == 'piggytech' else EXT_RULES
    what = 'PiggyTech products' if target == 'piggytech' else 'competitor fintech products'
    tweets = '\n'.join(f'[{i}] {t["tweet_text"]}' for i, t in enumerate(batch))
    return f'''You are an expert annotation system for aspect-based sentiment analysis of Nigerian fintech tweets.
Analyse each tweet about {what} and return structured labels.

{rules}

SPECIAL RULES:
- Use "inquiry" aspect when the tweet asks a question about a product
- Use "suggestion" aspect when the tweet recommends a feature or improvement
- inquiry/suggestion tweets still get a sentiment score

SENTIMENT OPTIONS: very_negative, slightly_negative, neutral, slightly_positive, very_positive
INTENT OPTIONS: opinion, complaint, inquiry, suggestion, spam

RULES:
1. Only detect products clearly mentioned
2. Only label aspects clearly discussed
3. overall_sentiment = general tone of whole tweet
4. aspect_sentiment = sentiment toward that specific aspect
5. One entry per aspect detected
6. If no listed product is mentioned, return empty lists
7. For inquiry/suggestion tweets, include inquiry or suggestion as one of the aspects
8. Label every tweet independently

TWEETS:
{tweets}

Return ONLY a JSON array with one object per tweet, in order:
[{{"i": 0, "products_detected": ["product_name"], "overall_sentiment": "sentiment", "intent": "intent_label",
  "aspects": [{{"aspect_product": "product_name", "aspect": "aspect_name", "aspect_sentiment": "sentiment"}}]}}]'''

class RateLimited(Exception):
    pass

def call_gemini(p):
    model = E('GEMINI_MODEL') or 'gemini-3.5-flash-lite'
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={E('GEMINI_API_KEY')}"
    try:
        d = http(url, {'contents': [{'parts': [{'text': p}]}],
                       'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 8192,
                                            'responseMimeType': 'application/json'}}, timeout=120)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        if e.code in (429, 503):
            raise RateLimited(f'gemini {e.code}: {body}')
        raise RuntimeError(f'gemini {e.code}: {body}')
    return d['candidates'][0]['content']['parts'][0]['text']

def call_groq(p):
    try:
        d = http('https://api.groq.com/openai/v1/chat/completions',
                 {'model': 'openai/gpt-oss-20b', 'temperature': 0.1,
                  'messages': [{'role': 'user', 'content': p}]},
                 {'Authorization': 'Bearer ' + E('GROQ_API_KEY', '')}, timeout=120)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        if e.code == 429:
            raise RateLimited(f'groq 429: {body}')
        raise RuntimeError(f'groq {e.code}: {body}')
    return d['choices'][0]['message']['content']

def parse(text):
    text = text.strip()
    if '[' in text and not text.startswith(('[', '{')):
        text = text[text.index('['):text.rindex(']') + 1]   # strip prose / code fences
    v = json.loads(text)
    if isinstance(v, dict):
        v = v.get('labels') or next((x for x in v.values() if isinstance(x, list)), [])
    return v

def to_rows(t, lab, target):
    prods = lab.get('products_detected') or []
    aspects = lab.get('aspects') or []
    if target == 'external':
        canon = {p.lower(): p for p in EXTERNAL_PRODUCTS}
        prods = [canon[p.lower().strip()] for p in prods if isinstance(p, str) and p.lower().strip() in canon]
        aspects = [{**a, 'aspect_product': canon[a['aspect_product'].lower().strip()]} for a in aspects
                   if isinstance(a.get('aspect_product'), str) and a['aspect_product'].lower().strip() in canon]
    intent = lab.get('intent') if lab.get('intent') in INTENTS else 'opinion'
    overall = lab.get('overall_sentiment') if lab.get('overall_sentiment') in SENT else 'neutral'
    base = {**t, 'products_detected': json.dumps(prods), 'overall_sentiment': overall, 'intent': intent}
    if aspects:
        return [{**base, 'aspect_product': a.get('aspect_product') or '', 'aspect': a.get('aspect') or '',
                 'aspect_sentiment': a.get('aspect_sentiment') if a.get('aspect_sentiment') in SENT else 'neutral'}
                for a in aspects]
    if prods:
        return [{**base, 'aspect_product': '', 'aspect': '', 'aspect_sentiment': ''}]
    return []

def label():
    tweets = json.load(open(os.path.join(OUT, 'clean.json')))
    lpath = os.path.join(OUT, 'labels.jsonl')
    done = set()
    if os.path.exists(lpath):
        for line in open(lpath):
            done.add(json.loads(line)['tweet_id'])
    todo = [t for t in tweets if t['tweet_id'] not in done]
    log(f'label: {len(tweets)} tweets, {len(todo)} to label')
    batches = []
    for target in ('piggytech', 'external'):
        ts = [t for t in todo if t['target'] == target]
        batches += [(target, ts[i:i + 10]) for i in range(0, len(ts), 10)]
    lock = threading.Lock(); stats = {'batches': 0, 'rows': 0, 'groq': 0, 'fail': 0}
    use_groq_until = [0.0]
    def work(job):
        target, batch = job
        p = prompt(batch, target)
        labs = None
        for attempt in range(6):
            try:
                if time.time() < use_groq_until[0] and E('USE_GROQ'):
                    labs = parse(call_groq(p)); stats['groq'] += 1
                else:
                    labs = parse(call_gemini(p))
                break
            except RateLimited as ex:
                if 'gemini' in str(ex) and E('USE_GROQ'):
                    use_groq_until[0] = time.time() + 120   # lean on Groq for 2 min
                time.sleep(min(60, 5 * 2 ** attempt))
            except Exception as ex:
                log(f'  label error ({target}): {str(ex)[:200]}')
                time.sleep(3)
        with lock:
            stats['batches'] += 1
            if labs is None:
                stats['fail'] += 1
                return
            by_i = {l.get('i'): l for l in labs if isinstance(l, dict)}
            with open(lpath, 'a') as f:
                for i, t in enumerate(batch):
                    lab = by_i.get(i)
                    if lab is None and len(labs) == len(batch):
                        lab = labs[i]
                    if lab is None:
                        continue
                    rows = to_rows(t, lab, target)
                    stats['rows'] += len(rows)
                    f.write(json.dumps({'tweet_id': t['tweet_id'], 'rows': rows}) + '\n')
            if stats['batches'] % 50 == 0 or stats['batches'] == len(batches):
                log(f'  labelled {stats["batches"]}/{len(batches)} batches, {stats["rows"]} rows, '
                    f'groq={stats["groq"]} failed={stats["fail"]}')
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(work, batches))

# ─── insert ──────────────────────────────────────────────────────────────────
def insert():
    rows = []
    for line in open(os.path.join(OUT, 'labels.jsonl')):
        rows += json.loads(line)['rows']
    log(f'insert: {len(rows)} rows')
    h = {'apikey': E('SUPABASE_ANON_KEY'), 'Authorization': 'Bearer ' + E('SUPABASE_ANON_KEY')}
    batch, inserted = [], 0
    def flush():
        nonlocal inserted, batch
        if batch:
            inserted += http(f"{E('SUPABASE_URL')}/rest/v1/rpc/ingest_tweets",
                             {'p_secret': E('SUPABASE_INGEST_SECRET'), 'p_rows': batch}, h)
            batch = []
    last = None
    for r in rows:   # rows of one tweet are contiguous; never split a tweet across batches
        if len(batch) >= 500 and r['tweet_id'] != last:
            flush()
        batch.append(r); last = r['tweet_id']
    flush()
    log(f'insert: {inserted} rows inserted')

if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for name, fn in [('scrape', scrape), ('clean', clean), ('label', label), ('insert', insert)]:
        if step in (name, 'all'):
            fn()
    log('done')
