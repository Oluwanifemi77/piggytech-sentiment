import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

const SEARCH_QUERIES = [
  'piggyvest', 'piggy vest', '@PiggyVest', 'safelock piggyvest',
  'piggyvest withdrawal', 'piggyvest savings', 'piggyvest customer service',
  'pocket app Nigeria', '@usepocket', 'pocket wallet',
  'PVB piggyvest', 'piggyvest for business', 'investify piggyvest',
  'flex dollar piggyvest', 'piggypoints'
];

const BRAND_KEYWORDS = [
  'piggyvest', 'piggy vest', '@piggyvest', 'pocket app',
  '@usepocket', 'usepocket', 'pvb', 'piggyvest for business',
  'investify', 'piggypoints',
];

export async function POST(req: NextRequest) {
  try {
    const { startDate, endDate } = await req.json();

    const run = await client.actor('CJdippxWmn9uRfooo').call({
      searchTerms: SEARCH_QUERIES,
      maxItems: 50,
      lang: 'en',
      since: startDate,
      until: endDate,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const seen = new Set();
    const tweets = items
      .map((t: any) => ({
        tweet_id: t.id || t.rest_id,
        tweet_text: (t.text || t.full_text || t.rawContent || '')
          .replace(/http\S+/g, '').replace(/\s+/g, ' ').trim(),
        created_at: t.createdAt || t.created_at || new Date().toISOString(),
      }))
      .filter((t: any) => {
        if (!t.tweet_id || seen.has(t.tweet_id) || t.tweet_text.length < 30) return false;
        seen.add(t.tweet_id);
        const text = t.tweet_text.toLowerCase();
        return BRAND_KEYWORDS.some(kw => text.includes(kw));
      });

    return NextResponse.json({ tweets, count: tweets.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}