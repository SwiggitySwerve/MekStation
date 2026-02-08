const fs = require('fs');
const path = require('path');

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const targets = ['ryoken-iii-xp-prime', 'ryoken-iii-xp-b', 'ryoken-iii-xp-c', 'ryoken-iii-b'];
for (const f of findJsonFiles('public/data/units/battlemechs')) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!targets.includes(d.id)) continue;
  console.log(`\n=== ${d.id} ===`);
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    const items = (slots || []).filter(s => s);
    if (items.length > 0) {
      console.log(`  ${loc}: ${items.join(', ')}`);
      // Check for anything matching TSM
      for (const s of items) {
        const lo = s.toLowerCase();
        if (lo === 'tsm' || lo.includes('triple strength') || lo.includes('triplestrength')) {
          console.log(`    *** TSM MATCH: "${s}"`);
        }
      }
    }
  }
}
