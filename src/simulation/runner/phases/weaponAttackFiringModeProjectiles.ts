import {
  damageForProjectiles,
  isMissileClusterWeapon,
  lookupClusterHits,
  missileRackSize,
} from '@/utils/gameplay/clusterWeapons';

import type { IWeapon, IWeaponFiringMode } from '../../ai/types';

import {
  resolveAMSInterception,
  resolveSingleMissileAMSWeaponHit,
  type IResolvedAMSInterception,
} from './weaponAttackAMS';
import {
  lowProfileClusterModifier,
  missileClusterModifier,
  sandblasterClusterModifier,
  type IMissileClusterModifierContext,
} from './weaponAttackClusterModifiers';
import {
  isClusterSlugMode,
  isStreakWeaponMount,
} from './weaponAttackFiringModeClassifiers';
import { weaponTypeFromMountId } from './weaponAttackHelpers';

export interface IResolvedShotWeapon {
  readonly weapon: IWeapon;
  readonly projectileCount?: number;
  readonly amsInterception?: IResolvedAMSInterception;
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
  const clusterModifier =
    sandblasterClusterModifier(baseWeapon, clusterContext) +
    lowProfileClusterModifier(clusterContext);
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

function resolveMissileClusterHit(options: {
  baseWeapon: IWeapon;
  shotWeapon: IWeapon;
  d6Roller: () => number;
  clusterContext?: IMissileClusterModifierContext;
}): IResolvedShotWeapon {
  const { baseWeapon, clusterContext, d6Roller, shotWeapon } = options;
  if (!isMissileClusterWeapon(baseWeapon.id, baseWeapon.name))
    return { weapon: shotWeapon };

  const rackSize = missileRackSize(baseWeapon.id, baseWeapon.name);
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
    unavailableAMSWeaponIds: clusterContext?.unavailableAMSWeaponIds,
    selectedAMSWeaponId: clusterContext?.selectedAMSWeaponId,
    optionalRules: clusterContext?.optionalRules,
  });
  const projectileCount = amsInterception?.projectilesRemaining ?? clusterHits;

  return {
    weapon: {
      ...shotWeapon,
      damage: damageForProjectiles(
        shotWeapon.damage,
        rackSize,
        projectileCount,
      ),
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

  const projectileCount = missileRackSize(baseWeapon.id, baseWeapon.name);
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
    unavailableAMSWeaponIds: clusterContext?.unavailableAMSWeaponIds,
    selectedAMSWeaponId: clusterContext?.selectedAMSWeaponId,
    optionalRules: clusterContext?.optionalRules,
  });
  const remainingProjectiles =
    amsInterception?.projectilesRemaining ?? projectileCount;

  return {
    weapon: {
      ...shotWeapon,
      damage: damageForProjectiles(
        shotWeapon.damage,
        projectileCount,
        remainingProjectiles,
      ),
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
    unavailableAMSWeaponIds: options.clusterContext?.unavailableAMSWeaponIds,
    selectedAMSWeaponId: options.clusterContext?.selectedAMSWeaponId,
    optionalRules: options.clusterContext?.optionalRules,
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
