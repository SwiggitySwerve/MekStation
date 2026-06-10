import type { IAmmoSlotState } from '@/types/gameplay';
import type { FiringArc } from '@/types/gameplay';

import {
  findAvailableAmmoBin,
  isEnergyWeapon,
} from '@/utils/gameplay/ammoTracking';
import { lookupClusterHits } from '@/utils/gameplay/clusterWeapons';
import { isNarc } from '@/utils/gameplay/specialWeaponMechanics';
import { isAMS } from '@/utils/gameplay/specialWeaponMechanics/defensiveSystems';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

import type { IWeapon } from '../../ai/types';

import { weaponTypeFromMountId } from './weaponAttackHelpers';

export interface IResolvedAMSInterception {
  readonly resolution: 'cluster-table' | 'single-missile';
  readonly amsWeaponId: string;
  readonly ammoWeaponType: string;
  readonly incomingProjectiles: number;
  readonly projectilesIntercepted: number;
  readonly projectilesRemaining: number;
  readonly ammoConsumed: number;
  readonly roll: readonly number[];
  readonly clusterRoll?: number;
  readonly clusterModifier?: number;
  readonly modifiedClusterRoll?: number;
}

function isOperationalAMS(weapon: IWeapon): boolean {
  return (
    !weapon.destroyed &&
    (isAMS(weaponTypeFromMountId(weapon.id)) || isAMS(weapon.name))
  );
}

function isSingleMissileAMSWeaponMount(weapon: IWeapon): boolean {
  const text = `${weaponTypeFromMountId(weapon.id)} ${weapon.id} ${weapon.name}`;
  return isNarc(text) || /thunderbolt/i.test(text);
}

function hasAmmoForAMS(
  weapon: IWeapon,
  targetAmmoState: Record<string, IAmmoSlotState> | undefined,
): boolean {
  if (isEnergyWeapon(weapon.name)) {
    return true;
  }

  if (!targetAmmoState || Object.keys(targetAmmoState).length === 0) {
    return false;
  }

  return (
    findAvailableAmmoBin(targetAmmoState, weaponTypeFromMountId(weapon.id)) !==
    null
  );
}

/**
 * Mirror MegaMek `Entity.assignAMS` (filters active AMS by firing arc).
 *
 * Audit C-8 (2026-06-09): routed through `weaponMountCoversTargetArc` so
 * arm-mounted AMS — which now hydrates multi-arc `mountingArcs`
 * [Front, Left/Right] per `Mek.getWeaponArc` ARC_LEFTARM/ARC_RIGHTARM —
 * unions its front+side coverage instead of falling back to the
 * permissive no-arc-metadata branch. AMS without any arc state stays
 * permissive (legacy fixtures and pre-hydration wiring).
 */
function canAMSInterceptFromArc(
  weapon: IWeapon,
  incomingAttackArc: FiringArc | undefined,
): boolean {
  if (incomingAttackArc === undefined) {
    return true;
  }

  return weaponMountCoversTargetArc(weapon, incomingAttackArc);
}

function findOperationalAMS(
  weapons: readonly IWeapon[] | undefined,
  targetAmmoState: Record<string, IAmmoSlotState> | undefined,
  incomingAttackArc: FiringArc | undefined,
): IWeapon | undefined {
  return weapons?.find(
    (weapon) =>
      isOperationalAMS(weapon) &&
      hasAmmoForAMS(weapon, targetAmmoState) &&
      canAMSInterceptFromArc(weapon, incomingAttackArc),
  );
}

export function resolveAMSInterception(options: {
  readonly incomingProjectiles: number;
  readonly rackSize: number;
  readonly clusterRoll: number;
  readonly clusterModifier: number;
  readonly clusterDice: readonly number[];
  readonly incomingAttackArc?: FiringArc;
  readonly targetWeapons?: readonly IWeapon[];
  readonly targetAmmoState?: Record<string, IAmmoSlotState>;
}): IResolvedAMSInterception | undefined {
  const {
    clusterDice,
    clusterModifier,
    clusterRoll,
    incomingProjectiles,
    incomingAttackArc,
    rackSize,
    targetAmmoState,
    targetWeapons,
  } = options;
  const amsWeapon = findOperationalAMS(
    targetWeapons,
    targetAmmoState,
    incomingAttackArc,
  );
  if (amsWeapon === undefined) {
    return undefined;
  }

  const amsClusterModifier = -4;
  const modifiedClusterRoll = Math.max(
    2,
    clusterRoll + clusterModifier + amsClusterModifier,
  );
  const projectilesRemaining = lookupClusterHits(modifiedClusterRoll, rackSize);
  return {
    resolution: 'cluster-table',
    amsWeaponId: amsWeapon.id,
    ammoWeaponType: weaponTypeFromMountId(amsWeapon.id),
    incomingProjectiles,
    projectilesIntercepted: Math.max(
      0,
      incomingProjectiles - projectilesRemaining,
    ),
    projectilesRemaining,
    ammoConsumed: isEnergyWeapon(amsWeapon.name) ? 0 : 1,
    roll: clusterDice,
    clusterRoll,
    clusterModifier: amsClusterModifier,
    modifiedClusterRoll,
  };
}

export function resolveSingleMissileAMSInterception(options: {
  readonly d6Roller: () => number;
  readonly incomingAttackArc?: FiringArc;
  readonly targetWeapons?: readonly IWeapon[];
  readonly targetAmmoState?: Record<string, IAmmoSlotState>;
}): IResolvedAMSInterception | undefined {
  const amsWeapon = findOperationalAMS(
    options.targetWeapons,
    options.targetAmmoState,
    options.incomingAttackArc,
  );
  if (amsWeapon === undefined) {
    return undefined;
  }

  const roll = options.d6Roller();
  const destroyed = roll <= 3;
  return {
    resolution: 'single-missile',
    amsWeaponId: amsWeapon.id,
    ammoWeaponType: weaponTypeFromMountId(amsWeapon.id),
    incomingProjectiles: 1,
    projectilesIntercepted: destroyed ? 1 : 0,
    projectilesRemaining: destroyed ? 0 : 1,
    ammoConsumed: isEnergyWeapon(amsWeapon.name) ? 0 : 1,
    roll: [roll],
  };
}

export function resolveSingleMissileAMSWeaponHit(options: {
  readonly baseWeapon: IWeapon;
  readonly shotWeapon: IWeapon;
  readonly d6Roller: () => number;
  readonly incomingAttackArc?: FiringArc;
  readonly targetWeapons?: readonly IWeapon[];
  readonly targetAmmoState?: Record<string, IAmmoSlotState>;
}): {
  readonly weapon: IWeapon;
  readonly projectileCount?: number;
  readonly amsInterception?: IResolvedAMSInterception;
} {
  const { baseWeapon, d6Roller, shotWeapon, targetAmmoState, targetWeapons } =
    options;
  if (!isSingleMissileAMSWeaponMount(baseWeapon)) {
    return { weapon: shotWeapon };
  }

  const amsInterception = resolveSingleMissileAMSInterception({
    d6Roller,
    incomingAttackArc: options.incomingAttackArc,
    targetWeapons,
    targetAmmoState,
  });
  if (amsInterception === undefined) {
    return { weapon: shotWeapon };
  }

  const projectileCount = amsInterception.projectilesRemaining;
  return {
    weapon: {
      ...shotWeapon,
      damage: projectileCount === 0 ? 0 : shotWeapon.damage,
    },
    projectileCount,
    amsInterception,
  };
}
