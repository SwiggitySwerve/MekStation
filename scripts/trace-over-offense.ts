/**
 * Deep trace of overcalculated 1-2% units to find systematic offensive excess.
 * Check weight bonus, weapon BV, ammo BV individually.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const over1to2 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2 && x.breakdown);

// Check if the defensive BV or offensive BV is the primary cause
console.log(`=== OVERCALCULATED 1-2% (${over1to2.length} units) ===\n`);

// Group by TSM
let tsmOver = 0;
let nonTsmOver = 0;
const tsmDetails: any[] = [];
const nonTsmDetails: any[] = [];

for (const u of over1to2) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase() === 'tsm' || s.toLowerCase().includes('triple strength') || s.toLowerCase().includes('triple-strength'))));

  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const neededBaseOff = (refBase - b.defensiveBV) / b.speedFactor;
  const excess = baseOff - neededBaseOff;

  const detail = {
    unitId: u.unitId, pct: u.percentDiff, diff: u.difference, hasTSM,
    weaponBV: b.weaponBV, ammoBV: b.ammoBV, weightBonus: b.weightBonus,
    physBV: b.physicalWeaponBV, offEquipBV: b.offEquipBV,
    speedFactor: b.speedFactor, tonnage: unit.tonnage, tech: unit.techBase,
    halvedCount: b.halvedWeaponCount, weaponCount: b.weaponCount,
    baseExcess: excess,
  };

  if (hasTSM) { tsmOver++; tsmDetails.push(detail); }
  else { nonTsmOver++; nonTsmDetails.push(detail); }
}

console.log(`TSM: ${tsmOver}, Non-TSM: ${nonTsmOver}\n`);

// For non-TSM: check what's in the excess
console.log('=== NON-TSM OVERCALCULATED 1-2% ===');
// Check if the excess is in weaponBV, ammoBV, or weightBonus
let excessInWeapon = 0;
let excessInAmmo = 0;
let excessInWeight = 0;

for (const d of nonTsmDetails.sort((a: any, b: any) => b.baseExcess - a.baseExcess)) {
  // Weight bonus = tonnage (for standard mech)
  // Check if weight bonus matches expected
  const expectedWeight = d.tonnage; // no TSM, no AES
  const weightDiff = d.weightBonus - expectedWeight;

  console.log(`  ${d.unitId.padEnd(42)} +${d.pct.toFixed(1)}% excess=${d.baseExcess.toFixed(0)} weapBV=${d.weaponBV?.toFixed(0)} ammoBV=${d.ammoBV} wt=${d.weightBonus?.toFixed(0)}(exp=${expectedWeight}) SF=${d.speedFactor} halved=${d.halvedCount}/${d.weaponCount}`);

  if (Math.abs(weightDiff) > 1) {
    console.log(`    *** WEIGHT DIFF: ${weightDiff.toFixed(1)} (got ${d.weightBonus?.toFixed(1)}, expected ${expectedWeight})`);
  }
}

console.log('\n=== TSM OVERCALCULATED 1-2% ===');
for (const d of tsmDetails.sort((a: any, b: any) => b.baseExcess - a.baseExcess)) {
  const expectedWeight = d.tonnage * 1.5; // TSM = 1.5x
  const weightDiff = (d.weightBonus ?? 0) - expectedWeight;
  console.log(`  ${d.unitId.padEnd(42)} +${d.pct.toFixed(1)}% excess=${d.baseExcess.toFixed(0)} weapBV=${d.weaponBV?.toFixed(0)} ammoBV=${d.ammoBV} wt=${d.weightBonus?.toFixed(0)}(exp=${expectedWeight}) SF=${d.speedFactor} halved=${d.halvedCount}/${d.weaponCount}`);
  if (Math.abs(weightDiff) > 1) {
    console.log(`    *** WEIGHT DIFF: ${weightDiff.toFixed(1)}`);
  }
}

// Check if halved weapon count correlates with overcalculation
console.log('\n=== HALVING ANALYSIS ===');
const halvedOvercalc = over1to2.filter((x: any) => x.breakdown.halvedWeaponCount > 0);
const noHalvedOvercalc = over1to2.filter((x: any) => x.breakdown.halvedWeaponCount === 0);
console.log(`  With halved weapons: ${halvedOvercalc.length} (avg +${(halvedOvercalc.reduce((s: number, x: any) => s + x.percentDiff, 0) / Math.max(halvedOvercalc.length, 1)).toFixed(2)}%)`);
console.log(`  No halved weapons: ${noHalvedOvercalc.length} (avg +${(noHalvedOvercalc.reduce((s: number, x: any) => s + x.percentDiff, 0) / Math.max(noHalvedOvercalc.length, 1)).toFixed(2)}%)`);

// Check: for overcalculated units, is the defensive BV too high or too low?
console.log('\n=== DEFENSIVE BV CHECK ===');
let defTooHigh = 0;
let defTooLow = 0;
let defCorrect = 0;
for (const u of over1to2) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  // If off is correct: defNeeded = refBase - offBV
  const defNeeded = refBase - b.offensiveBV;
  const defDiff = b.defensiveBV - defNeeded;
  if (defDiff > 5) defTooHigh++;
  else if (defDiff < -5) defTooLow++;
  else defCorrect++;
}
console.log(`  Def too high: ${defTooHigh}`);
console.log(`  Def too low: ${defTooLow}`);
console.log(`  Def about right: ${defCorrect}`);
