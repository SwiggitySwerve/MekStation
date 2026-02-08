const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {}
}

// Check units outside 1% where applying a 0.95 cockpit modifier would bring them within 1%
const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
console.log('=== Overcalculated units where 0.95 cockpit mod would fix ===\n');

let cockpitFixCount = 0;
for (const u of outside1) {
  if (u.percentDiff < 1) continue; // only check overcalculated
  const adjusted = Math.round(u.calculatedBV * 0.95);
  const adjDiff = ((adjusted - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(adjDiff) < 1) {
    const data = unitMap.get(u.unitId);
    const cockpit = data ? (data.cockpit || 'NOT SET') : 'UNKNOWN';
    console.log(`${u.chassis} ${u.model}: calc=${u.calculatedBV} ref=${u.indexBV} cur=${u.percentDiff.toFixed(2)}% adj=${adjDiff.toFixed(2)}% cockpit=${cockpit}`);
    cockpitFixCount++;
  }
}
console.log(`\nTotal overcalculated units fixable with 0.95 modifier: ${cockpitFixCount}`);

// Also check undercalculated units where removing a 0.95 cockpit would help
console.log('\n=== Undercalculated units where removing 0.95 cockpit would fix ===\n');
let removeCockpitCount = 0;
for (const u of outside1) {
  if (u.percentDiff > -1) continue;
  const b = u.breakdown || {};
  if (b.cockpitType !== 'small' && b.cockpitType !== 'torso-mounted') continue;
  // If current calc uses 0.95 modifier, what would 1.0 give?
  const adjusted = Math.round(u.calculatedBV / 0.95);
  const adjDiff = ((adjusted - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(adjDiff) < Math.abs(u.percentDiff)) {
    const data = unitMap.get(u.unitId);
    const cockpit = data ? (data.cockpit || 'NOT SET') : 'UNKNOWN';
    console.log(`${u.chassis} ${u.model}: calc=${u.calculatedBV} ref=${u.indexBV} cur=${u.percentDiff.toFixed(2)}% cockpit_in_data=${cockpit} detected=${b.cockpitType}`);
    removeCockpitCount++;
  }
}
console.log(`\nTotal undercalculated potentially wrong cockpit: ${removeCockpitCount}`);

// Check all units: how many have cockpit field vs rely on detection
let withCockpit = 0, noCockpit = 0;
const cockpitTypes = {};
for (const [id, d] of unitMap) {
  if (d.cockpit) {
    withCockpit++;
    cockpitTypes[d.cockpit] = (cockpitTypes[d.cockpit] || 0) + 1;
  } else {
    noCockpit++;
  }
}
console.log(`\nCockpit field stats: has=${withCockpit}, missing=${noCockpit}`);
console.log('Types:', JSON.stringify(cockpitTypes, null, 2));
