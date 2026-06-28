const bvAnalysis = require('./bv-analysis-helpers.cjs');

for (const f of bvAnalysis.findJsonFiles('public/data/units/battlemechs')) {
  const d = bvAnalysis.readJson(f);
  if (d.id === 'butcherbird-a') {
    console.log('Unit:', d.chassis, d.model);
    console.log('Movement:', JSON.stringify(d.movement));
    console.log('Tonnage:', d.tonnage);
    console.log('\nAll crit slots:');
    for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
      const items = (slots || []).filter((s) => s);
      if (items.length > 0) console.log(`  ${loc}: ${items.join(', ')}`);
    }
    break;
  }
}
