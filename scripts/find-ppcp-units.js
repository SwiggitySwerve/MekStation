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

// Find units with PPCP or primitive weapons
for (const [id, data] of unitMap) {
  if (!data.equipment) continue;
  const eqs = data.equipment.map(e => e.id.toLowerCase());
  if (eqs.some(e => e.includes('ppcp') || e.includes('primitive-prototype'))) {
    const u = r.allResults.find(x => x.unitId === id);
    console.log(id + ': ' + eqs.filter(e => e.includes('ppcp') || e.includes('primitive')).join(', ') + ' => ' + (u ? u.percentDiff.toFixed(2) + '%' : 'N/A'));
  }
}

// Also check which units went from exact to not-exact or vice versa
// by looking at units with very small differences
console.log('\n--- Units at exactly 0% (exact match) count:', r.allResults.filter(u => u.difference === 0).length);
console.log('--- Units between 0-1% (within 1%):', r.allResults.filter(u => Math.abs(u.percentDiff) > 0 && Math.abs(u.percentDiff) <= 1).length);
console.log('--- Units outside 1%:', r.allResults.filter(u => Math.abs(u.percentDiff) > 1).length);

// Total in allResults
console.log('--- Total allResults:', r.allResults.length);
