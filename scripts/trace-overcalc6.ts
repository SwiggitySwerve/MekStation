import * as fs from 'fs';
import * as path from 'path';

// Check how reference BV is chosen for overcalculated units
const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const overCalc = data.allResults.filter((d: any) => d.difference > 0 && d.percentDiff > 1 && d.rootCause === 'overcalculation');

const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

let wrongMulMatch = 0;
let noMulBV = 0;
let mulBVUsed = 0;
let indexBVUsed = 0;

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  const entry = mulCache.entries?.[d.unitId];

  if (entry && entry.mulBV > 0 && entry.matchType === 'exact') {
    mulBVUsed++;
  } else if (entry && entry.mulBV > 0 && entry.matchType === 'fuzzy') {
    // Fuzzy match - might be wrong variant
    const mulNameNorm = (entry.mulName || '').toLowerCase().trim();
    const modelNorm = (d.model || '').toLowerCase().trim();
    if (mulNameNorm.endsWith(modelNorm) || mulNameNorm.endsWith(') ' + modelNorm)) {
      mulBVUsed++;
    } else {
      // Fuzzy match rejected, using index BV
      indexBVUsed++;
    }
  } else {
    indexBVUsed++;
    if (!entry || entry.mulBV === 0) noMulBV++;
  }
}

console.log('Reference BV source for 163 overcalculated units:');
console.log('  MUL BV (exact):', mulBVUsed);
console.log('  Index BV (no MUL or rejected fuzzy):', indexBVUsed);
console.log('  No MUL entry at all:', noMulBV);
console.log('');

// Now check: for the units using MUL exact match, is the overcalculation still present?
// vs units using index BV
const mulExact: any[] = [];
const noMul: any[] = [];

for (const d of overCalc) {
  const entry = mulCache.entries?.[d.unitId];
  if (entry && entry.mulBV > 0 && entry.matchType === 'exact') {
    mulExact.push(d);
  } else {
    noMul.push(d);
  }
}

console.log('MUL exact match units: avg overcalc =', (mulExact.reduce((s: number, d: any) => s + d.percentDiff, 0) / mulExact.length).toFixed(1) + '%, count:', mulExact.length);
console.log('No MUL / index units: avg overcalc =', (noMul.reduce((s: number, d: any) => s + d.percentDiff, 0) / noMul.length).toFixed(1) + '%, count:', noMul.length);
console.log('');

// Let's look at the validation code more carefully - check how the reference BV is selected
// The validate-bv.ts uses mulBVMap.get(id) first, then falls back to index BV.
// Let me check a few specific "no MUL" units against MegaMek to see if our calc is actually right
// and the INDEX BV is wrong.

console.log('=== Top no-MUL overcalculated units (index BV may be outdated) ===');
noMul.sort((a: any, b: any) => b.percentDiff - a.percentDiff);
for (const d of noMul.slice(0, 15)) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  const entry = mulCache.entries?.[d.unitId];
  console.log(`  ${d.unitId}: indexBV=${d.indexBV} calc=${d.calculatedBV} diff=+${d.percentDiff.toFixed(1)}%`);
  if (entry) {
    console.log(`    MUL: mulBV=${entry.mulBV} match=${entry.matchType} name="${entry.mulName}"`);
  } else {
    console.log(`    MUL: not in cache`);
  }
}

console.log('\n=== Top MUL-exact overcalculated units (reliable reference) ===');
mulExact.sort((a: any, b: any) => b.percentDiff - a.percentDiff);
for (const d of mulExact.slice(0, 15)) {
  const entry = mulCache.entries?.[d.unitId];
  console.log(`  ${d.unitId}: mulBV=${d.indexBV} calc=${d.calculatedBV} diff=+${d.percentDiff.toFixed(1)}%`);
  console.log(`    MUL name: "${entry?.mulName}" weapBV=${d.breakdown.weaponBV} ammoBV=${d.breakdown.ammoBV} SF=${d.breakdown.speedFactor} defBV=${d.breakdown.defensiveBV.toFixed(0)}`);
}
