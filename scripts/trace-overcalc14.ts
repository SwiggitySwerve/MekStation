import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// HYPOTHESIS: The MUL BV values are the PILOT-MODIFIED BV with gunnery 4 / piloting 5.
// The pilot skill modifier for 4/5 is 1.0.
// BUT what if the MUL uses gunnery 4 / piloting 4 (which is 1.1)?
// Then MUL BV = baseBV * 1.1, and our calc = baseBV * 1.0.
// So our calc / MUL = 1/1.1 = 0.909 - too low.
// What about 5/5 (gunnery 5, piloting 5)?
// 5/5 modifier = 0.9. So MUL BV = baseBV * 0.9.
// Our calc / MUL = baseBV / (baseBV * 0.9) = 1/0.9 = 1.111 - too high.
// 4/6 (gunnery 4, piloting 6)? That's 0.95!
// MUL BV = baseBV * 0.95
// Our calc / MUL = baseBV / (baseBV * 0.95) = 1/0.95 = 1.0526!
// THAT MATCHES!

// So if MUL uses pilot skill 4/6 instead of 4/5, the BV would be multiplied by 0.95.
// Standard assumption is 4/5 (modifier = 1.0), but let me verify.

// Actually wait - the MUL standard IS 4/5. That gives modifier 1.0.
// So the MUL BV should equal baseBV, not baseBV * anything.

// Unless... the MUL BV already HAS the pilot modifier baked in?
// Most BV listings show the "base BV" without pilot modifier.
// The pilot modifier is applied per-game based on the crew's actual skills.

// Hmm but what if our VALIDATION is comparing against the wrong thing?
// Let me check: what does our validation use as the reference BV?

// From validate-bv.ts, the reference BV comes from:
// 1. mulBVMap.get(unitId) - MUL BV (if available)
// 2. Otherwise, index BV from the unit data file

// And the MUL BV comes from the MUL API, which returns "BFV" (Battle Force Value?)
// or "BV" (Battle Value). Let me check what the MUL cache contains.

console.log('=== MUL CACHE STRUCTURE ===');
const cacheEntries = Object.entries(mulCache.entries).slice(0, 3);
for (const [id, entry] of cacheEntries) {
  console.log(id + ':', JSON.stringify(entry));
}

// Check: for one of our overcalculated units, what are all the BV sources?
console.log('\n=== BV SOURCE COMPARISON ===');
const testIds = [
  'blade-bld-xr',
  'assassin-asn-109',
  'archangel-c-ang-ob-infernus',
  'black-knight-blk-nt-2y',
  'eyleuka-eyl-45b',
  'blue-flame-blf-40',
  'axman-axm-6t',
  'barghest-bgs-4x',
];

for (const uid of testIds) {
  const d = data.allResults.find((x: any) => x.unitId === uid);
  const iu = indexData.units.find((u: any) => u.id === uid);
  const mulEntry = mulCache.entries?.[uid];

  console.log(`\n${uid}:`);
  console.log(`  Our calc: ${d?.calculatedBV}`);
  console.log(`  Index BV: ${iu?.bv}`);
  console.log(`  MUL BV: ${mulEntry?.mulBV} (match: ${mulEntry?.matchType})`);
  console.log(`  Report ref: ${d?.indexBV}`);
  if (d && mulEntry?.mulBV) {
    console.log(`  calc/MUL: ${(d.calculatedBV / mulEntry.mulBV).toFixed(4)}`);
    console.log(`  Index/MUL: ${(iu?.bv / mulEntry.mulBV).toFixed(4)}`);
    console.log(`  calc * 0.95: ${Math.round(d.calculatedBV * 0.95)}`);
  }
}

// Now let me check: do our overcalculated units have INDEX BV = MUL BV?
// Or does the index BV disagree with MUL?
console.log('\n=== INDEX BV vs MUL BV for OVERCALCULATED units ===');
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

let indexEqMul = 0;
let indexGtMul = 0;
let indexLtMul = 0;
let indexMulDiffs: number[] = [];

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  const mulEntry = mulCache.entries?.[d.unitId];
  if (!iu || !mulEntry) continue;

  const indexBV = iu.bv;
  const mulBV = mulEntry.mulBV;
  const diff = indexBV - mulBV;
  indexMulDiffs.push(diff);

  if (diff === 0) indexEqMul++;
  else if (diff > 0) indexGtMul++;
  else indexLtMul++;
}

console.log('Index BV == MUL BV:', indexEqMul);
console.log('Index BV > MUL BV:', indexGtMul);
console.log('Index BV < MUL BV:', indexLtMul);
console.log('');

// Check: which reference does validate-bv.ts use?
// It prefers MUL BV when available. So for MUL exact match, the reference IS the MUL BV.
// The "indexBV" field in the report is the EFFECTIVE reference BV used, not necessarily the index BV.

// Let me verify: does d.indexBV in the report match MUL BV or index BV?
let refEqMul = 0;
let refEqIdx = 0;
for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  const mulEntry = mulCache.entries?.[d.unitId];
  if (!iu || !mulEntry) continue;

  if (d.indexBV === mulEntry.mulBV) refEqMul++;
  if (d.indexBV === iu.bv) refEqIdx++;
}
console.log('Report reference matches MUL BV:', refEqMul, 'of', overCalc.length);
console.log('Report reference matches Index BV:', refEqIdx, 'of', overCalc.length);

// KEY QUESTION: Is the Index BV in the unit data files ALREADY our calculated value?
// Or is it from an external source like Sarna/MUL?
// If our Index BV was computed by our own code in a previous run, then
// the fact that MUL disagrees would mean OUR calculation is wrong, not the data.

// Let me check: was there a data migration that set index BV = calculated BV?
// Check the git history of the index file
console.log('\n=== CHECKING add-bv-to-index.ts ===');
