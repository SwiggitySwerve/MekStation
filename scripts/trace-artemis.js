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

// Find ALL units with Artemis, compare inside-1% vs outside-1%
const resultMap = new Map();
for (const u of r.allResults) resultMap.set(u.unitId, u);

const artUnits = [];
for (const [id, data] of unitMap) {
  if (!data.criticalSlots) continue;
  const crits = Object.values(data.criticalSlots).flat().filter(Boolean);
  const hasArt4 = crits.some(s => s.toLowerCase().includes('artemis iv') || s.toLowerCase().includes('artemisiv'));
  const hasArt5 = crits.some(s => s.toLowerCase().includes('artemis v') || s.toLowerCase().includes('artemisv'));
  if (hasArt4 || hasArt5) {
    const u = resultMap.get(id);
    if (u) artUnits.push({ id, data, u, type: hasArt5 ? 'V' : 'IV' });
  }
}

console.log('Total Artemis units:', artUnits.length);
const outside = artUnits.filter(a => Math.abs(a.u.percentDiff) > 1);
console.log('Outside 1%:', outside.length, '(' + (100 * outside.length / artUnits.length).toFixed(1) + '%)');
console.log('Overcalculated:', outside.filter(a => a.u.percentDiff > 0).length);
console.log('Undercalculated:', outside.filter(a => a.u.percentDiff < 0).length);
console.log('');

// Show ALL outside-1% Artemis units with details
for (const a of outside.sort((x,y) => x.u.percentDiff - y.u.percentDiff)) {
  const b = a.u.breakdown || {};
  const weapons = a.data.equipment.filter(e => {
    const lo = e.id.toLowerCase();
    return lo.includes('srm') || lo.includes('lrm') || lo.includes('mrm') || lo.includes('mml');
  }).map(e => e.id);
  console.log(`${a.u.percentDiff > 0 ? '+' : ''}${a.u.percentDiff.toFixed(2)}%  ${a.u.chassis} ${a.u.model} [Art-${a.type}]`);
  console.log(`  calc=${a.u.calculatedBV} mul=${a.u.indexBV} diff=${a.u.difference}`);
  console.log(`  missiles: ${weapons.join(', ')}`);
  console.log(`  weaponBV=${b.weaponBV} raw=${b.rawWeaponBV} ammoBV=${b.ammoBV}`);
  console.log('');
}

// Check Artemis ammo BV: is ammo getting Artemis multiplier too?
// MegaMek: Artemis IV does NOT modify ammo BV. Only weapon BV gets ×1.2.
console.log('=== AMMO BV ANALYSIS FOR OUTSIDE-1% ARTEMIS UNITS ===');
for (const a of outside.filter(x => x.u.percentDiff < -1)) {
  const b = a.u.breakdown || {};
  console.log(`${a.u.chassis} ${a.u.model}: ammoBV=${b.ammoBV}`);
  // Check what ammo the unit has
  const ammo = a.data.equipment.filter(e => e.id.toLowerCase().includes('ammo'));
  console.log(`  ammo: ${ammo.map(e => e.id + '@' + e.location).join(', ')}`);
  console.log('');
}
