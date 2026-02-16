const auth = require('basic-auth');

const adminUser = {
    name: process.env.AUTH_USER || 'admin',
    pass: process.env.AUTH_PASS || 'admin'
};

// Security default: auth is ON unless explicitly disabled.
// Set AUTH_ENABLED=false for local/debug environments that do not require auth.
const isAuthEnabled = (() => {
    const raw = process.env.AUTH_ENABLED;
    if (raw === undefined) return true;
    return raw.toLowerCase() !== 'false';
})();

module.exports = function (req, res, next) {
    if (!isAuthEnabled) return next();
    const user = auth(req);

    if (!user || user.name !== adminUser.name || user.pass !== adminUser.pass) {
        res.set('WWW-Authenticate', 'Basic realm="TermLink"');
        return res.status(401).send();
    }
    return next();
};
