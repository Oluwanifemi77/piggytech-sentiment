/**
 * lib/supabase.ts
 *
 * Tiny Supabase REST helpers (no SDK needed).
 *   SUPABASE_URL            — https://<ref>.supabase.co
 *   SUPABASE_ANON_KEY       — publishable key (read-only: RLS allows SELECT on tweets)
 *   SUPABASE_INGEST_SECRET  — checked by the ingest_tweets() SQL function for writes
 */

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} environment variable is not set.`);
  return v;
}

function headers(extra: Record<string, string> = {}) {
  const key = env('SUPABASE_ANON_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

const COLUMNS = [
  'tweet_id', 'tweet_text', 'author_username', 'author_name', 'products_detected',
  'overall_sentiment', 'intent', 'aspect_product', 'aspect', 'aspect_sentiment', 'target', 'created_at',
].join(',');

/** All tweet rows, newest first. Pages through PostgREST's 1,000-row cap, 5 pages at a time. */
export async function fetchTweets(limit = 20000): Promise<Record<string, any>[]> {
  const base = env('SUPABASE_URL');
  const page = 1000;
  const getPage = async (from: number) => {
    const res = await fetch(
      `${base}/rest/v1/tweets?select=${COLUMNS}&order=created_at.desc.nullslast,id.desc`,
      { headers: headers({ Range: `${from}-${from + page - 1}` }), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`Supabase read failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return res.json() as Promise<Record<string, any>[]>;
  };
  const out: Record<string, any>[] = [];
  for (let from = 0; from < limit; from += page * 5) {
    const pages = await Promise.all([0, 1, 2, 3, 4].map(i => getPage(from + i * page)));
    let done = false;
    for (const rows of pages) {
      out.push(...rows);
      if (rows.length < page) { done = true; break; }
    }
    if (done) break;
  }
  for (const r of out) {
    // keep the same 'YYYY-MM-DDTHH:MM:SSZ' shape the dashboard compares as strings
    if (r.created_at) r.created_at = new Date(r.created_at).toISOString().slice(0, 19) + 'Z';
  }
  return out.slice(0, limit);
}

/** tweet_ids from the list that are already stored. */
export async function existingTweetIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const list = ids.map(id => `"${id.replace(/"/g, '')}"`).join(',');
  const res = await fetch(
    `${env('SUPABASE_URL')}/rest/v1/tweets?select=tweet_id&tweet_id=in.(${encodeURIComponent(list)})`,
    { headers: headers(), cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Supabase dedup query failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return new Set((await res.json() as { tweet_id: string }[]).map(r => r.tweet_id));
}

/** Insert labelled rows via the secret-checked ingest_tweets() function. Returns rows inserted. */
export async function insertTweets(rows: Record<string, string>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/ingest_tweets`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_secret: env('SUPABASE_INGEST_SECRET'), p_rows: rows }),
  });
  if (!res.ok) throw new Error(`Supabase insert failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return Number(await res.json());
}
