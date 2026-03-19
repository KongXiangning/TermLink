const PRIVILEGE_MODES = {
    STANDARD: 'standard',
    ELEVATED: 'elevated'
};

function readEnv(primaryKey, fallbackKey) {
    const primary = process.env[primaryKey];
    if (primary !== undefined) {
        return primary;
    }
    if (!fallbackKey) {
        return undefined;
    }
    return process.env[fallbackKey];
}

function parseBoolean(rawValue, defaultValue = false) {
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
        return defaultValue;
    }
    return String(rawValue).toLowerCase() === 'true';
}

function parseCsv(rawValue) {
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
        return [];
    }

    return String(rawValue)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizePrivilegeMode(rawMode) {
    if (!rawMode) {
        return PRIVILEGE_MODES.STANDARD;
    }

    const normalized = String(rawMode).trim().toLowerCase();
    if (normalized === PRIVILEGE_MODES.STANDARD || normalized === PRIVILEGE_MODES.ELEVATED) {
        return normalized;
    }

    console.warn(`[Security] Invalid privilege mode "${rawMode}", fallback to "${PRIVILEGE_MODES.STANDARD}".`);
    return PRIVILEGE_MODES.STANDARD;
}

function parsePrivilegeConfig() {
    const privilegeMode = normalizePrivilegeMode(
        readEnv('TERMLINK_PRIVILEGE_MODE', 'PRIVILEGE_MODE')
    );
    const elevatedEnabled = parseBoolean(
        readEnv('TERMLINK_ELEVATED_ENABLE', 'PRIVILEGE_ELEVATED_ENABLE'),
        false
    );
    const requireMtls = parseBoolean(
        readEnv('TERMLINK_ELEVATED_REQUIRE_MTLS', 'PRIVILEGE_REQUIRE_MTLS'),
        false
    );
    const auditPath = readEnv('TERMLINK_ELEVATED_AUDIT_PATH', 'PRIVILEGE_AUDIT_PATH')
        || './logs/elevated-audit.log';
    const allowedIps = parseCsv(
        readEnv('TERMLINK_ELEVATED_ALLOWED_IPS', 'PRIVILEGE_ALLOWED_IPS')
    );

    return {
        privilegeMode,
        mode: privilegeMode,
        isElevated: privilegeMode === PRIVILEGE_MODES.ELEVATED,
        elevatedEnabled,
        requireMtls,
        auditPath,
        allowedIps
    };
}

function validateElevatedEnabled(config) {
    if (!config || !config.isElevated) {
        return { valid: true };
    }

    if (!config.elevatedEnabled) {
        return {
            valid: false,
            message: 'Elevated mode requires TERMLINK_ELEVATED_ENABLE=true.'
        };
    }

    return { valid: true };
}

module.exports = {
    parsePrivilegeConfig,
    validateElevatedEnabled,
    PRIVILEGE_MODES
};
