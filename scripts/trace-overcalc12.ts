import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier, getEngineBVMultiplier } from '../src/types/validation/BattleValue';
import { EngineType } from '../src/types/construction/EngineType';
import { calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, calculateOffensiveSpeedFactor, getCockpitModifier } from '../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

// Blade BLD-XR: calc=1159, ref=1101, 1159*0.95 = 1101.05 -> 1101 (exact)
// Equipment: 2x light-ppc (88 BV each), 2x lac-2 (30 BV each)
// Tech base: IS, Engine: XL, 35 tons, Walk 7, Jump 0
// Armor: REACTIVE (1.5x), Structure: ENDO_STEEL, Gyro: STANDARD
// Heat sinks: 10 DHS
// Armor points: 119, Structure points: 58

console.log('=== BLADE BLD-XR FULL MANUAL TRACE ===');
console.log('');

// ----- DEFENSIVE BV -----
const armorBV = Math.round(119 * 2.5 * 1.5 * 10) / 10;
console.log('ArmorBV = round(119 * 2.5 * 1.5 * 10) / 10 =', armorBV);

const engMult = getEngineBVMultiplier(EngineType.XL_IS);
console.log('Engine mult for IS XL:', engMult);
const structBV = 58 * 1.5 * 1.0 * engMult;
console.log('StructBV = 58 * 1.5 * 1.0 *', engMult, '=', structBV);

const gyroBV = 35 * 0.5;
console.log('GyroBV = 35 * 0.5 =', gyroBV);

// Explosive penalties: lac-2 ammo is explosive
// The validation report shows explosivePenalty=30
// So there must be 2 tons of ammo, each 15 BV penalty
const explosivePenalty = 30;

const baseDef = armorBV + structBV + gyroBV - explosivePenalty;
console.log('BaseDef =', armorBV, '+', structBV, '+', gyroBV, '- 30 =', baseDef);

// Defensive factor: walk=7, run=ceil(7*1.5)=11, jump=0
// RunTMM: 11 -> TMM 4
// JumpTMM: 0
// MaxTMM: 4
// DefensiveFactor = 1 + 4/10 = 1.4
console.log('DefensiveFactor: 1 + 4/10 = 1.4');
const totalDef = baseDef * 1.4;
console.log('TotalDef =', baseDef, '* 1.4 =', totalDef);
console.log('(Validation report says:', 668.22, ')');
console.log('');

// ----- OFFENSIVE BV -----
// Weapons: 2x Light PPC, 2x LAC-2
// Light PPC: BV=88, heat=5
// LAC-2: BV=30, heat=1
console.log('Resolving weapons:');
const lppc = resolveEquipmentBV('light-ppc');
const lac2 = resolveEquipmentBV('lac-2');
console.log('  Light PPC:', JSON.stringify(lppc));
console.log('  LAC-2:', JSON.stringify(lac2));
console.log('');

// 2x LPPC: heat=10, bv=176
// 2x LAC-2: heat=2, bv=60
const totalWeaponHeat = 10 + 2;
const totalWeaponBV = 176 + 60;
console.log('Total weapon heat:', totalWeaponHeat);
console.log('Total weapon BV (before heat):', totalWeaponBV);

// Heat efficiency:
// 10 DHS = 20 heat dissipation
// runningHeat: engine type XL -> 2
// jumpHeat: 0 (no jump)
// moveHeat = max(2, 0) = 2
// heatEfficiency = 6 + 20 - 2 = 24
const heatEff = 6 + 20 - 2;
console.log('Heat efficiency:', heatEff);
console.log('Total weapon heat:', totalWeaponHeat, '<=', heatEff, '-> all weapons full BV');

// WeaponBV (with modifiers): all front-facing, no rear, no TC, no AES, no Artemis
const weaponBV = totalWeaponBV;
console.log('WeaponBV:', weaponBV);

// Ammo BV
// LAC-2 ammo: The report says ammoBV=8, which seems right for LAC-2 ammo
console.log('AmmoBV (from report):', 8);

// Weight bonus
const weightBonus = 35;
console.log('WeightBonus:', weightBonus);

// Speed factor
const sf = calculateOffensiveSpeedFactor(11, 0);
console.log('SpeedFactor:', sf, '(runMP=11, jumpMP=0)');
// mp = 11 + round(0/2) = 11
// sf = pow(1 + (11-5)/10, 1.2) = pow(1.6, 1.2) = 1.7577 (approx)

const baseOff = weaponBV + 8 + weightBonus;
console.log('BaseOff = weaponBV + ammoBV + weightBonus =', weaponBV, '+ 8 +', weightBonus, '=', baseOff);
const totalOff = baseOff * sf;
console.log('TotalOff =', baseOff, '*', sf, '=', totalOff);
console.log('(Validation report says:', 490.3983, ')');
console.log('');

// ----- TOTAL BV -----
const totalBV = totalDef + totalOff;
console.log('Total = DefBV + OffBV =', totalDef, '+', totalOff, '=', totalBV);
console.log('Rounded:', Math.round(totalBV));
console.log('Reference:', 1101);
console.log('With * 0.95:', Math.round(totalBV * 0.95));
console.log('');

// Now the question is: WHERE does the 0.95 come from?
// Our total = 1158.6 (rounds to 1159)
// Reference = 1101
// 1101 / 1158.6 = 0.9503

// Let me now check MegaMek's BV calculation process:
// 1. processArmor() -> armorBV (same as ours)
// 2. processStructure() -> structureBV (same)
// 3. processGyro() -> gyroBV (same)
// 4. processExplosiveEquipment() -> explosive penalty (same)
// 5. processDefensiveEquipment() -> def equip BV
// 6. processDefensiveFactor() -> defensive factor = 1 + TMM
// 7. defensiveBV = (armorBV + structBV + gyroBV + defEquipBV - explosivePenalty) * defensiveFactor
// 8. processWeapons() -> weapon BV with heat tracking
// 9. processAmmo() -> ammo BV
// 10. processWeight() -> weight bonus = tonnage (with TSM multiplier)
// 11. processOffensiveSpeedFactor() -> speed factor
// 12. offensiveBV = (weaponBV + ammoBV + weightBonus + offEquipBV + physBV) * speedFactor
// 13. baseBV = defensiveBV + offensiveBV
// 14. cockpitModifier applied
// 15. pilotModifier applied (1.0 for 4/5)
// 16. totalBV = round(baseBV * cockpitMod * pilotMod)

// Hmm, let me check: does MegaMek apply cockpitModifier × pilotModifier TOGETHER?
// Or does it round cockpit first, then round pilot?

// In MegaMek's MekBVCalculator, the final calculation is:
// double adjustedBV = baseBV;
// adjustedBV *= cockpitMultiplier;  // cockpit modifier
// adjustedBV = Math.round(adjustedBV);  // round after cockpit
// adjustedBV *= pilotModifier;  // pilot skill modifier
// adjustedBV = Math.round(adjustedBV);  // round after pilot

// For standard cockpit: cockpitMultiplier = 1.0
// For 4/5 pilot: pilotModifier = 1.0
// So neither should affect the BV.

// WAIT - let me re-examine this more carefully.
// In MegaMek MekBVCalculator.java, there's a `processOffensiveTypeModifier()`:
// This method applies:
// - Industrial mech modifier (×0.9)
// - AND importantly: for production/experimental/custom units,
//   there may be additional modifiers.
//
// But the Blade is a standard BattleMech, not industrial.

// Let me check: is there a modifier for "EXPERIMENTAL" or "ADVANCED" tech level?
// In TechManual p.313, the BV formula states:
// "Multiply the total BV by the appropriate Factor from Table 3"
// Table 3: Pilot Skill modifier. No tech level modifier.

// OK, let me try a completely different approach.
// Let me check if our armorBV formula is wrong for REACTIVE armor.
// In MegaMek, reactive armor multiplier for BV is... let me check.
// getBVTypeModifier() for reactive returns 1.0 (NOT 1.5!)
// WAIT - that can't be right. Let me verify.

// Actually, in MegaMek's EquipmentType, reactive armor does have a BV modifier.
// But the modifier might be applied differently.
// In MegaMek's Mek.java:
// - getArmorFactor(): returns 2.5 for standard, but for reactive it returns...
// The armor factor is ALWAYS 2.5 for all armor types.
// The armor TYPE modifier is applied to the DEFENSIVE FACTOR, not to the armor BV directly.

// WAIT. Let me reconsider.
// In MegaMek's MekBVCalculator:
// processArmor() line ~440:
//   armorFactor = 2.5;  -- ALWAYS 2.5
//   bvArmor += armor[loc] * armorFactor;
//   (no armor type modifier here!)
//
// Then in processDefensiveFactor():
//   the TMM is calculated, and...
//   Actually, the armor type modifier might be part of the BAR calculation.
//   BAR (Barrier Armor Rating): for standard armor BAR=10, so /10 = 1.0
//   For reactive armor: BAR=10, so /10 = 1.0
//   The 1.5x for reactive comes from somewhere else.

// ACTUALLY - let me re-read the code more carefully.
// In MegaMek MekBVCalculator.processArmor():
//   double armorFactor = entity.getBARRating(loc) / 10.0;
//   if (entity.getArmorType(loc) == EquipmentType.T_ARMOR_REACTIVE) {
//     // Reactive armor: base 2.5, NOT multiplied by type modifier
//   }
//   bvArmor += entity.getArmor(loc) * 2.5 * armorFactor;
//
// Wait no, I need to actually look at this properly.
// The BV calculation for armor in TechManual:
//   Total Armor BV = Total Armor Points × 2.5
//   Then modified by armor type multiplier (separate from the BV per point)
//   Reactive armor: ×1.0 (no modifier on armor points, but +1 to defensive modifier?)
//
// ACTUALLY: I think the armor type modifier goes into the DEFENSIVE FACTOR, not the armor BV.
// Let me check what our getArmorBVMultiplier returns for reactive.
console.log('=== ARMOR TYPE MODIFIER CHECK ===');
console.log('Reactive:', getArmorBVMultiplier('reactive'));
console.log('Standard:', getArmorBVMultiplier('standard'));
console.log('Hardened:', getArmorBVMultiplier('hardened'));
console.log('Reflective:', getArmorBVMultiplier('reflective'));

// If reactive is 1.5 in our code but should be 1.0 in MegaMek, that would overcalculate
// Blade's armorBV by 50%!
// Our armorBV = 119 * 2.5 * 1.5 = 446.25
// If it should be 119 * 2.5 * 1.0 = 297.5
// Difference: 148.75
// After defensive factor (1.4): 148.75 * 1.4 = 208.25
// So new defBV = 668.22 - 208.25 = 459.97
// New total = 459.97 + 490.40 = 950.37
// But reference = 1101, so this is too LOW.
// So reactive armor 1.0 doesn't work either.

// Let me check: what does MegaMek actually use?
// MegaMek's getBVTypeModifier() for armor types.
// I'll check the actual MegaMek source patterns.

// Actually, I think the issue might be different. Let me check if MegaMek's
// defensive factor formula is different from ours.
//
// MegaMek MekBVCalculator.processDefensiveFactor():
//   double totalModifier = 1.0;
//   totalModifier += entity.getRunMP(MPCalculationSetting.BV_MOVEMENT) * ... wait
//
// Actually in MegaMek the defensive factor is calculated differently:
// It uses:
//   1 + targetModifier
// where targetModifier = max(runTMM, jumpTMM) / 10.0
// WAIT - is it divided by 10 or just added?
//
// Our code: defensiveFactor = 1 + maxTMM / 10.0
// MegaMek: defensiveFactor = 1 + (double)tmmRan / 10.0 (where tmmRan is the TMM value)
// These should be the same.

// Let me try yet another angle: check if the Blade's reference BV of 1101
// could be calculated with a DIFFERENT armor multiplier.
console.log('\n=== WHAT ARMOR MULTIPLIER GIVES REFERENCE BV? ===');
// totalBV = (armorBV + structBV + gyroBV - explPen) * defFactor + offBV
// 1101 = (119 * 2.5 * X + 43.5 + 17.5 - 30) * 1.4 + 490.40
// 1101 - 490.40 = 610.60
// 610.60 / 1.4 = 436.14
// 436.14 - 43.5 - 17.5 + 30 = 405.14
// 405.14 / (119 * 2.5) = 1.361
console.log('Working backward: armor multiplier =', ((1101 - 490.40) / 1.4 - 43.5 - 17.5 + 30) / (119 * 2.5));

// Hmm, 1.36 doesn't match any known multiplier. Let me try with the exact validation values.
const valResult = data.allResults.find((d: any) => d.unitId === 'blade-bld-xr');
if (valResult) {
  console.log('\nValidation breakdown:');
  console.log('  defBV:', valResult.breakdown.defensiveBV);
  console.log('  offBV:', valResult.breakdown.offensiveBV);
  console.log('  total:', valResult.calculatedBV);

  // If we need total = 1101, and offBV stays at 490.40, defBV should be:
  const neededDef = 1101 - 490.40;
  console.log('  Needed defBV for ref 1101:', neededDef);
  console.log('  Our defBV:', valResult.breakdown.defensiveBV);
  console.log('  Excess defBV:', valResult.breakdown.defensiveBV - neededDef);
  console.log('  Ratio:', (neededDef / valResult.breakdown.defensiveBV).toFixed(4));

  // If we need total = 1101 and apply 0.95 to both sides:
  const neededDef2 = 1101 * valResult.breakdown.defensiveBV / valResult.calculatedBV;
  const neededOff2 = 1101 * valResult.breakdown.offensiveBV / valResult.calculatedBV;
  console.log('  Proportional defBV:', neededDef2.toFixed(2), '(ours:', valResult.breakdown.defensiveBV, ')');
  console.log('  Proportional offBV:', neededOff2.toFixed(2), '(ours:', valResult.breakdown.offensiveBV, ')');
}

// Let me also check: does MegaMek round the defensive BV before adding to offensive?
console.log('\n=== ROUNDING HYPOTHESIS ===');
console.log('If defBV is rounded to integer:');
const roundedDef = Math.round(totalDef);
console.log('  Round(', totalDef, ') =', roundedDef);
console.log('  Round(offBV) =', Math.round(totalOff));
console.log('  Sum =', roundedDef + Math.round(totalOff));

// What if BOTH defBV and offBV are calculated at 0.95x?
// (armorBV + structBV + gyroBV - explPen) * defFactor * 0.95 +
// (weaponBV + ammoBV + weightBonus) * speedFactor * 0.95
// = ((armorBV + structBV + gyroBV - explPen) * defFactor +
//    (weaponBV + ammoBV + weightBonus) * speedFactor) * 0.95
// = totalBV * 0.95
// This is just total * 0.95, which is what we already know works.

// So the 0.95 factor applies to the TOTAL, not to a specific component.
// Possible sources:
// 1. A missing cockpit modifier (but we checked, it's STANDARD -> 1.0)
// 2. A missing pilot modifier (but 4/5 -> 1.0)
// 3. A missing "type" modifier (industrial mech -> 0.9, standard mech -> ???)
// 4. The armor type multiplier being wrong (but it's applied consistently)
// 5. Some other global modifier we don't know about

// Let me check: could there be a BAR (Barrier Armor Rating) issue?
// Standard armor BAR = 10, so /10 = 1.0
// But what if we're not dividing by 10 somewhere?

// Our formula: armorBV = Math.round(totalArmorPoints * 2.5 * armorMultiplier * bar) / 10
// where bar = 10 for standard
// = round(119 * 2.5 * 1.5 * 10) / 10
// = round(4462.5) / 10
// = 4463 / 10
// = 446.3

// What if bar should not be in the multiplication?
// armorBV = totalArmorPoints * 2.5 * armorMultiplier
// = 119 * 2.5 * 1.5
// = 446.25

// The bar is for BAR rating, where most armor is 10 (full).
// ArmorBV = armorPoints * 2.5 * armorMultiplier * (bar/10)
// For bar=10: * (10/10) = * 1.0
// So it doesn't matter for standard BAR.

// Let me try something completely different.
// What if the 0.95x is actually from how MegaMek rounds between steps?
// MegaMek's BV calculation does:
// 1. Round defensiveBV to nearest integer
// 2. Round offensiveBV separately
// 3. Add them
// But rounding to integers doesn't lose 5%.

// FINAL HYPOTHESIS: Check if our units should have a DIFFERENT cockpit type.
// What if the unit data says "STANDARD" but MegaMek actually treats these mechs
// as having a different cockpit?

// Or: what if there's a SUPERHEAVY cockpit modifier?
// Superheavy mechs (>100 tons) use a different cockpit.
// But Blade is 35 tons.

// Actually, let me search for any modifier that's EXACTLY 0.95.
// In MegaMek MekBVCalculator:
// - Cockpit modifier for Small = 0.95 ✓
// - DroneOS = 0.95 ✓
// - Torso-mounted = 0.95 ✓
// - Industrial AFC modifier = 0.9 (not 0.95)
// - C3 reduction? No, C3 doesn't reduce base BV.

// WAIT - let me check another thing entirely.
// What if the issue is that these units actually DO have a special cockpit
// in MegaMek but our data says "STANDARD"?
// For example, what if MegaMek's MTF files for these units list a different
// cockpit type than what we have in our JSON data?
// This could happen if the data conversion lost the cockpit info.

// Let me check a few units' actual cockpit values in the unit data
console.log('\n=== CHECKING UNIT DATA COCKPIT FIELDS ===');
const testIds = [
  'blade-bld-xr',
  'assassin-asn-109',
  'archangel-c-ang-ob-infernus',
  'black-knight-blk-nt-2y',
  'barghest-bgs-4x',
  'axman-axm-6t',
  'eyleuka-eyl-45b',
];

for (const uid of testIds) {
  const iu = indexData.units.find((u: any) => u.id === uid);
  if (!iu) { console.log(uid + ': NOT FOUND'); continue; }
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const headCrits = unit.criticalSlots?.HEAD || [];
  console.log(`${uid}: cockpit="${unit.cockpit}" head=[${headCrits.join(', ')}]`);
}
