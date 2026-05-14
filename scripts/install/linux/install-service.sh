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
INSTALL_ROOT="$(resolve_install_root "$SOURCE_ROOT" "$RESOLVED_CONFIG_PATH")"
SERVICE_NAME="$(service_name "$RESOLVED_CONFIG_PATH")"
UNIT_PATH="$(systemd_unit_path "$RESOLVED_CONFIG_PATH")"

printf '=== TermLink Linux Release Installer ===\n'
printf 'Source root : %s\n' "$SOURCE_ROOT"
printf 'Install dir : %s\n' "$INSTALL_ROOT"
printf 'Config      : %s\n' "$RESOLVED_CONFIG_PATH"
printf 'Service     : %s\n' "$SERVICE_NAME"

write_termlink_env "$INSTALL_ROOT" "$RESOLVED_CONFIG_PATH"
init_runtime_dirs "$INSTALL_ROOT" "$RESOLVED_CONFIG_PATH"
install_node_dependencies_if_needed "$INSTALL_ROOT"

render_systemd_unit "$INSTALL_ROOT" "$RESOLVED_CONFIG_PATH" > "$INSTALL_ROOT/${SERVICE_NAME}.service"
sudo_cmd install -m 0644 "$INSTALL_ROOT/${SERVICE_NAME}.service" "$UNIT_PATH"
sudo_cmd systemctl daemon-reload

if [ "$(to_bool "$(json_get "$RESOLVED_CONFIG_PATH" autoStart true)")" = "true" ]; then
    sudo_cmd systemctl enable "$(service_unit_name "$RESOLVED_CONFIG_PATH")"
    AUTO_START_STATUS="enabled"
else
    sudo_cmd systemctl disable "$(service_unit_name "$RESOLVED_CONFIG_PATH")" >/dev/null 2>&1 || true
    AUTO_START_STATUS="disabled by config"
fi

sudo_cmd systemctl restart "$(service_unit_name "$RESOLVED_CONFIG_PATH")"

sleep 3
if bash "$SCRIPT_DIR/test-health.sh" --config "$RESOLVED_CONFIG_PATH" >/tmp/termlink-health-check.$$ 2>&1; then
    HEALTH_STATUS="$(cat /tmp/termlink-health-check.$$)"
else
    HEALTH_STATUS="FAILED: $(cat /tmp/termlink-health-check.$$)"
fi
rm -f /tmp/termlink-health-check.$$

printf '\n=== Installation Result ===\n'
printf 'Install dir : %s\n' "$INSTALL_ROOT"
printf 'Config file : %s\n' "$RESOLVED_CONFIG_PATH"
printf 'Env file    : %s\n' "$INSTALL_ROOT/.env"
printf 'Systemd env : %s\n' "$INSTALL_ROOT/.env.systemd"
printf 'Unit file   : %s\n' "$UNIT_PATH"
printf 'Service     : %s\n' "$SERVICE_NAME"
printf 'Auto-start  : %s\n' "$AUTO_START_STATUS"
printf 'Health URL  : %s\n' "$(health_url "$RESOLVED_CONFIG_PATH")"
printf 'Health      : %s\n' "$HEALTH_STATUS"
printf 'Logs        : journalctl -u %s -n 100 --no-pager\n' "$(service_unit_name "$RESOLVED_CONFIG_PATH")"
