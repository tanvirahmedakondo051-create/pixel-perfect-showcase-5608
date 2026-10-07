#!/usr/bin/env bash
# Hexa AI deploy agent installer (Ubuntu/Debian).
# Usage: curl -fsSL https://YOUR-APP/install-agent.sh | sudo bash -s -- <TOKEN> <AGENT_HOST> [EMAIL] [PORT]
set -euo pipefail
TOKEN="${1:?token required}"; AGENT_HOST="${2:?agent host required, e.g. deploy.example.com}"; EMAIL="${3:-}"; PORT="${4:-8443}"
SRC="$(dirname "${BASH_SOURCE[0]:-/}")"
APP_URL="${HEXA_APP_URL:-}"

apt-get update -y
apt-get install -y nginx certbot curl ca-certificates
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
mkdir -p /opt/hexa-agent /var/www/sites /var/www/certbot
if [ -n "$APP_URL" ]; then curl -fsSL "$APP_URL/deploy-agent.js" -o /opt/hexa-agent/deploy-agent.js; fi
[ -f /opt/hexa-agent/deploy-agent.js ] || { echo "Set HEXA_APP_URL so the agent can be downloaded"; exit 1; }

# Certificate for the agent itself (DNS of AGENT_HOST must point to this server)
if [ ! -f "/etc/letsencrypt/live/$AGENT_HOST/fullchain.pem" ]; then
  systemctl stop nginx || true
  certbot certonly --standalone -d "$AGENT_HOST" --non-interactive --agree-tos ${EMAIL:+-m "$EMAIL"} ${EMAIL:---register-unsafely-without-email}
  systemctl start nginx
fi

cat >/etc/systemd/system/hexa-agent.service <<EOF
[Unit]
Description=Hexa AI deploy agent
After=network.target nginx.service
[Service]
Environment=HEXA_TOKEN=$TOKEN
Environment=HEXA_AGENT_HOST=$AGENT_HOST
Environment=HEXA_PORT=$PORT
Environment=HEXA_EMAIL=$EMAIL
ExecStart=/usr/bin/node /opt/hexa-agent/deploy-agent.js
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now hexa-agent
command -v ufw >/dev/null && ufw allow "$PORT"/tcp && ufw allow 80/tcp && ufw allow 443/tcp || true
echo "✅ Hexa deploy agent running on https://$AGENT_HOST:$PORT"
