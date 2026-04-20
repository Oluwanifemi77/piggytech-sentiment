/**
 * scripts/seed-data.js
 *
 * Runs once on server startup (before `next start`).
 * If the persistent volume is empty, copies the committed CSV into it
 * so the dashboard has data from day one — no cron warmup period needed.
 *
 * Called by the "start" script in package.json:
 *   "start": "node scripts/seed-data.js && next start"
 */

const fs = require('fs');
const path = require('path');

const destPath = process.env.DATA_FILE_PATH;

// Only run when DATA_FILE_PATH is set (i.e. in production on Railway)
if (!destPath) {
  console.log('[seed] DATA_FILE_PATH not set — skipping (local dev mode)');
  process.exit(0);
}

const srcPath = path.join(process.cwd(), 'public', 'labelled_tweets_gemini.csv');

// Ensure the destination directory exists (Railway volume may be empty)
const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`[seed] Created directory: ${destDir}`);
}

// Only seed if the destination file is missing or empty
const destExists = fs.existsSync(destPath);
const destSize = destExists ? fs.statSync(destPath).size : 0;

if (destExists && destSize > 0) {
  const lines = fs.readFileSync(destPath, 'utf-8').split('\n').length - 1;
  console.log(`[seed] Volume already has data (${lines} rows) — skipping seed`);
  process.exit(0);
}

// Seed from the committed CSV
if (!fs.existsSync(srcPath)) {
  console.log(`[seed] Source CSV not found at ${srcPath} — starting with empty dataset`);
  process.exit(0);
}

fs.copyFileSync(srcPath, destPath);
const lines = fs.readFileSync(destPath, 'utf-8').split('\n').length - 1;
console.log(`[seed] ✅ Seeded volume with ${lines} rows from committed CSV`);
