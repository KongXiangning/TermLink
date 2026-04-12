const os = require('os');

function withWindowsPtyOptions(baseOptions = {}, platform = os.platform()) {
    const options = { ...baseOptions };
    if (platform === 'win32') {
        if (options.useConpty === undefined) {
            options.useConpty = true;
        }
        if (options.useConptyDll === undefined) {
            options.useConptyDll = true;
        }
    }
    return options;
}

module.exports = {
    withWindowsPtyOptions
};
