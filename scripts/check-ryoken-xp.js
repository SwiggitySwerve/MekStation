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

// Compare Ryoken III exact match vs Ryoken III-XP overcalculated
const targets = ['ryoken-iii-b', 'ryoken-iii-xp-b', 'ryoken-iii-xp-c', 'ryoken-iii-xp-prime'];
for (const id of targets) {
  const data = unitMap.get(id);
  const result = r.allResults.find(u => u.unitId === id);
  if (!data || !result) { console.log('NOT FOUND:', id); continue; }
  const b = result.breakdown || {};
  console.log(`\n=== ${result.chassis} ${result.model} (${result.percentDiff.toFixed(2)}%) ref=${result.indexBV} calc=${result.calculatedBV} gap=${result.difference} ===`);
  console.log(`  Equipment: ${data.equipment.map(e => e.id + '@' + e.location).join(', ')}`);
  console.log(`  OFF: wBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV} aBV=${b.ammoBV} wt=${b.weightBonus} sf=${b.speedFactor}`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty} df=${b.defensiveFactor}`);
  console.log(`  HEAT: eff=${b.heatEfficiency} diss=${b.heatDissipation} moveHeat=${b.moveHeat} cockpit=${b.cockpitType}`);
  console.log(`  Tech: ${b.techBase}, tonnage=${data.tonnage}, movement=${JSON.stringify(data.movement)}`);

  // Check for TC in crits
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('targeting') || crits.includes('targcomp')) console.log('  HAS TC');
  if (crits.includes('artemis')) console.log('  HAS ARTEMIS');
}

// Also check Artemis undercalculated units
console.log('\n\n=== Artemis undercalculated ===');
const artUnder = r.allResults.filter(u => {
  if (u.percentDiff >= -1) return false;
  const data = unitMap.get(u.unitId);
  if (!data) return false;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  return crits.includes('artemis');
}).sort((a, b) => a.percentDiff - b.percentDiff);

for (const u of artUnder) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  console.log(`${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference} tech=${b.techBase}`);
  // Count artemis slots
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const artIVCount = (crits.match(/artemis iv/g) || []).length;
  const artVCount = (crits.match(/artemis v/g) || []).length;
  console.log(`  Artemis IV: ${artIVCount}, Artemis V: ${artVCount}`);
}
