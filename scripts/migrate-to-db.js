/**
 * scripts/migrate-to-db.js
 *
 * One-time migration: loads your existing CSV into Neon Postgres.
 * Run this ONCE after setting DATABASE_URL in your environment:
 *
 *   DATABASE_URL="postgresql://..." node scripts/migrate-to-db.js
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING so duplicates are skipped.
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set.');
    console.error('    Run: DATABASE_URL="postgresql://..." node scripts/migrate-to-db.js');
    process.exit(1);
  }

  const csvPath = path.join(process.cwd(), 'public', 'labelled_tweets_gemini.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌  CSV not found at ${csvPath}`);
    process.exit(1);
  }

  const { parse } = require('csv-parse/sync');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });

  console.log(`📂  Found ${rows.length} rows in CSV`);

  const sql = neon(process.env.DATABASE_URL);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const result = await sql`
        INSERT INTO tweets
          (tweet_id, tweet_text, author_username, author_name,
           products_detected, overall_sentiment, intent,
           aspect_product, aspect, aspect_sentiment, created_at)
        VALUES
          (${String(row.tweet_id ?? '')},
           ${String(row.tweet_text ?? '')},
           ${String(row.author_username ?? '')},
           ${String(row.author_name ?? '')},
           ${String(row.products_detected ?? '[]')},
           ${String(row.overall_sentiment ?? '')},
           ${String(row.intent ?? '')},
           ${String(row.aspect_product ?? '')},
           ${String(row.aspect ?? '')},
           ${String(row.aspect_sentiment ?? '')},
           ${String(row.created_at ?? '')})
        ON CONFLICT (tweet_id, aspect) DO NOTHING
        RETURNING id
      `;

      if (result.length > 0) {
        inserted++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  Row ${i + 1} error (tweet_id=${row.tweet_id}): ${err.message}`);
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`  Progress: ${i + 1}/${rows.length} rows processed\r`);
    }
  }

  console.log(`\n✅  Migration complete!`);
  console.log(`    Inserted: ${inserted}`);
  console.log(`    Skipped (already existed): ${skipped}`);
  console.log(`    Errors: ${errors}`);
}

migrate().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
