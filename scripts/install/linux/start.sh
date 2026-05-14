#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=""
FOREGROUND="false"
while [ "$#" -gt 0 ]; do
    case "$1" in
        --config)
            CONFIG_PATH="${2:-}"
            [ -n "$CONFIG_PATH" ] || { echo "--config requires a path" >&2; exit 2; }
            shift 2
            ;;
        --foreground)
            FOREGROUND="true"
            shift
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
validate_install_config "$RESOLVED_CONFIG_PATH"
INSTALL_ROOT="$(resolve_install_root "$SOURCE_ROOT" "$RESOLVED_CONFIG_PATH")"

write_termlink_env "$INSTALL_ROOT" "$RESOLVED_CONFIG_PATH"
init_runtime_dirs "$INSTALL_ROOT" "$RESOLVED_CONFIG_PATH"

if [ "$FOREGROUND" = "true" ]; then
    install_node_dependencies_if_needed "$INSTALL_ROOT"
    cd "$INSTALL_ROOT"
    exec node src/server.js
fi

ensure_systemd_supported
sudo_cmd systemctl restart "$(service_unit_name "$RESOLVED_CONFIG_PATH")"
printf 'TermLink restarted via systemd: %s\n' "$(service_unit_name "$RESOLVED_CONFIG_PATH")"
