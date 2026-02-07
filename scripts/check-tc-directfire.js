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

// Weapons that should NOT get TC bonus but currently would (because they're not in our exclusion list)
const nonTCWeapons = ['thunderbolt', 'arrow-iv', 'mortar', 'rocket-launcher', 'thumper', 'sniper', 'long-tom', 'rocket'];

console.log('=== TC UNITS WITH NON-TC-ELIGIBLE WEAPONS ===');
console.log('(These weapons incorrectly get TC x1.25 bonus)\n');

let affected = 0;
for (const [id, data] of unitMap) {
  if (!data.criticalSlots || !data.equipment) continue;
  const crits = Object.values(data.criticalSlots).flat().filter(Boolean);
  const hasTC = crits.some(s => {
    const lo = s.toLowerCase();
    return lo.includes('targeting computer') || lo.includes('targetingcomputer');
  });
  if (!hasTC) continue;

  const u = resultMap.get(id);
  if (!u) continue;

  const badWeapons = data.equipment.filter(e => {
    const lo = e.id.toLowerCase();
    return nonTCWeapons.some(nw => lo.includes(nw));
  });

  if (badWeapons.length > 0) {
    const flag = Math.abs(u.percentDiff) > 1 ? '***' : '';
    console.log(`${flag} ${u.chassis} ${u.model}: ${u.percentDiff > 0 ? '+' : ''}${u.percentDiff.toFixed(2)}% diff=${u.difference}`);
    console.log(`  Bad TC weapons: ${badWeapons.map(e => e.id).join(', ')}`);
    console.log(`  All weapons: ${data.equipment.map(e => e.id).join(', ')}`);
    console.log('');
    affected++;
  }
}
console.log(`Total TC units with non-TC-eligible weapons: ${affected}`);
