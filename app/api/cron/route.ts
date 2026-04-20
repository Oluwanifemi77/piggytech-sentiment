/**
 * /api/cron/route.ts
 *
 * Automated pipeline — scrape X → clean → label with Gemini → append to CSV
 *
 * Trigger this endpoint every 30 minutes via cron-job.org, Vercel Cron,
 * GitHub Actions, or any external scheduler.
 *
 * Security: Set CRON_SECRET in your env. Pass it as:
 *   Header:  x-cron-secret: <your-secret>
 *   OR Query: ?secret=<your-secret>
 *
 * Required env vars:
 *   APIFY_API_TOKEN   — Apify account token
 *   GEMINI_API_KEY    — Google AI Studio API key
 *   CRON_SECRET       — A random string you choose (e.g. openssl rand -hex 32)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// ─── Constants ──────────────────────────────────────────────────────────────

const BRAND_KEYWORDS = [
  'piggyvest', 'piggy vest', '@piggyvest', 'pocket app',
  '@usepocket', 'usepocket', 'pvb', 'piggyvest for business',
  'investify', 'piggypoints', 'flex dollar', 'flex naira',
  'safelock', 'piggypoints', 'savings report',
];

const SEARCH_QUERIES = [
  'piggyvest', 'piggy vest', '@PiggyVest', 'safelock piggyvest',
  'piggyvest withdrawal', 'piggyvest savings', 'piggyvest customer service',
  'pocket app Nigeria', '@usepocket', 'pocket wallet',
  'PVB piggyvest', 'piggyvest for business', 'investify piggyvest',
  'flex dollar piggyvest', 'piggypoints',
];

const SENTIMENT_LABELS = [
  'very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive',
];

const INTENT_LABELS = ['opinion', 'complaint', 'inquiry', 'suggestion', 'spam'];

// Actor used by the existing /api/scrape route — keep consistent
const APIFY_ACTOR = 'CJdippxWmn9uRfooo';

// CSV output path — same file the dashboard reads from
const DATA_FILE = path.join(process.cwd(), 'public', 'labelled_tweets_gemini.csv');

// CSV column order must match what /api/data reads
const CSV_COLUMNS = [
  'tweet_id', 'tweet_text', 'author_username', 'author_name',
  'products_detected', 'overall_sentiment', 'intent',
  'aspect_product', 'aspect', 'aspect_sentiment', 'created_at',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract tweet creation time from a Twitter snowflake ID */
function snowflakeToDatetime(tweetId: string): string {
  try {
    const clean = tweetId.replace('tweet-', '');
    const ms = Number(BigInt(clean) >> BigInt(22)) + 1288834974657;
    return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
}

/** Escape a single CSV field value */
function csvField(value: unknown): string {
  const v = String(value ?? '');
  return v.includes(',') || v.includes('"') || v.includes('\n')
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

/** Serialize one row to a CSV line */
function toCsvLine(row: Record<string, unknown>): string {
  return CSV_COLUMNS.map(col => csvField(row[col])).join(',');
}

/** Load already-seen tweet IDs from the CSV to avoid duplicates */
function loadExistingIds(): Set<string> {
  try {
    if (!fs.existsSync(DATA_FILE)) return new Set();
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const records: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });
    return new Set(records.map(r => String(r.tweet_id)));
  } catch {
    return new Set();
  }
}

/** Append rows to the CSV (creates file with header if missing) */
function appendToCsv(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;

  const fileExists = fs.existsSync(DATA_FILE);
  const header = fileExists ? '' : CSV_COLUMNS.join(',') + '\n';
  const lines = rows.map(toCsvLine).join('\n') + '\n';

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.appendFileSync(DATA_FILE, header + lines, 'utf-8');
}

// ─── Step 1: Scrape ─────────────────────────────────────────────────────────

interface RawTweet {
  tweet_id: string;
  tweet_text: string;
  created_at: string;
  author_username: string;
  author_name: string;
  author_followers: number;
}

async function scrapeTweets(since: string, until: string): Promise<RawTweet[]> {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  const run = await client.actor(APIFY_ACTOR).call({
    searchTerms: SEARCH_QUERIES,
    maxItems: 50,       // keep well within Apify free quota per run
    lang: 'en',
    since,
    until,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const seen = new Set<string>();
  const results: RawTweet[] = [];

  for (const t of items as any[]) {
    const tweet_id = String(t.id || t.rest_id || '');
    if (!tweet_id || seen.has(tweet_id)) continue;

    const raw_text: string = t.text || t.full_text || t.rawContent || '';
    const tweet_text = raw_text.replace(/http\S+/g, '').replace(/\s+/g, ' ').trim();

    if (tweet_text.length < 30) continue;

    const text_lower = tweet_text.toLowerCase();
    if (!BRAND_KEYWORDS.some(kw => text_lower.includes(kw))) continue;

    seen.add(tweet_id);
    results.push({
      tweet_id,
      tweet_text,
      created_at: snowflakeToDatetime(tweet_id),
      author_username: t.author?.userName || t.user?.screen_name || '',
      author_name: t.author?.displayName || t.user?.name || '',
      author_followers: t.author?.followers || t.user?.followers_count || 0,
    });
  }

  return results;
}

// ─── Step 2: Label with Gemini ───────────────────────────────────────────────

interface AspectLabel {
  aspect_product: string;
  aspect: string;
  aspect_sentiment: string;
}

interface GeminiLabel {
  products_detected: string[];
  overall_sentiment: string;
  intent: string;
  aspects: AspectLabel[];
}

const GEMINI_PROMPT = (text: string) => `
You are an expert annotation system for aspect-based sentiment analysis of Nigerian fintech tweets.
Analyse this tweet about PiggyTech products and return structured labels.

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
6. If no PiggyTech product mentioned, return empty lists
7. For inquiry/suggestion tweets, include inquiry or suggestion as one of the aspects

Tweet: "${text.replace(/"/g, '\\"')}"

Return ONLY valid JSON, no explanation, no markdown:
{
  "products_detected": ["product_name"],
  "overall_sentiment": "sentiment",
  "intent": "intent_label",
  "aspects": [
    {
      "aspect_product": "product_name",
      "aspect": "aspect_name",
      "aspect_sentiment": "sentiment"
    }
  ]
}
`.trim();

async function labelTweet(tweet: RawTweet): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let responseText = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: GEMINI_PROMPT(tweet.tweet_text) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      });

      const data = await res.json() as any;
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

      // Strip markdown code fences if Gemini wraps with them
      if (responseText.startsWith('```')) {
        responseText = responseText.split('```')[1];
        if (responseText.startsWith('json')) responseText = responseText.slice(4);
        responseText = responseText.trim();
      }

      break;
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      } else {
        throw err;
      }
    }
  }

  if (!responseText) return [];

  let result: GeminiLabel;
  try {
    result = JSON.parse(responseText) as GeminiLabel;
  } catch {
    console.error(`JSON parse error for tweet ${tweet.tweet_id}:`, responseText.slice(0, 200));
    return [];
  }

  const intent = INTENT_LABELS.includes(result.intent) ? result.intent : 'opinion';
  const overall = SENTIMENT_LABELS.includes(result.overall_sentiment)
    ? result.overall_sentiment
    : 'neutral';

  const rows: Record<string, unknown>[] = [];

  if (result.aspects?.length) {
    for (const asp of result.aspects) {
      rows.push({
        tweet_id: tweet.tweet_id,
        tweet_text: tweet.tweet_text,
        author_username: tweet.author_username,
        author_name: tweet.author_name,
        products_detected: JSON.stringify(result.products_detected ?? []),
        overall_sentiment: overall,
        intent,
        aspect_product: asp.aspect_product ?? '',
        aspect: asp.aspect ?? '',
        aspect_sentiment: SENTIMENT_LABELS.includes(asp.aspect_sentiment)
          ? asp.aspect_sentiment
          : 'neutral',
        created_at: tweet.created_at,
      });
    }
  } else if (result.products_detected?.length) {
    // Tweet mentions a product but no specific aspect identified
    rows.push({
      tweet_id: tweet.tweet_id,
      tweet_text: tweet.tweet_text,
      author_username: tweet.author_username,
      author_name: tweet.author_name,
      products_detected: JSON.stringify(result.products_detected),
      overall_sentiment: overall,
      intent,
      aspect_product: '',
      aspect: '',
      aspect_sentiment: '',
      created_at: tweet.created_at,
    });
  }

  return rows;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Security ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided =
      req.headers.get('x-cron-secret') ??
      new URL(req.url).searchParams.get('secret');
    if (provided !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  const log: string[] = [];

  try {
    // ── Date range: last 35 minutes (slight overlap avoids gaps) ────────────
    const now = new Date();
    const until = now.toISOString().slice(0, 10);
    const since = new Date(now.getTime() - 35 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    log.push(`Scraping ${since} → ${until}`);

    // ── Step 1: Scrape ───────────────────────────────────────────────────────
    let rawTweets: RawTweet[] = [];
    try {
      rawTweets = await scrapeTweets(since, until);
      log.push(`Scraped ${rawTweets.length} relevant tweets from Apify`);
    } catch (err: any) {
      log.push(`Apify scrape failed: ${err.message}`);
      return NextResponse.json({ ok: false, log }, { status: 500 });
    }

    if (rawTweets.length === 0) {
      return NextResponse.json({
        ok: true,
        scraped: 0,
        labelled: 0,
        saved: 0,
        log,
        elapsed_ms: Date.now() - startedAt,
      });
    }

    // ── Step 2: Deduplicate against existing data ────────────────────────────
    const existingIds = loadExistingIds();
    const newTweets = rawTweets.filter(t => !existingIds.has(t.tweet_id));
    log.push(`${newTweets.length} new tweets after dedup (skipped ${rawTweets.length - newTweets.length} already seen)`);

    if (newTweets.length === 0) {
      return NextResponse.json({
        ok: true,
        scraped: rawTweets.length,
        labelled: 0,
        saved: 0,
        log,
        elapsed_ms: Date.now() - startedAt,
      });
    }

    // ── Step 3: Label with Gemini ────────────────────────────────────────────
    const allRows: Record<string, unknown>[] = [];
    let labelledCount = 0;
    let skippedCount = 0;

    for (const tweet of newTweets) {
      try {
        const rows = await labelTweet(tweet);
        if (rows.length > 0) {
          allRows.push(...rows);
          labelledCount++;
        } else {
          skippedCount++;
        }
        // Pace Gemini calls to avoid rate-limit errors
        await new Promise(r => setTimeout(r, 800));
      } catch (err: any) {
        log.push(`Label failed for ${tweet.tweet_id}: ${err.message}`);
        skippedCount++;
      }
    }

    log.push(`Gemini labelled ${labelledCount} tweets, skipped ${skippedCount} (no product detected)`);

    // ── Step 4: Append to CSV ────────────────────────────────────────────────
    appendToCsv(allRows);
    log.push(`Appended ${allRows.length} rows to CSV`);

    const elapsed = Date.now() - startedAt;
    log.push(`Done in ${(elapsed / 1000).toFixed(1)}s`);

    return NextResponse.json({
      ok: true,
      scraped: rawTweets.length,
      new: newTweets.length,
      labelled: labelledCount,
      saved: allRows.length,
      log,
      elapsed_ms: elapsed,
    });

  } catch (err: any) {
    log.push(`Unhandled error: ${err.message}`);
    return NextResponse.json({ ok: false, log, error: err.message }, { status: 500 });
  }
}

// Also accept POST so Vercel Cron can hit it (Vercel uses POST for cron routes)
export { GET as POST };
