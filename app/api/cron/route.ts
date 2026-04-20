/**
 * /api/cron/route.ts
 *
 * Automated pipeline — scrape X → clean → label with Gemini → save to Neon DB
 *
 * Trigger this endpoint every 30 minutes via cron-job.org or any scheduler.
 *
 * Security: Set CRON_SECRET in your env. Pass it as:
 *   Header:  x-cron-secret: <your-secret>
 *   OR Query: ?secret=<your-secret>
 *
 * Required env vars:
 *   APIFY_API_TOKEN   — Apify account token
 *   GEMINI_API_KEY    — Google AI Studio API key
 *   CRON_SECRET       — A random string you choose
 *   DATABASE_URL      — Neon Postgres connection string
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// ─── Constants ───────────────────────────────────────────────────────────────

const BRAND_KEYWORDS = [
  'piggyvest', 'piggy vest', '@piggyvest', 'pocket app',
  '@usepocket', 'usepocket', 'pvb', 'piggyvest for business',
  'investify', 'piggypoints', 'flex dollar', 'flex naira',
  'safelock', 'savings report',
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

// Apify actor ID — same one used by /api/scrape
const APIFY_ACTOR = 'CJdippxWmn9uRfooo';
const APIFY_BASE = 'https://api.apify.com/v2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function snowflakeToDatetime(tweetId: string): string {
  try {
    const clean = tweetId.replace('tweet-', '');
    const ms = Number(BigInt(clean) >> BigInt(22)) + 1288834974657;
    return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
}

// ─── Step 1: Scrape ───────────────────────────────────────────────────────────

interface RawTweet {
  tweet_id: string;
  tweet_text: string;
  created_at: string;
  author_username: string;
  author_name: string;
}

async function scrapeTweets(since: string, until: string): Promise<RawTweet[]> {
  const token = process.env.APIFY_API_TOKEN;

  // Start the actor run and block up to 30s waiting for it to finish.
  // Using direct HTTP so no apify-client / proxy-agent native modules are needed.
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${token}&waitForFinish=30`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTerms: SEARCH_QUERIES,
        maxItems: 20,
        lang: 'en',
        since,
        until,
      }),
    }
  );

  if (!startRes.ok) {
    const body = await startRes.text();
    throw new Error(`Apify start failed (${startRes.status}): ${body.slice(0, 200)}`);
  }

  const { data: runData } = await startRes.json() as { data: any };
  const datasetId: string = runData.defaultDatasetId;

  if (!datasetId) {
    throw new Error(`Apify returned no datasetId. Run status: ${runData.status}`);
  }

  // Fetch dataset items (may be partial if run didn't finish in 30s — still useful)
  const dataRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=20`
  );

  if (!dataRes.ok) {
    throw new Error(`Apify dataset fetch failed (${dataRes.status})`);
  }

  const items: any[] = await dataRes.json();

  const seen = new Set<string>();
  const results: RawTweet[] = [];

  for (const t of items) {
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
    });
  }

  return results;
}

// ─── Step 2: Check existing tweet IDs ────────────────────────────────────────

async function getExistingIds(tweetIds: string[]): Promise<Set<string>> {
  if (tweetIds.length === 0) return new Set();
  const sql = getDb();
  const rows = await sql`
    SELECT DISTINCT tweet_id FROM tweets WHERE tweet_id = ANY(${tweetIds})
  `;
  return new Set(rows.map((r: any) => r.tweet_id as string));
}

// ─── Step 3: Label with Gemini ────────────────────────────────────────────────

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
2. only label aspects clearly discussed
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

async function labelTweet(tweet: RawTweet): Promise<Record<string, string>[]> {
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

      if (responseText.startsWith('```')) {
        responseText = responseText.split('```')[1];
        if (responseText.startsWith('json')) responseText = responseText.slice(4);
        responseText = responseText.trim();
      }
      break;
    } catch (err) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      else throw err;
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
    ? result.overall_sentiment : 'neutral';

  const rows: Record<string, string>[] = [];

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
          ? asp.aspect_sentiment : 'neutral',
        created_at: tweet.created_at,
      });
    }
  } else if (result.products_detected?.length) {
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

// ─── Step 4: Save to Neon DB ─────────────────────────────────────────────────

async function insertRows(rows: Record<string, string>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const sql = getDb();
  let saved = 0;

  for (const row of rows) {
    const result = await sql`
      INSERT INTO tweets
        (tweet_id, tweet_text, author_username, author_name,
         products_detected, overall_sentiment, intent,
         aspect_product, aspect, aspect_sentiment, created_at)
      VALUES
        (${row.tweet_id}, ${row.tweet_text}, ${row.author_username},
         ${row.author_name}, ${row.products_detected}, ${row.overall_sentiment},
         ${row.intent}, ${row.aspect_product}, ${row.aspect},
         ${row.aspect_sentiment}, ${row.created_at})
      ON CONFLICT (tweet_id, aspect) DO NOTHING
      RETURNING id
    `;
    if (result.length > 0) saved++;
  }

  return saved;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export const maxDuration = 60; // Vercel function timeout (seconds)

export async function GET(req: NextRequest) {
  // ── Security ────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const provided =
      (req.headers.get('x-cron-secret') ??
      new URL(req.url).searchParams.get('secret'))?.trim();
    if (provided !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  const log: string[] = [];

  try {
    // ── Date range: last 35 min (slight overlap avoids gaps) ────────────────
    const now = new Date();
    const until = now.toISOString().slice(0, 10);
    const since = new Date(now.getTime() - 35 * 60 * 1000).toISOString().slice(0, 10);
    log.push(`Scraping ${since} → ${until}`);

    // ── Scrape ───────────────────────────────────────────────────────────────
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
        ok: true, scraped: 0, labelled: 0, saved: 0, log,
        elapsed_ms: Date.now() - startedAt,
      });
    }

    // ── Dedup against DB ─────────────────────────────────────────────────────
    const scrapedIds = rawTweets.map(t => t.tweet_id);
    const existingIds = await getExistingIds(scrapedIds);
    const newTweets = rawTweets.filter(t => !existingIds.has(t.tweet_id));
    log.push(`${newTweets.length} new tweets after dedup (${rawTweets.length - newTweets.length} already in DB)`);

    if (newTweets.length === 0) {
      return NextResponse.json({
        ok: true, scraped: rawTweets.length, labelled: 0, saved: 0, log,
        elapsed_ms: Date.now() - startedAt,
      });
    }

    // ── Label with Gemini ────────────────────────────────────────────────────
    const allRows: Record<string, string>[] = [];
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
        await new Promise(r => setTimeout(r, 600));
      } catch (err: any) {
        log.push(`Label failed for ${tweet.tweet_id}: ${err.message}`);
        skippedCount++;
      }
    }

    log.push(`Gemini labelled ${labelledCount} tweets, skipped ${skippedCount} (no product detected)`);

    // ── Save to DB ───────────────────────────────────────────────────────────
    const saved = await insertRows(allRows);
    log.push(`Inserted ${saved} rows into Neon DB`);

    const elapsed = Date.now() - startedAt;
    log.push(`Done in ${(elapsed / 1000).toFixed(1)}s`);

    return NextResponse.json({
      ok: true,
      scraped: rawTweets.length,
      new: newTweets.length,
      labelled: labelledCount,
      saved,
      log,
      elapsed_ms: elapsed,
    });

  } catch (err: any) {
    log.push(`Unhandled error: ${err.message}`);
    return NextResponse.json({ ok: false, log, error: err.message }, { status: 500 });
  }
}

export { GET as POST };
