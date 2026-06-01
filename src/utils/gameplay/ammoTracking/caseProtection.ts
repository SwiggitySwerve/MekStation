import type { IUnitGameState } from '@/types/gameplay';
import type { ILocationDamage } from '@/types/gameplay';
import type { IUnitDamageState } from '@/utils/gameplay/damage';

import { CombatLocation, getFrontCombatLocation } from '@/types/gameplay';

import type { CASEProtectionLevel } from './types';

const STANDARD_CASE_DAMAGE_CAP = 10;
const CASE_II_DAMAGE_CAP = 1;

function structureLocation(location: string): string {
  return location.replace(/_rear$/, '');
}

function internalStructureRemaining(
  unit: IUnitGameState,
  location: string,
): number {
  const structure = unit.structure[structureLocation(location)] ?? 0;
  return Math.max(0, structure);
}

export function caseProtectionForLocation(
  unit: IUnitGameState,
  location: string,
): CASEProtectionLevel {
  return unit.caseProtection?.[location] ?? 'none';
}

export function resolveCaseAdjustedAmmoExplosionDamage(
  unit: IUnitGameState,
  location: string,
  totalDamage: number,
): {
  readonly caseProtection: CASEProtectionLevel;
  readonly damageToApply: number;
} {
  const caseProtection = caseProtectionForLocation(unit, location);
  if (caseProtection === 'none') {
    return { caseProtection, damageToApply: totalDamage };
  }

  const cap =
    caseProtection === 'case_ii'
      ? CASE_II_DAMAGE_CAP
      : STANDARD_CASE_DAMAGE_CAP;
  const damageToApply = Math.min(
    totalDamage,
    cap,
    internalStructureRemaining(unit, location),
  );
  return { caseProtection, damageToApply };
}

function rearArmorLocationForTorso(
  location: CombatLocation,
): CombatLocation | null {
  const frontLocation = getFrontCombatLocation(location);
  switch (frontLocation) {
    case 'center_torso':
      return 'center_torso_rear';
    case 'left_torso':
      return 'left_torso_rear';
    case 'right_torso':
      return 'right_torso_rear';
    default:
      return null;
  }
}

export function applyAmmoExplosionRearArmorBlowout(
  state: IUnitDamageState,
  location: CombatLocation,
  caseProtection: CASEProtectionLevel,
  damageToApply: number,
): {
  readonly state: IUnitDamageState;
  readonly locationDamages: readonly ILocationDamage[];
} {
  if (caseProtection === 'none' || damageToApply <= 0) {
    return { state, locationDamages: [] };
  }

  const frontLocation = getFrontCombatLocation(location);
  const rearLocation = rearArmorLocationForTorso(frontLocation);
  if (rearLocation === null) {
    return { state, locationDamages: [] };
  }

  const currentStructure = state.structure[frontLocation] ?? 0;
  if (currentStructure <= damageToApply) {
    return { state, locationDamages: [] };
  }

  const rearArmorKey = frontLocation as keyof IUnitDamageState['rearArmor'];
  const rearArmor = state.rearArmor[rearArmorKey] ?? 0;
  if (rearArmor <= 0) {
    return { state, locationDamages: [] };
  }

  const updatedState: IUnitDamageState = {
    ...state,
    armor: {
      ...state.armor,
      [rearLocation]: 0,
    },
    rearArmor: {
      ...state.rearArmor,
      [rearArmorKey]: 0,
    },
  };

  return {
    state: updatedState,
    locationDamages: [
      {
        location: rearLocation,
        damage: rearArmor,
        armorDamage: rearArmor,
        structureDamage: 0,
        armorRemaining: 0,
        structureRemaining: currentStructure,
        destroyed: false,
        transferredDamage: 0,
      },
    ],
  };
}
