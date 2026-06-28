const bvAnalysis = require('./bv-analysis-helpers.cjs');

const targets = [
  'prey-seeker-py-sr30',
  'piranha-4',
  'mauler-mal-1x-affc',
  'revenant-ubm-1a',
  'great-turtle-gtr-1',
  'merlin-mln-sx',
  'shogun-c-2',
];

for (const f of bvAnalysis.findJsonFiles('public/data/units/battlemechs')) {
  const d = bvAnalysis.readJson(f);
  if (!targets.includes(d.id)) continue;

  console.log(`\n=== ${d.chassis} ${d.model} (${d.id}) ===`);
  console.log('Tonnage:', d.tonnage, 'Movement:', JSON.stringify(d.movement));
  console.log('Tech Base:', d.techBase);
  console.log('\nEquipment:');
  for (const e of d.equipment) console.log(`  ${e.id} @ ${e.location}`);
  console.log('\nCrit slots:');
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    const items = (slots || []).filter((s) => s);
    if (items.length > 0) console.log(`  ${loc}: ${items.join(', ')}`);
  }
  console.log('---');
}
