const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json','utf8'));

// Find units in 1-5% range where ammoBV=0 but they likely have ammo
const units = r.allResults.filter(u => {
  const b = u.breakdown || {};
  return Math.abs(u.percentDiff) > 1 && Math.abs(u.percentDiff) <= 5 && b.ammoBV === 0;
});

console.log('Units in 1-5% with ammoBV=0:', units.length);
for (const u of units) {
  const b = u.breakdown || {};
  console.log('  ' + u.chassis + ' ' + u.model + ' (' + u.percentDiff.toFixed(1) + '%) weap=' + b.weaponBV + ' halved=' + b.halvedWeaponCount + ' tech=' + b.techBase);
}

// Now find ALL units where ammoBV=0 (even those within 1%)
const allAmmo0 = r.allResults.filter(u => {
  const b = u.breakdown || {};
  return b.ammoBV === 0 && Math.abs(u.percentDiff) > 0;
});
console.log('\nAll units with ammoBV=0 and non-zero diff:', allAmmo0.length);

// Check pattern: are undercalculated units more likely to have ammoBV=0?
const under0 = allAmmo0.filter(u => u.percentDiff < -0.5).length;
const over0 = allAmmo0.filter(u => u.percentDiff > 0.5).length;
console.log('  Undercalc (>0.5%):', under0, '  Overcalc (>0.5%):', over0);

// Check for units where ammo exists in crits but ammoBV=0
const fs = require('fs');
const path = require('path');
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
const unitMap = new Map();
for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    unitMap.set(d.id, d);
  } catch {}
}

console.log('\n--- Units with ammo in crits but ammoBV=0 and >1% off ---');
let ammoCritMismatch = 0;
for (const u of units) {
  const data = unitMap.get(u.unitId);
  if (!data || !data.criticalSlots) continue;
  const crits = JSON.stringify(data.criticalSlots).toLowerCase();
  if (crits.includes('ammo')) {
    ammoCritMismatch++;
    console.log('  ' + u.chassis + ' ' + u.model + ' (' + u.percentDiff.toFixed(1) + '%) - has ammo in crits');
  }
}
console.log('Total with ammo mismatch:', ammoCritMismatch);
