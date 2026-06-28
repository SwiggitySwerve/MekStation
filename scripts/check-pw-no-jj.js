const bvAnalysis = require('./bv-analysis-helpers.cjs');
const r = bvAnalysis.loadBvValidationReport();

const unitDir = 'public/data/units/battlemechs';
const files = bvAnalysis.findJsonFiles(unitDir);

for (const f of files) {
  try {
    const d = bvAnalysis.readJson(f);
    const crits = JSON.stringify(d.criticalSlots || {});
    if (
      !crits.toLowerCase().includes('partialwing') &&
      !crits.toLowerCase().includes('partial wing')
    )
      continue;
    const hasJJ = (d.movement.jump || 0) > 0;
    const result = r.allResults.find((x) => x.unitId === d.id);
    const diffStr = result ? result.percentDiff.toFixed(1) + '%' : 'N/A';
    if (!hasJJ) {
      console.log(
        'PW+NoJJ:',
        d.chassis,
        d.model,
        'jump=' + (d.movement.jump || 0),
        'diff=' + diffStr,
      );
    }
  } catch {}
}
