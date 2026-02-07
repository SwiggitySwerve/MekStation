import * as fs from 'fs';

// Load validation report
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const cache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf-8'));

// Get undercalculated units with MUL BV
const undercalc = (report.allResults as any[]).filter(
  (r: any) => r.percentDiff !== null && r.percentDiff < -0.5 && r.percentDiff > -5
    && r.breakdown
);

// For each, compute the implied offensive BV difference
const diffs: {name: string; defBV: number; offBV: number; refBV: number; impliedOff: number; offDiff: number; offDiffPct: number}[] = [];

for (const r of undercalc) {
  const entry = cache.entries?.[r.unitId];
  const mulBV = (entry && entry.mulBV > 0 && entry.matchType === 'exact') ? entry.mulBV : 0;
  if (mulBV === 0) continue; // Only use MUL-verified units

  const defBV = r.breakdown.defensiveBV;
  const offBV = r.breakdown.offensiveBV;
  const refBV = r.indexBV;

  // Assuming cockpit modifier = 1.0 (standard), refBV = round(defBV + expectedOff)
  // So expectedOff = refBV - defBV (approximately, since cockpit modifier applies to sum)
  const impliedOff = refBV - defBV;
  const offDiff = offBV - impliedOff;
  const offDiffPct = (offDiff / impliedOff) * 100;

  diffs.push({name: `${r.chassis} ${r.model}`, defBV, offBV, refBV, impliedOff, offDiff, offDiffPct});
}

// Sort by offDiffPct
diffs.sort((a, b) => a.offDiffPct - b.offDiffPct);

console.log(`Units analyzed: ${diffs.length}`);
console.log(`\nAssuming defensive BV is correct and cockpit mod = 1.0:`);
console.log(`Implied offensive BV differences:\n`);

// Statistics
const pcts = diffs.map(d => d.offDiffPct);
const avgPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
const medianPct = pcts.sort((a, b) => a - b)[Math.floor(pcts.length / 2)];

console.log(`Average offensive diff: ${avgPct.toFixed(2)}%`);
console.log(`Median offensive diff: ${medianPct.toFixed(2)}%`);

// Show distribution
const buckets = [-20, -15, -10, -8, -6, -4, -3, -2, -1, 0, 5, 10];
for (let i = 0; i < buckets.length - 1; i++) {
  const count = pcts.filter(p => p >= buckets[i] && p < buckets[i+1]).length;
  if (count > 0) console.log(`  ${buckets[i]}% to ${buckets[i+1]}%: ${count} units`);
}

console.log(`\n--- Top 20 largest offensive BV shortfalls ---`);
for (const d of diffs.slice(0, 20)) {
  console.log(`${d.name.padEnd(35)} def=${d.defBV.toFixed(0)} off=${d.offBV.toFixed(0)} refBV=${d.refBV} impliedOff=${d.impliedOff.toFixed(0)} offDiff=${d.offDiff.toFixed(0)} (${d.offDiffPct.toFixed(1)}%)`);
}

console.log(`\n--- 20 units with SMALLEST offensive diff (closest to 0) ---`);
const sorted2 = [...diffs].sort((a, b) => Math.abs(a.offDiffPct) - Math.abs(b.offDiffPct));
for (const d of sorted2.slice(0, 20)) {
  console.log(`${d.name.padEnd(35)} def=${d.defBV.toFixed(0)} off=${d.offBV.toFixed(0)} refBV=${d.refBV} impliedOff=${d.impliedOff.toFixed(0)} offDiff=${d.offDiff.toFixed(0)} (${d.offDiffPct.toFixed(1)}%)`);
}
