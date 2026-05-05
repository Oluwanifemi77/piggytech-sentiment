#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
source .venv/bin/activate

echo "=== [1/4] Scraping 2026 tweets ==="
python -u run_scrape.py

echo ""
echo "=== [2/4] Labelling new tweets ==="
python -u run_train.py

echo ""
echo "=== [3/4] Updating public CSV ==="
cp data/labelled_tweets_unified.csv ../public/labelled_tweets_gemini.csv
echo "Copied: $(wc -l < ../public/labelled_tweets_gemini.csv) rows to public/"

echo ""
echo "=== [4/4] Committing and deploying to Vercel ==="
cd ..
git add public/labelled_tweets_gemini.csv
git commit -m "$(cat <<'EOF'
Add 2026 Q1-Q2 tweet data and updated labels

- Scraped new tweets from 2026-01-01 to today
- Labelled via Groq (llama-3.1-8b-instant)
- Updated public dataset

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main || true
vercel --prod

echo ""
echo "✅ Pipeline complete — live on Vercel"
