const bvAnalysis = require('./bv-analysis-helpers.cjs');

const targets = [
  'ryoken-iii-xp-prime',
  'ryoken-iii-xp-b',
  'ryoken-iii-xp-c',
  'ryoken-iii-b',
];
for (const f of bvAnalysis.findJsonFiles('public/data/units/battlemechs')) {
  const d = bvAnalysis.readJson(f);
  if (!targets.includes(d.id)) continue;
  console.log(`\n=== ${d.id} ===`);
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    const items = (slots || []).filter((s) => s);
    if (items.length > 0) {
      console.log(`  ${loc}: ${items.join(', ')}`);
      // Check for anything matching TSM
      for (const s of items) {
        const lo = s.toLowerCase();
        if (
          lo === 'tsm' ||
          lo.includes('triple strength') ||
          lo.includes('triplestrength')
        ) {
          console.log(`    *** TSM MATCH: "${s}"`);
        }
      }
    }
  }
}
