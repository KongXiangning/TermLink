const validator = require('./src/services/codexRuntimeValidator');
async function run() {
    console.log('Validating...');
    const res = await validator.validate();
    console.log('Result:', res);
}
run();
