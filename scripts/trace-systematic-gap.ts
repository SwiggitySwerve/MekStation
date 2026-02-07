#!/usr/bin/env npx tsx
/**
 * Analyze the systematic ~2% gap by looking at what's consistent:
 * 1. Check if the gap is a fixed fraction of defensiveBV or offensiveBV
 * 2. Check if applying a specific multiplier to defensive or offensive fixes it
 * 3. Look for a missing BV term
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});

console.log(`Analyzing ${undercalc.length} undercalculated units (1-5% below MUL)\n`);

// For each unit, compute: gap = indexBV - calculatedBV
// See if gap correlates better with defBV, offBV, weaponBV, ammoBV, etc.
interface Analysis {
  unitId: string;
  gap: number;
  defBV: number;
  offBV: number;
  weaponBV: number;
  ammoBV: number;
  speedFactor: number;
  explosivePenalty: number;
  defEquipBV: number;
  totalBV: number;
  indexBV: number;
  // Ratios
  gapPctOfDef: number;
  gapPctOfOff: number;
  gapPctOfTotal: number;
}

const analyses: Analysis[] = [];
for (const r of undercalc) {
  const b = r.breakdown;
  if (!b) continue;
  const gap = r.indexBV - r.calculatedBV;
  analyses.push({
    unitId: r.unitId,
    gap,
    defBV: b.defensiveBV,
    offBV: b.offensiveBV,
    weaponBV: b.weaponBV,
    ammoBV: b.ammoBV,
    speedFactor: b.speedFactor,
    explosivePenalty: b.explosivePenalty,
    defEquipBV: b.defensiveEquipBV,
    totalBV: r.calculatedBV,
    indexBV: r.indexBV,
    gapPctOfDef: gap / b.defensiveBV * 100,
    gapPctOfOff: gap / b.offensiveBV * 100,
    gapPctOfTotal: gap / r.calculatedBV * 100,
  });
}

// Statistics
function stats(arr: number[]): { mean: number; median: number; stddev: number; min: number; max: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const stddev = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  return { mean, median, stddev, min: sorted[0], max: sorted[sorted.length - 1] };
}

console.log('Gap as % of Defensive BV:');
const defPcts = analyses.map(a => a.gapPctOfDef);
const defStats = stats(defPcts);
console.log(`  mean=${defStats.mean.toFixed(2)}% median=${defStats.median.toFixed(2)}% stddev=${defStats.stddev.toFixed(2)}%`);

console.log('\nGap as % of Offensive BV:');
const offPcts = analyses.map(a => a.gapPctOfOff);
const offStats = stats(offPcts);
console.log(`  mean=${offStats.mean.toFixed(2)}% median=${offStats.median.toFixed(2)}% stddev=${offStats.stddev.toFixed(2)}%`);

console.log('\nGap as % of Total BV:');
const totPcts = analyses.map(a => a.gapPctOfTotal);
const totStats = stats(totPcts);
console.log(`  mean=${totStats.mean.toFixed(2)}% median=${totStats.median.toFixed(2)}% stddev=${totStats.stddev.toFixed(2)}%`);

// Correlation analysis: does gap = k * defBV or gap = k * offBV?
// Linear regression: gap = a * defBV + b
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumXX = xs.reduce((s, v) => s + v * v, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = ys.reduce((s, v, i) => s + (v - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

const gaps = analyses.map(a => a.gap);
const defs = analyses.map(a => a.defBV);
const offs = analyses.map(a => a.offBV);
const totals = analyses.map(a => a.totalBV);
const weapons = analyses.map(a => a.weaponBV);
const ammos = analyses.map(a => a.ammoBV);
const speeds = analyses.map(a => a.speedFactor);
const indexes = analyses.map(a => a.indexBV);

console.log('\n=== Linear Regression: gap vs component ===');
const regDef = linearRegression(defs, gaps);
console.log(`gap = ${regDef.slope.toFixed(4)} * defBV + ${regDef.intercept.toFixed(1)}  R²=${regDef.r2.toFixed(4)}`);

const regOff = linearRegression(offs, gaps);
console.log(`gap = ${regOff.slope.toFixed(4)} * offBV + ${regOff.intercept.toFixed(1)}  R²=${regOff.r2.toFixed(4)}`);

const regTotal = linearRegression(totals, gaps);
console.log(`gap = ${regTotal.slope.toFixed(4)} * totalBV + ${regTotal.intercept.toFixed(1)}  R²=${regTotal.r2.toFixed(4)}`);

const regWeapon = linearRegression(weapons, gaps);
console.log(`gap = ${regWeapon.slope.toFixed(4)} * weaponBV + ${regWeapon.intercept.toFixed(1)}  R²=${regWeapon.r2.toFixed(4)}`);

const regIndex = linearRegression(indexes, gaps);
console.log(`gap = ${regIndex.slope.toFixed(4)} * indexBV + ${regIndex.intercept.toFixed(1)}  R²=${regIndex.r2.toFixed(4)}`);

// Check: gap ≈ k * (defBV + offBV)?
console.log(`\n=== Testing: gap ≈ k * totalBV ===`);
const kValues = analyses.map(a => a.gap / a.totalBV);
const kStats = stats(kValues);
console.log(`k: mean=${kStats.mean.toFixed(4)} median=${kStats.median.toFixed(4)} stddev=${kStats.stddev.toFixed(4)}`);
console.log(`If we add ${(kStats.mean * 100).toFixed(1)}% to each unit's BV, how many come within 1%?`);
let within1 = 0;
for (const a of analyses) {
  const adjusted = a.totalBV * (1 + kStats.mean);
  if (Math.abs(adjusted - a.indexBV) / a.indexBV * 100 <= 1) within1++;
}
console.log(`  ${within1} of ${analyses.length} (${(within1 / analyses.length * 100).toFixed(1)}%)`);

// Try multiple k values
for (const k of [0.01, 0.015, 0.02, 0.025, 0.03]) {
  let w1 = 0;
  for (const a of analyses) {
    const adj = a.totalBV * (1 + k);
    if (Math.abs(adj - a.indexBV) / a.indexBV * 100 <= 1) w1++;
  }
  console.log(`  k=${k}: ${w1} within 1% (${(w1 / analyses.length * 100).toFixed(1)}%)`);
}

// Check if gap correlates more with weapon BV * speedFactor
console.log(`\n=== Testing: gap ≈ k * weaponBV * speedFactor ===`);
const weaponTimesSpeed = analyses.map(a => a.weaponBV * a.speedFactor);
const regWS = linearRegression(weaponTimesSpeed, gaps);
console.log(`gap = ${regWS.slope.toFixed(4)} * (weaponBV*speedFactor) + ${regWS.intercept.toFixed(1)}  R²=${regWS.r2.toFixed(4)}`);

// Check: does gap disappear when we look at (defBV + offBV) vs indexBV directly?
// i.e., is there a consistent additive term missing?
console.log(`\n=== Additive analysis: gap distribution ===`);
console.log(`Gap absolute: mean=${stats(gaps).mean.toFixed(1)} median=${stats(gaps).median.toFixed(1)} stddev=${stats(gaps).stddev.toFixed(1)} min=${stats(gaps).min} max=${stats(gaps).max}`);

// Bucket by tonnage
const byTonnage = new Map<number, number[]>();
for (const a of analyses) {
  const iu = report.allResults.find((r: any) => r.unitId === a.unitId);
  if (!iu) continue;
  const ton = iu.tonnage;
  if (!byTonnage.has(ton)) byTonnage.set(ton, []);
  byTonnage.get(ton)!.push(a.gapPctOfTotal);
}
console.log(`\n=== Gap % by tonnage ===`);
for (const ton of [...byTonnage.keys()].sort((a, b) => a - b)) {
  const pcts = byTonnage.get(ton)!;
  if (pcts.length >= 3) {
    const s = stats(pcts);
    console.log(`  ${ton}t (n=${pcts.length}): mean=${s.mean.toFixed(2)}% median=${s.median.toFixed(2)}%`);
  }
}
