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
INSTALL_ROOT="$(resolve_install_root "$SOURCE_ROOT" "$RESOLVED_CONFIG_PATH")"
node "$INSTALL_ROOT/scripts/certs/installer-health-check.js" --install-root "$INSTALL_ROOT" --config "$RESOLVED_CONFIG_PATH" --timeout "$TIMEOUT_SEC"
