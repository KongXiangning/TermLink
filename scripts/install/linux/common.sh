#!/usr/bin/env bash
set -euo pipefail

die() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

warn() {
    printf 'WARN: %s\n' "$*" >&2
}

resolve_script_dir() {
    local source="${BASH_SOURCE[0]}"
    local dir
    while [ -L "$source" ]; do
        dir="$(cd -P "$(dirname "$source")" >/dev/null 2>&1 && pwd)"
        source="$(readlink "$source")"
        [[ "$source" != /* ]] && source="$dir/$source"
    done
    cd -P "$(dirname "$source")" >/dev/null 2>&1 && pwd
}

SCRIPT_DIR="$(resolve_script_dir)"

resolve_termlink_root() {
    local current="$SCRIPT_DIR"
    while [ "$current" != "/" ]; do
        if [ -f "$current/package.json" ] && [ -f "$current/src/server.js" ]; then
            printf '%s\n' "$current"
            return 0
        fi
        current="$(dirname "$current")"
    done
    die "TermLink project root not found from: $SCRIPT_DIR"
}

require_node() {
    command -v node >/dev/null 2>&1 || die "Node.js not found in PATH. Install Node.js first."
}

resolve_config_path() {
    local source_root="$1"
    local config_path="${2:-}"

    if [ -n "$config_path" ]; then
        [ -f "$config_path" ] || die "Config file not found: $config_path"
        cd "$(dirname "$config_path")" >/dev/null 2>&1 && printf '%s/%s\n' "$(pwd)" "$(basename "$config_path")"
        return 0
    fi

    local candidate
    for candidate in \
        "$source_root/install.config.json" \
        "$source_root/termlink-install.config.json" \
        "$source_root/scripts/install/termlink-install.config.example.json"; do
        if [ -f "$candidate" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    die "No install config found. Copy scripts/install/termlink-install.config.example.json to install.config.json and edit it first."
}

json_get() {
    local config_path="$1"
    local expression="$2"
    local fallback="${3:-}"
    node - "$config_path" "$expression" "$fallback" <<'NODE'
const fs = require('fs');
const [configPath, expression, fallback] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const value = expression.split('.').reduce((current, key) => {
  if (current == null || !Object.prototype.hasOwnProperty.call(current, key)) return undefined;
  return current[key];
}, config);
if (value === undefined || value === null || value === '') {
  process.stdout.write(fallback);
} else if (typeof value === 'boolean') {
  process.stdout.write(value ? 'true' : 'false');
} else {
  process.stdout.write(String(value));
}
NODE
}

to_bool() {
    case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
        1|true|yes|on) printf 'true' ;;
        *) printf 'false' ;;
    esac
}

validate_install_config() {
    local config_path="$1"
    node - "$config_path" <<'NODE'
const fs = require('fs');
const configPath = process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const tls = config.tls || {};
const mtls = config.mtls || {};
const privilege = config.privilege || {};
const port = Number(config.port || 3010);
const serviceName = String(config.serviceName || 'termlink');
const mtlsDeployment = String(mtls.deployment || 'none');
const directServerGeneration = (() => {
  const raw = mtls.generateDirectServerCertificates;
  if (raw === undefined || raw === null || raw === '') return false;
  if (typeof raw === 'boolean') return raw;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
})();
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) fail('port must be between 1 and 65535.');
if (!/^[A-Za-z0-9_.@-]+$/.test(serviceName) || serviceName.includes('..')) {
  fail('serviceName must use only letters, numbers, dot, underscore, at-sign, or hyphen, and must not contain "..".');
}
if (!['off', 'direct', 'nginx'].includes(String(tls.mode || 'off'))) fail('tls.mode must be one of: off, direct, nginx.');
if (!['none', 'request', 'require'].includes(String(tls.clientCertPolicy || 'none'))) fail('tls.clientCertPolicy must be one of: none, request, require.');
if (!['none', 'direct-server', 'nginx'].includes(mtlsDeployment)) fail('mtls.deployment must be one of: none, direct-server, nginx.');
if (directServerGeneration && mtlsDeployment !== 'direct-server') fail('mtls.generateDirectServerCertificates can only be true when mtls.deployment is "direct-server".');
if (mtlsDeployment === 'direct-server' && String(tls.mode || 'off') !== 'direct') fail('mtls.deployment=direct-server requires tls.mode=direct.');
if (mtlsDeployment === 'direct-server' && !['request', 'require'].includes(String(tls.clientCertPolicy || 'none'))) {
  fail('mtls.deployment=direct-server requires tls.clientCertPolicy=request or require.');
}
if (!['standard', 'elevated'].includes(String(privilege.mode || 'standard'))) fail('privilege.mode must be one of: standard, elevated.');
const certDir = tls.certDir ?? './certs';
const envFields = [
  ['auth.user', config.auth?.user ?? 'admin'],
  ['auth.pass', config.auth?.pass ?? 'admin'],
  ['privilege.mode', privilege.mode ?? 'standard'],
  ['tls.certDir', certDir],
  ['tls.serverCert', tls.serverCert ?? `${certDir}/server.crt`],
  ['tls.serverKey', tls.serverKey ?? `${certDir}/server.key`],
  ['tls.caCert', tls.caCert ?? `${certDir}/client-ca.crt`],
  ['tls.clientCertPolicy', tls.clientCertPolicy ?? 'none'],
  ['tls.proxySecret', tls.proxySecret ?? '']
];
for (const [field, value] of envFields) {
  if (/[\r\n]/.test(String(value))) fail(`${field} must not contain newline characters for env file output.`);
}
NODE
}

resolve_runtime_path() {
    local install_root="$1"
    local configured_path="${2:-}"
    local fallback_path="$3"
    local candidate="$configured_path"
    if [ -z "${candidate// }" ]; then
        candidate="$fallback_path"
    fi
    if [[ "$candidate" = /* ]]; then
        printf '%s\n' "$candidate"
        return 0
    fi
    printf '%s\n' "$(cd "$install_root" >/dev/null 2>&1 && pwd)/$candidate"
}

json_value() {
    local json_input="$1"
    local expression="$2"
    local fallback="${3:-}"
    node - "$json_input" "$expression" "$fallback" <<'NODE'
const [jsonInput, expression, fallback] = process.argv.slice(2);
const payload = JSON.parse(jsonInput);
const value = expression.split('.').reduce((current, key) => {
  if (current == null || !Object.prototype.hasOwnProperty.call(current, key)) return undefined;
  return current[key];
}, payload);
if (value === undefined || value === null || value === '') {
  process.stdout.write(fallback);
} else if (typeof value === 'boolean') {
  process.stdout.write(value ? 'true' : 'false');
} else {
  process.stdout.write(String(value));
}
NODE
}

dotenv_env_value() {
    node - "$1" <<'NODE'
const value = String(process.argv[2] ?? '');
if (/[\r\n]/.test(value)) {
  console.error('dotenv values must not contain newline characters.');
  process.exit(1);
}
process.stdout.write(`'${value}'`);
NODE
}

systemd_env_value() {
    node - "$1" <<'NODE'
const value = String(process.argv[2] ?? '');
if (/[\r\n]/.test(value)) {
  console.error('EnvironmentFile values must not contain newline characters.');
  process.exit(1);
}
process.stdout.write(`"${value.replace(/[`"\\$]/g, '\\$&')}"`);
NODE
}

require_systemd_safe_path() {
    local label="$1"
    local value="$2"
    case "$value" in
        *[[:space:]]*)
            die "$label contains whitespace, which is not supported by the current Linux systemd release installer: $value"
            ;;
    esac
}

resolve_install_root() {
    local source_root="$1"
    local config_path="$2"
    local configured_dir
    configured_dir="$(json_get "$config_path" installDir '')"

    if [ -z "${configured_dir// }" ]; then
        printf '%s\n' "$source_root"
        return 0
    fi

    local candidate="$configured_dir"
    if [[ "$candidate" != /* ]]; then
        candidate="$source_root/$candidate"
    fi
    [ -d "$candidate" ] || die "installDir does not exist: $candidate"

    local resolved
    resolved="$(cd "$candidate" >/dev/null 2>&1 && pwd)"
    [ -f "$resolved/package.json" ] && [ -f "$resolved/src/server.js" ] || \
        die "installDir must point to an extracted TermLink application root containing package.json and src/server.js: $resolved"
    printf '%s\n' "$resolved"
}

service_name() {
    json_get "$1" serviceName termlink
}

service_unit_name() {
    printf '%s.service\n' "$(service_name "$1")"
}

health_url() {
    local config_path="$1"
    local tls_mode port scheme
    tls_mode="$(json_get "$config_path" tls.mode off)"
    port="$(json_get "$config_path" port 3010)"
    if [ "$tls_mode" = "direct" ]; then
        scheme="https"
    else
        scheme="http"
    fi
    printf '%s://localhost:%s/api/health\n' "$scheme" "$port"
}

ensure_systemd_supported() {
    command -v systemctl >/dev/null 2>&1 || die "systemctl not found. Linux release auto-start is supported only on systemd hosts. Fallback: run scripts/install/linux/start.sh --foreground manually."
    [ -d /run/systemd/system ] || die "systemd runtime not detected. Linux release auto-start is supported only on systemd hosts. Fallback: run scripts/install/linux/start.sh --foreground manually."
}

sudo_cmd() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    else
        command -v sudo >/dev/null 2>&1 || die "sudo not found. Re-run as root or install sudo for systemd service changes."
        sudo "$@"
    fi
}

write_termlink_env() {
    local install_root="$1"
    local config_path="$2"
    local tls_mode tls_enabled proxy_mode cert_dir server_cert server_key ca_cert proxy_secret auth_enabled

    tls_mode="$(json_get "$config_path" tls.mode off)"
    if [ "$tls_mode" = "direct" ]; then tls_enabled="true"; else tls_enabled="false"; fi
    if [ "$tls_mode" = "nginx" ]; then proxy_mode="nginx"; else proxy_mode="off"; fi
    cert_dir="$(json_get "$config_path" tls.certDir ./certs)"
    server_cert="$(json_get "$config_path" tls.serverCert "$cert_dir/server.crt")"
    server_key="$(json_get "$config_path" tls.serverKey "$cert_dir/server.key")"
    ca_cert="$(json_get "$config_path" tls.caCert "$cert_dir/client-ca.crt")"
    proxy_secret="$(json_get "$config_path" tls.proxySecret '')"
    auth_enabled="$(to_bool "$(json_get "$config_path" auth.enabled true)")"

    (
        umask 077
        cat > "$install_root/.env" <<EOF
# Generated by TermLink Linux release installer.
PORT=$(dotenv_env_value "$(json_get "$config_path" port 3010)")
AUTH_ENABLED=$(dotenv_env_value "$auth_enabled")
AUTH_USER=$(dotenv_env_value "$(json_get "$config_path" auth.user admin)")
AUTH_PASS=$(dotenv_env_value "$(json_get "$config_path" auth.pass admin)")
TERMLINK_SERVICE_NAME=$(dotenv_env_value "$(service_name "$config_path")")
TERMLINK_PRIVILEGE_MODE=$(dotenv_env_value "$(json_get "$config_path" privilege.mode standard)")
TERMLINK_ELEVATED_ENABLE=$(dotenv_env_value "$(to_bool "$(json_get "$config_path" privilege.elevatedEnable false)")")
TERMLINK_ELEVATED_AUDIT_PATH=$(dotenv_env_value "./logs/elevated-audit.log")
SESSION_PERSIST_ENABLED=$(dotenv_env_value "true")
SESSION_PERSIST_PATH=$(dotenv_env_value "./data/sessions.json")
TERMLINK_TLS_ENABLED=$(dotenv_env_value "$tls_enabled")
TERMLINK_TLS_CERT=$(dotenv_env_value "$server_cert")
TERMLINK_TLS_KEY=$(dotenv_env_value "$server_key")
TERMLINK_TLS_CA=$(dotenv_env_value "$ca_cert")
TERMLINK_TLS_CLIENT_CERT=$(dotenv_env_value "$(json_get "$config_path" tls.clientCertPolicy none)")
TERMLINK_TLS_PROXY_MODE=$(dotenv_env_value "$proxy_mode")
TERMLINK_TLS_PROXY_SECRET=$(dotenv_env_value "$proxy_secret")
EOF

        cat > "$install_root/.env.systemd" <<EOF
# Generated by TermLink Linux release installer for systemd EnvironmentFile.
PORT=$(systemd_env_value "$(json_get "$config_path" port 3010)")
AUTH_ENABLED=$(systemd_env_value "$auth_enabled")
AUTH_USER=$(systemd_env_value "$(json_get "$config_path" auth.user admin)")
AUTH_PASS=$(systemd_env_value "$(json_get "$config_path" auth.pass admin)")
TERMLINK_SERVICE_NAME=$(systemd_env_value "$(service_name "$config_path")")
TERMLINK_PRIVILEGE_MODE=$(systemd_env_value "$(json_get "$config_path" privilege.mode standard)")
TERMLINK_ELEVATED_ENABLE=$(systemd_env_value "$(to_bool "$(json_get "$config_path" privilege.elevatedEnable false)")")
TERMLINK_ELEVATED_AUDIT_PATH=$(systemd_env_value "./logs/elevated-audit.log")
SESSION_PERSIST_ENABLED=$(systemd_env_value "true")
SESSION_PERSIST_PATH=$(systemd_env_value "./data/sessions.json")
TERMLINK_TLS_ENABLED=$(systemd_env_value "$tls_enabled")
TERMLINK_TLS_CERT=$(systemd_env_value "$server_cert")
TERMLINK_TLS_KEY=$(systemd_env_value "$server_key")
TERMLINK_TLS_CA=$(systemd_env_value "$ca_cert")
TERMLINK_TLS_CLIENT_CERT=$(systemd_env_value "$(json_get "$config_path" tls.clientCertPolicy none)")
TERMLINK_TLS_PROXY_MODE=$(systemd_env_value "$proxy_mode")
TERMLINK_TLS_PROXY_SECRET=$(systemd_env_value "$proxy_secret")
EOF
    )
    chmod 600 "$install_root/.env" "$install_root/.env.systemd"
}

init_runtime_dirs() {
    local install_root="$1"
    local config_path="$2"
    local cert_dir mtls_deployment generate_direct server_output_dir client_output_dir
    cert_dir="$(json_get "$config_path" tls.certDir ./certs)"
    mkdir -p "$install_root/data" "$install_root/logs" "$(resolve_runtime_path "$install_root" "$cert_dir" ./certs)"

    mtls_deployment="$(json_get "$config_path" mtls.deployment none)"
    generate_direct="$(to_bool "$(json_get "$config_path" mtls.generateDirectServerCertificates false)")"
    if [ "$mtls_deployment" = "direct-server" ] || [ "$generate_direct" = "true" ]; then
        server_output_dir="$(resolve_runtime_path "$install_root" "$(json_get "$config_path" mtls.serverOutputDir "$cert_dir")" ./certs)"
        client_output_dir="$(resolve_runtime_path "$install_root" "$(json_get "$config_path" mtls.clientOutputDir "$cert_dir/clients")" ./certs/clients)"
        mkdir -p "$server_output_dir" "$client_output_dir"
    fi
}

render_systemd_unit() {
    local install_root="$1"
    local config_path="$2"
    local node_path user group service
    node_path="$(command -v node)"
    user="${TERMLINK_RUN_USER:-$(id -un)}"
    group="${TERMLINK_RUN_GROUP:-$(id -gn)}"
    service="$(service_name "$config_path")"

    require_systemd_safe_path "installDir" "$install_root"
    require_systemd_safe_path "Node.js path" "$node_path"

    cat <<EOF
[Unit]
Description=TermLink release service ($service)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$user
Group=$group
WorkingDirectory=$install_root
Environment=NODE_ENV=production
EnvironmentFile=$install_root/.env.systemd
ExecStart=$node_path src/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

systemd_unit_path() {
    printf '/etc/systemd/system/%s\n' "$(service_unit_name "$1")"
}

install_node_dependencies_if_needed() {
    local install_root="$1"
    if [ ! -d "$install_root/node_modules" ]; then
        command -v npm >/dev/null 2>&1 || die "npm not found and node_modules is missing. Install npm or prepack dependencies first."
        (cd "$install_root" && npm install --omit=dev)
    fi
}

generate_direct_mtls_artifacts() {
    local install_root="$1"
    local config_path="$2"
    local helper_path="$install_root/scripts/certs/generate-direct-mtls.js"
    [ -f "$helper_path" ] || die "Direct mTLS helper not found: $helper_path"
    node "$helper_path" --mode generate --install-root "$install_root" --config "$config_path"
}
