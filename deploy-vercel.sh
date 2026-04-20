#!/bin/bash
# =============================================================
# PiggyTech Sentiment — Vercel + Neon Deployment Script
# Run ONCE from your terminal: bash deploy-vercel.sh
# =============================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PiggyTech Sentiment — Vercel + Neon Deployment        ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Step 1: Pause — get your Neon connection string first ─────────────────────
echo ""
echo -e "${YELLOW}⚠️  BEFORE WE START — you need a Neon database URL.${NC}"
echo ""
echo "  1. Open https://neon.tech and sign up (free, no credit card)"
echo "  2. Click 'New Project' → name it 'piggytech'"
echo "  3. On the next screen, copy the connection string."
echo "     It looks like: postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb"
echo "  4. Paste it below when prompted."
echo ""
read -p "Paste your Neon DATABASE_URL here: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "❌  No DATABASE_URL provided. Exiting."
  exit 1
fi

echo -e "${GREEN}✓ Got DATABASE_URL${NC}"

# ── Step 2: Run the schema in Neon ────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/5] Creating database tables in Neon...${NC}"
echo "→ Paste this SQL into your Neon SQL Editor and click Run:"
echo ""
cat schema.sql
echo ""
read -p "Press Enter once you've run the SQL in Neon → "
echo -e "${GREEN}✓ Schema created${NC}"

# ── Step 3: Migrate existing CSV data ────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/5] Migrating your 1,229 existing tweets into Neon...${NC}"
DATABASE_URL="$DATABASE_URL" node scripts/migrate-to-db.js
echo -e "${GREEN}✓ Historical data migrated${NC}"

# ── Step 4: Commit all new files ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/5] Committing updated files...${NC}"
git add .
git commit -m "Switch to Neon Postgres, add Vercel config and migration script" || echo "Nothing new to commit."
echo -e "${GREEN}✓ Committed${NC}"

# ── Step 5: Install Vercel CLI and deploy ─────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/5] Installing Vercel CLI and deploying...${NC}"
if ! command -v vercel &> /dev/null; then
  npm install -g vercel
fi

echo "→ A browser window will open — log in with GitHub and click Authorize."
vercel login

echo "→ Deploying to Vercel (answer the prompts, accept all defaults)..."
vercel --prod

echo -e "${GREEN}✓ Deployed!${NC}"

# ── Step 6: Set environment variables on Vercel ───────────────────────────────
echo ""
echo -e "${YELLOW}[5/5] Setting environment variables on Vercel...${NC}"
echo "$DATABASE_URL"           | vercel env add DATABASE_URL production
echo "apify_api_dLrdodgBJYHMjqyNuB4lEQ6vGu8LEs2UmVqG" | vercel env add APIFY_API_TOKEN production
echo "AIzaSyCNFpqgHVHWLan_aJeGtsk4bp-lGxZZ8m0"         | vercel env add GEMINI_API_KEY production
echo "7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894" | vercel env add CRON_SECRET production

echo ""
echo -e "${YELLOW}Redeploying with env vars active...${NC}"
vercel --prod
echo -e "${GREEN}✓ All environment variables set${NC}"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Your app is live on Vercel!                        ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Get your live URL:"
vercel ls 2>/dev/null | grep piggytech || echo "Run 'vercel ls' to see your URL."
echo ""
echo "Final step — set up the 30-minute cron job at cron-job.org:"
echo ""
echo "  URL: https://YOUR-APP.vercel.app/api/cron?secret=7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894"
echo "  Schedule: */30 * * * *"
echo "  Method: GET"
echo ""
echo "See DEPLOY_NOW.md Step 6 for the full cron-job.org walkthrough."
