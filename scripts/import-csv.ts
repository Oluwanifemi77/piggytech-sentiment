/**
 * scripts/import-csv.ts
 *
 * Imports historical tweet data from the CSV file into MySQL.
 * Run once after setting up your MySQL database.
 *
 * Usage:
 *   DATABASE_URL="mysql://USER:PASS@HOST:PORT/DB" npx tsx scripts/import-csv.ts
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mysql from 'mysql2/promise';

const CSV_PATH = path.join(process.cwd(), 'public', 'labelled_tweets_gemini.csv');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection({
    uri: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Reading CSV: ${CSV_PATH}`);
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: any[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(`Found ${records.length} rows in CSV`);

  let inserted = 0;
  let skipped = 0;

  for (const row of records) {
    try {
      const [result] = await conn.execute(
        `INSERT IGNORE INTO tweets
          (tweet_id, tweet_text, author_username, author_name,
           products_detected, overall_sentiment, intent,
           aspect_product, aspect, aspect_sentiment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.tweet_id   || '',
          row.tweet_text || '',
          row.author_username || '',
          row.author_name     || '',
          row.products_detected || '[]',
          row.overall_sentiment || 'neutral',
          row.intent            || 'opinion',
          row.aspect_product    || '',
          row.aspect            || '',
          row.aspect_sentiment  || '',
          row.created_at        || new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      if ((result as any).affectedRows > 0) inserted++;
      else skipped++;
    } catch (err: any) {
      console.error(`Row skipped (${row.tweet_id}): ${err.message}`);
      skipped++;
    }
  }

  await conn.end();
  console.log(`Done — inserted: ${inserted}, skipped (duplicates/errors): ${skipped}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
