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

const targets = ['prey-seeker-py-sr30', 'piranha-4', 'mauler-mal-1x-affc', 'revenant-ubm-1a', 'great-turtle-gtr-1', 'merlin-mln-sx', 'shogun-c-2'];

for (const f of findJsonFiles('public/data/units/battlemechs')) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!targets.includes(d.id)) continue;

  console.log(`\n=== ${d.chassis} ${d.model} (${d.id}) ===`);
  console.log('Tonnage:', d.tonnage, 'Movement:', JSON.stringify(d.movement));
  console.log('Tech Base:', d.techBase);
  console.log('\nEquipment:');
  for (const e of d.equipment) console.log(`  ${e.id} @ ${e.location}`);
  console.log('\nCrit slots:');
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    const items = (slots || []).filter(s => s);
    if (items.length > 0) console.log(`  ${loc}: ${items.join(', ')}`);
  }
  console.log('---');
}
