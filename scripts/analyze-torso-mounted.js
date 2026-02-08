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

// All torso-mounted cockpit units (not just outside 1%)
const tmCockpit = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.cockpit === 'TORSO_MOUNTED';
}).sort((a, b) => a.percentDiff - b.percentDiff);

console.log(`Total torso-mounted cockpit units: ${tmCockpit.length}`);
console.log(`Under 1%: ${tmCockpit.filter(u => u.percentDiff < -1).length}`);
console.log(`Within 1%: ${tmCockpit.filter(u => Math.abs(u.percentDiff) <= 1).length}`);
console.log(`Over 1%: ${tmCockpit.filter(u => u.percentDiff > 1).length}`);

const avgDiff = tmCockpit.reduce((s, u) => s + u.percentDiff, 0) / tmCockpit.length;
console.log(`Average % diff: ${avgDiff.toFixed(2)}%`);

// Show all torso-mounted units
console.log('\n=== All torso-mounted units ===');
for (const u of tmCockpit) {
  const b = u.breakdown || {};
  const data = unitMap.get(u.unitId);
  const isQuad = data && data.criticalSlots && (data.criticalSlots.FRONT_LEFT_LEG || data.criticalSlots.REAR_LEFT_LEG);
  const crits = data ? JSON.stringify(data.criticalSlots || {}).toLowerCase() : '';
  const hasTC = crits.includes('targeting computer') || crits.includes('targcomp');
  const hasECM = crits.includes('ecm');

  console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference} sf=${b.speedFactor} df=${b.defensiveFactor}${isQuad ? ' [QUAD]' : ''}${hasTC ? ' [TC]' : ''}${hasECM ? ' [ECM]' : ''} tech=${b.techBase}`);
}

// Check: what's the ratio ref/calc for torso-mounted?
console.log('\n=== Ratio analysis ===');
const ratios = tmCockpit.map(u => u.indexBV / u.calculatedBV);
const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
console.log(`Average ref/calc ratio: ${avgRatio.toFixed(4)}`);
console.log(`If we multiply all calcs by ${avgRatio.toFixed(4)}, how many come within 1%?`);
let fixedCount = 0;
for (const u of tmCockpit) {
  const adjusted = u.calculatedBV * avgRatio;
  const adjDiff = ((adjusted - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(adjDiff) <= 1) fixedCount++;
}
console.log(`Would bring ${fixedCount}/${tmCockpit.length} within 1%`);

// Check specific factor: does dividing by 0.95 match better?
console.log('\n=== What if cockpit modifier should be 1/0.95 = 1.0526? ===');
let fixed095 = 0;
for (const u of tmCockpit) {
  // Currently applying 1.0, what if we should apply (1/0.95)?
  const adjusted = u.calculatedBV / 0.95;
  const adjDiff = ((adjusted - u.indexBV) / u.indexBV) * 100;
  if (Math.abs(adjDiff) <= 1) fixed095++;
}
console.log(`Would bring ${fixed095}/${tmCockpit.length} within 1% (dividing by 0.95)`);

// Check if the issue is related to defensive BV specifically
console.log('\n=== Defensive vs Offensive breakdown ===');
for (const u of tmCockpit.filter(x => Math.abs(x.percentDiff) > 2)) {
  const b = u.breakdown || {};
  const rawDefBV = (b.armorBV || 0) + (b.structureBV || 0) + (b.gyroBV || 0) + (b.defEquipBV || 0) - (b.explosivePenalty || 0);
  const defBV = rawDefBV * (b.defensiveFactor || 1);
  const rawOffBV = (b.rawWeaponBV || 0) - (b.halvedWeaponBV || 0) + (b.ammoBV || 0) + (b.weightBonus || 0) + (b.physicalWeaponBV || 0) + (b.offEquipBV || 0);
  const offBV = rawOffBV * (b.speedFactor || 1);
  console.log(`  ${u.chassis} ${u.model}: defBV=${defBV.toFixed(0)} offBV=${offBV.toFixed(0)} total=${(defBV+offBV).toFixed(0)} ref=${u.indexBV} gap=${u.difference}`);
  console.log(`    defPortion=${(defBV/(defBV+offBV)*100).toFixed(1)}% offPortion=${(offBV/(defBV+offBV)*100).toFixed(1)}%`);
}
