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

for (const f of findJsonFiles('public/data/units/battlemechs')) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (d.id === 'butcherbird-a') {
    console.log('Unit:', d.chassis, d.model);
    console.log('Movement:', JSON.stringify(d.movement));
    console.log('Tonnage:', d.tonnage);
    console.log('\nAll crit slots:');
    for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
      const items = (slots || []).filter(s => s);
      if (items.length > 0) console.log(`  ${loc}: ${items.join(', ')}`);
    }
    break;
  }
}
