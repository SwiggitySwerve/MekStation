import type { IGameState, IToHitModifier } from '@/types/gameplay';

import {
  findAvailableAmmoBin,
  hasAmmoForWeapon,
  isEnergyWeapon,
} from '@/utils/gameplay/ammoTracking';
import { lookupClusterHits } from '@/utils/gameplay/clusterWeapons';
import { isSemiGuidedLRM } from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon, IWeaponFiringMode } from '../../ai/types';

import {
  sandblasterClusterModifier,
  type IMissileClusterModifierContext,
} from './weaponAttackClusterModifiers';
import {
  isClusterSlugMode,
  isStreakWeaponMount,
} from './weaponAttackFiringModeClassifiers';
import { weaponTypeFromMountId } from './weaponAttackHelpers';
export {
  resolveClusterModeHit,
  resolveSpecialProjectileHit,
} from './weaponAttackFiringModeProjectiles';
export type { IResolvedShotWeapon } from './weaponAttackFiringModeProjectiles';

export function getSelectedFiringMode(
  weapon: IWeapon,
  modeId: string | undefined,
): IWeaponFiringMode | undefined {
  if (!modeId) return undefined;
  return weapon.firingModes?.modes.find((candidate) => candidate.id === modeId);
}

function applySelectedFiringMode(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
): IWeapon {
  if (!mode) return weapon;
  return {
    ...weapon,
    damage: mode.damage,
    heat: mode.heat,
  };
}

export function expandSelectedModeIntoShots(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
  resolvedShotCount?: number,
): readonly IWeapon[] {
  if (!mode || weapon.firingModes?.kind !== 'rate-of-fire') {
    return [applySelectedFiringMode(weapon, mode)];
  }

  const shotsPerTurn = Math.max(1, mode.shotsPerTurn);
  const expandedShotCount =
    resolvedShotCount !== undefined
      ? Math.max(1, resolvedShotCount)
      : shotsPerTurn;
  const shotWeapon: IWeapon = {
    ...weapon,
    damage: mode.damage / shotsPerTurn,
    heat: mode.heat / shotsPerTurn,
  };

  return Array.from({ length: expandedShotCount }, () => shotWeapon);
}

export function selectedAmmoWeaponType(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
): string {
  return mode?.ammoWeaponType ?? weaponTypeFromMountId(weapon.id);
}

export function hasAmmoForValidShot(
  unit: IGameState['units'][string],
  weapon: IWeapon,
  mode?: IWeaponFiringMode,
): boolean {
  if (isEnergyWeapon(weapon.name)) return true;

  const ammoState = unit.ammoState;
  if (!ammoState || Object.keys(ammoState).length === 0) {
    return true;
  }

  return hasAmmoForWeapon(ammoState, selectedAmmoWeaponType(weapon, mode));
}

export function isSemiGuidedAmmoSelectedForWeapon(
  unit: IGameState['units'][string],
  weapon: IWeapon,
  mode?: IWeaponFiringMode,
): boolean {
  const ammoState = unit.ammoState;
  if (!ammoState || Object.keys(ammoState).length === 0) {
    return false;
  }

  const selectedBin = findAvailableAmmoBin(
    ammoState,
    selectedAmmoWeaponType(weapon, mode),
  );
  return selectedBin !== null && isSemiGuidedLRM(selectedBin.weaponType);
}

export function isWeaponJammed(
  unit: IGameState['units'][string],
  weaponId: string,
): boolean {
  return unit.jammedWeapons?.includes(weaponId) ?? false;
}

export function markWeaponFiredForHeat(
  currentState: IGameState,
  unitId: string,
  weaponId: string,
): IGameState {
  const unit = currentState.units[unitId];
  return {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...unit,
        weaponsFiredThisTurn: [...(unit.weaponsFiredThisTurn ?? []), weaponId],
      },
    },
  };
}

export function markWeaponJammed(
  currentState: IGameState,
  unitId: string,
  weaponId: string,
): IGameState {
  const unit = currentState.units[unitId];
  const jammedWeapons = unit.jammedWeapons ?? [];
  if (jammedWeapons.includes(weaponId)) {
    return currentState;
  }

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...unit,
        jammedWeapons: [...jammedWeapons, weaponId],
      },
    },
  };
}

export function shouldSpendAmmoAndHeatOnMiss(weapon: IWeapon): boolean {
  return !isStreakWeaponMount(weapon);
}

export function selectedModeToHitModifier(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
): IToHitModifier | null {
  if (!isClusterSlugMode(weapon, mode)) {
    return null;
  }

  return {
    name: 'LB-X cluster mode',
    value: -1,
    source: 'equipment',
  };
}

export function shouldJamOnNaturalTwo(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
): boolean {
  if (weapon.firingModes?.kind !== 'rate-of-fire' || mode === undefined) {
    return false;
  }

  const baseId = weaponTypeFromMountId(weapon.id);
  const isUltraAC =
    /(?:^|-)uac-\d+/i.test(baseId) || /ultra\s*AC/i.test(weapon.name);
  if (isUltraAC && mode.shotsPerTurn <= 1) {
    return false;
  }

  return mode.shotsPerTurn >= 1;
}

export interface ISandblasterRateOfFireShotCount {
  readonly clusterRoll: number;
  readonly clusterModifier: number;
  readonly modifiedRoll: number;
  readonly shotCount: number;
}

function isAutocannonRateOfFireWeapon(weapon: IWeapon): boolean {
  const baseId = weaponTypeFromMountId(weapon.id);
  return (
    /(?:^|-)uac-\d+/i.test(baseId) ||
    /(?:^|-)rac-\d+/i.test(baseId) ||
    /(?:^|-)ac-\d+/i.test(baseId) ||
    /ultra\s*AC/i.test(weapon.name) ||
    /rotary\s*AC/i.test(weapon.name) ||
    /\bAC\s*\/\s*\d+\b/i.test(weapon.name) ||
    /\bAutocannon\s*\/\s*\d+\b/i.test(weapon.name)
  );
}

export function resolveSandblasterAutocannonRateOfFireShotCount(options: {
  baseWeapon: IWeapon;
  selectedMode: IWeaponFiringMode | undefined;
  d6Roller: () => number;
  clusterContext?: IMissileClusterModifierContext;
}): ISandblasterRateOfFireShotCount | undefined {
  const { baseWeapon, clusterContext, d6Roller, selectedMode } = options;
  if (
    baseWeapon.firingModes?.kind !== 'rate-of-fire' ||
    selectedMode === undefined ||
    !isAutocannonRateOfFireWeapon(baseWeapon)
  ) {
    return undefined;
  }

  const shotsPerTurn = Math.max(1, selectedMode.shotsPerTurn);
  if (shotsPerTurn <= 1) return undefined;

  const clusterModifier = sandblasterClusterModifier(
    baseWeapon,
    clusterContext,
  );
  if (clusterModifier <= 0) return undefined;

  const clusterRoll = d6Roller() + d6Roller();
  const modifiedRoll = clusterRoll + clusterModifier;
  return {
    clusterRoll,
    clusterModifier,
    modifiedRoll,
    shotCount: lookupClusterHits(modifiedRoll, shotsPerTurn),
  };
}
