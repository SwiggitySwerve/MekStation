import { EngineType } from '../../types/construction/EngineType';
import { calculateDefensiveBV } from './battleValueDefensive';
import { calculateOffensiveBVWithHeatTracking } from './battleValueOffensive';
import { resolveEquipmentBV } from './equipmentBVResolver';

export type CockpitType =
  | 'standard'
  | 'small'
  | 'torso-mounted'
  | 'small-command-console'
  | 'command-console'
  | 'interface'
  | 'drone-operating-system';

export function getCockpitModifier(cockpitType?: CockpitType): number {
  switch (cockpitType) {
    case 'small':
    case 'torso-mounted':
    case 'small-command-console':
    case 'drone-operating-system':
      return 0.95;
    case 'interface':
      return 1.3;
    default:
      return 1.0;
  }
}

export interface BVCalculationConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  heatSinkCapacity: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  weapons: Array<{ id: string; rear?: boolean }>;
  hasTargetingComputer?: boolean;
  hasDefensiveEquipment?: boolean;
  armorType?: string;
  structureType?: string;
  gyroType?: string;
  engineType?: EngineType;
  engineMultiplier?: number;
  cockpitType?: CockpitType;
  hasStealthArmor?: boolean;
  hasChameleonLPS?: boolean;
  hasNullSig?: boolean;
  hasVoidSig?: boolean;
  hasTSM?: boolean;
  hasIndustrialTSM?: boolean;
  aesArms?: number;
  aesLegs?: number;
  isIndustrialMech?: boolean;
  ammo?: Array<{ id: string; bv: number; weaponType: string }>;
  explosivePenalties?: number;
  defensiveEquipmentBV?: number;
  physicalWeaponBV?: number;
  offensiveEquipmentBV?: number;
  coolantPods?: number;
  heatSinkCount?: number;
  umuMP?: number;
  hasImprovedJJ?: boolean;
  hasPrototypeIJJ?: boolean;
}

export interface BVBreakdown {
  defensiveBV: number;
  offensiveBV: number;
  speedFactor: number;
  totalBV: number;
}

type OffensiveWeaponInput = {
  id: string;
  name: string;
  heat: number;
  bv: number;
  rear?: boolean;
  isDirectFire: boolean;
};

function mapWeaponsForOffensive(
  weapons: Array<{ id: string; rear?: boolean }>,
): OffensiveWeaponInput[] {
  return weapons.map((weapon) => {
    const resolved = resolveEquipmentBV(weapon.id);
    const weaponId = weapon.id.toLowerCase();
    const isDirectFire =
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm') &&
      !weaponId.includes('machine-gun') &&
      !weaponId.includes('flamer');

    return {
      id: weapon.id,
      name: weaponId,
      heat: resolved.heat,
      bv: resolved.battleValue,
      rear: weapon.rear,
      isDirectFire,
    };
  });
}

export function calculateTotalBV(config: BVCalculationConfig): number {
  const defensiveResult = calculateDefensiveBV({
    totalArmorPoints: config.totalArmorPoints,
    totalStructurePoints: config.totalStructurePoints,
    tonnage: config.tonnage,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    armorType: config.armorType,
    structureType: config.structureType,
    gyroType: config.gyroType,
    engineType: config.engineType,
    engineMultiplier: config.engineMultiplier,
    hasStealthArmor: config.hasStealthArmor,
    hasChameleonLPS: config.hasChameleonLPS,
    hasNullSig: config.hasNullSig,
    hasVoidSig: config.hasVoidSig,
    defensiveEquipmentBV: config.defensiveEquipmentBV,
    explosivePenalties: config.explosivePenalties,
    umuMP: config.umuMP,
  });

  const offensiveResult = calculateOffensiveBVWithHeatTracking({
    weapons: mapWeaponsForOffensive(config.weapons),
    ammo: config.ammo,
    tonnage: config.tonnage,
    walkMP: config.walkMP,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    heatDissipation: config.heatSinkCapacity,
    hasTargetingComputer: config.hasTargetingComputer,
    hasTSM: config.hasTSM,
    hasIndustrialTSM: config.hasIndustrialTSM,
    aesArms: config.aesArms,
    aesLegs: config.aesLegs,
    isIndustrialMech: config.isIndustrialMech,
    engineType: config.engineType,
    hasStealthArmor: config.hasStealthArmor,
    hasNullSig: config.hasNullSig,
    hasVoidSig: config.hasVoidSig,
    hasChameleonShield: config.hasChameleonLPS,
    coolantPods: config.coolantPods,
    heatSinkCount: config.heatSinkCount,
    hasImprovedJJ: config.hasImprovedJJ,
    hasPrototypeIJJ: config.hasPrototypeIJJ,
    physicalWeaponBV: config.physicalWeaponBV,
    offensiveEquipmentBV: config.offensiveEquipmentBV,
    umuMP: config.umuMP,
  });

  const baseBV =
    defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV;
  const cockpitModifier = getCockpitModifier(config.cockpitType);
  return Math.round(baseBV * cockpitModifier);
}

export function getBVBreakdown(config: BVCalculationConfig): BVBreakdown {
  const defensiveResult = calculateDefensiveBV({
    totalArmorPoints: config.totalArmorPoints,
    totalStructurePoints: config.totalStructurePoints,
    tonnage: config.tonnage,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    armorType: config.armorType,
    structureType: config.structureType,
    gyroType: config.gyroType,
    engineType: config.engineType,
    engineMultiplier: config.engineMultiplier,
    hasStealthArmor: config.hasStealthArmor,
    hasChameleonLPS: config.hasChameleonLPS,
    hasNullSig: config.hasNullSig,
    hasVoidSig: config.hasVoidSig,
    defensiveEquipmentBV: config.defensiveEquipmentBV,
    explosivePenalties: config.explosivePenalties,
    umuMP: config.umuMP,
  });

  const offensiveResult = calculateOffensiveBVWithHeatTracking({
    weapons: mapWeaponsForOffensive(config.weapons),
    ammo: config.ammo,
    tonnage: config.tonnage,
    walkMP: config.walkMP,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    heatDissipation: config.heatSinkCapacity,
    hasTargetingComputer: config.hasTargetingComputer,
    hasTSM: config.hasTSM,
    hasIndustrialTSM: config.hasIndustrialTSM,
    aesArms: config.aesArms,
    aesLegs: config.aesLegs,
    isIndustrialMech: config.isIndustrialMech,
    engineType: config.engineType,
    hasStealthArmor: config.hasStealthArmor,
    hasNullSig: config.hasNullSig,
    hasVoidSig: config.hasVoidSig,
    hasChameleonShield: config.hasChameleonLPS,
    coolantPods: config.coolantPods,
    heatSinkCount: config.heatSinkCount,
    hasImprovedJJ: config.hasImprovedJJ,
    hasPrototypeIJJ: config.hasPrototypeIJJ,
    physicalWeaponBV: config.physicalWeaponBV,
    offensiveEquipmentBV: config.offensiveEquipmentBV,
    umuMP: config.umuMP,
  });

  const baseBV =
    defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV;
  const cockpitModifier = getCockpitModifier(config.cockpitType);

  return {
    defensiveBV: defensiveResult.totalDefensiveBV,
    offensiveBV: offensiveResult.totalOffensiveBV,
    speedFactor: offensiveResult.speedFactor,
    totalBV: Math.round(baseBV * cockpitModifier),
  };
}
