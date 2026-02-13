const auth = require('basic-auth');

const adminUser = {
    name: process.env.AUTH_USER || 'admin',
    pass: process.env.AUTH_PASS || 'admin'
};

module.exports = function (req, res, next) {
    if (process.env.AUTH_ENABLED === 'false') return next();
    const user = auth(req);

    if (!user || user.name !== adminUser.name || user.pass !== adminUser.pass) {
        res.set('WWW-Authenticate', 'Basic realm="TermLink"');
        return res.status(401).send();
    }
    return next();
};
