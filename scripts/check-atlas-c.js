const fs = require('fs');
const path = require('path');

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

for (const uid of ['atlas-c', 'shogun-c-2', 'stealth-sth-5x', 'mauler-mal-1x-affc']) {
  const data = unitMap.get(uid);
  if (!data) { console.log(uid + ': NOT FOUND'); continue; }
  console.log(`\n=== ${uid} (tech=${data.techBase}) ===`);
  console.log('Equipment:');
  for (const eq of data.equipment || []) {
    console.log(`  ${eq.id} @ ${eq.location}`);
  }
  console.log('\nCritical slots by location:');
  for (const [loc, slots] of Object.entries(data.criticalSlots || {})) {
    const filled = (slots || []).filter(Boolean);
    if (filled.length === 0) continue;
    console.log(`  ${loc}:`);
    for (const s of filled) {
      const isClan = s.startsWith('CL') || s.startsWith('Clan');
      const isIS = s.startsWith('IS') || s.startsWith('Is');
      console.log(`    ${s}${isClan ? ' [CLAN]' : isIS ? ' [IS]' : ''}`);
    }
  }
}
