const bvAnalysis = require('./bv-analysis-helpers.cjs');
const r = bvAnalysis.loadBvValidationReport();

const unitMap = bvAnalysis.loadBattleMechUnitMap();

// List prototype equipment units
const protoIds = [
  'fennec-fec-5cm',
  'griffin-grf-1a',
  'cataphract-ctf-2x-george',
  'black-knight-bl-6-knt-ian',
  'emperor-emp-6a-ec',
  'starslayer-sty-2c-ec',
];
for (const id of protoIds) {
  const data = unitMap.get(id);
  if (!data) {
    console.log(id + ': NOT FOUND');
    continue;
  }
  const crits = Object.values(data.criticalSlots || {})
    .flat()
    .filter(Boolean);
  const protoItems = crits.filter((s) => {
    const lo = s.toLowerCase();
    return (
      lo.includes('prototype') ||
      lo.includes('re-engineered') ||
      lo.includes('reengineered')
    );
  });
  const u = r.allResults.find((x) => x.unitId === id);
  console.log(
    data.chassis +
      ' ' +
      data.model +
      ': ' +
      (u ? u.percentDiff.toFixed(2) + '% gap=' + u.difference : 'N/A'),
  );
  console.log('  Proto crits: ' + [...new Set(protoItems)].join(', '));
  console.log('  Equipment: ' + data.equipment.map((e) => e.id).join(', '));
  console.log('');
}
