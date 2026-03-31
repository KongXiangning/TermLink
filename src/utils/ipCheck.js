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

function expandIpv6(ip) {
    let addr = ip.toLowerCase();
    // Handle :: expansion
    if (addr.includes('::')) {
        const parts = addr.split('::');
        if (parts.length > 2) {
            return null;
        }
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        const missing = 8 - left.length - right.length;
        if (missing < 0) {
            return null;
        }
        const middle = Array(missing).fill('0000');
        const full = [...left, ...middle, ...right];
        for (const g of full) {
            if (g && !/^[0-9a-f]{1,4}$/.test(g)) {
                return null;
            }
        }
        return full.map((g) => g.padStart(4, '0')).join(':');
    }

    const groups = addr.split(':');
    if (groups.length !== 8) {
        return null;
    }
    for (const g of groups) {
        if (!/^[0-9a-f]{1,4}$/.test(g)) {
            return null;
        }
    }
    return groups.map((g) => g.padStart(4, '0')).join(':');
}

function parseIpv6ToBigInt(ip) {
    const expanded = expandIpv6(ip);
    if (!expanded) {
        return null;
    }

    const groups = expanded.split(':');
    if (groups.length !== 8) {
        return null;
    }

    let value = 0n;
    for (const group of groups) {
        if (!/^[0-9a-f]{4}$/.test(group)) {
            return null;
        }
        value = (value << 16n) | BigInt(parseInt(group, 16));
    }
    return value;
}

function isIpv6InCidr(ip, cidr) {
    const [networkIp, prefixRaw] = cidr.split('/');
    if (!networkIp || prefixRaw === undefined) {
        return false;
    }

    const prefix = Number.parseInt(prefixRaw, 10);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
        return false;
    }

    const ipInt = parseIpv6ToBigInt(ip);
    const networkInt = parseIpv6ToBigInt(networkIp);
    if (ipInt === null || networkInt === null) {
        return false;
    }

    if (prefix === 0) {
        return true;
    }

    const shift = BigInt(128 - prefix);
    const mask = ((1n << 128n) - 1n) >> shift << shift;
    return (ipInt & mask) === (networkInt & mask);
}

function isIpv6(ip) {
    return ip.includes(':');
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
            // Determine if this is an IPv6 or IPv4 CIDR
            const networkPart = rule.split('/')[0];
            if (isIpv6(networkPart)) {
                return isIpv6(normalizedIp) && isIpv6InCidr(normalizedIp, rule);
            }
            return isIpv4InCidr(normalizedIp, rule);
        }
        // IPv6 exact match: normalize both sides to expanded form
        if (isIpv6(rule) && isIpv6(normalizedIp)) {
            const expandedIp = expandIpv6(normalizedIp);
            const expandedRule = expandIpv6(rule);
            if (expandedIp === null || expandedRule === null) {
                return false;
            }
            return expandedIp === expandedRule;
        }
        return normalizeIp(rule) === normalizedIp;
    });
}

module.exports = {
    isIpAllowed,
    normalizeIp
};
