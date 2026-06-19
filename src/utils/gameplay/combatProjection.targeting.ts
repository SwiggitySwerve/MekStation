import type {
  CombatFiringArc,
  CombatTargetVisibilityState,
  IAttackInvalidPayload,
  IHexCoordinate,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { classifyLOS } from '@/utils/overlays/losClassifier';

import { RangeBracket } from '@/types/gameplay';

import { determineArc } from './firingArcs';
import {
  evadingAttackerAttackDetails,
  sprintingAttackerAttackDetails,
} from './gameSessionAttackResolutionValidation';
import { coordToKey } from './hexMath';
import { formatLOSBlockedDetails } from './lineOfSight';
import {
  getMinimumRangePenalty,
  getWeaponRangeBracket,
  strictestApplicableMinimumRange,
} from './range';
import { weaponMountCoversTargetArc } from './weaponMountArcs';

const RANGE_BRACKET_RANK: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 1,
  [RangeBracket.Long]: 2,
  [RangeBracket.Extreme]: 3,
  [RangeBracket.OutOfRange]: 4,
};

export function isOperationalWeaponStatus(weapon: IWeaponStatus): boolean {
  if (weapon.destroyed || weapon.jammed) return false;
  if (weapon.ammoRemaining !== undefined && weapon.ammoRemaining <= 0) {
    return false;
  }
  return true;
}

export function deriveWeaponReadinessInvalidState(
  weapons: readonly IWeaponStatus[],
):
  | {
      readonly reason: IAttackInvalidPayload['reason'];
      readonly details: string;
    }
  | undefined {
  if (weapons.length === 0) {
    return {
      reason: 'InvalidTarget',
      details: 'No operational weapons',
    };
  }

  const nonJammedWeapons = weapons.filter(
    (weapon) => !weapon.destroyed && !weapon.jammed,
  );
  if (
    nonJammedWeapons.length > 0 &&
    nonJammedWeapons.every(
      (weapon) =>
        weapon.ammoRemaining !== undefined && weapon.ammoRemaining <= 0,
    )
  ) {
    const details =
      nonJammedWeapons.length === 1
        ? `No matching non-empty ammo bin for "${nonJammedWeapons[0].name}"`
        : 'No selected weapons have ammunition remaining';
    return {
      reason: 'OutOfAmmo',
      details,
    };
  }

  return {
    reason: 'InvalidTarget',
    details: 'No operational weapons',
  };
}

export function bestRangeBracket(
  brackets: readonly RangeBracket[],
): RangeBracket {
  return brackets.reduce<RangeBracket>((best, current) => {
    return RANGE_BRACKET_RANK[current] < RANGE_BRACKET_RANK[best]
      ? current
      : best;
  }, RangeBracket.OutOfRange);
}

export function weaponBracketAtDistance(
  weapon: IWeaponStatus,
  distance: number,
): RangeBracket {
  return getWeaponRangeBracket(distance, {
    short: weapon.ranges.short,
    medium: weapon.ranges.medium,
    long: weapon.ranges.long,
    extreme: weapon.ranges.extreme,
    minimum: weapon.ranges.minimum,
  });
}

export function weaponCanCoverTargetArc(
  weapon: IWeaponStatus,
  targetArc: ReturnType<typeof determineArc>['arc'] | null,
): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
}

export function minimumRangePenaltyForWeapon(
  weapon: IWeaponStatus,
  distance: number,
  minimumRangeApplies = true,
): number {
  if (!minimumRangeApplies) return 0;
  return getMinimumRangePenalty(distance, {
    short: weapon.ranges.short,
    medium: weapon.ranges.medium,
    long: weapon.ranges.long,
    extreme: weapon.ranges.extreme,
    minimum: weapon.ranges.minimum,
  });
}

export function formatMinimumRangeReason(
  penalty: number,
  weaponIds: readonly string[],
): string | undefined {
  if (penalty <= 0 || weaponIds.length === 0) return undefined;
  return `Minimum range penalty +${penalty} (${weaponIds.join(', ')})`;
}

// Audit B-6 (W1.2): delegates to the shared volley helper so the projection
// and the engine commit path (declareAttack) compute the identical minimum —
// inclusive at exactly minimum range per MegaMek Compute.java#L1714-L1716.
// The previous local strict `minimum > distance` comparison dropped the +1
// at exactly minimum range while the committed path applied it.
export function minimumRangeForWeapons(
  weapons: readonly IWeaponStatus[],
  distance: number,
  minimumRangeApplies = true,
): number {
  return strictestApplicableMinimumRange(
    weapons.map((weapon) => weapon.ranges.minimum),
    distance,
    minimumRangeApplies,
  );
}

export function targetIdsAtHex(
  hex: IHexCoordinate,
  attacker: IUnitToken,
  tokens: readonly IUnitToken[],
): readonly {
  readonly unitId: string;
  readonly visibility: Exclude<CombatTargetVisibilityState, 'none' | 'mixed'>;
  readonly attackable: boolean;
}[] {
  const key = coordToKey(hex);
  return tokens
    .filter(
      (token) =>
        !token.isDestroyed &&
        token.side !== attacker.side &&
        coordToKey(displayPositionForToken(token)) === key,
    )
    .map((token) => {
      const visibility = visibilityStateForToken(token);
      return {
        unitId: token.unitId,
        visibility,
        attackable: visibility === 'visible',
      };
    });
}

function displayPositionForToken(token: IUnitToken): IHexCoordinate {
  if (token.fogStatus === 'lastKnown' && token.lastKnownPosition) {
    return token.lastKnownPosition;
  }

  return token.position;
}

function visibilityStateForToken(
  token: IUnitToken,
): Exclude<CombatTargetVisibilityState, 'none' | 'mixed'> {
  if (token.fogStatus === 'hidden') return 'hidden';
  if (token.fogStatus === 'lastKnown') return 'lastKnown';
  return 'visible';
}

export function summarizeTargetVisibility(
  contacts: readonly ReturnType<typeof targetIdsAtHex>[number][],
): CombatTargetVisibilityState {
  if (contacts.length === 0) return 'none';
  const hasVisible = contacts.some(
    (contact) => contact.visibility === 'visible',
  );
  const hasHidden = contacts.some((contact) => contact.visibility === 'hidden');
  const hasLastKnown = contacts.some(
    (contact) => contact.visibility === 'lastKnown',
  );
  const stateCount =
    Number(hasVisible) + Number(hasHidden) + Number(hasLastKnown);
  if (stateCount > 1) return 'mixed';
  if (hasVisible) return 'visible';
  if (hasLastKnown) return 'lastKnown';
  return 'hidden';
}

export function visibilityBlockedReasonForHex(
  state: CombatTargetVisibilityState,
  visibleTargetCount: number,
): string | undefined {
  if (visibleTargetCount > 0) return undefined;
  if (state === 'lastKnown')
    return 'Last known contact is not currently visible';
  if (state === 'hidden') return 'Hidden contact is not currently visible';
  if (state === 'mixed') return 'No contact on this hex is currently visible';
  return undefined;
}

export function lineOfSightBlockedDetails(
  los: ReturnType<typeof classifyLOS>,
): string {
  return (
    los.blockerAnnotations[0]?.title ??
    formatLOSBlockedDetails(los.engineResult)
  );
}

export function deriveAttackInvalidState({
  hasTarget,
  distance,
  inRange,
  inArc,
  hasAvailableWeapon,
  firingArc,
  los,
  operationalWeaponCount,
  weaponReadinessInvalidState,
  visibilityBlockedReason,
  weaponEnvironmentInvalidState,
  indirectFirePermitted,
  indirectFireUnavailableReason,
  attackerId,
  attackerIsEvading,
  attackerSprintedThisTurn,
}: {
  readonly hasTarget: boolean;
  readonly distance: number;
  readonly inRange: boolean;
  readonly inArc: boolean;
  readonly hasAvailableWeapon: boolean;
  readonly firingArc: CombatFiringArc;
  readonly los: ReturnType<typeof classifyLOS>;
  readonly operationalWeaponCount: number;
  readonly weaponReadinessInvalidState?: ReturnType<
    typeof deriveWeaponReadinessInvalidState
  >;
  readonly visibilityBlockedReason?: string;
  readonly weaponEnvironmentInvalidState?: {
    readonly reason: IAttackInvalidPayload['reason'];
    readonly details: string;
  };
  readonly indirectFirePermitted: boolean;
  readonly indirectFireUnavailableReason?: string;
  /** Attacker unit id, echoed into attacker-state rejection details. */
  readonly attackerId: string;
  /**
   * Audit B-2 (W1.2): attacker-state gates mirroring the engine commit path
   * (declareAttack -> invalidateEvadingAttackerAttack /
   * invalidateSprintingAttackerAttack). Sourced from combat state by the
   * caller; false when no combat state is supplied.
   */
  readonly attackerIsEvading: boolean;
  readonly attackerSprintedThisTurn: boolean;
}): {
  readonly reason?: IAttackInvalidPayload['reason'];
  readonly details?: string;
} {
  if (!hasTarget) return {};
  if (operationalWeaponCount === 0) {
    return (
      weaponReadinessInvalidState ?? {
        reason: 'InvalidTarget',
        details: 'No operational weapons',
      }
    );
  }
  if (visibilityBlockedReason) {
    return {
      reason: 'TargetNotVisible',
      details: visibilityBlockedReason,
    };
  }
  if (distance === 0) {
    return {
      reason: 'SameHex',
      details: 'Attacker and target occupy the same hex',
    };
  }
  if (!inRange) {
    return {
      reason: 'OutOfRange',
      details: `Target at ${distance} hexes is outside the selected weapons' range`,
    };
  }
  if (!inArc || !hasAvailableWeapon) {
    if (weaponEnvironmentInvalidState) return weaponEnvironmentInvalidState;
    return {
      reason: 'OutOfArc',
      details: `No selected weapons can fire into the ${firingArc} arc`,
    };
  }
  if (los.state === 'blocked' && !indirectFirePermitted) {
    const losDetails = lineOfSightBlockedDetails(los);
    return {
      reason: 'NoLineOfSight',
      details: indirectFireUnavailableReason
        ? `${indirectFireUnavailableReason}; ${losDetails}`
        : losDetails,
    };
  }
  // Audit B-2 (W1.2): attacker-state gates run LAST so reason precedence
  // matches the interactive commit path — applyInteractiveSessionAttack
  // performs visibility/same-hex/range/arc/LOS rejection before declareAttack
  // reaches invalidateEvadingAttackerAttack / invalidateSprintingAttackerAttack.
  // Evading is checked before sprinting, mirroring declareAttack's order.
  if (attackerIsEvading) {
    return {
      reason: 'AttackerEvading',
      details: evadingAttackerAttackDetails(attackerId),
    };
  }
  if (attackerSprintedThisTurn) {
    return {
      reason: 'AttackerSprinted',
      details: sprintingAttackerAttackDetails(attackerId),
    };
  }
  return {};
}

export function blockedReasonForHex(
  invalidState: ReturnType<typeof deriveAttackInvalidState>,
  firingArc: CombatFiringArc,
  los: ReturnType<typeof classifyLOS>,
): string | undefined {
  const reason = invalidState.reason;
  const detailsReasons = new Set([
    'TargetNotVisible',
    'InvalidTarget',
    'SameHex',
    'OutOfAmmo',
    'AttackerEvading',
    'AttackerSprinted',
  ]);

  if (reason && detailsReasons.has(reason)) {
    return invalidState.details;
  }
  if (reason === 'OutOfRange') {
    return 'Out of weapon range';
  }
  if (reason === 'OutOfArc') {
    return `No weapons cover ${firingArc} arc`;
  }
  if (reason === 'NoLineOfSight') {
    return invalidState.details ?? los.blockerAnnotations[0]?.title;
  }
  if (los.state === 'partial') {
    return los.blockerAnnotations[0]?.title ?? 'Partial cover';
  }
  return undefined;
}
