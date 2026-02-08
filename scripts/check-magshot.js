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

// Find all units with magshot
console.log('=== MAGSHOT UNITS ===');
const magUnits = [];
for (const [id, data] of unitMap) {
  if (!data.equipment) continue;
  const hasMag = data.equipment.some(e => e.id.toLowerCase().includes('magshot'));
  if (!hasMag) continue;
  const u = resultMap.get(id);
  if (u) magUnits.push({ id, data, u });
}

console.log('Total Magshot units:', magUnits.length);
const outside = magUnits.filter(m => Math.abs(m.u.percentDiff) > 1);
console.log('Outside 1%:', outside.length, '(all overcalculated)');
console.log('');

// Check: do Magshot units also have other suspect equipment?
for (const m of outside.sort((a, b) => b.u.percentDiff - a.u.percentDiff)) {
  const b = m.u.breakdown || {};
  const crits = Object.values(m.data.criticalSlots || {}).flat().filter(Boolean);
  const flags = [];
  if (crits.some(s => s.toLowerCase().includes('light machine gun'))) flags.push('LMG');
  if (crits.some(s => s.toLowerCase().includes('heavy machine gun'))) flags.push('HMG');
  if (crits.some(s => s.toLowerCase().includes('machine gun') && !s.toLowerCase().includes('light') && !s.toLowerCase().includes('heavy'))) flags.push('MG');
  if (crits.some(s => s.toLowerCase().includes('supercharger'))) flags.push('SC');
  if (crits.some(s => s.toLowerCase().includes('targeting computer'))) flags.push('TC');
  if (m.data.techBase === 'MIXED') flags.push('MIX');

  console.log(`+${m.u.percentDiff.toFixed(2)}%  ${m.u.chassis} ${m.u.model} (diff=+${m.u.difference}) [${flags.join(',')}]`);
  console.log(`  equip: ${m.data.equipment.map(e => e.id).join(', ')}`);
}

// Check: what BV does magshot resolve to?
console.log('\n--- Magshot BV check ---');
// In catalog: magshot = ?
const weaponFiles = fs.readdirSync('public/data/equipment/official/weapons').filter(f => f.endsWith('.json'));
for (const wf of weaponFiles) {
  const data = JSON.parse(fs.readFileSync('public/data/equipment/official/weapons/' + wf, 'utf8'));
  if (data.items) {
    const mag = data.items.find(i => i.id && i.id.toLowerCase().includes('magshot'));
    if (mag) console.log('Catalog:', mag.id, 'BV=' + mag.battleValue, 'heat=' + mag.heat);
  }
}
