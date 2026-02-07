// Trace the heat tracking BV calculation for a specific unit
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
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

// Focus on overcalculated units with halvedWeaponBV=0 but high total weapon heat
const outside = r.allResults.filter(u => u.percentDiff > 1);
console.log('=== Overcalculated units where no weapons are halved but total heat > heat efficiency ===\n');

for (const u of outside) {
  const b = u.breakdown || {};
  if (b.halvedWeaponCount > 0) continue; // skip if some weapons ARE halved

  // Total weapon heat ~ sum of all weapon heats
  // weaponBV = rawWeaponBV means no halving
  if (b.rawWeaponBV !== b.weaponBV) continue; // some halving happened

  // Check if the highest-heat weapon exceeds heat efficiency
  // We can't see individual weapon heats, but we can infer from the data
  // If a unit has heatEfficiency > 0 and rawWeaponBV = weaponBV, then no weapon crossed the threshold
  // This could mean: total heat is less than heatEfficiency
  // OR: there's a bug

  console.log(`${u.chassis} ${u.model}: +${u.percentDiff.toFixed(2)}% gap=+${u.difference}`);
  console.log(`  weaponBV=${b.weaponBV} rawWeaponBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV}`);
  console.log(`  heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`  weapons=${b.weaponCount} walkMP=${b.walkMP} runMP=${b.runMP} jumpMP=${b.jumpMP} sf=${b.speedFactor}`);

  const data = unitMap.get(u.unitId);
  if (data) {
    console.log(`  equipment: ${data.equipment.map(e => e.id).join(', ')}`);
  }
  console.log('');
}
