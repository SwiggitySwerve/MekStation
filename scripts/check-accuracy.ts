import * as fs from 'fs';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
console.log('Summary:', JSON.stringify(r.summary, null, 2));
console.log('\nAccuracy gates:', JSON.stringify(r.accuracyGates, null, 2));
