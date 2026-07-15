#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
CONFIG_PATH=""
NON_INTERACTIVE=false
DRY_RUN=false

usage() {
    cat <<'EOF'
Usage: ./install.sh [--config FILE --non-interactive] [--dry-run]

Without --non-interactive, TermLink asks for every required setting.
The installer supports Debian/Ubuntu hosts using systemd on amd64 or arm64.
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --config) CONFIG_PATH="${2:-}"; shift 2 ;;
        --non-interactive) NON_INTERACTIVE=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) printf 'Unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
    esac
done

[ "$(uname -s)" = "Linux" ] || { echo 'TermLink Linux installer must run on Linux.' >&2; exit 1; }
case "$(uname -m)" in x86_64|aarch64|arm64) ;; *) echo 'Only amd64 and arm64 are supported.' >&2; exit 1 ;; esac
[ -r /etc/os-release ] || { echo '/etc/os-release is required.' >&2; exit 1; }
. /etc/os-release
case "${ID:-}:${ID_LIKE:-}" in debian:*|ubuntu:*|*:debian*) ;; *) echo 'Only Debian and Ubuntu are supported.' >&2; exit 1 ;; esac
command -v systemctl >/dev/null 2>&1 || { echo 'systemd is required.' >&2; exit 1; }

as_root() {
    if [ "$(id -u)" -eq 0 ]; then "$@"; else command -v sudo >/dev/null 2>&1 || { echo 'sudo is required.' >&2; exit 1; }; sudo "$@"; fi
}

if [ "$DRY_RUN" = true ]; then
    echo 'Dry run: would ensure Node.js, npm, OpenSSL and native build dependencies with apt.'
    command -v node >/dev/null 2>&1 || { echo 'Node.js is needed to validate an interactive dry run.' >&2; exit 1; }
else
    as_root apt-get update
    as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm openssl curl ca-certificates build-essential python3 pkg-config
    NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
    if [ "$NODE_MAJOR" -lt 18 ]; then
        NODE_SETUP="$(mktemp)"
        curl -fsSL https://deb.nodesource.com/setup_22.x -o "$NODE_SETUP"
        as_root bash "$NODE_SETUP"
        rm -f "$NODE_SETUP"
        as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
    fi
fi

CONFIG_TMP="$(mktemp)"
trap 'rm -f "$CONFIG_TMP"' EXIT
WIZARD_ARGS=(--output "$CONFIG_TMP")
[ -n "$CONFIG_PATH" ] && WIZARD_ARGS+=(--config "$CONFIG_PATH")
[ "$NON_INTERACTIVE" = true ] && WIZARD_ARGS+=(--non-interactive)
node "$SOURCE_DIR/scripts/install/linux/installer-config.js" "${WIZARD_ARGS[@]}"

MODE="$(node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(c.tls.mode)" "$CONFIG_TMP")"
RUN_USER="$(node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(c.runUser)" "$CONFIG_TMP")"
id "$RUN_USER" >/dev/null 2>&1 || { echo "Service run user does not exist: $RUN_USER" >&2; exit 1; }
RUN_GROUP="$(id -gn "$RUN_USER")"
if [ "$MODE" = nginx ] && ! command -v nginx >/dev/null 2>&1; then
    if [ "$DRY_RUN" = true ]; then echo 'Dry run: would install nginx with apt.'; else as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx; fi
fi

if [ "$DRY_RUN" = true ]; then
    echo
    echo 'Configuration is valid. Planned locations:'
    node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(c.auth)c.auth.pass='<redacted>';if(c.tls)c.tls.proxySecret='<redacted>';if(c.mtls&&c.mtls.clientP12Password)c.mtls.clientP12Password='<redacted>';process.stdout.write(JSON.stringify(c,null,2)+'\\n')" "$CONFIG_TMP"
    exit 0
fi

INSTALL_ARGS=(--config "$CONFIG_TMP" --source "$SOURCE_DIR")
if [ "$(id -u)" -eq 0 ]; then
    TERMLINK_RUN_USER="$RUN_USER" TERMLINK_RUN_GROUP="$RUN_GROUP" bash "$SOURCE_DIR/scripts/install/linux/install-service.sh" "${INSTALL_ARGS[@]}"
else
    sudo TERMLINK_RUN_USER="$RUN_USER" TERMLINK_RUN_GROUP="$RUN_GROUP" bash "$SOURCE_DIR/scripts/install/linux/install-service.sh" "${INSTALL_ARGS[@]}"
fi
