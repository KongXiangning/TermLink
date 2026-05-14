#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=""
REMOVE_AUTOSTART="false"
while [ "$#" -gt 0 ]; do
    case "$1" in
        --config)
            CONFIG_PATH="${2:-}"
            [ -n "$CONFIG_PATH" ] || { echo "--config requires a path" >&2; exit 2; }
            shift 2
            ;;
        --remove-autostart)
            REMOVE_AUTOSTART="true"
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
ensure_systemd_supported

SOURCE_ROOT="$(resolve_termlink_root)"
RESOLVED_CONFIG_PATH="$(resolve_config_path "$SOURCE_ROOT" "$CONFIG_PATH")"
validate_install_config "$RESOLVED_CONFIG_PATH"
INSTALL_ROOT="$(resolve_install_root "$SOURCE_ROOT" "$RESOLVED_CONFIG_PATH")"
UNIT_NAME="$(service_unit_name "$RESOLVED_CONFIG_PATH")"
UNIT_PATH="$(systemd_unit_path "$RESOLVED_CONFIG_PATH")"

printf '=== TermLink Linux Release Uninstaller ===\n'
printf 'Install dir : %s\n' "$INSTALL_ROOT"
printf 'Service     : %s\n' "$(service_name "$RESOLVED_CONFIG_PATH")"

sudo_cmd systemctl stop "$UNIT_NAME" >/dev/null 2>&1 || true

if [ "$REMOVE_AUTOSTART" = "true" ]; then
    sudo_cmd systemctl disable "$UNIT_NAME" >/dev/null 2>&1 || true
fi

if [ -f "$UNIT_PATH" ]; then
    sudo_cmd rm -f "$UNIT_PATH"
    sudo_cmd systemctl daemon-reload
fi

printf '\n=== Uninstall Result ===\n'
printf 'Systemd unit removed: %s\n' "$UNIT_PATH"
printf 'Application files were not deleted.\n'
printf 'Use --remove-autostart to disable boot startup during uninstall.\n'

