#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=""
TIMEOUT_SEC="8"
while [ "$#" -gt 0 ]; do
    case "$1" in
        --config)
            CONFIG_PATH="${2:-}"
            [ -n "$CONFIG_PATH" ] || { echo "--config requires a path" >&2; exit 2; }
            shift 2
            ;;
        --timeout)
            TIMEOUT_SEC="${2:-}"
            [ -n "$TIMEOUT_SEC" ] || { echo "--timeout requires seconds" >&2; exit 2; }
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 2
            ;;
    esac
done

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)/common.sh"

require_node
SOURCE_ROOT="$(resolve_termlink_root)"
RESOLVED_CONFIG_PATH="$(resolve_config_path "$SOURCE_ROOT" "$CONFIG_PATH")"
URL="$(health_url "$RESOLVED_CONFIG_PATH")"
AUTH_ENABLED="$(to_bool "$(json_get "$RESOLVED_CONFIG_PATH" auth.enabled true)")"

if command -v curl >/dev/null 2>&1; then
    if [ "$AUTH_ENABLED" = "true" ]; then
        curl --fail --silent --show-error --max-time "$TIMEOUT_SEC" \
            --user "$(json_get "$RESOLVED_CONFIG_PATH" auth.user admin):$(json_get "$RESOLVED_CONFIG_PATH" auth.pass admin)" \
            "$URL" >/dev/null
    else
        curl --fail --silent --show-error --max-time "$TIMEOUT_SEC" "$URL" >/dev/null
    fi
    printf 'Health OK HTTP 200\n'
    exit 0
fi

node - "$RESOLVED_CONFIG_PATH" "$URL" "$TIMEOUT_SEC" <<'NODE'
const http = require('http');
const https = require('https');
const fs = require('fs');
const [configPath, url, timeoutSec] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const client = url.startsWith('https:') ? https : http;
const headers = {};
if ((config.auth?.enabled ?? true) !== false) {
  const user = config.auth?.user || 'admin';
  const pass = config.auth?.pass || 'admin';
  headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}
const req = client.get(url, { headers, timeout: Number(timeoutSec) * 1000 }, (res) => {
  res.resume();
  if (res.statusCode >= 200 && res.statusCode < 300) {
    console.log(`Health OK HTTP ${res.statusCode}`);
    process.exit(0);
  }
  console.error(`Health failed HTTP ${res.statusCode}`);
  process.exit(1);
});
req.on('timeout', () => req.destroy(new Error('health check timed out')));
req.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
NODE

