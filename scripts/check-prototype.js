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

// List prototype equipment units
const protoIds = ['fennec-fec-5cm', 'griffin-grf-1a', 'cataphract-ctf-2x-george', 'black-knight-bl-6-knt-ian', 'emperor-emp-6a-ec', 'starslayer-sty-2c-ec'];
for (const id of protoIds) {
  const data = unitMap.get(id);
  if (!data) { console.log(id + ': NOT FOUND'); continue; }
  const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
  const protoItems = crits.filter(s => {
    const lo = s.toLowerCase();
    return lo.includes('prototype') || lo.includes('re-engineered') || lo.includes('reengineered');
  });
  const u = r.allResults.find(x => x.unitId === id);
  console.log(data.chassis + ' ' + data.model + ': ' + (u ? u.percentDiff.toFixed(2) + '% gap=' + u.difference : 'N/A'));
  console.log('  Proto crits: ' + [...new Set(protoItems)].join(', '));
  console.log('  Equipment: ' + data.equipment.map(e => e.id).join(', '));
  console.log('');
}
