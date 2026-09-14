#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu VPS. Run once as root or with sudo.
# Usage: sudo bash setup-vps.sh yourdomain.com
set -euo pipefail

DOMAIN="${1:-a2t.io.vn}"
APP_DIR="/var/www/social-network-app"
NODE_MAJOR=20

echo "==> Updating system packages..."
apt-get update -y
apt-get upgrade -y

echo "==> Installing base tools..."
apt-get install -y curl git ufw nginx

echo "==> Installing Node.js ${NODE_MAJOR}.x..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs

echo "==> Installing PM2 globally..."
npm install -g pm2

echo "==> Configuring firewall (UFW)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Preparing app directory..."
mkdir -p "$APP_DIR"
echo "Place/clone your project into: $APP_DIR"

echo "==> Installing Nginx site config for $DOMAIN..."
cp "$(dirname "$0")/nginx/${DOMAIN}.conf" "/etc/nginx/sites-available/${DOMAIN}.conf" 2>/dev/null \
  || echo "NOTE: copy nginx/a2t.io.vn.conf manually to /etc/nginx/sites-available/${DOMAIN}.conf if this script isn't run from the repo."
ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Installing Certbot for free SSL..."
apt-get install -y certbot python3-certbot-nginx
echo "Run this manually after DNS has propagated to this server's IP:"
echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

echo "==> Enabling PM2 startup on boot..."
pm2 startup systemd -u "$(logname)" --hp "/home/$(logname)" | tail -1 > /tmp/pm2_startup_cmd.sh
echo "Run the printed command above (or check /tmp/pm2_startup_cmd.sh) to finish PM2 boot persistence."

echo ""
echo "==> Base setup complete."
echo "Next steps:"
echo "  1. Clone/copy your project into $APP_DIR"
echo "  2. cd $APP_DIR && bash deploy.sh"
echo "  3. sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
