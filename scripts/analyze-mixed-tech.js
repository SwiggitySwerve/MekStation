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

const mixedOutside = r.allResults.filter(u =>
  Math.abs(u.percentDiff) > 1 && (u.breakdown?.techBase === 'MIXED')
).sort((a, b) => a.percentDiff - b.percentDiff);

console.log('=== MIXED tech units outside 1% (27 units) ===\n');
for (const u of mixedOutside) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};

  // Check what makes them mixed - do they have both IS and Clan equipment?
  const equip = (data?.equipment || []);
  const clanWeapons = equip.filter(e => {
    const id = e.id.toLowerCase();
    return id.startsWith('cl') || id.startsWith('clan');
  });
  const isWeapons = equip.filter(e => {
    const id = e.id.toLowerCase();
    return id.startsWith('is') || id.startsWith('inner');
  });

  const features = [];
  if (b.cockpitType && b.cockpitType !== 'standard') features.push(b.cockpitType);
  if (b.hasTC) features.push('TC');
  if (b.hasTSM) features.push('TSM');
  if (b.ppcCap > 0) features.push('ppcCap');

  console.log(`${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`);
  console.log(`  OFF: wBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV} ammo=${b.ammoBV} sf=${b.speedFactor}`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} expl=${b.explosivePenalty} df=${b.defensiveFactor}`);
  if (features.length) console.log(`  Features: ${features.join(', ')}`);

  // Show equipment that looks potentially mis-resolved
  const allEquipIds = equip.map(e => e.id);
  console.log(`  Equip: ${allEquipIds.join(', ')}`);
  console.log('');
}

// What fraction of MIXED are undercalculated vs overcalculated?
const mixedAll = r.allResults.filter(u => u.breakdown?.techBase === 'MIXED');
const avg = mixedAll.reduce((s, u) => s + u.percentDiff, 0) / mixedAll.length;
console.log(`MIXED stats: total=${mixedAll.length} avg=${avg.toFixed(4)}%`);
console.log(`  Within 0.5%: ${mixedAll.filter(u => Math.abs(u.percentDiff) <= 0.5).length}`);
console.log(`  Within 1%: ${mixedAll.filter(u => Math.abs(u.percentDiff) <= 1).length}`);
console.log(`  Outside 1%: ${mixedAll.filter(u => Math.abs(u.percentDiff) > 1).length}`);
