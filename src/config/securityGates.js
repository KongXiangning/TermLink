const fs = require('fs');
const path = require('path');

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

    const mtlsEnabled = String(process.env.TERMLINK_MTLS_ENABLED || '').toLowerCase() === 'true';
    if (!mtlsEnabled) {
        return {
            passed: false,
            message: 'TERMLINK_ELEVATED_REQUIRE_MTLS=true requires TERMLINK_MTLS_ENABLED=true.'
        };
    }

    return { passed: true };
}

function runSecurityGates({ authEnabled, authUser, authPass, auditPath, requireMtls } = {}) {
    const checks = [];

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
    runSecurityGates
};
