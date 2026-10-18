import type {
  OffensiveBVConfig,
  OffensiveBVResult,
} from './battleValueOffensiveTypes';

import { EngineType } from '../../types/construction/EngineType';
import { calculateAmmoBVWithExcessiveCap } from './battleValueAmmo';
import { calculateOffensiveSpeedFactor } from './battleValueMovement';

function applyWeaponBVModifiers(
  weapon: {
    bv: number;
    rear?: boolean;
    hasAES?: boolean;
    artemisType?: 'iv' | 'v';
    isDirectFire?: boolean;
  },
  hasTC: boolean,
): number {
  let modifiedBV = weapon.bv;

  if (weapon.hasAES) {
    modifiedBV *= 1.25;
  }

  if (weapon.rear) {
    modifiedBV *= 0.5;
  }

  if (weapon.artemisType === 'iv') {
    modifiedBV *= 1.2;
  } else if (weapon.artemisType === 'v') {
    modifiedBV *= 1.3;
  }

  if (hasTC && weapon.isDirectFire) {
    modifiedBV *= 1.25;
  }

  return modifiedBV;
}

function heatSorter(
  a: { bv: number; heat: number },
  b: { bv: number; heat: number },
): number {
  if (a.heat === 0 && b.heat > 0) return -1;
  if (a.heat > 0 && b.heat === 0) return 1;
  if (a.heat === 0 && b.heat === 0) return 0;

  if (a.bv === b.bv) {
    return a.heat - b.heat;
  }
  return b.bv - a.bv;
}

function usesXXLHeatProfile(config: OffensiveBVConfig): boolean {
  return config.isXXLEngine || config.engineType === EngineType.XXL;
}

function calculateRunningHeat(config: OffensiveBVConfig): number {
  if (config.engineType === EngineType.ICE) return 0;
  if (config.engineType === EngineType.FUEL_CELL) return 0;
  return usesXXLHeatProfile(config) ? 6 : 2;
}

function calculateJumpHeat(config: OffensiveBVConfig): number {
  const jumpHeatMP = config.jumpHeatMP ?? config.jumpMP;
  if (jumpHeatMP <= 0) return 0;

  const hasXXLHeatProfile = usesXXLHeatProfile(config);
  if (config.hasPrototypeIJJ) {
    const doubledMP = jumpHeatMP * 2;
    if (hasXXLHeatProfile) return Math.max(6, doubledMP * 2);
    return Math.max(6, Math.max(3, doubledMP));
  }

  const effectiveJumpMP = config.hasImprovedJJ
    ? Math.ceil(jumpHeatMP / 2)
    : jumpHeatMP;
  if (hasXXLHeatProfile) return Math.max(6, effectiveJumpMP * 2);
  return Math.max(3, effectiveJumpMP);
}

function calculateCoolantPodHeatBonus(config: OffensiveBVConfig): number {
  const coolantPods = config.coolantPods ?? 0;
  const heatSinkCount = config.heatSinkCount ?? 0;
  return coolantPods > 0 && heatSinkCount > 0
    ? Math.ceil((heatSinkCount * coolantPods) / 5)
    : 0;
}

function calculateSignatureHeatPenalty(config: OffensiveBVConfig): number {
  return (
    (config.hasStealthArmor ? 10 : 0) +
    (config.hasNullSig ? 10 : 0) +
    (config.hasVoidSig ? 10 : 0) +
    (config.hasChameleonShield ? 6 : 0)
  );
}

function calculateHeatEfficiency(
  config: OffensiveBVConfig,
  moveHeat: number,
): number {
  return (
    6 +
    config.heatDissipation -
    moveHeat +
    calculateCoolantPodHeatBonus(config) -
    calculateSignatureHeatPenalty(config)
  );
}

function calculateHeatTrackedWeaponTotals(
  sortedWeapons: Array<{ bv: number; heat: number }>,
  heatEfficiency: number,
) {
  let heatExceeded = heatEfficiency <= 0;
  let heatSum = 0;
  let weaponBV = 0;
  let rawWeaponBV = 0;
  let halvedWeaponBV = 0;
  let halvedWeaponCount = 0;

  for (const weapon of sortedWeapons) {
    heatSum += weapon.heat;
    rawWeaponBV += weapon.bv;

    const adjustedBV = heatExceeded ? weapon.bv * 0.5 : weapon.bv;
    weaponBV += adjustedBV;

    if (heatExceeded) {
      halvedWeaponBV += adjustedBV;
      halvedWeaponCount++;
    }

    heatExceeded = heatExceeded || heatSum >= heatEfficiency;
  }

  return {
    weaponBV,
    rawWeaponBV,
    halvedWeaponBV,
    halvedWeaponCount,
  };
}

function calculateWeightBonus(config: OffensiveBVConfig): number {
  const aesMultiplier =
    1.0 + (config.aesArms ?? 0) * 0.1 + (config.aesLegs ?? 0) * 0.1;
  const adjustedWeight = config.tonnage * aesMultiplier;
  const tsmMultiplier = config.hasTSM
    ? 1.5
    : config.hasIndustrialTSM
      ? 1.15
      : 1.0;
  return adjustedWeight * tsmMultiplier;
}

export function calculateOffensiveBVWithHeatTracking(
  config: OffensiveBVConfig,
): OffensiveBVResult {
  const hasTC = config.hasTargetingComputer ?? false;

  const weaponsWithModifiers = config.weapons.map((weapon) => ({
    ...weapon,
    bv: applyWeaponBVModifiers(weapon, hasTC),
  }));

  const sortedWeapons = [...weaponsWithModifiers].sort(heatSorter);
  const moveHeat = config.hasSCM
    ? 0
    : Math.max(calculateRunningHeat(config), calculateJumpHeat(config));
  const heatEfficiency = calculateHeatEfficiency(config, moveHeat);
  const heatTrackedWeapons = calculateHeatTrackedWeaponTotals(
    sortedWeapons,
    heatEfficiency,
  );

  const ammoBV = calculateAmmoBVWithExcessiveCap(
    config.weapons,
    config.ammo ?? [],
  );
  const weightBonus = calculateWeightBonus(config);

  const speedFactor = calculateOffensiveSpeedFactor(
    config.runMP,
    config.jumpMP,
    config.umuMP ?? 0,
  );
  const physicalWeaponBV = config.physicalWeaponBV ?? 0;
  const offensiveEquipmentBV = config.offensiveEquipmentBV ?? 0;
  const baseOffensive =
    heatTrackedWeapons.weaponBV +
    ammoBV +
    physicalWeaponBV +
    weightBonus +
    offensiveEquipmentBV;

  const typeModifier = config.isIndustrialMech ? 0.9 : 1.0;
  const totalOffensiveBV = baseOffensive * speedFactor * typeModifier;

  return {
    weaponBV: heatTrackedWeapons.weaponBV,
    ammoBV,
    weightBonus,
    speedFactor,
    totalOffensiveBV,
    heatEfficiency,
    moveHeat,
    rawWeaponBV: heatTrackedWeapons.rawWeaponBV,
    halvedWeaponBV: heatTrackedWeapons.halvedWeaponBV,
    weaponCount: sortedWeapons.length,
    halvedWeaponCount: heatTrackedWeapons.halvedWeaponCount,
    physicalWeaponBV,
    offensiveEquipmentBV,
  };
}
