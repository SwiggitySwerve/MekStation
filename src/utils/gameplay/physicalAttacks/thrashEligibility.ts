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

const TERRAIN_TOKEN_SPLIT = /[,_:+|/\s-]+/;

function terrainTokens(terrain: string | undefined): readonly string[] {
  return (terrain ?? '')
    .trim()
    .toLowerCase()
    .split(TERRAIN_TOKEN_SPLIT)
    .filter(Boolean);
}

export function thrashBlockingTerrainsForHexTerrain(
  terrain: string | undefined,
): readonly ThrashAttackBlockingTerrain[] {
  const tokens = new Set(terrainTokens(terrain));
  const blockers: ThrashAttackBlockingTerrain[] = [];

  if (tokens.has('woods') || tokens.has('wood')) blockers.push('woods');
  if (tokens.has('jungle')) blockers.push('jungle');
  if (tokens.has('rough')) blockers.push('rough');
  if (tokens.has('rubble')) blockers.push('rubble');
  if (tokens.has('building')) blockers.push('building');
  if (tokens.has('fuel') && tokens.has('tank')) blockers.push('fuel-tank');

  return blockers;
}

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
