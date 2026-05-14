#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=""
while [ "$#" -gt 0 ]; do
    case "$1" in
        --config)
            CONFIG_PATH="${2:-}"
            [ -n "$CONFIG_PATH" ] || { echo "--config requires a path" >&2; exit 2; }
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
ensure_systemd_supported
SOURCE_ROOT="$(resolve_termlink_root)"
RESOLVED_CONFIG_PATH="$(resolve_config_path "$SOURCE_ROOT" "$CONFIG_PATH")"
validate_install_config "$RESOLVED_CONFIG_PATH"
sudo_cmd systemctl disable "$(service_unit_name "$RESOLVED_CONFIG_PATH")"
printf 'Disabled startup service: %s\n' "$(service_unit_name "$RESOLVED_CONFIG_PATH")"
