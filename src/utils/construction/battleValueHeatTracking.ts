import type {
  OffensiveBVConfig,
  OffensiveBVResult,
} from './battleValueOffensiveTypes';

import { EngineType } from '../../types/construction/EngineType';
import { calculateAmmoBVPools } from './battleValueAmmo';
import { calculateOffensiveSpeedFactor } from './battleValueMovement';
import { applyTargetingComputerBV } from './battleValueWeapons';
import { getArtemisBVMultiplier } from './equipmentBVResolver';

export function applyWeaponBVModifiers(
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

  modifiedBV *= getArtemisBVMultiplier(weapon.artemisType);

  if (hasTC && weapon.isDirectFire) {
    modifiedBV = applyTargetingComputerBV(modifiedBV);
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
  if (config.hasIndustrialStructure) return 0;
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
    calculateBaseHeatEfficiency(config.heatDissipation) -
    moveHeat +
    calculateCoolantPodHeatBonus(config) -
    calculateSignatureHeatPenalty(config)
  );
}

/** Shared native ordering and cutoff; the threshold-crossing weapon stays full.
 * MegaMek 48fcb2f64, HeatTrackingBVCalculator.java:108-147.
 */
export function calculateHeatTrackedWeapons<
  T extends { bv: number; heat: number },
>(
  weapons: readonly T[],
  heatEfficiency: number,
): { weapon: T; adjustedBV: number; heatDiscount: boolean }[] {
  let heatExceeded = heatEfficiency <= 0;
  let heatSum = 0;
  return [...weapons].sort(heatSorter).map((weapon) => {
    heatSum += weapon.heat;
    const heatDiscount = heatExceeded;
    const adjustedBV = heatDiscount ? weapon.bv * 0.5 : weapon.bv;
    heatExceeded = heatExceeded || heatSum >= heatEfficiency;
    return { weapon, adjustedBV, heatDiscount };
  });
}

export function calculateBaseHeatEfficiency(heatDissipation: number): number {
  return 6 + heatDissipation;
}

function calculateHeatTrackedWeaponTotals(
  weapons: readonly {
    name: string;
    bv: number;
    heat: number;
    location?: string;
  }[],
  heatEfficiency: number,
) {
  let weaponBV = 0;
  let rawWeaponBV = 0;
  let halvedWeaponBV = 0;
  let halvedWeaponCount = 0;
  const weaponMountBV: { name: string; location?: string; bv: number }[] = [];
  for (const {
    weapon,
    adjustedBV,
    heatDiscount,
  } of calculateHeatTrackedWeapons(weapons, heatEfficiency)) {
    weaponMountBV.push({
      name: weapon.name,
      location: weapon.location,
      bv: adjustedBV,
    });
    rawWeaponBV += weapon.bv;
    weaponBV += adjustedBV;
    if (heatDiscount) {
      halvedWeaponBV += adjustedBV;
      halvedWeaponCount++;
    }
  }
  return {
    weaponBV,
    rawWeaponBV,
    halvedWeaponBV,
    halvedWeaponCount,
    weaponMountBV,
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
  movement: { speedFactor?: number; heat?: number } = {},
): OffensiveBVResult {
  const hasTC = config.hasTargetingComputer ?? false;

  const weaponsWithModifiers = config.weapons.map((weapon) => ({
    ...weapon,
    bv: applyWeaponBVModifiers(weapon, hasTC),
  }));

  const moveHeat =
    movement.heat ??
    (config.hasSCM
      ? 0
      : Math.max(calculateRunningHeat(config), calculateJumpHeat(config)));
  const heatEfficiency = calculateHeatEfficiency(config, moveHeat);
  const heatTrackedWeapons = calculateHeatTrackedWeaponTotals(
    weaponsWithModifiers,
    heatEfficiency,
  );

  const ammoPools = calculateAmmoBVPools(
    config.ammoCapWeapons ?? config.weapons,
    config.ammo ?? [],
  );
  const ammoBV = ammoPools.total;
  const weightBonus = calculateWeightBonus(config) + 1;

  const speedFactor =
    movement.speedFactor ??
    calculateOffensiveSpeedFactor(
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
    offensiveTypeModifier: typeModifier,
    heatEfficiency,
    moveHeat,
    rawWeaponBV: heatTrackedWeapons.rawWeaponBV,
    halvedWeaponBV: heatTrackedWeapons.halvedWeaponBV,
    weaponCount: weaponsWithModifiers.length,
    halvedWeaponCount: heatTrackedWeapons.halvedWeaponCount,
    weaponMountBV: heatTrackedWeapons.weaponMountBV,
    ammoPools: { available: ammoPools.available, cap: ammoPools.cap },
    physicalWeaponBV,
    offensiveEquipmentBV,
  };
}
