#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=""
SOURCE_ROOT=""
while [ "$#" -gt 0 ]; do
    case "$1" in
        --config) CONFIG_PATH="${2:-}"; shift 2 ;;
        --source) SOURCE_ROOT="${2:-}"; shift 2 ;;
        *) echo "Unknown argument: $1" >&2; exit 2 ;;
    esac
done

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)/common.sh"

[ "$(id -u)" -eq 0 ] || die 'install-service.sh must run as root (use the top-level install.sh entrypoint).'
require_node
ensure_systemd_supported
[ -n "$SOURCE_ROOT" ] || SOURCE_ROOT="$(resolve_termlink_root)"
SOURCE_ROOT="$(cd "$SOURCE_ROOT" && pwd)"
[ -n "$CONFIG_PATH" ] || die '--config is required.'
CONFIG_PATH="$(cd "$(dirname "$CONFIG_PATH")" && pwd)/$(basename "$CONFIG_PATH")"
validate_install_config "$CONFIG_PATH"

INSTALL_BASE="$(json_get "$CONFIG_PATH" installDir /opt/termlink)"
CONFIG_DIR="$(json_get "$CONFIG_PATH" configDir /etc/termlink)"
DATA_DIR="$(json_get "$CONFIG_PATH" dataDir /var/lib/termlink)"
RUN_USER="${TERMLINK_RUN_USER:-$(json_get "$CONFIG_PATH" runUser '')}"
[ -n "$RUN_USER" ] || die 'runUser is required.'
id "$RUN_USER" >/dev/null 2>&1 || die "Service run user does not exist: $RUN_USER"
RUN_GROUP="${TERMLINK_RUN_GROUP:-$(id -gn "$RUN_USER")}"
SERVICE_NAME="$(service_name "$CONFIG_PATH")"
UNIT_PATH="$(systemd_unit_path "$CONFIG_PATH")"
VERSION="$(node -p "require('$SOURCE_ROOT/package.json').version")"
RELEASES_DIR="$INSTALL_BASE/releases"
RELEASE_DIR="$RELEASES_DIR/$VERSION"
if [ -e "$RELEASE_DIR" ]; then RELEASE_DIR="$RELEASES_DIR/$VERSION-$(date +%Y%m%d%H%M%S)"; fi
CURRENT_LINK="$INSTALL_BASE/current"
PREVIOUS_TARGET=""
[ -L "$CURRENT_LINK" ] && PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK")"

CONFIG_BACKUP=""
NGINX_CONFIG="$(json_get "$CONFIG_PATH" nginx.configPath /etc/nginx/conf.d/termlink.conf)"
NGINX_BACKUP=""
if [ -d "$CONFIG_DIR" ]; then
    CONFIG_BACKUP="$(mktemp -d)/config"
    cp -a "$CONFIG_DIR" "$CONFIG_BACKUP"
fi
if [ -f "$NGINX_CONFIG" ]; then NGINX_BACKUP="$(mktemp)"; cp -a "$NGINX_CONFIG" "$NGINX_BACKUP"; fi

rollback() {
    local code=$?
    trap - ERR
    echo 'Installation failed; restoring previous TermLink release.' >&2
    if [ -n "$PREVIOUS_TARGET" ] && [ -d "$PREVIOUS_TARGET" ]; then ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"; else rm -f "$CURRENT_LINK"; fi
    if [ -n "$CONFIG_BACKUP" ] && [ -d "$CONFIG_BACKUP" ]; then rm -rf "$CONFIG_DIR"; cp -a "$CONFIG_BACKUP" "$CONFIG_DIR"; else rm -rf "$CONFIG_DIR"; fi
    if [ -n "$NGINX_BACKUP" ] && [ -f "$NGINX_BACKUP" ]; then install -D -m 0644 "$NGINX_BACKUP" "$NGINX_CONFIG"; else rm -f "$NGINX_CONFIG"; fi
    systemctl daemon-reload || true
    systemctl restart "$SERVICE_NAME.service" || true
    [ "$(json_get "$CONFIG_PATH" tls.mode off)" = nginx ] && systemctl restart nginx || true
    exit "$code"
}
trap rollback ERR

install -d -m 0755 "$RELEASES_DIR" "$CONFIG_DIR" "$CONFIG_DIR/certs" "$CONFIG_DIR/certs/clients"
install -d -o "$RUN_USER" -g "$RUN_GROUP" -m 0750 "$DATA_DIR" "$DATA_DIR/data" "$DATA_DIR/logs"
mkdir -p "$RELEASE_DIR"
for entry in src public scripts package.json package-lock.json .env.example release-manifest.json release-contents.txt; do
    [ -e "$SOURCE_ROOT/$entry" ] && cp -a "$SOURCE_ROOT/$entry" "$RELEASE_DIR/"
done

(cd "$RELEASE_DIR" && npm ci --omit=dev --no-audit --no-fund)
ln -sfn "$DATA_DIR/data" "$RELEASE_DIR/data"
ln -sfn "$DATA_DIR/logs" "$RELEASE_DIR/logs"

TLS_MODE="$(json_get "$CONFIG_PATH" tls.mode off)"
SERVER_SOURCE="$(json_get "$CONFIG_PATH" tls.serverSource generate)"
MTLS_DEPLOYMENT="$(json_get "$CONFIG_PATH" mtls.deployment none)"
CERT_DIR="$(json_get "$CONFIG_PATH" tls.certDir "$CONFIG_DIR/certs")"
SERVER_CERT="$(json_get "$CONFIG_PATH" tls.serverCert "$CERT_DIR/server.crt")"
SERVER_KEY="$(json_get "$CONFIG_PATH" tls.serverKey "$CERT_DIR/server.key")"
CA_CERT="$(json_get "$CONFIG_PATH" tls.caCert "$CERT_DIR/client-ca.crt")"
CLIENT_DIR="$(json_get "$CONFIG_PATH" mtls.clientOutputDir "$CERT_DIR/clients")"
CLIENT_BASENAME=client
if [ "$SERVER_SOURCE" = import ] && [ "$TLS_MODE" = nginx ]; then CLIENT_BASENAME="$(json_get "$CONFIG_PATH" mtls.clientName client)"; fi
MTLS_JSON='{"enabled":false}'

if [ "$TLS_MODE" != off ] && [ "$SERVER_SOURCE" = import ]; then
    install -m 0644 "$(json_get "$CONFIG_PATH" tls.importCert '')" "$SERVER_CERT"
    install -m 0640 "$(json_get "$CONFIG_PATH" tls.importKey '')" "$SERVER_KEY"
fi

if [ "$TLS_MODE" != off ] && [ "$SERVER_SOURCE" = generate ]; then
    if [ -f "$SERVER_CERT" ] && [ -f "$SERVER_KEY" ] && { [ "$MTLS_DEPLOYMENT" = none ] || { [ -f "$CA_CERT" ] && [ -f "$CLIENT_DIR/client.p12" ] && [ -f "$CLIENT_DIR/client-password.txt" ]; }; }; then
        echo "Reusing existing generated certificates from $CERT_DIR"
    else
        MTLS_JSON="$(node "$RELEASE_DIR/scripts/certs/generate-direct-mtls.js" --mode generate --install-root "$RELEASE_DIR" --config "$CONFIG_PATH")"
    fi
elif [ "$MTLS_DEPLOYMENT" != none ]; then
    if [ "$TLS_MODE" = direct ]; then CLIENT_NAME=client; else CLIENT_NAME="$(json_get "$CONFIG_PATH" mtls.clientName client)"; fi
    if [ -f "$CA_CERT" ] && [ -f "$CLIENT_DIR/$CLIENT_NAME.p12" ] && [ -f "$CLIENT_DIR/$CLIENT_NAME-password.txt" ]; then
        echo "Reusing existing mTLS client credentials from $CLIENT_DIR"
    else
        MTLS_JSON="$(node "$RELEASE_DIR/scripts/certs/generate-nginx-mtls.js" --install-root "$RELEASE_DIR" --output-dir "$CERT_DIR" --client-name "$CLIENT_NAME" --client-p12-password "$(json_get "$CONFIG_PATH" mtls.clientP12Password '')")"
    fi
fi

install -m 0600 "$CONFIG_PATH" "$CONFIG_DIR/install.config.json"

AUTH_ENABLED="$(to_bool "$(json_get "$CONFIG_PATH" auth.enabled true)")"
TLS_ENABLED=false; PROXY_MODE=off
[ "$TLS_MODE" = direct ] && TLS_ENABLED=true
[ "$TLS_MODE" = nginx ] && PROXY_MODE=nginx
cat > "$CONFIG_DIR/termlink.env" <<EOF
PORT=$(systemd_env_value "$(json_get "$CONFIG_PATH" port 3010)")
TERMLINK_BIND_HOST=$(systemd_env_value "$(json_get "$CONFIG_PATH" bindAddress 127.0.0.1)")
AUTH_ENABLED=$(systemd_env_value "$AUTH_ENABLED")
AUTH_USER=$(systemd_env_value "$(json_get "$CONFIG_PATH" auth.user admin)")
AUTH_PASS=$(systemd_env_value "$(json_get "$CONFIG_PATH" auth.pass '')")
TERMLINK_PRIVILEGE_MODE="standard"
TERMLINK_ELEVATED_ENABLE="false"
TERMLINK_ELEVATED_AUDIT_PATH=$(systemd_env_value "$DATA_DIR/logs/elevated-audit.log")
SESSION_PERSIST_ENABLED="true"
SESSION_PERSIST_PATH=$(systemd_env_value "$DATA_DIR/data/sessions.json")
TERMLINK_TLS_ENABLED=$(systemd_env_value "$TLS_ENABLED")
TERMLINK_TLS_CERT=$(systemd_env_value "$SERVER_CERT")
TERMLINK_TLS_KEY=$(systemd_env_value "$SERVER_KEY")
TERMLINK_TLS_CA=$(systemd_env_value "$CA_CERT")
TERMLINK_TLS_CLIENT_CERT=$(systemd_env_value "$(json_get "$CONFIG_PATH" tls.clientCertPolicy none)")
TERMLINK_TLS_PROXY_MODE=$(systemd_env_value "$PROXY_MODE")
TERMLINK_TLS_PROXY_SECRET=$(systemd_env_value "$(json_get "$CONFIG_PATH" tls.proxySecret '')")
EOF
chown root:"$RUN_GROUP" "$CONFIG_DIR/termlink.env" "$CONFIG_DIR/install.config.json"
chmod 0640 "$CONFIG_DIR/termlink.env" "$CONFIG_DIR/install.config.json"
chown -R root:"$RUN_GROUP" "$CONFIG_DIR/certs"
find "$CONFIG_DIR/certs" -type d -exec chmod 0750 {} +
find "$CONFIG_DIR/certs" -type f -name '*.key' -exec chmod 0640 {} +
find "$CONFIG_DIR/certs" -type f ! -name '*.key' -exec chmod 0644 {} +
find "$CONFIG_DIR/certs" -type f -name '*password.txt' -exec chmod 0640 {} +

NODE_PATH="$(command -v node)"
cat > "$UNIT_PATH" <<EOF
[Unit]
Description=TermLink server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$CURRENT_LINK
Environment=NODE_ENV=production
EnvironmentFile=$CONFIG_DIR/termlink.env
ExecStart=$NODE_PATH src/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

if [ "$TLS_MODE" = nginx ]; then
    PROXY_SECRET="$(json_get "$CONFIG_PATH" tls.proxySecret '')"
    LISTEN_PORT="$(json_get "$CONFIG_PATH" nginx.listenPort 443)"
    CLIENT_VERIFY=off
    [ "$MTLS_DEPLOYMENT" != none ] && CLIENT_VERIFY=on
    install -d -m 0755 "$(dirname "$NGINX_CONFIG")"
    CLIENT_CA_DIRECTIVE=""
    [ "$MTLS_DEPLOYMENT" != none ] && CLIENT_CA_DIRECTIVE="    ssl_client_certificate $CA_CERT;"
    cat > "$NGINX_CONFIG" <<EOF
server {
    listen $LISTEN_PORT ssl;
    server_name $(json_get "$CONFIG_PATH" publicHost _);
    ssl_certificate $SERVER_CERT;
    ssl_certificate_key $SERVER_KEY;
$CLIENT_CA_DIRECTIVE
    ssl_verify_client $CLIENT_VERIFY;

    location / {
        proxy_pass http://127.0.0.1:$(json_get "$CONFIG_PATH" port 3010);
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-SSL-Client-Verify \$ssl_client_verify;
        proxy_set_header X-TermLink-Proxy-Tls-Secret "$PROXY_SECRET";
    }
}
EOF
    nginx -t
fi

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
systemctl daemon-reload
if [ "$(to_bool "$(json_get "$CONFIG_PATH" autoStart true)")" = true ]; then systemctl enable "$SERVICE_NAME.service"; fi
systemctl restart "$SERVICE_NAME.service"
[ "$TLS_MODE" = nginx ] && systemctl restart nginx
sleep 3
node "$RELEASE_DIR/scripts/certs/installer-health-check.js" --install-root "$RELEASE_DIR" --config "$CONFIG_DIR/install.config.json" --timeout 12

trap - ERR
echo
echo '=== TermLink installation complete ==='
printf 'Release       : %s\n' "$RELEASE_DIR"
printf 'Current       : %s\n' "$CURRENT_LINK"
printf 'Configuration : %s\n' "$CONFIG_DIR/install.config.json"
printf 'Environment   : %s\n' "$CONFIG_DIR/termlink.env"
printf 'Data          : %s\n' "$DATA_DIR"
printf 'Service       : %s.service\n' "$SERVICE_NAME"
printf 'Systemd unit  : %s\n' "$UNIT_PATH"
[ "$TLS_MODE" = off ] && printf 'URL           : http://%s:%s\n' "$(json_get "$CONFIG_PATH" publicHost localhost)" "$(json_get "$CONFIG_PATH" port 3010)"
[ "$TLS_MODE" = direct ] && printf 'URL           : https://%s:%s\n' "$(json_get "$CONFIG_PATH" publicHost localhost)" "$(json_get "$CONFIG_PATH" port 3010)"
[ "$TLS_MODE" = nginx ] && printf 'URL           : https://%s:%s\n' "$(json_get "$CONFIG_PATH" publicHost localhost)" "$(json_get "$CONFIG_PATH" nginx.listenPort 443)"
[ "$TLS_MODE" = nginx ] && printf 'Nginx config  : %s\n' "$NGINX_CONFIG"
if [ "$MTLS_DEPLOYMENT" != none ]; then
    printf 'Client PEM/P12: %s\n' "$CLIENT_DIR"
    printf 'Public CA     : %s\n' "$CA_CERT"
    PASSWORD_PATH="$(json_value "$MTLS_JSON" clientPasswordPath "$CLIENT_DIR/$CLIENT_BASENAME-password.txt")"
    printf 'P12 password  : %s\n' "$PASSWORD_PATH"
fi
printf 'Logs          : journalctl -u %s.service -n 100 --no-pager\n' "$SERVICE_NAME"
