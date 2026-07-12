const bvAnalysis = require('./bv-analysis-helpers.cjs');
const path = require('path');

const unitDir = 'public/data/units/battlemechs';
const files = bvAnalysis.findJsonFiles(unitDir);
const missing = [];

for (const f of files) {
  try {
    const data = bvAnalysis.readJson(f);
    if (data.configuration !== 'Quad') continue;
    const crits = data.criticalSlots || {};
    const hasRearLegs =
      crits.REAR_LEFT_LEG ||
      crits.REAR_RIGHT_LEG ||
      crits.RearLeftLeg ||
      crits.RearRightLeg;
    const hasFrontLegs =
      crits.FRONT_LEFT_LEG ||
      crits.FRONT_RIGHT_LEG ||
      crits.FrontLeftLeg ||
      crits.FrontRightLeg;
    if (!hasRearLegs && !hasFrontLegs) {
      missing.push({
        file: path.relative(unitDir, f),
        id: data.id,
        chassis: data.chassis,
        model: data.model,
        tonnage: data.tonnage,
      });
    }
  } catch (_error) {
    // Ignore expected failure in one-off tooling.
    void _error;
  }
}

console.log('Quad mechs missing leg data:', missing.length);
missing.sort(
  (a, b) =>
    a.chassis.localeCompare(b.chassis) || a.model.localeCompare(b.model),
);
for (const m of missing) {
  console.log(`  ${m.chassis} ${m.model} (${m.tonnage}t) - ${m.file}`);
}
