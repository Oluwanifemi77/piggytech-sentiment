#!/bin/bash
# =============================================================
# PiggyTech Sentiment — One-Shot Railway Deployment Script
# Run this ONCE from your terminal: bash deploy.sh
# =============================================================
set -e   # stop on first error

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PiggyTech Sentiment — Railway Deployment               ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 1. Commit everything ───────────────────────────────────────
echo -e "\n${YELLOW}[1/6] Committing new files...${NC}"
git add .
git commit -m "Add Railway config, cron route, seed script, persistent data path" || echo "Nothing new to commit."
echo -e "${GREEN}✓ Git commit done${NC}"

# ── 2. Install Railway CLI ─────────────────────────────────────
echo -e "\n${YELLOW}[2/6] Installing Railway CLI...${NC}"
if command -v railway &> /dev/null; then
    echo "Railway CLI already installed: $(railway --version)"
else
    npm install -g @railway/cli
fi
echo -e "${GREEN}✓ Railway CLI ready${NC}"

# ── 3. Login to Railway ────────────────────────────────────────
echo -e "\n${YELLOW}[3/6] Logging into Railway...${NC}"
echo "→ A browser window will open. Click 'Authorize' to continue."
railway login
echo -e "${GREEN}✓ Logged in${NC}"

# ── 4. Create project and deploy ──────────────────────────────
echo -e "\n${YELLOW}[4/6] Creating Railway project and uploading your app...${NC}"
echo "→ When asked for a project name, type: piggytech-sentiment"
echo "→ When asked for an environment, press Enter to accept 'production'"
railway init
railway up --detach
echo -e "${GREEN}✓ App uploaded to Railway${NC}"

# ── 5. Set environment variables ──────────────────────────────
echo -e "\n${YELLOW}[5/6] Setting environment variables...${NC}"
railway variables --set "APIFY_API_TOKEN=$APIFY_API_TOKEN"
railway variables --set "GEMINI_API_KEY=$GEMINI_API_KEY"
railway variables --set "CRON_SECRET=7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894"
railway variables --set "NODE_ENV=production"
railway variables --set "DATA_FILE_PATH=/data/labelled_tweets_gemini.csv"
echo -e "${GREEN}✓ All environment variables set${NC}"

# ── 6. Open the dashboard ─────────────────────────────────────
echo -e "\n${YELLOW}[6/6] Opening your Railway dashboard...${NC}"
railway open

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Deployment kicked off!                              ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps (do these in the Railway dashboard that just opened):"
echo ""
echo "  1. Wait for the build to finish (watch Deployments tab)"
echo "  2. Go to Settings → Networking → 'Generate Domain'"
echo "     → This gives you your public URL"
echo "  3. Go to the Volumes tab → Add Volume"
echo "     → Mount Path: /data"
echo "     → Click Add (Railway redeploys automatically)"
echo ""
echo "Then set up the 30-min cron job at cron-job.org:"
echo ""
echo "  URL: https://YOUR-APP.up.railway.app/api/cron?secret=7e023a41a84f694a1e1db943d04e67e336ab3479a3ab2c7e9ee843ccb10c7894"
echo "  Schedule: */30 * * * *"
echo ""
echo "Full instructions: see DEPLOY_NOW.md in your project folder"
