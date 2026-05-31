export type TripAttackInvalidReason =
  | 'TacOpsTripDisabled'
  | 'AttackerAlreadyGrappled'
  | 'FriendlyTarget'
  | 'AttackerNotMek'
  | 'TargetNotMek'
  | 'AttackerAirborne'
  | 'LegMissing'
  | 'TargetNotAdjacent'
  | 'TargetNotInFrontArc'
  | 'AttackerProne'
  | 'TargetProne'
  | 'ElevationMismatch'
  | 'TripLimbUnavailable';

export interface ITripAttackEligibilityInput {
  readonly tacOpsTripAttackEnabled?: boolean;
  readonly attackerIsMek?: boolean;
  readonly targetIsMek?: boolean;
  readonly attackerAlreadyGrappled?: boolean;
  readonly targetIsFriendly?: boolean;
  readonly attackerIsAirborneVTOLorWIGE?: boolean;
  readonly targetDistance?: number;
  readonly targetInFrontArc?: boolean;
  readonly attackerProne?: boolean;
  readonly targetProne?: boolean;
  readonly sameElevation?: boolean;
  readonly leftLegPresent?: boolean;
  readonly rightLegPresent?: boolean;
  readonly leftTripLimbUsable?: boolean;
  readonly rightTripLimbUsable?: boolean;
}

export interface ITripAttackEligibilityResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly reasonCode?: TripAttackInvalidReason;
}

function blocked(
  reason: string,
  reasonCode: TripAttackInvalidReason,
): ITripAttackEligibilityResult {
  return { allowed: false, reason, reasonCode };
}

export function getTripAttackBaseToHitAdjustment(): number {
  return -1;
}

export function canTrip(
  input: ITripAttackEligibilityInput,
): ITripAttackEligibilityResult {
  if (input.tacOpsTripAttackEnabled !== true) {
    return blocked(
      'Trip attacks require the TacOps Trip Attack option',
      'TacOpsTripDisabled',
    );
  }

  if (input.attackerAlreadyGrappled) {
    return blocked(
      'A unit that is already grappled cannot make a trip attack',
      'AttackerAlreadyGrappled',
    );
  }

  if (input.targetIsFriendly) {
    return blocked(
      'A friendly unit cannot be the target of a direct trip attack',
      'FriendlyTarget',
    );
  }

  if (input.attackerIsMek === false) {
    return blocked('Only Meks can make trip attacks', 'AttackerNotMek');
  }

  if (input.targetIsMek === false) {
    return blocked('Only Meks can be tripped', 'TargetNotMek');
  }

  if (input.attackerIsAirborneVTOLorWIGE) {
    return blocked(
      'Airborne VTOL or WIGE attackers cannot make trip attacks',
      'AttackerAirborne',
    );
  }

  if (input.leftLegPresent === false || input.rightLegPresent === false) {
    return blocked(
      'Trip attacks require both leg locations to be present',
      'LegMissing',
    );
  }

  if (input.targetDistance !== undefined && input.targetDistance > 1) {
    return blocked(
      'Trip attacks require an adjacent target',
      'TargetNotAdjacent',
    );
  }

  if (input.targetInFrontArc === false) {
    return blocked(
      'Trip attacks require the target in the front arc',
      'TargetNotInFrontArc',
    );
  }

  if (input.attackerProne) {
    return blocked('Prone attackers cannot make trip attacks', 'AttackerProne');
  }

  if (input.targetProne) {
    return blocked('Prone targets cannot be tripped', 'TargetProne');
  }

  if (input.sameElevation === false) {
    return blocked(
      'Trip attacks require attacker and target at the same elevation',
      'ElevationMismatch',
    );
  }

  if (
    input.leftTripLimbUsable === false &&
    input.rightTripLimbUsable === false
  ) {
    return blocked(
      'Trip attacks require at least one usable trip limb',
      'TripLimbUnavailable',
    );
  }

  return { allowed: true };
}
