const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { parseTlsConfig, validateTlsConfig } = require('./tlsConfig');

function parseAuthEnabled() {
    const raw = process.env.AUTH_ENABLED;
    if (raw === undefined) {
        return true;
    }
    return String(raw).toLowerCase() !== 'false';
}

function isWeakCredential(user, pass) {
    const normalizedUser = String(user || '').trim().toLowerCase();
    const normalizedPass = String(pass || '').trim();
    return (
        !normalizedUser
        || !normalizedPass
        || (normalizedUser === 'admin' && normalizedPass === 'admin')
        || normalizedPass.toLowerCase() === 'change_me_to_strong_password'
    );
}

function isStrongPassword(pass) {
    const value = String(pass || '');
    if (value.length < 8) {
        return false;
    }

    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    return hasLetter && hasNumber;
}

function checkAuditPathWritable(auditPath) {
    if (!auditPath || String(auditPath).trim() === '') {
        return {
            passed: false,
            message: 'TERMLINK_ELEVATED_AUDIT_PATH is required.'
        };
    }

    const resolvedPath = path.resolve(auditPath);
    const dir = path.dirname(resolvedPath);

    try {
        fs.mkdirSync(dir, { recursive: true });
        const fd = fs.openSync(resolvedPath, 'a');
        fs.closeSync(fd);
        return { passed: true };
    } catch (error) {
        return {
            passed: false,
            message: `Audit path is not writable: ${resolvedPath} (${error.message})`
        };
    }
}

function checkMtlsGate(requireMtls) {
    if (!requireMtls) {
        return { passed: true };
    }

    const tlsConfig = parseTlsConfig();
    if (!tlsConfig.enabled) {
        return {
            passed: false,
            message: 'TERMLINK_ELEVATED_REQUIRE_MTLS=true requires TERMLINK_TLS_ENABLED=true.'
        };
    }

    if (tlsConfig.clientCertPolicy !== 'require') {
        return {
            passed: false,
            message: 'TERMLINK_ELEVATED_REQUIRE_MTLS=true requires TERMLINK_TLS_CLIENT_CERT=require.'
        };
    }

    const tlsValidation = validateTlsConfig(tlsConfig);
    if (!tlsValidation.valid) {
        return {
            passed: false,
            message: `TERMLINK_ELEVATED_REQUIRE_MTLS=true requires readable TLS cert/key and client CA. ${tlsValidation.errors[0]}`
        };
    }

    return { passed: true };
}

function checkProcessPrivileges(hasRequiredPrivileges) {
    const effectiveHasRequiredPrivileges = hasRequiredPrivileges === undefined
        ? detectRequiredProcessPrivileges()
        : Boolean(hasRequiredPrivileges);
    return {
        passed: effectiveHasRequiredPrivileges,
        message: effectiveHasRequiredPrivileges
            ? 'Process privilege check passed.'
            : 'Elevated mode requires the service process to run with administrator/root privileges.'
    };
}

function detectRequiredProcessPrivileges() {
    if (process.platform === 'win32') {
        try {
            const output = childProcess.execFileSync(
                'powershell.exe',
                [
                    '-NoProfile',
                    '-NonInteractive',
                    '-Command',
                    '([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
                ],
                {
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'pipe']
                }
            );
            return String(output || '').trim().toLowerCase() === 'true';
        } catch (error) {
            return false;
        }
    }

    if (typeof process.getuid === 'function') {
        return process.getuid() === 0;
    }

    return false;
}

function runSecurityGates({ authEnabled, authUser, authPass, auditPath, requireMtls, hasRequiredPrivileges } = {}) {
    const checks = [];

    const privilegeCheck = checkProcessPrivileges(hasRequiredPrivileges);
    checks.push({
        code: 'PROCESS_PRIVILEGE_REQUIRED',
        passed: privilegeCheck.passed,
        message: privilegeCheck.message
    });

    const effectiveAuthEnabled = authEnabled === undefined ? parseAuthEnabled() : Boolean(authEnabled);
    checks.push({
        code: 'AUTH_ENABLED_REQUIRED',
        passed: effectiveAuthEnabled,
        message: effectiveAuthEnabled
            ? 'AUTH is enabled.'
            : 'Elevated mode requires AUTH_ENABLED=true.'
    });

    const defaultCredentialCheckPassed = !isWeakCredential(authUser, authPass);
    checks.push({
        code: 'NON_DEFAULT_CREDENTIALS_REQUIRED',
        passed: defaultCredentialCheckPassed,
        message: defaultCredentialCheckPassed
            ? 'Credentials are non-default.'
            : 'Elevated mode requires non-default AUTH_USER/AUTH_PASS.'
    });

    const passwordStrengthPassed = isStrongPassword(authPass);
    checks.push({
        code: 'PASSWORD_STRENGTH_REQUIRED',
        passed: passwordStrengthPassed,
        message: passwordStrengthPassed
            ? 'Password strength check passed.'
            : 'AUTH_PASS must be at least 8 characters and include letters and numbers.'
    });

    const auditPathCheck = checkAuditPathWritable(auditPath);
    checks.push({
        code: 'AUDIT_PATH_WRITABLE',
        passed: auditPathCheck.passed,
        message: auditPathCheck.passed ? 'Audit path is writable.' : auditPathCheck.message
    });

    const mtlsCheck = checkMtlsGate(requireMtls);
    checks.push({
        code: 'MTLS_REQUIRED_CHECK',
        passed: mtlsCheck.passed,
        message: mtlsCheck.passed ? 'mTLS gate check passed.' : mtlsCheck.message
    });

    const failedCheck = checks.find((check) => !check.passed) || null;
    return {
        passed: !failedCheck,
        checks,
        failedCheck
    };
}

module.exports = {
    detectRequiredProcessPrivileges,
    runSecurityGates
};
