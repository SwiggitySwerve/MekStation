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

// Top 20 overcalculated IS/MIXED units
const overIS = r.allResults.filter(u =>
  u.percentDiff > 1 && (u.breakdown?.techBase === 'INNER_SPHERE' || u.breakdown?.techBase === 'MIXED')
).sort((a, b) => b.percentDiff - a.percentDiff).slice(0, 20);

console.log('=== Top 20 overcalculated IS/MIXED units ===\n');
for (const u of overIS) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  console.log(`${u.chassis} ${u.model}: +${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`);
  console.log(`  OFF: wBV=${b.rawWeaponBV} half=${b.halvedWeaponBV} ammo=${b.ammoBV} wt=${b.weightBonus} sf=${b.speedFactor} heatEff=${b.heatEfficiency} wCount=${b.weaponCount} halfCount=${b.halvedWeaponCount}`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty} df=${b.defensiveFactor}`);

  if (data) {
    const equip = data.equipment.map(e => e.id).join(', ');
    console.log(`  Equip: ${equip}`);
    // Look for specific patterns
    const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
    const features = [];
    if (crits.includes('artemis')) features.push('ARTEMIS');
    if (crits.includes('apollo')) features.push('APOLLO');
    if (crits.includes('targeting computer') || crits.includes('targcomp')) features.push('TC');
    if (crits.includes('c3')) features.push('C3');
    if (crits.includes('capacitor')) features.push('PPC-CAP');
    if (crits.includes('laser insulator')) features.push('INSULATOR');
    if (crits.includes('risc')) features.push('RISC');
    if (features.length) console.log(`  Special: ${features.join(', ')}`);
  }
  console.log('');
}

// Check: how many overcalculated units have C3?
console.log('\n=== C3 in overcalculated units ===');
let c3OverCount = 0;
for (const u of r.allResults.filter(x => x.percentDiff > 1)) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('c3') || data.equipment.some(e => e.id.toLowerCase().includes('c3'))) {
    c3OverCount++;
  }
}
const c3AllCount = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  if (!data) return false;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  return crits.includes('c3') || data.equipment.some(e => e.id.toLowerCase().includes('c3'));
}).length;
console.log(`C3 overcalculated (>1%): ${c3OverCount} out of ${c3AllCount} total C3 units`);

// Check: Artemis in overcalculated units
let artOverCount = 0;
for (const u of r.allResults.filter(x => x.percentDiff > 1)) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('artemis')) artOverCount++;
}
const artAllCount = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  if (!data) return false;
  return JSON.stringify(data.criticalSlots || {}).toLowerCase().includes('artemis');
}).length;
console.log(`Artemis overcalculated (>1%): ${artOverCount} out of ${artAllCount} total Artemis units`);
