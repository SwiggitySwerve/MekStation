import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
import { calculateOffensiveSpeedFactor, calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, calculateTMM } from '../src/utils/construction/battleValueCalculations';
import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import { getArmorBVMultiplier } from '../src/types/validation/BattleValue';

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

// ===== Jenner JR7-D Webster: CORRECT arithmetic =====
console.log('=== Jenner JR7-D (Webster) ===');
const jennerPath = 'public/data/units/battlemechs/4-clan-invasion/advanced/Jenner JR7-D (Webster).json';
const jenner = JSON.parse(fs.readFileSync(jennerPath, 'utf8'));
const jennerArmor = calcTotalArmor(jenner.armor.allocation);
const jennerStruct = calcTotalStructure(35);
console.log('Total armor:', jennerArmor, '(expected ~64)');
console.log('Total structure:', jennerStruct);

// walk=7, run=ceil(7*1.5)=11, jump=7
const jennerRun = Math.ceil(7 * 1.5);
const jennerDef = calculateDefensiveBV({
  totalArmorPoints: jennerArmor,
  totalStructurePoints: jennerStruct,
  tonnage: 35,
  runMP: jennerRun,
  jumpMP: 7,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.STANDARD,
});
console.log('DefBV:', jennerDef.totalDefensiveBV.toFixed(2), '(report says 370.3)');
console.log('  armorBV:', jennerDef.armorBV, 'structBV:', jennerDef.structureBV.toFixed(2), 'gyroBV:', jennerDef.gyroBV);
console.log('  factor:', jennerDef.defensiveFactor);

// Offensive: 6x ML, 20 heat diss, jump=7
// engine rating 245 -> 245/25=9 integrated HS
// 10 total DHS -> 10*2=20 heat diss
// But wait: the crit slots show 1 ISDoubleHeatSink (3 slots) in RT
// That's 1 external DHS = 10 total (9 integrated + 1 external)
// 10 DHS * 2 = 20 heat dissipation
console.log('');
console.log('Offensive:');
console.log('  heatDiss: 10 DHS * 2 = 20');
console.log('  runningHeat: 2');
console.log('  jumpHeat: max(3, 7) = 7');
console.log('  moveHeat: max(2, 7) = 7');
console.log('  heatEfficiency: 6 + 20 - 7 = 19');
console.log('  6x ML: heat=18, BV=276');
console.log('  18 < 19 -> all weapons full BV');
console.log('  weaponBV = 276');
console.log('  weightBonus = 35');
console.log('  SF = pow(1 + (15-5)/10, 1.2) =', calculateOffensiveSpeedFactor(jennerRun, 7));
console.log('  offBV = (276 + 0 + 0 + 35) * 2.2974 =', (276 + 35) * 2.2974);
console.log('');
console.log('Total = defBV + offBV =', (jennerDef.totalDefensiveBV + (276 + 35) * 2.2974).toFixed(0), '(ref: 930)');
console.log('');

// The reference says 930. Our calc says 1085. So we're 155 over.
// offBV = 714 is the main contributor.
// MegaMek BV for 6x IS ML should give 276 * something...
// Actually, MegaMek's reference is via MUL ID 8282.
// Let me check what MegaMek actually gives.

// Let me look at this from MegaMek's perspective:
// DefBV: should be around 370 (matches our calc)
// OffBV: reference total = 930 - 370 = 560
// Our offBV = 714
// Excess = 154
//
// 714 / 2.2974 = 310.7 (base offensive)
// 560 / 2.2974 = 243.7 (needed base offensive)
// Difference = 67
// weightBonus = 35
// So our weapon+ammo = 276, and needed weapon+ammo = 243.7 - 35 = 208.7
//
// WAIT - does MegaMek use a weight bonus of 35t?
// For IS mech with no TSM: weightBonus = tonnage / 2 = 17.5???
//
// Let me re-check the weight bonus formula!

console.log('=== WEIGHT BONUS CHECK ===');
console.log('MegaMek processWeight():');
console.log('  dbv = entity.getWeight()  -- this is tonnage');
console.log('  For standard mech: no modifier');
console.log('  dbv added directly to offensiveBV');
console.log('');
console.log('Our code: weightBonus = config.tonnage (no TSM) = 35 for Jenner');
console.log('');
console.log('If weight bonus = tonnage:');
console.log('  (276 + 35) * 2.2974 = 714.5');
console.log('If weight bonus = tonnage/2:');
console.log('  (276 + 17.5) * 2.2974 = 674.3');
console.log('Neither matches reference offBV of ~560');
console.log('');

// Let me check if MegaMek adds weight bonus INSIDE the speed factor multiplication
// or OUTSIDE it. The code shows:
// baseOffensive = weaponBV + ammoBV + physicalWeaponBV + weightBonus + offensiveEquipmentBV
// totalOffensiveBV = baseOffensive * speedFactor
// So weight bonus IS inside speed factor. This matches MegaMek.

// Let me think about what could cause a 67 BV base offset...
// If the speed factor is wrong:
// Our SF = 2.2974, if MegaMek uses a lower SF:
// For reference offBV 560: SF = 560/311 = 1.80 (way too different)
// For reference with correct base: SF = 560/(276+35) = 1.80

// Hmm, what if the jump MP calculation is wrong?
// walk=7, jump=7
// run = ceil(7*1.5) = 11
// mp = 11 + round(7/2) = 11 + 4 = 15
// SF = pow(1 + (15-5)/10, 1.2) = pow(2.0, 1.2) = 2.2974

// But MegaMek uses:
// mp = max(runMP, round(jumpMP * 0.75) + ... ) ?
// Actually I should check the EXACT MegaMek formula.
// MegaMek HeatTrackingBVCalculator.processOffensiveSpeedFactor():
//   int mp = entity.getRunMPforBV() + (int)Math.round(Math.max(entity.getJumpMPforBV(), entity.getUMUMPforBV()) / 2.0);

// So mp = runMP + round(jumpMP / 2.0)
// runMP = ceil(7 * 1.5) = 11
// mp = 11 + round(7/2.0) = 11 + round(3.5) = 11 + 4 = 15
// That's correct.

// speedFactor = Math.pow(1 + ((mp - 5) / 10.0), 1.2)
// = pow(1 + 10/10, 1.2) = pow(2.0, 1.2) = 2.2974

// So our speed factor IS correct for the Jenner.
// The issue must be elsewhere. Let me check the reference BV value.

console.log('=== CHECKING REFERENCE BV VALUES ===');
console.log('');

// Check MUL BV cache
const mulCachePath = 'scripts/data-migration/mul-bv-cache.json';
if (fs.existsSync(mulCachePath)) {
  const mulCache = JSON.parse(fs.readFileSync(mulCachePath, 'utf8'));
  const testUnits = [
    'jenner-jr7-d-webster', 'wyvern-wve-5nsl', 'thunderbolt-tdr-5l',
    'battle-cobra-btl-c-2oc', 'koshi-e', 'man-o-war-e', 'gladiator-a',
    'loki-prime', 'hatamoto-chi-htm-27t-lowenbrau', 'celerity-clr-03-oe',
  ];

  const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

  for (const uid of testUnits) {
    const entry = mulCache.entries?.[uid];
    const iu = indexData.units.find((u: any) => u.id === uid);
    const indexBV = iu?.bv || 0;

    if (entry) {
      console.log(`${uid}:`);
      console.log(`  Index BV: ${indexBV}`);
      console.log(`  MUL BV: ${entry.mulBV} (match: ${entry.matchType})`);
      console.log(`  MUL Name: ${entry.mulName}`);
      if (entry.mulBV !== indexBV && entry.mulBV > 0) {
        console.log(`  ** DIFFERENCE: MUL=${entry.mulBV} vs Index=${indexBV}`);
      }
    } else {
      console.log(`${uid}: NOT in MUL cache (indexBV: ${indexBV})`);
    }
  }
}
