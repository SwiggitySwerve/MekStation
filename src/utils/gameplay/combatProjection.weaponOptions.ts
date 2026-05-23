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
import { determineArc } from './firingArcs';
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
}: {
  readonly weapons: readonly IWeaponStatus[];
  readonly distance: number;
  readonly targetArc: ReturnType<typeof determineArc>['arc'] | null;
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly minimumRangeApplies: boolean;
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
}: {
  readonly weapon: IWeaponStatus;
  readonly distance: number;
  readonly targetArc: ReturnType<typeof determineArc>['arc'] | null;
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly minimumRangeApplies: boolean;
}): ICombatWeaponRangeOption {
  const rangeBracket = weaponBracketAtDistance(weapon, distance);
  const inRange = rangeBracket !== RangeBracket.OutOfRange;
  const inArc = weaponCanCoverTargetArc(weapon, targetArc);
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
    available: inRange && inArc && environmentLegal,
    minimumRangePenalty:
      minimumRangePenalty > 0 ? minimumRangePenalty : undefined,
    blockedReason: weaponOptionBlockedReason({
      inRange,
      inArc,
      environmentInvalidDetails: environmentInvalidState?.details,
      targetArc,
    }),
  };
}

function weaponOptionBlockedReason({
  inRange,
  inArc,
  environmentInvalidDetails,
  targetArc,
}: {
  readonly inRange: boolean;
  readonly inArc: boolean;
  readonly environmentInvalidDetails?: string;
  readonly targetArc: ReturnType<typeof determineArc>['arc'] | null;
}): string | undefined {
  if (!inRange) return 'out of range';
  if (!inArc) return targetArc ? `out of ${targetArc} arc` : 'no firing arc';
  return environmentInvalidDetails;
}
