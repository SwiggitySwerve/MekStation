export type ThrashAttackInvalidReason =
  | 'FriendlyTarget'
  | 'AttackerNotMek'
  | 'AttackerNotProne'
  | 'TargetNotInfantry'
  | 'TargetSwarming'
  | 'TargetNotSameHex'
  | 'ElevationMismatch'
  | 'TerrainNotClearOrPavement'
  | 'InvalidExplicitTarget'
  | 'WeaponFiredThisTurn'
  | 'ThrashLimbUnavailable';

export type ThrashAttackBlockingTerrain =
  | 'woods'
  | 'jungle'
  | 'rough'
  | 'rubble'
  | 'fuel-tank'
  | 'building';

export interface IThrashAttackEligibilityInput {
  readonly friendlyFireEnabled?: boolean;
  readonly targetIsFriendly?: boolean;
  readonly attackerIsMek?: boolean;
  readonly attackerProne?: boolean;
  readonly targetIsInfantry?: boolean;
  readonly targetIsSwarming?: boolean;
  readonly targetDistance?: number;
  readonly sameElevation?: boolean;
  readonly blockingTerrains?: readonly ThrashAttackBlockingTerrain[];
  readonly targetIsBuildingFuelTankOrHex?: boolean;
  readonly weaponFiredThisTurn?: boolean;
  readonly hasWorkingArmOrLeg?: boolean;
}

export interface IThrashAttackEligibilityResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly reasonCode?: ThrashAttackInvalidReason;
}

function blocked(
  reason: string,
  reasonCode: ThrashAttackInvalidReason,
): IThrashAttackEligibilityResult {
  return { allowed: false, reason, reasonCode };
}

export function canThrash(
  input: IThrashAttackEligibilityInput,
): IThrashAttackEligibilityResult {
  if (input.targetIsFriendly && input.friendlyFireEnabled !== true) {
    return blocked(
      'A friendly unit cannot be the target of a direct thrash attack',
      'FriendlyTarget',
    );
  }

  if (input.attackerIsMek === false) {
    return blocked('Only Meks can thrash at infantry', 'AttackerNotMek');
  }

  if (input.attackerProne !== true) {
    return blocked(
      'Only prone Meks can thrash at infantry',
      'AttackerNotProne',
    );
  }

  if (input.targetIsInfantry === false) {
    return blocked(
      'Thrash attacks can only target infantry',
      'TargetNotInfantry',
    );
  }

  if (input.targetIsSwarming) {
    return blocked(
      'Thrash attacks cannot target swarming infantry',
      'TargetSwarming',
    );
  }

  if (input.targetDistance !== undefined && input.targetDistance !== 0) {
    return blocked(
      'Thrash attacks require a target in the same hex',
      'TargetNotSameHex',
    );
  }

  if (input.sameElevation === false) {
    return blocked(
      'Thrash attacks require attacker and target at the same elevation',
      'ElevationMismatch',
    );
  }

  if ((input.blockingTerrains?.length ?? 0) > 0) {
    return blocked(
      'Thrash attacks require a clear or pavement hex',
      'TerrainNotClearOrPavement',
    );
  }

  if (input.targetIsBuildingFuelTankOrHex) {
    return blocked(
      'Thrash attacks require a unit target',
      'InvalidExplicitTarget',
    );
  }

  if (input.weaponFiredThisTurn) {
    return blocked(
      'A Mek that fired weapons this turn cannot make a thrash attack',
      'WeaponFiredThisTurn',
    );
  }

  if (input.hasWorkingArmOrLeg === false) {
    return blocked(
      'Thrash attacks require at least one working arm or leg',
      'ThrashLimbUnavailable',
    );
  }

  return { allowed: true };
}

export function isThrashAttackAutomaticSuccess(): boolean {
  return true;
}

export function getThrashAttackDamageForWeight(weightTons: number): number {
  return Math.round(weightTons / 3);
}
