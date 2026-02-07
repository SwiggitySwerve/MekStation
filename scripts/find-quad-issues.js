const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));

// Find quad mechs with issues
const quads = r.allResults.filter(u => {
  const b = u.breakdown || {};
  return b.configuration && b.configuration.toLowerCase().includes('quad') && Math.abs(u.percentDiff) > 1;
});

console.log('Quad mechs >1% off:', quads.length);
quads.sort((a,b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));
for (const u of quads) {
  const b = u.breakdown || {};
  console.log(u.chassis + ' ' + u.model + ' diff=' + u.difference + ' (' + u.percentDiff.toFixed(1) + '%) tech=' + b.techBase);
}

// Check for units that have ammo issues (crit-based ammo not matching)
console.log('\n--- Non-quad undercalculated units with issues array ---');
const issueUnits = r.allResults.filter(u => {
  return u.issues && u.issues.length > 0 && Math.abs(u.percentDiff) > 1 && Math.abs(u.percentDiff) <= 5;
});
console.log('Units with issues:', issueUnits.length);
const issueCounts = {};
for (const u of issueUnits) {
  for (const iss of u.issues) {
    issueCounts[iss] = (issueCounts[iss] || 0) + 1;
  }
}
console.log('Issue types:', JSON.stringify(issueCounts, null, 2));
