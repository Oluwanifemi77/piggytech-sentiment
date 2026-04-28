/**
 * scripts/import-to-bigquery.ts
 *
 * One-time import of historical CSV data into BigQuery.
 *
 * Usage:
 *   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *   npx tsx scripts/import-to-bigquery.ts
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { BigQuery } from '@google-cloud/bigquery';

const DATASET = 'piggytech_sentiment';
const TABLE   = 'tweets';
const CSV_PATH = path.join(process.cwd(), 'public', 'labelled_tweets_gemini.csv');
const BATCH_SIZE = 500; // BigQuery streaming insert limit per request

async function main() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) { console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set'); process.exit(1); }

  const credentials = JSON.parse(raw);
  const bq = new BigQuery({ projectId: credentials.project_id, credentials });
  const table = bq.dataset(DATASET).table(TABLE);

  console.log(`Reading ${CSV_PATH}...`);
  const records: any[] = parse(fs.readFileSync(CSV_PATH, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(`${records.length} rows found`);

  const now = new Date().toISOString();
  const rows = records.map(r => ({
    tweet_id:          String(r.tweet_id || ''),
    tweet_text:        String(r.tweet_text || ''),
    author_username:   String(r.author_username || ''),
    author_name:       String(r.author_name || ''),
    products_detected: String(r.products_detected || '[]'),
    overall_sentiment: String(r.overall_sentiment || 'neutral'),
    intent:            String(r.intent || 'opinion'),
    aspect_product:    String(r.aspect_product || ''),
    aspect:            String(r.aspect || ''),
    aspect_sentiment:  String(r.aspect_sentiment || ''),
    created_at:        r.created_at || now,
    inserted_at:       now,
  }));

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await table.insert(batch, { skipInvalidRows: true, ignoreUnknownValues: true });
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${rows.length}...`);
  }

  console.log(`Done — ${inserted} rows imported into BigQuery`);
}

main().catch(err => { console.error(err); process.exit(1); });
