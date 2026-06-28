const bvAnalysis = require('./bv-analysis-helpers.cjs');
const r = bvAnalysis.loadBvValidationReport();

const unitMap = bvAnalysis.loadBattleMechUnitMap();

// Find all undercalculated units where removing explosive penalty brings them closer
const under = r.allResults
  .filter((u) => u.percentDiff < -1)
  .sort((a, b) => a.percentDiff - b.percentDiff);

console.log(
  '=== Undercalculated units: would removing explosive penalty help? ===\n',
);

let improvedCount = 0;
let perfectCount = 0;
for (const u of under) {
  const b = u.breakdown || {};
  if (!b.explosivePenalty || b.explosivePenalty === 0) continue;

  // If we remove explosive penalty, defensive BV increases
  const df = b.defensiveFactor || 1.0;
  const explBVImpact = b.explosivePenalty * df;

  // Account for cockpit modifier
  const cockpitMod = b.cockpitModifier || 1.0;
  const newCalc = Math.round(
    (u.calculatedBV / cockpitMod + explBVImpact) * cockpitMod,
  );
  const newDiff = ((newCalc - u.indexBV) / u.indexBV) * 100;

  if (Math.abs(newDiff) < Math.abs(u.percentDiff)) {
    improvedCount++;
    if (Math.abs(newDiff) <= 1) perfectCount++;
    if (Math.abs(u.percentDiff) > 2) {
      console.log(
        `${u.chassis} ${u.model}: expl=${b.explosivePenalty} df=${df} cur=${u.percentDiff.toFixed(2)}% new=${newDiff.toFixed(2)}% ${Math.abs(newDiff) <= 1 ? '[WITHIN 1%]' : ''}`,
      );
    }
  }
}
console.log(`\nWould improve: ${improvedCount}/${under.length}`);
console.log(`Would bring within 1%: ${perfectCount}/${under.length}`);

// Also check: how many units have explosive penalty?
const withExpl = r.allResults.filter(
  (u) => (u.breakdown?.explosivePenalty || 0) > 0,
);
console.log(`\nTotal units with explosive penalty: ${withExpl.length}`);
console.log(
  `Within 1%: ${withExpl.filter((u) => Math.abs(u.percentDiff) <= 1).length}`,
);
console.log(
  `Outside 1%: ${withExpl.filter((u) => Math.abs(u.percentDiff) > 1).length}`,
);
