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

// Trace specific clean units barely outside 1%
const targets = [
  'arctic-fox-af1u', 'fenris-j', 'rifleman-rfl-7g', 'silver-fox-svr-5y',
  'juggernaut-jg-r9t3', 'goshawk-ii-2', 'charger-cgr-3kr', 'hachiwara-hca-4u',
  'bombardier-bmb-14k', 'grand-crusader-grn-d-01-x'
];

for (const id of targets) {
  const result = r.allResults.find(u => u.unitId === id);
  if (!result) { console.log(`NOT FOUND: ${id}`); continue; }
  const data = unitMap.get(id);
  const b = result.breakdown || {};

  console.log(`\n=== ${result.chassis} ${result.model} (${result.percentDiff.toFixed(2)}%) ref=${result.indexBV} calc=${result.calculatedBV} gap=${result.difference} ===`);
  console.log(`  DEFENSIVE: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty} df=${b.defensiveFactor} => defBV=${b.defensiveBV}`);
  console.log(`  OFFENSIVE: wBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV} ammo=${b.ammoBV} wt=${b.weightBonus} phys=${b.physicalWeaponBV} offEq=${b.offEquipBV} sf=${b.speedFactor} => offBV=${b.offensiveBV}`);
  console.log(`  HEAT: eff=${b.heatEfficiency} diss=${b.heatDissipation} move=${b.moveHeat} wCount=${b.weaponCount} halvedCount=${b.halvedWeaponCount}`);
  console.log(`  CONTEXT: tech=${b.techBase} walk=${b.walkMP} run=${b.runMP} jump=${b.jumpMP} cockpit=${b.cockpitType} mod=${b.cockpitModifier}`);
  console.log(`  base = defBV(${b.defensiveBV}) + offBV(${b.offensiveBV}) = ${b.defensiveBV + b.offensiveBV}`);
  console.log(`  final = ${b.defensiveBV + b.offensiveBV} * ${b.cockpitModifier} = ${Math.round((b.defensiveBV + b.offensiveBV) * b.cockpitModifier)}`);

  if (data) {
    console.log(`  Equipment: ${data.equipment.map(e => e.id).join(', ')}`);
    console.log(`  Tonnage: ${data.tonnage}, Movement: walk=${data.movement.walk} run=${data.movement.run} jump=${data.movement.jump || 0}`);
    console.log(`  Armor: ${JSON.stringify(data.armor?.type)} Engine: ${data.engine?.type} Gyro: ${data.gyro?.type} Structure: ${data.structure?.type}`);
  }
}

// Summary: what's the average gap per BV component for over vs under?
const outside = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
const over = outside.filter(u => u.percentDiff > 1);
const under = outside.filter(u => u.percentDiff < -1);

function avgField(arr, field) {
  const vals = arr.map(u => u.breakdown?.[field]).filter(v => v !== undefined && v !== null);
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

console.log('\n\n=== Component averages: Over vs Under vs All ===');
const fields = ['defensiveBV', 'offensiveBV', 'speedFactor', 'defensiveFactor', 'heatEfficiency', 'explosivePenalty'];
for (const f of fields) {
  const allAvg = avgField(r.allResults, f);
  const overAvg = avgField(over, f);
  const underAvg = avgField(under, f);
  console.log(`  ${f}: all=${allAvg.toFixed(2)} over=${overAvg.toFixed(2)} under=${underAvg.toFixed(2)}`);
}
