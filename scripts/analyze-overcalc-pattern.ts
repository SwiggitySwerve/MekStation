import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Get all overcalculated units in the ~5.26% band
const overcalc5pct = report.allResults
  .filter((r: any) => r.percentDiff > 4.0 && r.percentDiff < 7.0)
  .sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`Units in 4-7% overcalculation band: ${overcalc5pct.length}`);

// Check their properties
let clanCount = 0, isCount = 0, mixedCount = 0;
const tonnageDist: Record<number, number> = {};
const headCritPatterns: Record<string, number> = {};
let withSmallCockpitInName = 0;

for (const r of overcalc5pct) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    if (u.techBase === 'CLAN') clanCount++;
    else if (u.techBase === 'INNER_SPHERE') isCount++;
    else mixedCount++;
    tonnageDist[u.tonnage] = (tonnageDist[u.tonnage] || 0) + 1;

    // HEAD crit pattern
    const head = u.criticalSlots?.HEAD;
    const pattern = Array.isArray(head) ? head.map((s: any) => s || 'empty').join(' | ') : 'no-head';
    headCritPatterns[pattern] = (headCritPatterns[pattern] || 0) + 1;

    // Check if chassis/model suggests small cockpit
    const fullName = `${u.chassis} ${u.model}`.toLowerCase();
    if (fullName.includes('small')) withSmallCockpitInName++;

    // Check BV ratio: our/expected. If it's consistently 1/0.95 = 1.0526...
    const ratio = r.calculatedBV / r.indexBV;
    if (Math.abs(ratio - 1/0.95) < 0.005) {
      // This unit's overcalculation is almost exactly 1/0.95
    }
  } catch { /* skip */ }
}

console.log(`\nTech base: Clan=${clanCount} IS=${isCount} Mixed=${mixedCount}`);
console.log('\nTonnage distribution:');
for (const [ton, count] of Object.entries(tonnageDist).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  ${ton}t: ${count}`);
}

console.log('\nHEAD crit patterns (top 10):');
for (const [pat, count] of Object.entries(headCritPatterns).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  [${count}x] ${pat}`);
}

// Check exact ratio distribution
console.log('\n=== Ratio analysis (calcBV / indexBV) ===');
const ratios = overcalc5pct.map((r: any) => ({
  id: r.unitId,
  ratio: r.calculatedBV / r.indexBV,
  pct: r.percentDiff
}));

// Group by ratio proximity to common multiplier errors
const near_1_05263 = ratios.filter((r: any) => Math.abs(r.ratio - 1/0.95) < 0.005);  // small cockpit miss
const near_1_05 = ratios.filter((r: any) => Math.abs(r.ratio - 1.05) < 0.005);
console.log(`Near 1/0.95 (5.26%, small cockpit?): ${near_1_05263.length}`);
console.log(`Near 1.05 (5.00%): ${near_1_05.length}`);

// Show some examples
console.log('\nSample units near 5.26%:');
for (const r of near_1_05263.slice(0, 15)) {
  console.log(`  ${r.id.padEnd(45)} ratio=${r.ratio.toFixed(5)} pct=${r.pct.toFixed(2)}%`);
}

// Also count ALL overcalculated units where ratio is near 1/0.95
const allOvercalc = report.allResults.filter((r: any) => r.difference > 0);
const allNear5_26 = allOvercalc.filter((r: any) => {
  const ratio = r.calculatedBV / r.indexBV;
  return Math.abs(ratio - 1/0.95) < 0.008; // slightly wider band
});
console.log(`\nAll overcalculated units near 5.26% ratio: ${allNear5_26.length} out of ${allOvercalc.length}`);
