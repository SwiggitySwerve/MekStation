#!/usr/bin/env npx tsx
/**
 * Find units that undercalculate WITHOUT any unresolved weapon issues.
 * These represent the "clean" systematic gap.
 */
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Find units with minor discrepancy that have NO issues at all
const cleanUnder = report.allResults.filter((r: any) =>
  r.percentDiff !== null &&
  r.percentDiff < -1 && r.percentDiff > -5 &&
  r.rootCause === 'minor-discrepancy' &&
  r.issues.length === 0
);

console.log(`Clean undercalculating units (no issues, 1-5% under): ${cleanUnder.length}`);

// Group by techBase
const byTech: Record<string, any[]> = {};
for (const r of cleanUnder) {
  // We don't have techBase in report directly, but can guess from unitId
  // Let's just show some examples
  const key = r.breakdown?.speedFactor === 1 ? 'speedFactor=1.0' : 'speedFactor>1.0';
  if (!byTech[key]) byTech[key] = [];
  byTech[key].push(r);
}

for (const [key, units] of Object.entries(byTech)) {
  console.log(`\n${key}: ${units.length} units`);
}

// Show detailed breakdown for first 20 clean undercalculating units
console.log('\n=== DETAILED CLEAN UNDERCALCULATIONS ===');
for (const r of cleanUnder.slice(0, 30)) {
  const expected = r.indexBV;
  const calc = r.calculatedBV;
  const gap = r.difference;
  const b = r.breakdown;

  // What's the gap vs just offensive BV?
  // totalBV = defensive + offensive * cockpitMod ≈ defensiveBV + offensiveBV (if cockpit=standard, mod=1.0)
  // The gap must come from SOMEWHERE in the formula
  console.log(`${r.unitId}: expected=${expected} calc=${calc} gap=${gap} (${r.percentDiff.toFixed(1)}%)`);
  console.log(`  def=${b.defensiveBV.toFixed(1)} off=${b.offensiveBV.toFixed(1)} weaponBV=${b.weaponBV} ammoBV=${b.ammoBV} speed=${b.speedFactor} explPen=${b.explosivePenalty} defEquip=${b.defensiveEquipBV}`);

  // Reconstruct total
  const reconstructed = Math.round(b.defensiveBV + b.offensiveBV);
  console.log(`  reconstructed=${reconstructed} vs calc=${calc} (diff=${calc - reconstructed})`);
}

// Analyze: is the gap proportional to offensive BV?
console.log('\n=== GAP vs OFFENSIVE BV CORRELATION ===');
let offCorrelation = 0;
let defCorrelation = 0;
for (const r of cleanUnder) {
  const b = r.breakdown;
  const offRatio = Math.abs(r.difference) / (b.offensiveBV || 1);
  const defRatio = Math.abs(r.difference) / (b.defensiveBV || 1);
  offCorrelation += offRatio;
  defCorrelation += defRatio;
}
console.log(`Avg gap/offensiveBV ratio: ${(offCorrelation / cleanUnder.length * 100).toFixed(1)}%`);
console.log(`Avg gap/defensiveBV ratio: ${(defCorrelation / cleanUnder.length * 100).toFixed(1)}%`);

// Are there any patterns in the BV gap?
const gapValues = cleanUnder.map((r: any) => Math.abs(r.difference));
const avgGap = gapValues.reduce((a: number, b: number) => a + b, 0) / gapValues.length;
console.log(`Avg absolute gap: ${avgGap.toFixed(1)} BV points`);
console.log(`Min gap: ${Math.min(...gapValues)} Max gap: ${Math.max(...gapValues)}`);
