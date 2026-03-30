const fs = require('node:fs');
const path = require('node:path');

function setupTestI18n() {
    const translations = JSON.parse(fs.readFileSync(
        path.join(__dirname, '..', 'public', 'i18n', 'en.json'), 'utf8'
    ));
    const t = (key, params) => {
        let text = translations[key] || key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            }
        }
        return text;
    };
    globalThis.t = t;
    return t;
}

module.exports = { setupTestI18n };
