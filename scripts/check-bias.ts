import fs from "fs";
import path from "path";

/**
 * Analyze the overall bias in BV calculations from the validation report.
 *
 * percentDiff is defined as (calculated - index) / index * 100,
 * so positive = overcalculated, negative = undercalculated.
 */

const reportPath = path.resolve(
  __dirname,
  "../validation-output/bv-validation-report.json"
);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

interface UnitResult {
  unitId: string;
  chassis: string;
  model: string;
  tonnage: number;
  indexBV: number;
  calculatedBV: number;
  difference: number;
  percentDiff: number;
  status: string;
  rootCause: string;
}

const allResults: UnitResult[] = report.allResults;

// Filter out any error units (status === "error") if they exist
const units = allResults.filter((u) => u.status !== "error");

console.log(`Total units in allResults: ${allResults.length}`);
console.log(`Non-error units analyzed:  ${units.length}`);
console.log();

// 1. Mean percentDiff
const sumPctDiff = units.reduce((acc, u) => acc + u.percentDiff, 0);
const meanPctDiff = sumPctDiff / units.length;

// 2. Median percentDiff
const sorted = [...units].sort((a, b) => a.percentDiff - b.percentDiff);
const mid = Math.floor(sorted.length / 2);
const medianPctDiff =
  sorted.length % 2 === 0
    ? (sorted[mid - 1].percentDiff + sorted[mid].percentDiff) / 2
    : sorted[mid].percentDiff;

console.log("=== BIAS SUMMARY ===");
console.log(`Mean percentDiff:   ${meanPctDiff.toFixed(4)}%`);
console.log(`Median percentDiff: ${medianPctDiff.toFixed(4)}%`);
console.log();

// 3. Overcalculated vs undercalculated counts
const overcalc = units.filter((u) => u.percentDiff > 0);
const undercalc = units.filter((u) => u.percentDiff < 0);
const exact = units.filter((u) => u.percentDiff === 0);

console.log("=== DIRECTION COUNTS ===");
console.log(
  `Overcalculated (positive diff): ${overcalc.length}  (${((overcalc.length / units.length) * 100).toFixed(1)}%)`
);
console.log(
  `Undercalculated (negative diff): ${undercalc.length}  (${((undercalc.length / units.length) * 100).toFixed(1)}%)`
);
console.log(
  `Exact match (zero diff):         ${exact.length}  (${((exact.length / units.length) * 100).toFixed(1)}%)`
);
console.log();

// 4. Mean absolute percentDiff for overcalculated vs undercalculated
const meanAbsOver =
  overcalc.length > 0
    ? overcalc.reduce((acc, u) => acc + Math.abs(u.percentDiff), 0) /
      overcalc.length
    : 0;
const meanAbsUnder =
  undercalc.length > 0
    ? undercalc.reduce((acc, u) => acc + Math.abs(u.percentDiff), 0) /
      undercalc.length
    : 0;
const meanAbsAll =
  units.reduce((acc, u) => acc + Math.abs(u.percentDiff), 0) / units.length;

console.log("=== MEAN ABSOLUTE ERROR BY DIRECTION ===");
console.log(`Overcalculated mean |percentDiff|:  ${meanAbsOver.toFixed(4)}%`);
console.log(`Undercalculated mean |percentDiff|: ${meanAbsUnder.toFixed(4)}%`);
console.log(`Overall mean |percentDiff|:         ${meanAbsAll.toFixed(4)}%`);
console.log();

// 5. Histogram: 1% buckets from -10% to +10%
console.log("=== HISTOGRAM (1% buckets, -10% to +10%) ===");
const buckets: { label: string; min: number; max: number; count: number }[] =
  [];

// Below -10%
buckets.push({ label: "  < -10%", min: -Infinity, max: -10, count: 0 });

// -10% to +10% in 1% increments
for (let low = -10; low < 10; low++) {
  const high = low + 1;
  const label =
    low >= 0
      ? ` ${low.toString().padStart(2)}% to  ${high.toString().padStart(2)}%`
      : `${low.toString().padStart(3)}% to ${high <= 0 ? high.toString().padStart(3) : " " + high.toString().padStart(2)}%`;
  buckets.push({ label, min: low, max: high, count: 0 });
}

// Above +10%
buckets.push({ label: " >= +10%", min: 10, max: Infinity, count: 0 });

for (const u of units) {
  for (const b of buckets) {
    if (b.min === -Infinity && u.percentDiff < b.max) {
      b.count++;
      break;
    } else if (b.max === Infinity && u.percentDiff >= b.min) {
      b.count++;
      break;
    } else if (u.percentDiff >= b.min && u.percentDiff < b.max) {
      b.count++;
      break;
    }
  }
}

const maxCount = Math.max(...buckets.map((b) => b.count));
const barScale = 60; // max bar width in chars

for (const b of buckets) {
  const barLen = Math.round((b.count / maxCount) * barScale);
  const bar = "#".repeat(barLen);
  const countStr = b.count.toString().padStart(5);
  console.log(`${b.label} | ${countStr} ${bar}`);
}

console.log();

// Summary stats
console.log("=== PERCENTILE BREAKPOINTS ===");
const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99];
for (const p of percentiles) {
  const idx = Math.min(
    Math.floor((p / 100) * sorted.length),
    sorted.length - 1
  );
  console.log(`  P${p.toString().padStart(2)}: ${sorted[idx].percentDiff.toFixed(2)}%`);
}
