import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
import { calculateOffensiveSpeedFactor, calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, getCockpitModifier, calculateTMM } from '../src/utils/construction/battleValueCalculations';
import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier } from '../src/types/validation/BattleValue';

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

// =============================
// JENNER JR7-D (Webster) - Simple case: 6x Medium Laser
// =============================
console.log('=== Jenner JR7-D (Webster) - Detailed Trace ===');
console.log('Reference BV: 930, Our calc: 1085, Diff: +155 (16.7%)');
console.log('');

// Defensive BV
const jennerArmor = 11 + 11 + (14+7) + (14+7) + (17+8) + 9 + 15 + 15; // from data file
const jennerStruct = calcTotalStructure(35);

// walk=7, run=ceil(7*1.5)=11, jump=7
const jennerRunMP = Math.ceil(7 * 1.5);
console.log('Movement: walk=7, run=' + jennerRunMP + ', jump=7');

const jennerDefResult = calculateDefensiveBV({
  totalArmorPoints: jennerArmor,
  totalStructurePoints: jennerStruct,
  tonnage: 35,
  runMP: jennerRunMP,
  jumpMP: 7,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.STANDARD,
});
console.log('Defensive BV:', jennerDefResult.totalDefensiveBV.toFixed(2));
console.log('  armorBV:', jennerDefResult.armorBV, 'structBV:', jennerDefResult.structureBV, 'gyroBV:', jennerDefResult.gyroBV);
console.log('  defensiveFactor:', jennerDefResult.defensiveFactor);

// Offensive BV
const jennerHeatDiss = 10 * 2; // 10 DHS
const jennerWeapons = Array.from({length: 6}, () => ({
  id: 'medium-laser', name: 'medium-laser', heat: 3, bv: 46,
  rear: false, isDirectFire: true, location: 'LEFT_ARM',
}));

const jennerOffResult = calculateOffensiveBVWithHeatTracking({
  weapons: jennerWeapons,
  tonnage: 35,
  walkMP: 7,
  runMP: jennerRunMP,
  jumpMP: 7,
  heatDissipation: jennerHeatDiss,
  engineType: EngineType.STANDARD,
});
console.log('Offensive BV:', jennerOffResult.totalOffensiveBV.toFixed(2));
console.log('  weaponBV:', jennerOffResult.weaponBV, 'ammoBV:', jennerOffResult.ammoBV);
console.log('  weightBonus:', jennerOffResult.weightBonus, 'speedFactor:', jennerOffResult.speedFactor);

const jennerTotalBV = Math.round(jennerDefResult.totalDefensiveBV + jennerOffResult.totalOffensiveBV);
console.log('Total BV:', jennerTotalBV, '(ref: 930, diff:', jennerTotalBV - 930, ')');
console.log('');

// Now let's think about what MegaMek's BV should be:
// MegaMek: runMP for BV with 7 walk = ceil(1.5*7) = 11 (NO MASC/SC)
// speed factor: mp = 11 + round(7/2) = 11 + 4 = 15
// MegaMek speed factor = pow(1 + (15-5)/10, 1.2) = pow(2.0, 1.2) = 2.2974
console.log('Checking speed factor vs MegaMek formula:');
console.log('  mp = 11 + round(7/2) =', 11 + Math.round(7/2));
console.log('  pow(1 + (15-5)/10, 1.2) =', Math.pow(1 + (15-5)/10, 1.2).toFixed(4));
console.log('  Our speed factor:', jennerOffResult.speedFactor);
console.log('');

// Heat efficiency for Jenner
// heatDiss = 20, runningHeat = 2, jumpHeat = max(3, 7) = 7
// moveHeat = max(2, 7) = 7
// heatEfficiency = 6 + 20 - 7 = 19
console.log('Heat efficiency calculation:');
console.log('  heatDiss=20, runningHeat=2, jumpHeat=max(3,7)=7');
console.log('  moveHeat=max(2,7)=7');
console.log('  heatEfficiency = 6 + 20 - 7 =', 6 + 20 - 7);
console.log('  Total weapon heat = 6*3 = 18');
console.log('  So 18 < 19 => NO weapon gets halved');
console.log('  weaponBV = 6 * 46 = 276 (matches)');
console.log('');

// Defensive side analysis
console.log('Defensive BV analysis:');
console.log('  TMM(run=11) =', calculateTMM(11, 0));
console.log('  TMM(jump=7) + 1 =', calculateTMM(0, 7));
console.log('  TMM (max of run/jump) =', calculateTMM(11, 7));
console.log('  defensiveFactor = 1 + TMM/10 =', 1 + calculateTMM(11, 7) / 10);
console.log('');

// The issue: our offensive BV for Jenner = 714, which = (276 + 0 + 0 + 35) * 2.2974 = 714.49
// If MegaMek's reference is 930 total, and our defensive is ~370...
// Then reference offensive should be ~930 - 370 = 560
// 560 / 2.2974 = 243.7 base offensive
// But our base = 276 + 35 = 311
// So the issue is either:
// 1. Our weapon BV is too high (276 vs ~208.7 needed)
// 2. Our weight bonus is too high (35 vs needed)
// 3. Our speed factor is wrong
// 4. Our defensive BV is wrong

// Let's check if Jenner actually uses IS medium lasers at 46 BV
// or if MegaMek gives them different BV values
console.log('Checking: what if weapon BV or speed factor is different?');
console.log('  Our calc: (276 + 35) * 2.2974 =', (276 + 35) * 2.2974);
console.log('  For reference BV 930, defensive ~370:');
console.log('    needed offensive = 560');
console.log('    needed base = 560 / 2.2974 = ', (560/2.2974).toFixed(1));
console.log('    That would need weaponBV = ' + ((560/2.2974 - 35).toFixed(1)));
console.log('');

// =============================
// Hatamoto-Chi (Lowenbrau) - MASC unit
// =============================
console.log('=== Hatamoto-Chi HTM-27T (Lowenbrau) - MASC Analysis ===');
console.log('Has MASC, walk=4');
console.log('');

// MASC: runMP = walk * 2 = 8
// But wait - for MegaMek BV, does MASC use walk*2 or ceil(walk*1.5) for base run + MASC speed?
// MegaMek BV: MASC/SC does NOT directly give a "run" MP.
// MegaMek: getRunMP(useMaxMASC, onlyBV) uses maxMASCBonus which adds to the run MP.
// For BV purposes: MASC doubles walk → "BV run MP" = walk * 2
// So walk=4, MASC run=8

// But the key question: Is speed factor based on MASC-boosted run?
// MegaMek's calculateOffensiveSpeedFactor:
//   mp = runMP + round(jumpMP / 2.0)
// And runMP for BV includes MASC bonus.

// Our code calculates: runMP = cs.hasMASC ? bvWalk * 2 : ceil(bvWalk * 1.5)
// For Hatamoto: runMP = 4 * 2 = 8
// speedFactor: mp = 8 + 0 = 8, pow(1 + 3/10, 1.2) = 1.37
console.log('Hatamoto speed: walk=4, MASC run=8, jump=0');
console.log('  mp = 8 + 0 = 8');
console.log('  speed factor = pow(1 + (8-5)/10, 1.2) =', Math.pow(1 + 3/10, 1.2).toFixed(4));
console.log('');

// Our calc: defBV=1092.65, offBV=772.68
// Total = 1092.65 + 772.68 = 1865
// Ref = 1584
// Diff = 281

// Let's check what the defensive BV should be
console.log('Hatamoto defensive:');
const hatArmor = 26 + 26 + (25+9) + (25+9) + (34+16) + 9 + 34 + 34; // 247
console.log('  Total armor:', hatArmor);
const hatStruct = calcTotalStructure(80);
console.log('  Total structure:', hatStruct);

// For BV defensive factor with MASC: run=8, jump=0
// TMM(8) = 3
// defensiveFactor = 1.3
const hatTMM = calculateTMM(8, 0);
console.log('  TMM(run=8, jump=0):', hatTMM);
console.log('  defensiveFactor:', 1 + hatTMM / 10);

const hatDefResult = calculateDefensiveBV({
  totalArmorPoints: hatArmor,
  totalStructurePoints: hatStruct,
  tonnage: 80,
  runMP: 8,
  jumpMP: 0,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.STANDARD,
});
console.log('  Our defBV:', hatDefResult.totalDefensiveBV.toFixed(2));
console.log('');

// Check: For reference BV 1584, if defBV is right at ~1093:
// offBV = 1584 - 1093 = 491
// our offBV = 773
// offBV excess = 773 - 491 = 282

// Our offensive: (470 + 14 + 0 + 80) * 1.37 = 771.78
// If reference offensive = 491: 491 / 1.37 = 358.4
// weaponBV + ammoBV + weightBonus = 358.4
// weaponBV = 358.4 - 14 - 80 = 264.4

// But 2x PPC (176 each) = 352, so weapon BV after heat should be < 352
// Heat: heatDiss = 14 * 2 = 28, runningHeat = 2, jumpHeat = 0
// moveHeat = 2
// heatEfficiency = 6 + 28 - 2 = 32
// PPC heat = 10 each, SRM-6 heat = 4 each
// Total weapon heat = 20 + 8 = 28 < 32 → all weapons at full BV
// weaponBV = 352 + 118 = 470

// So MegaMek may NOT use MASC run for BV speed factor OR defensive factor...
// Let me check: without MASC, run = ceil(4*1.5) = 6
// speedFactor: mp = 6 + 0 = 6, pow(1 + 1/10, 1.2) = 1.1212
// defensive factor: TMM(6) = 2, factor = 1.2

console.log('What if MASC does NOT contribute to speed factor?');
console.log('  Normal run: ceil(4*1.5) = 6');
const noMascSpeedFactor = calculateOffensiveSpeedFactor(6, 0);
console.log('  speed factor with run=6:', noMascSpeedFactor);
console.log('  offensive = (470 + 14 + 80) * ' + noMascSpeedFactor + ' =', (470 + 14 + 80) * noMascSpeedFactor);
console.log('');

const noMascDefResult = calculateDefensiveBV({
  totalArmorPoints: hatArmor,
  totalStructurePoints: hatStruct,
  tonnage: 80,
  runMP: 6,
  jumpMP: 0,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.STANDARD,
});
console.log('  defBV with run=6:', noMascDefResult.totalDefensiveBV.toFixed(2));
const noMascTotal = Math.round(noMascDefResult.totalDefensiveBV + (470 + 14 + 80) * noMascSpeedFactor);
console.log('  Total without MASC speed:', noMascTotal, '(ref: 1584)');
console.log('');

// =============================
// Gladiator A - MASC + Jump
// =============================
console.log('=== Gladiator A - MASC + Jump Analysis ===');
console.log('walk=4, MASC, jump=4');
console.log('');

// With MASC: run = 4*2 = 8
// mp = 8 + round(4/2) = 8+2 = 10
// speed = pow(1+(10-5)/10, 1.2) = pow(1.5, 1.2) = 1.6267
console.log('With MASC: run=8, jump=4');
console.log('  mp = 8 + 2 = 10');
console.log('  speed factor:', calculateOffensiveSpeedFactor(8, 4));

// Without MASC: run = ceil(4*1.5) = 6
// mp = 6 + 2 = 8
// speed = pow(1.3, 1.2) = 1.37
console.log('Without MASC: run=6, jump=4');
console.log('  mp = 6 + 2 = 8');
console.log('  speed factor:', calculateOffensiveSpeedFactor(6, 4));

// Our breakdown: weaponBV=1129, ammoBV=1, tonnage=95
// offBV = 1992.71 with SF 1.6267
// base = 1992.71 / 1.6267 = 1225
// 1225 - 95 - 1 = 1129 weapon BV (correct)
// With non-MASC SF 1.37: offBV = (1129 + 1 + 95) * 1.37 = 1678.25
// + defBV: need to check with non-MASC TMM too

const gladArmor = 32+32+(20+10)+(20+10)+(37+9)+9+40+40; // 259
const gladStruct = calcTotalStructure(95);
const gladDefNoMasc = calculateDefensiveBV({
  totalArmorPoints: gladArmor,
  totalStructurePoints: gladStruct,
  tonnage: 95,
  runMP: 6,
  jumpMP: 4,
  armorType: 'standard',  // ferro fibrous clan
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.XL_CLAN,
});
const gladOffNoMasc = (1129 + 1 + 95) * calculateOffensiveSpeedFactor(6, 4);
const gladTotalNoMasc = Math.round(gladDefNoMasc.totalDefensiveBV + gladOffNoMasc);
console.log('Gladiator without MASC speed: total =', gladTotalNoMasc, '(ref: 2194, our:', 3108, ')');
console.log('  defBV without MASC:', gladDefNoMasc.totalDefensiveBV.toFixed(2));
console.log('  offBV without MASC:', gladOffNoMasc.toFixed(2));
console.log('');

// =============================
// CONCLUSION: Check if MegaMek DOES or DOESN'T use MASC in speed factor
// =============================
console.log('=== MASC Speed Factor Hypothesis ===');
console.log('');
console.log('Hypothesis: MASC/Supercharger should NOT boost runMP for offensive speed factor');
console.log('');

// Test: Hatamoto with normal run
const hatOffNoMasc = calculateOffensiveBVWithHeatTracking({
  weapons: [
    { id: 'ppc', name: 'ppc', heat: 10, bv: 176, rear: false, isDirectFire: true, location: 'LEFT_ARM' },
    { id: 'ppc', name: 'ppc', heat: 10, bv: 176, rear: false, isDirectFire: true, location: 'RIGHT_ARM' },
    { id: 'srm-6', name: 'srm-6', heat: 4, bv: 59, rear: false, isDirectFire: false, location: 'LEFT_TORSO' },
    { id: 'srm-6', name: 'srm-6', heat: 4, bv: 59, rear: false, isDirectFire: false, location: 'RIGHT_TORSO' },
  ],
  ammo: [
    { id: 'srm-6-ammo', bv: 7, weaponType: 'srm-6' },
    { id: 'srm-6-ammo', bv: 7, weaponType: 'srm-6' },
  ],
  tonnage: 80,
  walkMP: 4,
  runMP: 6,  // Normal (no MASC)
  jumpMP: 0,
  heatDissipation: 28,
  engineType: EngineType.STANDARD,
});

console.log('Hatamoto offBV with NORMAL run=6:', hatOffNoMasc.totalOffensiveBV.toFixed(2));
console.log('  speed factor:', hatOffNoMasc.speedFactor);
console.log('  weaponBV:', hatOffNoMasc.weaponBV);
console.log('');

// But MASC DOES affect defensive factor (TMM)
// MegaMek: processDefensiveFactor() uses getRunMP(true, true) which INCLUDES MASC
console.log('Key question: Does MASC affect DEFENSIVE TMM but NOT offensive speed factor?');
console.log('');

// Actually let me re-read MegaMek more carefully...
// In MegaMek BVCalculator:
// - Defensive: uses entity.getRunMP(useMaxMASC=true, onlyBV=true)
// - Offensive: processOffensiveSpeedFactor() also uses entity.getRunMP(true, true)
// So MASC DOES affect BOTH defensive and offensive in MegaMek.
// Let's look for another issue.

// Wait - the overcalculated amount for Hatamoto is 281 BV (17.7%)
// With MASC: def=1093, off=773, total=1866 (ref=1584)
// Without MASC: def=~1008 (TMM=2), off = (470+14+80)*1.1212 = 632, total = ~1640
// Still over by 56.
// Hmm, let me check if MASC contributes LESS than doubling.

// Actually MegaMek getRunMP(true,true) for MASC:
// getMASCRunMP() returns walkMP + mascBonus where mascBonus = ceil(walkMP * 0.5)
// So MASC run = walk + ceil(walk/2) = 4 + 2 = 6 (same as normal run!)
// Wait no... MASC gives +1 to run MP bonus?
// Let me check the MegaMek source more carefully.

console.log('CRITICAL CHECK: How does MegaMek calculate MASC run MP?');
console.log('  Option A: run = walk * 2 (our current code)');
console.log('  Option B: run = ceil(walk * 1.5) + mascBonus (MegaMek style)');
console.log('');
console.log('MegaMek Mech.java getRunMP():');
console.log('  baseRunMP = (int)Math.ceil(walkMP * 1.5)');
console.log('  mascRunMP = walkMP + (int)Math.ceil(walkMP * 0.5) [i.e., same as baseRunMP]');
console.log('  ..but with useMaxMASC=true: getRunMP returns entity.getRunMP() including MASC bonus');
console.log('');
console.log('For MASC, MegaMek adds +1 to run per walk point');
console.log('  walk=4: normal run=6, MASC run=8 (walk*2)');
console.log('  walk=5: normal run=8, MASC run=10 (walk*2)');
console.log('');

// So our formula walk*2 may be correct. The question is whether MegaMek uses
// the MASC-boosted run or normal run in BV calculations.

// Let me look at this differently. For the Hatamoto, reference is 1584.
// Try: defFactor with MASC TMM, but offBV speed factor WITHOUT MASC:
const hatDefWithMasc = calculateDefensiveBV({
  totalArmorPoints: hatArmor,
  totalStructurePoints: hatStruct,
  tonnage: 80,
  runMP: 8,  // MASC for defense
  jumpMP: 0,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.STANDARD,
});
console.log('Test: MASC for defense, no MASC for offense:');
console.log('  defBV:', hatDefWithMasc.totalDefensiveBV.toFixed(2));
console.log('  offBV with SF 1.1212:', ((470+14+80)*1.1212).toFixed(2));
console.log('  total:', Math.round(hatDefWithMasc.totalDefensiveBV + (470+14+80)*1.1212), '(ref: 1584)');
console.log('');

// Hmm still not right. Let me calculate the Hatamoto backwards from 1584.
console.log('Working backwards from reference BV 1584 for Hatamoto:');
// If cockpit modifier = 1.0:
// defBV + offBV = 1584
// offBV = (weaponBV + ammoBV + weightBonus) * speedFactor
// Need to figure out what speed factor MegaMek uses

// Try several speed factors:
for (const sf of [1.0, 1.1, 1.1212, 1.2, 1.37, 1.4]) {
  const offBV = (470 + 14 + 80) * sf;
  const defBV = 1584 - offBV;
  console.log(`  SF=${sf}: offBV=${offBV.toFixed(0)}, needed defBV=${defBV.toFixed(0)} (our: ${hatDefWithMasc.totalDefensiveBV.toFixed(0)})`);
}
