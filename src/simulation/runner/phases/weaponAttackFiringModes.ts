import type { IGameState, IToHitModifier } from '@/types/gameplay';

import {
  findAvailableAmmoBin,
  hasAmmoForWeapon,
  isEnergyWeapon,
} from '@/utils/gameplay/ammoTracking';
import {
  isStreakWeapon,
  lookupClusterHits,
} from '@/utils/gameplay/clusterWeapons';
import {
  isMissileWeapon,
  isSemiGuidedLRM,
} from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon, IWeaponFiringMode } from '../../ai/types';

import {
  resolveAMSInterception,
  resolveSingleMissileAMSWeaponHit,
  type IResolvedAMSInterception,
} from './weaponAttackAMS';
import {
  missileClusterModifier,
  sandblasterClusterModifier,
  type IMissileClusterModifierContext,
} from './weaponAttackClusterModifiers';
import { weaponTypeFromMountId } from './weaponAttackHelpers';

export interface IResolvedShotWeapon {
  readonly weapon: IWeapon;
  readonly projectileCount?: number;
  readonly amsInterception?: IResolvedAMSInterception;
}

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
): readonly IWeapon[] {
  if (!mode || weapon.firingModes?.kind !== 'rate-of-fire') {
    return [applySelectedFiringMode(weapon, mode)];
  }

  const shotsPerTurn = Math.max(1, mode.shotsPerTurn);
  const shotWeapon: IWeapon = {
    ...weapon,
    damage: mode.damage / shotsPerTurn,
    heat: mode.heat / shotsPerTurn,
  };

  return Array.from({ length: shotsPerTurn }, () => shotWeapon);
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

function isStreakWeaponMount(weapon: IWeapon): boolean {
  const baseId = weaponTypeFromMountId(weapon.id);
  return isStreakWeapon(baseId) || /streak/i.test(weapon.name);
}

export function shouldSpendAmmoAndHeatOnMiss(weapon: IWeapon): boolean {
  return !isStreakWeaponMount(weapon);
}

function isClusterSlugMode(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
): boolean {
  return weapon.firingModes?.kind === 'cluster-slug' && mode?.id === 'cluster';
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

function clusterSizeForLBX(weapon: IWeapon): number {
  const baseId = weaponTypeFromMountId(weapon.id);
  const match = baseId.match(/lb-(\d+)-x(?:-ac)?/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return Math.max(1, Math.round(weapon.damage));
}

export function resolveClusterModeHit(options: {
  baseWeapon: IWeapon;
  shotWeapon: IWeapon;
  selectedMode: IWeaponFiringMode | undefined;
  d6Roller: () => number;
  clusterContext?: IMissileClusterModifierContext;
}): IResolvedShotWeapon {
  const { baseWeapon, clusterContext, d6Roller, selectedMode, shotWeapon } =
    options;
  if (!isClusterSlugMode(baseWeapon, selectedMode))
    return { weapon: shotWeapon };

  const clusterRoll = d6Roller() + d6Roller();
  const clusterModifier = sandblasterClusterModifier(
    baseWeapon,
    clusterContext,
  );
  const projectileCount = lookupClusterHits(
    clusterRoll + clusterModifier,
    clusterSizeForLBX(baseWeapon),
  );

  return {
    weapon: {
      ...shotWeapon,
      damage: projectileCount,
    },
    projectileCount,
  };
}

function missileRackSize(weapon: IWeapon): number | undefined {
  const pattern = /(?:lrm|srm|mrm|atm|mml)[\s-]?(\d+)/i;
  const candidates = [weaponTypeFromMountId(weapon.id), weapon.id, weapon.name];

  for (const candidate of candidates) {
    const match = candidate.match(pattern);
    if (!match) continue;
    const size = parseInt(match[1], 10);
    if (Number.isFinite(size) && size > 0) return size;
  }

  return undefined;
}

function isMissileClusterWeaponMount(weapon: IWeapon): boolean {
  const baseId = weaponTypeFromMountId(weapon.id);
  return (
    isMissileWeapon(baseId) ||
    isMissileWeapon(weapon.name) ||
    /\bmml[\s-]?\d+/i.test(`${baseId} ${weapon.name}`)
  );
}

function resolveMissileClusterHit(options: {
  baseWeapon: IWeapon;
  shotWeapon: IWeapon;
  d6Roller: () => number;
  clusterContext?: IMissileClusterModifierContext;
}): IResolvedShotWeapon {
  const { baseWeapon, clusterContext, d6Roller, shotWeapon } = options;
  if (!isMissileClusterWeaponMount(baseWeapon)) return { weapon: shotWeapon };

  const rackSize = missileRackSize(baseWeapon);
  if (rackSize === undefined) return { weapon: shotWeapon };

  const clusterDice = [d6Roller(), d6Roller()] as const;
  const clusterRoll = clusterDice[0] + clusterDice[1];
  const clusterModifier = missileClusterModifier({
    weapon: baseWeapon,
    context: clusterContext,
  });
  const modifiedRoll = clusterRoll + clusterModifier;
  const clusterHits = lookupClusterHits(modifiedRoll, rackSize);
  const amsInterception = resolveAMSInterception({
    incomingProjectiles: clusterHits,
    rackSize,
    clusterRoll,
    clusterModifier,
    clusterDice,
    incomingAttackArc: clusterContext?.incomingAttackArc,
    targetWeapons: clusterContext?.targetWeapons,
    targetAmmoState: clusterContext?.targetAmmoState,
  });
  const projectileCount = amsInterception?.projectilesRemaining ?? clusterHits;
  const damagePerProjectile = shotWeapon.damage / rackSize;

  return {
    weapon: {
      ...shotWeapon,
      damage: projectileCount * damagePerProjectile,
    },
    projectileCount,
    ...(amsInterception !== undefined ? { amsInterception } : {}),
  };
}

function resolveStreakModeHit(options: {
  baseWeapon: IWeapon;
  shotWeapon: IWeapon;
  clusterContext?: IMissileClusterModifierContext;
}): IResolvedShotWeapon {
  const { baseWeapon, clusterContext, shotWeapon } = options;
  if (!isStreakWeaponMount(baseWeapon)) return { weapon: shotWeapon };

  const projectileCount = missileRackSize(baseWeapon);
  if (projectileCount === undefined) {
    return { weapon: shotWeapon };
  }

  const amsInterception = resolveAMSInterception({
    incomingProjectiles: projectileCount,
    rackSize: projectileCount,
    clusterRoll: 11,
    clusterModifier: 0,
    clusterDice: [11],
    incomingAttackArc: clusterContext?.incomingAttackArc,
    targetWeapons: clusterContext?.targetWeapons,
    targetAmmoState: clusterContext?.targetAmmoState,
  });
  const remainingProjectiles =
    amsInterception?.projectilesRemaining ?? projectileCount;

  return {
    weapon: {
      ...shotWeapon,
      damage: (shotWeapon.damage / projectileCount) * remainingProjectiles,
    },
    projectileCount: remainingProjectiles,
    ...(amsInterception !== undefined ? { amsInterception } : {}),
  };
}

export function resolveSpecialProjectileHit(options: {
  baseWeapon: IWeapon;
  shotWeapon: IWeapon;
  selectedMode: IWeaponFiringMode | undefined;
  d6Roller: () => number;
  clusterContext?: IMissileClusterModifierContext;
}): IResolvedShotWeapon {
  const clusterResult = resolveClusterModeHit(options);
  if (clusterResult.projectileCount !== undefined) {
    return clusterResult;
  }

  const singleMissileAMSResult = resolveSingleMissileAMSWeaponHit({
    baseWeapon: options.baseWeapon,
    shotWeapon: options.shotWeapon,
    d6Roller: options.d6Roller,
    incomingAttackArc: options.clusterContext?.incomingAttackArc,
    targetWeapons: options.clusterContext?.targetWeapons,
    targetAmmoState: options.clusterContext?.targetAmmoState,
  });
  if (singleMissileAMSResult.amsInterception !== undefined) {
    return singleMissileAMSResult;
  }

  const streakResult = resolveStreakModeHit({
    baseWeapon: options.baseWeapon,
    shotWeapon: options.shotWeapon,
    clusterContext: options.clusterContext,
  });
  if (streakResult.projectileCount !== undefined) {
    return streakResult;
  }

  return resolveMissileClusterHit({
    baseWeapon: options.baseWeapon,
    shotWeapon: options.shotWeapon,
    d6Roller: options.d6Roller,
    clusterContext: options.clusterContext,
  });
}
