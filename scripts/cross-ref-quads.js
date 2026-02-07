const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));

// Load missing quad list (manually constructed from IDs)
function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const unitDir = 'public/data/units/battlemechs';
const files = findJsonFiles(unitDir);
const missingIds = new Set();

for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (data.configuration !== 'Quad') continue;
    const crits = data.criticalSlots || {};
    const hasLegs = crits.REAR_LEFT_LEG || crits.REAR_RIGHT_LEG || crits.FRONT_LEFT_LEG || crits.FRONT_RIGHT_LEG;
    if (!hasLegs) missingIds.add(data.id);
  } catch {}
}

// Cross-reference with validation
const affected = r.allResults.filter(u => missingIds.has(u.unitId) && Math.abs(u.percentDiff) > 1);
affected.sort((a,b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

console.log('Validated quads with missing legs AND >1% error:', affected.length);
for (const u of affected) {
  const b = u.breakdown || {};
  console.log(`  ${u.chassis} ${u.model}: ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%) ammo=${b.ammoBV} expl=${b.explosivePenalty}`);
}
