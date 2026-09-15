#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "==> Pulling latest code..."
  git pull
else
  echo "==> No git repo detected, skipping pull (using files already on disk)."
fi

echo "==> Installing dependencies..."
npm ci

echo "==> Building project..."
npm run build

echo "==> Restarting app with PM2..."
if pm2 describe social-network-app > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --env production
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "==> Deploy complete."
