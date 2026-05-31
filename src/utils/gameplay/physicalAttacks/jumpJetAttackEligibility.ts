export type JumpJetAttackInvalidReason =
  | 'TacOpsJumpJetAttackDisabled'
  | 'CommonImpossible'
  | 'LandAirMekNotMekMode'
  | 'InvalidLegSelection'
  | 'AttackerNotMek'
  | 'BothLegsRequiresProne'
  | 'LegMissing'
  | 'JumpJetsMissingOrDestroyed'
  | 'AttackerJumpedThisTurn'
  | 'LegWeaponFiredThisTurn'
  | 'TargetNotAdjacent'
  | 'TargetElevationNotInRange'
  | 'TargetNotDirectlyAheadOfFeet'
  | 'TargetNotDirectlyBehindFeet';

export type JumpJetAttackSelectedLeg = 'left' | 'right' | 'both';

export type JumpJetAttackModifierReason = 'JumpJetAttack' | 'AttackerProne';

export interface IJumpJetAttackEligibilityInput {
  readonly tacOpsJumpJetAttackEnabled?: boolean;
  readonly commonImpossible?: boolean;
  readonly attackerIsLandAirMek?: boolean;
  readonly attackerIsMekMode?: boolean;
  readonly selectedLeg?: JumpJetAttackSelectedLeg;
  readonly attackerIsMek?: boolean;
  readonly attackerProne?: boolean;
  readonly leftLegPresent?: boolean;
  readonly rightLegPresent?: boolean;
  readonly leftReadyJumpJetCount?: number;
  readonly rightReadyJumpJetCount?: number;
  readonly attackerMovedJump?: boolean;
  readonly leftLegWeaponFiredThisTurn?: boolean;
  readonly rightLegWeaponFiredThisTurn?: boolean;
  readonly targetDistance?: number;
  readonly standingAttackerHeightAboveTargetHeight?: number;
  readonly proneTargetElevationInRange?: boolean;
  readonly targetDirectlyAheadOfFeet?: boolean;
  readonly targetDirectlyBehindFeet?: boolean;
}

export interface IJumpJetAttackEligibilityResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly reasonCode?: JumpJetAttackInvalidReason;
}

export interface IJumpJetAttackDamageInput {
  readonly selectedLeg: JumpJetAttackSelectedLeg;
  readonly leftReadyJumpJetCount?: number;
  readonly rightReadyJumpJetCount?: number;
  readonly leftLegWet?: boolean;
  readonly rightLegWet?: boolean;
}

export interface IJumpJetAttackModifier {
  readonly value: number;
  readonly reasonCode: JumpJetAttackModifierReason;
  readonly description: string;
}

export interface IJumpJetAttackToHitModifierInput {
  readonly attackerProne?: boolean;
  readonly targetIsBuildingFuelTankOrGunEmplacement?: boolean;
}

export interface IJumpJetAttackToHitModifierResult {
  readonly automaticSuccess: boolean;
  readonly automaticSuccessReason?: string;
  readonly automaticSuccessReasonCode?: 'AdjacentBuilding';
  readonly modifiers: readonly IJumpJetAttackModifier[];
}

function blocked(
  reason: string,
  reasonCode: JumpJetAttackInvalidReason,
): IJumpJetAttackEligibilityResult {
  return { allowed: false, reason, reasonCode };
}

function modifier(
  value: number,
  reasonCode: JumpJetAttackModifierReason,
  description: string,
): IJumpJetAttackModifier {
  return { value, reasonCode, description };
}

function selectedLeft(input: {
  readonly selectedLeg?: JumpJetAttackSelectedLeg;
}) {
  return input.selectedLeg === 'left' || input.selectedLeg === 'both';
}

function selectedRight(input: {
  readonly selectedLeg?: JumpJetAttackSelectedLeg;
}) {
  return input.selectedLeg === 'right' || input.selectedLeg === 'both';
}

export function canJumpJetAttack(
  input: IJumpJetAttackEligibilityInput,
): IJumpJetAttackEligibilityResult {
  if (input.tacOpsJumpJetAttackEnabled !== true) {
    return blocked(
      'Jump jet attacks require the TacOps Jump Jet Attack option',
      'TacOpsJumpJetAttackDisabled',
    );
  }

  if (input.commonImpossible) {
    return blocked(
      'Jump jet attacks require the common physical attack state to be possible',
      'CommonImpossible',
    );
  }

  if (input.attackerIsLandAirMek && input.attackerIsMekMode !== true) {
    return blocked(
      'LAM attackers can only make jump jet attacks in Mek mode',
      'LandAirMekNotMekMode',
    );
  }

  if (
    input.selectedLeg !== 'left' &&
    input.selectedLeg !== 'right' &&
    input.selectedLeg !== 'both'
  ) {
    return blocked(
      'Jump jet attacks must select left, right, or both legs',
      'InvalidLegSelection',
    );
  }

  if (input.attackerIsMek === false) {
    return blocked('Only Meks can make jump jet attacks', 'AttackerNotMek');
  }

  if (input.selectedLeg === 'both' && !input.attackerProne) {
    return blocked(
      'Only prone Meks can attack with both legs',
      'BothLegsRequiresProne',
    );
  }

  if (
    (selectedLeft(input) && input.leftLegPresent === false) ||
    (selectedRight(input) && input.rightLegPresent === false)
  ) {
    return blocked(
      'Jump jet attacks require selected leg locations to be present',
      'LegMissing',
    );
  }

  const hasSelectedJumpJet =
    (selectedLeft(input) && (input.leftReadyJumpJetCount ?? 0) > 0) ||
    (selectedRight(input) && (input.rightReadyJumpJetCount ?? 0) > 0);
  if (!hasSelectedJumpJet) {
    return blocked(
      'Jump jet attacks require at least one ready jump jet in the selected leg',
      'JumpJetsMissingOrDestroyed',
    );
  }

  if (input.attackerMovedJump) {
    return blocked(
      'A Mek that already jumped this turn cannot make a jump jet attack',
      'AttackerJumpedThisTurn',
    );
  }

  if (
    (selectedLeft(input) && input.leftLegWeaponFiredThisTurn) ||
    (selectedRight(input) && input.rightLegWeaponFiredThisTurn)
  ) {
    return blocked(
      'Selected leg-mounted weapons cannot have fired this turn',
      'LegWeaponFiredThisTurn',
    );
  }

  if (input.targetDistance !== undefined && input.targetDistance !== 1) {
    return blocked(
      'Jump jet attacks require an adjacent range-one target',
      'TargetNotAdjacent',
    );
  }

  if (!input.attackerProne) {
    if (
      input.standingAttackerHeightAboveTargetHeight !== undefined &&
      input.standingAttackerHeightAboveTargetHeight !== 1
    ) {
      return blocked(
        'Standing jump jet attacks require attacker height one level above the target height',
        'TargetElevationNotInRange',
      );
    }

    if (input.targetDirectlyAheadOfFeet === false) {
      return blocked(
        'Standing jump jet attacks require the target directly ahead of the feet',
        'TargetNotDirectlyAheadOfFeet',
      );
    }
  } else {
    if (input.proneTargetElevationInRange === false) {
      return blocked(
        'Prone jump jet attacks require the target elevation to overlap the attacker height',
        'TargetElevationNotInRange',
      );
    }

    if (input.targetDirectlyBehindFeet === false) {
      return blocked(
        'Prone jump jet attacks require the target directly behind the feet',
        'TargetNotDirectlyBehindFeet',
      );
    }
  }

  return { allowed: true };
}

export function getJumpJetAttackDamage(
  input: IJumpJetAttackDamageInput,
): number {
  const leftDamage =
    selectedLeft(input) && !input.leftLegWet
      ? (input.leftReadyJumpJetCount ?? 0) * 3
      : 0;
  const rightDamage =
    selectedRight(input) && !input.rightLegWet
      ? (input.rightReadyJumpJetCount ?? 0) * 3
      : 0;

  return leftDamage + rightDamage;
}

export function getJumpJetAttackToHitModifiers(
  input: IJumpJetAttackToHitModifierInput = {},
): IJumpJetAttackToHitModifierResult {
  if (input.targetIsBuildingFuelTankOrGunEmplacement) {
    return {
      automaticSuccess: true,
      automaticSuccessReason: 'Targeting adjacent building.',
      automaticSuccessReasonCode: 'AdjacentBuilding',
      modifiers: [],
    };
  }

  const modifiers: IJumpJetAttackModifier[] = [
    modifier(2, 'JumpJetAttack', 'Jump Jet'),
  ];

  if (input.attackerProne) {
    modifiers.push(modifier(2, 'AttackerProne', 'Attacker is prone'));
  }

  return { automaticSuccess: false, modifiers };
}
