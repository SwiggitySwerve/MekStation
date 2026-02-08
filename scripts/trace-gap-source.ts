#!/usr/bin/env npx tsx
/**
 * Determine whether the systematic gap is in defensive or offensive BV
 * by comparing against known MUL BV values.
 */
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Find clean undercalculating units (1-5% under, no issues)
const cleanUnder = report.allResults.filter((r: any) =>
  r.percentDiff !== null &&
  r.percentDiff < -1 && r.percentDiff > -5 &&
  r.rootCause === 'minor-discrepancy' &&
  r.issues.length === 0
);

console.log(`Analyzing ${cleanUnder.length} clean undercalculating units\n`);

// For speedFactor=1.0 units (100-ton mechs), the gap is purely in the base BV
// (no speed factor amplification)
const sf1Units = cleanUnder.filter((r: any) => r.breakdown.speedFactor === 1);
console.log(`=== Speed Factor = 1.0 (${sf1Units.length} units) ===`);
console.log(`(Gap is not amplified by speed factor, easier to trace)\n`);

let defGapSum = 0;
let offGapSum = 0;

for (const r of sf1Units.slice(0, 10)) {
  const b = r.breakdown;
  // totalBV = round(defensiveBV + offensiveBV)
  // indexBV = expected total
  // gap = indexBV - calculatedBV
  // If defensive is correct, entire gap is in offensive
  // If offensive is correct, entire gap is in defensive

  // We can't split the gap perfectly, but we can look at patterns
  console.log(`${r.unitId}: expected=${r.indexBV} calc=${r.calculatedBV} gap=${r.difference}`);
  console.log(`  def=${b.defensiveBV.toFixed(0)} off=${b.offensiveBV.toFixed(0)} weapBV=${b.weaponBV} ammo=${b.ammoBV}`);

  // If gap was entirely in offensive:
  const offNeeded = r.indexBV - b.defensiveBV;
  const offGap = offNeeded - b.offensiveBV;
  // If gap was entirely in defensive:
  const defNeeded = r.indexBV - b.offensiveBV;
  const defGap = defNeeded - b.defensiveBV;

  console.log(`  If off: needs ${offNeeded.toFixed(0)}, have ${b.offensiveBV.toFixed(0)}, gap=${offGap.toFixed(0)}`);
  console.log(`  If def: needs ${defNeeded.toFixed(0)}, have ${b.defensiveBV.toFixed(0)}, gap=${defGap.toFixed(0)}`);

  // Check if gap as % of offensive vs defensive makes more sense
  const offPct = (offGap / b.offensiveBV * 100);
  const defPct = (defGap / b.defensiveBV * 100);
  console.log(`  offGap%=${offPct.toFixed(1)}% defGap%=${defPct.toFixed(1)}%`);

  defGapSum += defGap;
  offGapSum += offGap;
}

console.log(`\nAvg offensive gap needed: ${(offGapSum / Math.min(sf1Units.length, 10)).toFixed(1)}`);
console.log(`Avg defensive gap needed: ${(defGapSum / Math.min(sf1Units.length, 10)).toFixed(1)}`);

// Now check for ALL units: is the gap amplified by speed factor?
// If gap = X * speedFactor, then X is a base-level gap in offensive BV components
console.log(`\n=== GAP vs SPEED FACTOR ANALYSIS ===`);
let corrSum = 0;
const dataPoints: { sf: number; gap: number; offBV: number; baseGap: number }[] = [];

for (const r of cleanUnder) {
  const b = r.breakdown;
  const sf = b.speedFactor;
  const gap = Math.abs(r.difference);
  const baseGap = gap / sf; // normalize by speed factor
  dataPoints.push({ sf, gap, offBV: b.offensiveBV, baseGap });
}

// Group by speed factor to see if baseGap is constant
const bySF: Record<string, { count: number; avgGap: number; avgBaseGap: number; avgOff: number }> = {};
for (const dp of dataPoints) {
  const key = dp.sf.toFixed(2);
  if (!bySF[key]) bySF[key] = { count: 0, avgGap: 0, avgBaseGap: 0, avgOff: 0 };
  bySF[key].count++;
  bySF[key].avgGap += dp.gap;
  bySF[key].avgBaseGap += dp.baseGap;
  bySF[key].avgOff += dp.offBV;
}

for (const [sf, d] of Object.entries(bySF).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  console.log(`SF=${sf}: n=${d.count}, avgGap=${(d.avgGap / d.count).toFixed(1)}, avgBaseGap=${(d.avgBaseGap / d.count).toFixed(1)}, avgOff=${(d.avgOff / d.count).toFixed(0)}`);
}

// Key question: does gap/speedFactor give a more consistent number than gap alone?
const rawGaps = dataPoints.map(d => d.gap);
const baseGaps = dataPoints.map(d => d.baseGap);
const stdDev = (arr: number[]) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
};
const cv = (arr: number[]) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return stdDev(arr) / mean;
};

console.log(`\nRaw gap CV: ${cv(rawGaps).toFixed(3)} (coefficient of variation)`);
console.log(`BaseGap (gap/SF) CV: ${cv(baseGaps).toFixed(3)}`);
console.log(`If baseGap CV is lower, the gap is primarily in the offensive BV pipeline (amplified by SF)`);
console.log(`If rawGap CV is lower, the gap is primarily in the defensive BV pipeline (not affected by SF)`);
