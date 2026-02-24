function normalizeIp(ip) {
    if (!ip) {
        return 'unknown';
    }

    const value = String(ip).trim();
    if (value.startsWith('::ffff:')) {
        return value.slice(7);
    }
    return value;
}

function parseIpv4(ip) {
    const segments = ip.split('.');
    if (segments.length !== 4) {
        return null;
    }

    let value = 0;
    for (const segment of segments) {
        if (!/^\d+$/.test(segment)) {
            return null;
        }
        const part = Number.parseInt(segment, 10);
        if (part < 0 || part > 255) {
            return null;
        }
        value = (value << 8) | part;
    }
    return value >>> 0;
}

function isIpv4InCidr(ip, cidr) {
    const [networkIp, prefixRaw] = cidr.split('/');
    if (!networkIp || prefixRaw === undefined) {
        return false;
    }

    const ipInt = parseIpv4(ip);
    const networkInt = parseIpv4(networkIp);
    const prefix = Number.parseInt(prefixRaw, 10);
    if (ipInt === null || networkInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        return false;
    }

    const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
    return (ipInt & mask) === (networkInt & mask);
}

function isIpAllowed(ip, allowedIps = []) {
    if (!Array.isArray(allowedIps) || allowedIps.length === 0) {
        return true;
    }

    const normalizedIp = normalizeIp(ip);
    return allowedIps.some((rawRule) => {
        const rule = String(rawRule || '').trim();
        if (!rule) {
            return false;
        }
        if (rule === '*') {
            return true;
        }
        if (rule.includes('/')) {
            return isIpv4InCidr(normalizedIp, rule);
        }
        return normalizeIp(rule) === normalizedIp;
    });
}

module.exports = {
    isIpAllowed,
    normalizeIp
};
