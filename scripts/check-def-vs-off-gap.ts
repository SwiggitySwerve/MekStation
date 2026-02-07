/**
 * For ALL undercalculated units, determine if the gap is in defensive BV, offensive BV, or both.
 * We can't get MegaMek's def/off split directly, but we can compare our def+off against the index.
 * If our defensive BV is correct, then: expectedOffBV = indexBV/cockpitMod - defBV
 * And offGap = expectedOffBV - ourOffBV
 */
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

console.log("=== DEFENSIVE vs OFFENSIVE BV GAP ANALYSIS ===\n");

// Get all undercalculated units (-1% to -10%)
const underUnits = report.allResults.filter((u: any) => u.percentDiff < -1 && u.percentDiff > -10);
console.log(`Total undercalculated units (-1% to -10%): ${underUnits.length}\n`);

let defGapCount = 0;
let offGapCount = 0;
let bothGapCount = 0;
let totalDefGap = 0;
let totalOffGap = 0;
let analyzed = 0;

const results: Array<{
  id: string;
  indexBV: number;
  calcBV: number;
  defBV: number;
  offBV: number;
  cockpitMod: number;
  totalGap: number;
  estimatedDefGap: number;
  estimatedOffGap: number;
}> = [];

for (const u of underUnits) {
  const bd = u.breakdown;
  if (!bd || !bd.defensiveBV || !bd.offensiveBV) continue;

  // Our calc: totalBV = round((defBV + offBV) * cockpitMod)
  // So defBV + offBV = calcBV / cockpitMod
  const cockpitMod = bd.cockpitModifier || 1.0;
  const ourSum = bd.defensiveBV + bd.offensiveBV;
  const ourTotal = Math.round(ourSum * cockpitMod);

  // MegaMek's index BV = round((megaDef + megaOff) * cockpitMod)
  // Assuming same cockpitMod, the gap in (def+off) is:
  const totalGap = u.indexBV - ourTotal; // positive = we undercalculate

  // We can't split this gap perfectly, but if we assume our defensive BV is close to correct,
  // then the offensive gap ≈ totalGap (since we know def is correct from the traces above).
  //
  // But to be more rigorous: let's check if the reported defensive factor and components explain
  // the defensive BV. If they do, the gap is purely offensive.

  analyzed++;
  results.push({
    id: u.unitId,
    indexBV: u.indexBV,
    calcBV: u.calculatedBV,
    defBV: bd.defensiveBV,
    offBV: bd.offensiveBV,
    cockpitMod,
    totalGap,
    estimatedDefGap: 0, // Can't determine without MegaMek def/off split
    estimatedOffGap: totalGap, // Assume all gap is offensive
  });

  totalOffGap += totalGap;
}

console.log(`Analyzed: ${analyzed}\n`);

// Distribution of gap sizes
const gapBuckets: Record<string, number> = {};
for (const r of results) {
  const bucket = Math.round(r.totalGap / 10) * 10;
  const key = `${bucket}`;
  gapBuckets[key] = (gapBuckets[key] ?? 0) + 1;
}

// Show some summary stats
const totalGaps = results.map(r => r.totalGap);
const avg = totalGaps.reduce((a, b) => a + b, 0) / totalGaps.length;
const sorted = [...totalGaps].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];

console.log(`Average BV gap: ${avg.toFixed(1)}`);
console.log(`Median BV gap: ${median}`);
console.log(`Min: ${sorted[0]}, Max: ${sorted[sorted.length - 1]}`);

// Now check: what fraction of the gap is explained by offensive vs defensive
console.log("\n--- Per-unit: DefBV as % of total, OffBV as % of total ---\n");

let defPctSum = 0;
let offPctSum = 0;
for (const r of results) {
  const total = r.defBV + r.offBV;
  if (total > 0) {
    defPctSum += r.defBV / total;
    offPctSum += r.offBV / total;
  }
}

console.log(`Average DefBV share: ${(defPctSum / results.length * 100).toFixed(1)}%`);
console.log(`Average OffBV share: ${(offPctSum / results.length * 100).toFixed(1)}%`);

// For the first 20 undercalculated, show the detailed breakdown
console.log("\n--- Top 20 Undercalculated Units Detail ---\n");
console.log("Unit ID                          | Index |  Calc |  Gap | DefBV | OffBV | CkMod");
console.log("---------------------------------|-------|-------|------|-------|-------|------");
for (const r of results.sort((a, b) => a.totalGap - b.totalGap).reverse().slice(0, 20)) {
  console.log(
    `${r.id.padEnd(33)}| ${String(r.indexBV).padStart(5)} | ${String(r.calcBV).padStart(5)} | ${String(r.totalGap).padStart(4)} | ${r.defBV.toFixed(0).padStart(5)} | ${r.offBV.toFixed(0).padStart(5)} | ${r.cockpitMod.toFixed(2)}`
  );
}

// Also check: do units with higher offensive BV fraction tend to have bigger gaps?
console.log("\n--- Gap vs Offensive BV Ratio ---\n");
const byOffPct = results.map(r => ({
  ...r,
  offPct: r.offBV / (r.defBV + r.offBV),
  gapPct: r.totalGap / r.indexBV * 100,
})).sort((a, b) => a.offPct - b.offPct);

// Group by offensive share quartile
const q1 = byOffPct.slice(0, Math.floor(byOffPct.length / 4));
const q2 = byOffPct.slice(Math.floor(byOffPct.length / 4), Math.floor(byOffPct.length / 2));
const q3 = byOffPct.slice(Math.floor(byOffPct.length / 2), Math.floor(byOffPct.length * 3 / 4));
const q4 = byOffPct.slice(Math.floor(byOffPct.length * 3 / 4));

function avgGapPct(arr: typeof byOffPct) {
  return arr.reduce((a, b) => a + b.gapPct, 0) / arr.length;
}
function avgOffPct(arr: typeof byOffPct) {
  return arr.reduce((a, b) => a + b.offPct, 0) / arr.length;
}

console.log("Quartile | Avg Off% | Avg Gap%");
console.log("---------|----------|--------");
console.log(`Q1 (low) | ${(avgOffPct(q1)*100).toFixed(1)}%   | ${avgGapPct(q1).toFixed(2)}%`);
console.log(`Q2       | ${(avgOffPct(q2)*100).toFixed(1)}%   | ${avgGapPct(q2).toFixed(2)}%`);
console.log(`Q3       | ${(avgOffPct(q3)*100).toFixed(1)}%   | ${avgGapPct(q3).toFixed(2)}%`);
console.log(`Q4 (high)| ${(avgOffPct(q4)*100).toFixed(1)}%   | ${avgGapPct(q4).toFixed(2)}%`);
