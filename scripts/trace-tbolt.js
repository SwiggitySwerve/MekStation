const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findJsonFiles(f));
    else if (e.name.endsWith('.json') && e.name !== 'index.json') results.push(f);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

const resultMap = new Map();
for (const u of r.allResults) resultMap.set(u.unitId, u);

// Find ALL Thunderbolt units
console.log('=== THUNDERBOLT WEAPON UNITS ===');
for (const [id, data] of unitMap) {
  if (!data.equipment) continue;
  const tbWeapons = data.equipment.filter(e => e.id.toLowerCase().includes('thunderbolt'));
  if (tbWeapons.length === 0) continue;

  const u = resultMap.get(id);
  if (!u) continue;

  const b = u.breakdown || {};
  const flag = Math.abs(u.percentDiff) > 1 ? '***' : '';
  console.log(`${flag} ${u.chassis} ${u.model}: ${u.percentDiff > 0 ? '+' : ''}${u.percentDiff.toFixed(2)}% (diff=${u.difference}) TB=[${tbWeapons.map(e => e.id).join(', ')}]`);
  if (flag) {
    console.log(`  weaponBV=${b.weaponBV} raw=${b.rawWeaponBV} halved=${b.halvedWeaponBV}`);
    console.log(`  heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
    console.log(`  allEquip: ${data.equipment.map(e => e.id).join(', ')}`);
  }
}

// Investigate: is the TB-20 heat correct?
// MegaMek ISThunderbolt20: BV=305, Heat=8
// Our CATALOG_BV_OVERRIDES: BV=305, heat=8
console.log('\nCATALOG_BV_OVERRIDES TB-20: BV=305, heat=8');
console.log('MegaMek ISThunderbolt20: BV=305, Heat=8');
console.log('If TB-20 heat was 0 (original catalog value), these units would have even HIGHER BV (more overcalculated)');
console.log('So the heat=8 override is CORRECT direction but may not be enough to explain the overcalculation');
