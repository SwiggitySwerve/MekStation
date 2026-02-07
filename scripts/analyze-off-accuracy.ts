// Check if offensive BV is accurate for a broader set of undercalculated units
// by comparing rawOff (before speed factor) to the expected sum of components
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// For each undercalculated unit:
// expectedTotalOffBV = indexBV - defBV  (what offBV would need to be if defBV is correct)
// If our offBV < expectedTotalOffBV, the gap is partly offensive
// If our offBV >= expectedTotalOffBV, the gap is entirely defensive
//
// Alternative: compute what defBV would need to be if offBV is correct
// expectedDefBV = indexBV - offBV
// If our defBV < expectedDefBV, gap is defensive
// If our defBV >= expectedDefBV, gap is offensive
//
// Actually: diff = defBV + offBV - indexBV (negative = undercalculation)
// We know diff = (defBV - expectedDef) = (offBV - expectedOff) ... no that's not right either.
//
// The REAL way to check:
// If offensive raw components (before speed factor) match the expected sum, offensive is correct.
// The expected sum = weaponBV + ammoBV + physicalBV + tonnage + offEquipBV
// This is what the validation script computes, and it then multiplies by speed factor.
// But we can't easily recompute this from outside...
//
// Let me instead check: for each unit, what fraction of the total gap is attributable
// to the defensive side being wrong vs offensive side.
// We can check this by: if we correct defBV to make it match (indexBV - offBV),
// does the corrected defBV make physical sense? (positive, reasonable magnitude)

const undercalc = report.allResults.filter((r: any) => r.difference < -1 && r.breakdown);

let defLow = 0;
let offLow = 0;
let both = 0;
let totalCount = 0;

// Check: is our defBV consistently lower than what it should be?
// We know: calculatedBV = defBV + offBV, indexBV > calculatedBV (undercalculation)
// expectedDefBV (if offBV correct) = indexBV - offBV
// defGap = expectedDefBV - defBV = indexBV - offBV - defBV = indexBV - calculatedBV = diff (positive for undercalc since diff<0... wait, diff = calculatedBV - indexBV < 0)
// So defGap = indexBV - defBV - offBV = -(calculatedBV - indexBV) = -diff > 0
// Meaning: if offBV is correct, defBV needs to increase by |diff| to match.
// Similarly: if defBV is correct, offBV needs to increase by |diff| to match.

// The question is: WHICH side is actually wrong?
// We can't determine this from just index and calculated BV.
// We need to check the RAW components.

// Let me check the breakdown more carefully.
// The breakdown has: weaponBV, ammoBV, speedFactor, defensiveBV, offensiveBV, explosivePenalty, defensiveEquipBV

// offensiveBV = rawOff * speedFactor
// rawOff = weaponBV + ammoBV + physicalBV + tonnage * aesModifier * tsmModifier + offEquipBV
// The breakdown gives us weaponBV, ammoBV, speedFactor
// tonnage is known from the unit data.
// So rawOff should approximately equal: weaponBV + ammoBV + tonnage + physBV + offEquipBV
// And offBV / speedFactor should give us the actual rawOff.

// If rawOff ≈ weaponBV + ammoBV + tonnage (approximately, ignoring small physBV and offEquipBV),
// then the offensive side is correct and the gap is defensive.

let offCorrectCount = 0;
let offWrongCount = 0;
let offCorrectGap = 0;
let offWrongGap = 0;

for (const r of undercalc) {
  const b = r.breakdown;
  const entry = (index.units as any[]).find((e: any) => e.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const rawOff = b.offensiveBV / b.speedFactor;
    const expectedRawOff = b.weaponBV + b.ammoBV + data.tonnage; // approximate (no physBV, offEquipBV)
    const rawOffGap = rawOff - expectedRawOff;

    // If rawOff is close to expectedRawOff (within 5%), offensive is correct
    const relativeGap = Math.abs(rawOffGap) / Math.max(1, expectedRawOff);
    if (relativeGap < 0.02) { // within 2%
      offCorrectCount++;
      offCorrectGap += r.difference;
    } else {
      offWrongCount++;
      offWrongGap += r.difference;
    }
    totalCount++;
  } catch {}
}

console.log(`Undercalculated units analyzed: ${totalCount}`);
console.log(`Offensive BV correct (rawOff matches components): ${offCorrectCount} (${(offCorrectCount/totalCount*100).toFixed(1)}%)`);
console.log(`  avgDiff for these: ${(offCorrectGap/offCorrectCount).toFixed(1)}`);
console.log(`Offensive BV has gap: ${offWrongCount} (${(offWrongCount/totalCount*100).toFixed(1)}%)`);
console.log(`  avgDiff for these: ${offWrongGap > 0 ? '' : ''}${(offWrongGap/offWrongCount).toFixed(1)}`);
