import type {
  ICombatWeaponImpact,
  ICombatWeaponRangeOption,
  IHexCoordinate,
  IHexGrid,
  IWeaponStatus,
} from '@/types/gameplay';

import { RangeBracket } from '@/types/gameplay';

import {
  minimumRangePenaltyForWeapon,
  weaponBracketAtDistance,
  weaponCanCoverTargetArc,
} from './combatProjection.targeting';
import { determineArc, firingArcProjectionLabel } from './firingArcs';
import { representedWaterAttackInvalidStateForWeapon } from './underwaterAttacks';

export function weaponImpactForStatus(
  weapon: IWeaponStatus,
): ICombatWeaponImpact {
  const ammoRemaining = weapon.ammoRemaining;
  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    heat: weapon.heat,
    damage: weaponDamageValue(weapon),
    ammoConsumed: ammoRemaining === undefined ? 0 : 1,
    ammoRemaining,
  };
}

function weaponDamageValue(weapon: IWeaponStatus): number {
  if (typeof weapon.damage === 'number') return weapon.damage;
  const parsed = Number.parseFloat(weapon.damage);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function deriveCombatWeaponRangeOptions({
  weapons,
  distance,
  targetArc,
  grid,
  attackerPosition,
  targetPosition,
  minimumRangeApplies,
  weaponRuleBlockedReason,
}: {
  readonly weapons: readonly IWeaponStatus[];
  readonly distance: number;
  readonly targetArc: ReturnType<typeof determineArc>['arc'] | null;
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly minimumRangeApplies: boolean;
  readonly weaponRuleBlockedReason?: (
    weapon: IWeaponStatus,
  ) => string | undefined;
}): readonly ICombatWeaponRangeOption[] {
  return weapons.map((weapon) =>
    weaponRangeOptionForStatus({
      weapon,
      distance,
      targetArc,
      grid,
      attackerPosition,
      targetPosition,
      minimumRangeApplies,
      weaponRuleBlockedReason,
    }),
  );
}

function weaponRangeOptionForStatus({
  weapon,
  distance,
  targetArc,
  grid,
  attackerPosition,
  targetPosition,
  minimumRangeApplies,
  weaponRuleBlockedReason,
}: {
  readonly weapon: IWeaponStatus;
  readonly distance: number;
  readonly targetArc: ReturnType<typeof determineArc>['arc'] | null;
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly minimumRangeApplies: boolean;
  readonly weaponRuleBlockedReason?: (
    weapon: IWeaponStatus,
  ) => string | undefined;
}): ICombatWeaponRangeOption {
  const rangeBracket = weaponBracketAtDistance(weapon, distance);
  const inRange = rangeBracket !== RangeBracket.OutOfRange;
  const inArc = weaponCanCoverTargetArc(weapon, targetArc);
  const readinessBlockedReason = weaponReadinessBlockedReason(weapon);
  const environmentInvalidState =
    inRange && inArc
      ? representedWaterAttackInvalidStateForWeapon({
          grid,
          attackerPosition,
          targetPosition,
          weapon,
        })
      : undefined;
  const environmentLegal = environmentInvalidState === undefined;
  const ruleBlockedReason =
    inRange && inArc && environmentLegal && !readinessBlockedReason
      ? weaponRuleBlockedReason?.(weapon)
      : undefined;
  const minimumRangePenalty = minimumRangePenaltyForWeapon(
    weapon,
    distance,
    minimumRangeApplies,
  );

  return {
    ...weaponImpactForStatus(weapon),
    rangeBracket,
    inRange,
    inArc,
    environmentLegal,
    available:
      inRange &&
      inArc &&
      environmentLegal &&
      !readinessBlockedReason &&
      !ruleBlockedReason,
    minimumRangePenalty:
      minimumRangePenalty > 0 ? minimumRangePenalty : undefined,
    blockedReason: weaponOptionBlockedReason({
      inRange,
      inArc,
      environmentInvalidDetails: environmentInvalidState?.details,
      readinessBlockedReason,
      ruleBlockedReason,
      targetArc,
    }),
  };
}

function weaponReadinessBlockedReason(
  weapon: IWeaponStatus,
): string | undefined {
  if (weapon.destroyed) return `${weapon.name} is destroyed`;
  if (weapon.jammed) return `${weapon.name} is jammed`;
  if (weapon.ammoRemaining !== undefined && weapon.ammoRemaining <= 0) {
    return `No matching non-empty ammo bin for "${weapon.name}"`;
  }
  return undefined;
}

function weaponOptionBlockedReason({
  inRange,
  inArc,
  environmentInvalidDetails,
  readinessBlockedReason,
  ruleBlockedReason,
  targetArc,
}: {
  readonly inRange: boolean;
  readonly inArc: boolean;
  readonly environmentInvalidDetails?: string;
  readonly readinessBlockedReason?: string;
  readonly ruleBlockedReason?: string;
  readonly targetArc: ReturnType<typeof determineArc>['arc'] | null;
}): string | undefined {
  if (!inRange) return 'out of range';
  if (!inArc)
    return targetArc
      ? `out of ${firingArcProjectionLabel(targetArc)} arc`
      : 'no firing arc';
  return (
    environmentInvalidDetails ?? readinessBlockedReason ?? ruleBlockedReason
  );
}
