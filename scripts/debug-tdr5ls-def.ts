import { calculateDefensiveBV, calculateExplosivePenalties, type MechLocation, type ExplosiveEquipmentEntry } from '../src/utils/construction/battleValueCalculations';
import { EngineType } from '../src/types/construction/EngineType';

// TDR-5LS: 65t, Standard Fusion, Standard Gyro, Standard Structure, Standard Armor
// Armor: LA=20, RA=20, LT=24+6, RT=24+6, CT=30+11, HD=9, LL=29, RL=29
const totalArmor = 20 + 20 + 24 + 6 + 24 + 6 + 30 + 11 + 9 + 29 + 29;
console.log(`Total armor: ${totalArmor}`);

// Total structure for 65t
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
const totalStructure = STRUCTURE_POINTS_TABLE[65];
console.log(`Total structure: ${totalStructure}`);

// Explosive: LRM-15 ammo x2, SRM-2 ammo x1 in RT. No CASE.
const explosive: ExplosiveEquipmentEntry[] = [
  { location: 'RT', slots: 1, penaltyCategory: 'standard' },
  { location: 'RT', slots: 1, penaltyCategory: 'standard' },
  { location: 'RT', slots: 1, penaltyCategory: 'standard' },
];
const explResult = calculateExplosivePenalties({
  equipment: explosive,
  caseLocations: [],
  caseIILocations: [],
  engineType: EngineType.STANDARD,
});
console.log(`Explosive penalty: ${explResult.totalPenalty}`);

const defResult = calculateDefensiveBV({
  totalArmorPoints: totalArmor,
  totalStructurePoints: totalStructure,
  tonnage: 65,
  runMP: 6,
  jumpMP: 0,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType: EngineType.STANDARD,
  defensiveEquipmentBV: 0,
  explosivePenalties: explResult.totalPenalty,
});

console.log(`\nDefensive BV Breakdown:`);
console.log(`  armorBV: ${defResult.armorBV}`);
console.log(`  structureBV: ${defResult.structureBV}`);
console.log(`  gyroBV: ${defResult.gyroBV}`);
console.log(`  defensiveFactor: ${defResult.defensiveFactor}`);
console.log(`  totalDefensiveBV: ${defResult.totalDefensiveBV}`);
console.log(`\nExpected from report: 796.2`);
