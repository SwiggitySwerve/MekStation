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

// Find all NONE gyro units
const noneGyro = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.gyro?.type === 'NONE';
}).sort((a, b) => a.percentDiff - b.percentDiff);

console.log(`=== NONE gyro units (${noneGyro.length} total) ===\n`);
for (const u of noneGyro) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  console.log(`${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty} df=${b.defensiveFactor}`);
  console.log(`  OFF: wBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV} ammo=${b.ammoBV} wt=${b.weightBonus} sf=${b.speedFactor}`);
  console.log(`  tonnage=${data.tonnage} engine=${data.engine?.type} structure=${data.structure?.type} cockpit=${data.cockpit}`);

  // Estimate: what if gyroBV = 0?
  if (b.gyroBV > 0) {
    const defBase = (b.armorBV + b.structureBV + 0 + (b.defEquipBV||0) + (b.armoredComponentBV||0) + (b.harjelBonus||0) - (b.explosivePenalty||0));
    const newDef = defBase * b.defensiveFactor;
    const offBV = b.offensiveBV;
    const newTotal = Math.round((newDef + offBV) * (b.cockpitModifier || 1));
    const newPct = ((newTotal - u.indexBV) / u.indexBV * 100);
    console.log(`  If gyroBV=0: newCalc=${newTotal} newDiff=${newPct.toFixed(2)}% ${Math.abs(newPct) <= 1 ? '[WITHIN 1%]' : ''}`);
  }
  console.log('');
}

// Also check: COMPOSITE structure
console.log('\n=== COMPOSITE structure units ===\n');
const compStruct = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.structure?.type === 'COMPOSITE';
}).sort((a, b) => a.percentDiff - b.percentDiff);

for (const u of compStruct.filter(x => Math.abs(x.percentDiff) > 1)) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  console.log(`${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`);
  console.log(`  DEF: struct=${b.structureBV} armor=${b.armorBV} gyro=${b.gyroBV} df=${b.defensiveFactor}`);
  console.log(`  tonnage=${data.tonnage}`);
}

// REINFORCED structure
console.log('\n=== REINFORCED structure units outside 1% ===\n');
const reinforced = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.structure?.type === 'REINFORCED';
}).sort((a, b) => a.percentDiff - b.percentDiff);

for (const u of reinforced.filter(x => Math.abs(x.percentDiff) > 1)) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  console.log(`${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`);
  console.log(`  DEF: struct=${b.structureBV} armor=${b.armorBV} gyro=${b.gyroBV} df=${b.defensiveFactor}`);
  console.log(`  tonnage=${data.tonnage} engine=${data.engine?.type}`);
}
