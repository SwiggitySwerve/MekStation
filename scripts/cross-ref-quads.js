const bvAnalysis = require('./bv-analysis-helpers.cjs');
const r = bvAnalysis.loadBvValidationReport();

// Load missing quad list (manually constructed from IDs)

const unitDir = 'public/data/units/battlemechs';
const files = bvAnalysis.findJsonFiles(unitDir);
const missingIds = new Set();

for (const f of files) {
  try {
    const data = bvAnalysis.readJson(f);
    if (data.configuration !== 'Quad') continue;
    const crits = data.criticalSlots || {};
    const hasLegs =
      crits.REAR_LEFT_LEG ||
      crits.REAR_RIGHT_LEG ||
      crits.FRONT_LEFT_LEG ||
      crits.FRONT_RIGHT_LEG;
    if (!hasLegs) missingIds.add(data.id);
  } catch (_error) {
    // Ignore expected failure in one-off tooling.
    void _error;
  }
}

// Cross-reference with validation
const affected = r.allResults.filter(
  (u) => missingIds.has(u.unitId) && Math.abs(u.percentDiff) > 1,
);
affected.sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

console.log(
  'Validated quads with missing legs AND >1% error:',
  affected.length,
);
for (const u of affected) {
  const b = u.breakdown || {};
  console.log(
    `  ${u.chassis} ${u.model}: ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%) ammo=${b.ammoBV} expl=${b.explosivePenalty}`,
  );
}
