/**
 * Check accuracy for MUL-sourced BV vs non-MUL BV separately.
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

let mulExact = 0, mulWithin1 = 0, mulWithin5 = 0, mulTotal = 0;
let nonMulExact = 0, nonMulWithin1 = 0, nonMulWithin5 = 0, nonMulTotal = 0;

for (const u of valid) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  const hasMUL = !!(ie?.mulBV && ie.mulBV > 0);
  const absPct = Math.abs(u.percentDiff);

  if (hasMUL) {
    mulTotal++;
    if (u.status === 'exact') mulExact++;
    if (absPct <= 1) mulWithin1++;
    if (absPct <= 5) mulWithin5++;
  } else {
    nonMulTotal++;
    if (u.status === 'exact') nonMulExact++;
    if (absPct <= 1) nonMulWithin1++;
    if (absPct <= 5) nonMulWithin5++;
  }
}

console.log(`=== MUL-SOURCED BV (${mulTotal} units) ===`);
console.log(`  Exact: ${mulExact} (${(mulExact/mulTotal*100).toFixed(1)}%)`);
console.log(`  Within 1%: ${mulWithin1} (${(mulWithin1/mulTotal*100).toFixed(1)}%)`);
console.log(`  Within 5%: ${mulWithin5} (${(mulWithin5/mulTotal*100).toFixed(1)}%)`);

console.log(`\n=== NON-MUL BV (${nonMulTotal} units) ===`);
console.log(`  Exact: ${nonMulExact} (${(nonMulExact/nonMulTotal*100).toFixed(1)}%)`);
console.log(`  Within 1%: ${nonMulWithin1} (${(nonMulWithin1/nonMulTotal*100).toFixed(1)}%)`);
console.log(`  Within 5%: ${nonMulWithin5} (${(nonMulWithin5/nonMulTotal*100).toFixed(1)}%)`);

// Also check: 1-2% band by MUL status
const nearMiss = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);
let nearMissMul = 0, nearMissNonMul = 0;
for (const u of nearMiss) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (ie?.mulBV && ie.mulBV > 0) nearMissMul++;
  else nearMissNonMul++;
}
console.log(`\n=== 1-2% BAND: MUL=${nearMissMul}, NonMUL=${nearMissNonMul} ===`);

// Check all bands by MUL status
for (const band of [
  { name: 'exact', fn: (x: any) => x.status === 'exact' },
  { name: '0-1%', fn: (x: any) => Math.abs(x.percentDiff) > 0 && Math.abs(x.percentDiff) <= 1 },
  { name: '1-2%', fn: (x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2 },
  { name: '2-5%', fn: (x: any) => Math.abs(x.percentDiff) > 2 && Math.abs(x.percentDiff) <= 5 },
  { name: '5%+', fn: (x: any) => Math.abs(x.percentDiff) > 5 },
]) {
  const items = valid.filter(band.fn);
  let mul = 0, nonMul = 0;
  for (const u of items) {
    const ie = idx.units.find((e: any) => e.id === u.unitId);
    if (ie?.mulBV && ie.mulBV > 0) mul++;
    else nonMul++;
  }
  console.log(`  ${band.name.padEnd(10)} total=${String(items.length).padStart(5)} MUL=${String(mul).padStart(5)} NonMUL=${String(nonMul).padStart(5)}`);
}
