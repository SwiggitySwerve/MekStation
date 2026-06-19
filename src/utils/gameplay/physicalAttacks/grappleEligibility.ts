import {
  type BreakGrappleUnitKind,
  getBreakGrappleWeightClassModifier,
} from './breakGrappleEligibility';

export type GrappleAttackInvalidReason =
  | 'TacOpsGrapplingDisabled'
  | 'AttackerAirborne'
  | 'CommonImpossible'
  | 'FriendlyTarget'
  | 'AttackerNotBipedMekOrProtoMek'
  | 'TargetNotMekOrProtoMek'
  | 'NoArmsQuirk'
  | 'ArmMissing'
  | 'ShoulderMissingOrDestroyed'
  | 'TargetNotAdjacent'
  | 'ElevationMismatch'
  | 'TargetNotInFrontArc'
  | 'AttackerProne'
  | 'TargetProne'
  | 'WeaponFiredThisTurn'
  | 'AlreadyGrappled';

export type GrappleAttackSide = 'left' | 'right' | 'both';

export type GrappleAttackModifierReason =
  | 'LeftUpperArmActuatorDestroyed'
  | 'LeftLowerArmActuatorDestroyed'
  | 'LeftHandActuatorDestroyed'
  | 'RightUpperArmActuatorDestroyed'
  | 'RightLowerArmActuatorDestroyed'
  | 'RightHandActuatorDestroyed'
  | 'ArmAES'
  | 'TSMActiveBonus'
  | 'WeightClassDifference';

export interface IGrappleAttackEligibilityInput {
  readonly tacOpsGrapplingEnabled?: boolean;
  readonly attackerIsAirborneVTOLorWIGE?: boolean;
  readonly commonImpossibleReasonCode?: 'LockedInGrapple' | 'Other';
  readonly friendlyFireEnabled?: boolean;
  readonly targetIsFriendly?: boolean;
  readonly attackerIsBipedMek?: boolean;
  readonly attackerIsProtoMek?: boolean;
  readonly targetIsMek?: boolean;
  readonly targetIsProtoMek?: boolean;
  readonly noMinimalArmsQuirk?: boolean;
  readonly grappleSide?: GrappleAttackSide;
  readonly leftArmPresent?: boolean;
  readonly rightArmPresent?: boolean;
  readonly leftShoulderWorking?: boolean;
  readonly rightShoulderWorking?: boolean;
  readonly counterGrapple?: boolean;
  readonly targetDistance?: number;
  readonly elevationDifference?: number;
  readonly maxElevationChange?: number;
  readonly targetInFrontArc?: boolean;
  readonly attackerProne?: boolean;
  readonly targetProne?: boolean;
  readonly weaponFiredThisTurn?: boolean;
  readonly attackerGrappledTargetMatches?: boolean;
  readonly targetIsGrappleAttacker?: boolean;
}

export interface IGrappleAttackEligibilityResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly reasonCode?: GrappleAttackInvalidReason;
}

export interface IGrappleAttackModifierInput {
  readonly grappleSide?: GrappleAttackSide;
  readonly attackerIsMek?: boolean;
  readonly leftUpperArmWorking?: boolean;
  readonly leftLowerArmWorking?: boolean;
  readonly leftHandWorking?: boolean;
  readonly rightUpperArmWorking?: boolean;
  readonly rightLowerArmWorking?: boolean;
  readonly rightHandWorking?: boolean;
  readonly leftArmAesFunctional?: boolean;
  readonly rightArmAesFunctional?: boolean;
  readonly attackerHasActiveTsm?: boolean;
  readonly attackerUnitKind?: BreakGrappleUnitKind;
  readonly targetUnitKind?: BreakGrappleUnitKind;
  readonly attackerWeightClass?: number;
  readonly targetWeightClass?: number;
}

export interface IGrappleAttackModifier {
  readonly value: number;
  readonly reasonCode: GrappleAttackModifierReason;
  readonly description: string;
}

export interface IGrappleAttackToHitModifierResult {
  readonly modifiers: readonly IGrappleAttackModifier[];
}

function blocked(
  reason: string,
  reasonCode: GrappleAttackInvalidReason,
): IGrappleAttackEligibilityResult {
  return { allowed: false, reason, reasonCode };
}

function modifier(
  value: number,
  reasonCode: GrappleAttackModifierReason,
  description: string,
): IGrappleAttackModifier {
  return { value, reasonCode, description };
}

function isLeftSelected(grappleSide: GrappleAttackSide | undefined) {
  return grappleSide === 'left' || grappleSide === 'both';
}

function isRightSelected(grappleSide: GrappleAttackSide | undefined) {
  return grappleSide === 'right' || grappleSide === 'both';
}

function grappleOptionRestriction(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult | undefined {
  if (input.tacOpsGrapplingEnabled !== true) {
    return blocked(
      'Grapple attacks require the TacOps grappling option',
      'TacOpsGrapplingDisabled',
    );
  }

  if (input.attackerIsAirborneVTOLorWIGE) {
    return blocked(
      'Airborne VTOL or WIGE attackers cannot grapple',
      'AttackerAirborne',
    );
  }

  if (
    input.commonImpossibleReasonCode !== undefined &&
    input.commonImpossibleReasonCode !== 'LockedInGrapple'
  ) {
    return blocked(
      'Grapple attacks require the common physical attack state to be possible or locked in grapple',
      'CommonImpossible',
    );
  }

  return undefined;
}

function grappleUnitRestriction(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult | undefined {
  if (input.targetIsFriendly && input.friendlyFireEnabled !== true) {
    return blocked(
      'A friendly unit cannot be the target of a direct grapple attack',
      'FriendlyTarget',
    );
  }

  if (input.attackerIsBipedMek !== true && input.attackerIsProtoMek !== true) {
    return blocked(
      'Only biped Meks and ProtoMeks can make grapple attacks',
      'AttackerNotBipedMekOrProtoMek',
    );
  }

  if (input.targetIsMek !== true && input.targetIsProtoMek !== true) {
    return blocked(
      'Grapple attacks can only target Meks and ProtoMeks',
      'TargetNotMekOrProtoMek',
    );
  }

  if (input.noMinimalArmsQuirk) {
    return blocked('Grapple attacks require normal arms', 'NoArmsQuirk');
  }

  return undefined;
}

function grappleArmRestriction(
  input: IGrappleAttackEligibilityInput,
  grappleSide: GrappleAttackSide,
): IGrappleAttackEligibilityResult | undefined {
  if (
    (isLeftSelected(grappleSide) && input.leftArmPresent === false) ||
    (isRightSelected(grappleSide) && input.rightArmPresent === false)
  ) {
    return blocked('Grapple attacks require selected arms', 'ArmMissing');
  }

  if (
    (isLeftSelected(grappleSide) && input.leftShoulderWorking === false) ||
    (isRightSelected(grappleSide) && input.rightShoulderWorking === false)
  ) {
    return blocked(
      'Grapple attacks require selected shoulder actuators',
      'ShoulderMissingOrDestroyed',
    );
  }

  return undefined;
}

function grapplePositionRestriction(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult | undefined {
  if (
    !input.counterGrapple &&
    input.targetDistance !== undefined &&
    input.targetDistance !== 1
  ) {
    return blocked(
      'Grapple attacks require an adjacent range-one target unless counter-grappling',
      'TargetNotAdjacent',
    );
  }

  if (
    input.elevationDifference !== undefined &&
    input.maxElevationChange !== undefined &&
    Math.abs(input.elevationDifference) > input.maxElevationChange
  ) {
    return blocked(
      'Grapple attacks require target elevation within attacker elevation change',
      'ElevationMismatch',
    );
  }

  if (!input.counterGrapple && input.targetInFrontArc === false) {
    return blocked(
      'Grapple attacks require the target in the front arc unless counter-grappling',
      'TargetNotInFrontArc',
    );
  }

  return undefined;
}

function grapplePostureRestriction(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult | undefined {
  if (input.attackerProne) {
    return blocked(
      'Prone attackers cannot make grapple attacks',
      'AttackerProne',
    );
  }

  if (input.targetProne) {
    return blocked('Prone targets cannot be grappled', 'TargetProne');
  }

  return undefined;
}

function grapplePriorActionRestriction(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult | undefined {
  if (!input.counterGrapple && input.weaponFiredThisTurn) {
    return blocked(
      'A unit that fired weapons this round cannot initiate a grapple',
      'WeaponFiredThisTurn',
    );
  }

  if (
    (input.attackerGrappledTargetMatches === false ||
      input.attackerGrappledTargetMatches === undefined) &&
    input.targetIsGrappleAttacker
  ) {
    return blocked(
      'A unit already involved in another grapple cannot initiate this grapple',
      'AlreadyGrappled',
    );
  }

  return undefined;
}

export function canGrapple(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult {
  const grappleSide = input.grappleSide ?? 'both';
  const restriction =
    grappleOptionRestriction(input) ??
    grappleUnitRestriction(input) ??
    grappleArmRestriction(input, grappleSide) ??
    grapplePositionRestriction(input) ??
    grapplePostureRestriction(input) ??
    grapplePriorActionRestriction(input);

  if (restriction) return restriction;

  return { allowed: true };
}

type GrappleArmSide = 'left' | 'right';

interface IGrappleArmModifierState {
  readonly upperWorking?: boolean;
  readonly lowerWorking?: boolean;
  readonly handWorking?: boolean;
  readonly aesFunctional?: boolean;
}

const GRAPPLE_ARM_MODIFIER_REASONS: Readonly<
  Record<
    GrappleArmSide,
    {
      readonly upper: GrappleAttackModifierReason;
      readonly lower: GrappleAttackModifierReason;
      readonly hand: GrappleAttackModifierReason;
      readonly label: string;
    }
  >
> = {
  left: {
    upper: 'LeftUpperArmActuatorDestroyed',
    lower: 'LeftLowerArmActuatorDestroyed',
    hand: 'LeftHandActuatorDestroyed',
    label: 'Left',
  },
  right: {
    upper: 'RightUpperArmActuatorDestroyed',
    lower: 'RightLowerArmActuatorDestroyed',
    hand: 'RightHandActuatorDestroyed',
    label: 'Right',
  },
};

function grappleArmState(
  input: IGrappleAttackModifierInput,
  side: GrappleArmSide,
): IGrappleArmModifierState {
  return side === 'left'
    ? {
        upperWorking: input.leftUpperArmWorking,
        lowerWorking: input.leftLowerArmWorking,
        handWorking: input.leftHandWorking,
        aesFunctional: input.leftArmAesFunctional,
      }
    : {
        upperWorking: input.rightUpperArmWorking,
        lowerWorking: input.rightLowerArmWorking,
        handWorking: input.rightHandWorking,
        aesFunctional: input.rightArmAesFunctional,
      };
}

function armSelectedForGrapple(
  side: GrappleArmSide,
  grappleSide: GrappleAttackSide,
): boolean {
  return side === 'left'
    ? isLeftSelected(grappleSide)
    : isRightSelected(grappleSide);
}

function appendGrappleArmModifiers(
  modifiers: IGrappleAttackModifier[],
  input: IGrappleAttackModifierInput,
  side: GrappleArmSide,
  grappleSide: GrappleAttackSide,
): void {
  if (!armSelectedForGrapple(side, grappleSide)) return;

  const state = grappleArmState(input, side);
  const reasons = GRAPPLE_ARM_MODIFIER_REASONS[side];
  const checks: readonly [
    boolean | undefined,
    number,
    GrappleAttackModifierReason,
    string,
  ][] = [
    [
      state.upperWorking,
      2,
      reasons.upper,
      `${reasons.label} upper arm actuator destroyed`,
    ],
    [
      state.lowerWorking,
      2,
      reasons.lower,
      `${reasons.label} lower arm actuator destroyed`,
    ],
    [
      state.handWorking,
      1,
      reasons.hand,
      `${reasons.label} hand actuator destroyed`,
    ],
  ];

  for (const [working, value, reasonCode, description] of checks) {
    if (working === false) {
      modifiers.push(modifier(value, reasonCode, description));
    }
  }

  if (state.aesFunctional && grappleSide === side) {
    modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
  }
}

function appendBothArmGrappleModifiers(
  modifiers: IGrappleAttackModifier[],
  input: IGrappleAttackModifierInput,
  grappleSide: GrappleAttackSide,
): void {
  appendGrappleArmModifiers(modifiers, input, 'left', grappleSide);
  appendGrappleArmModifiers(modifiers, input, 'right', grappleSide);

  if (
    grappleSide === 'both' &&
    input.leftArmAesFunctional &&
    input.rightArmAesFunctional
  ) {
    modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
  }
}

export function getGrappleAttackToHitModifiers(
  input: IGrappleAttackModifierInput = {},
): IGrappleAttackToHitModifierResult {
  const modifiers: IGrappleAttackModifier[] = [];
  const grappleSide = input.grappleSide ?? 'both';

  if (input.attackerIsMek) {
    appendBothArmGrappleModifiers(modifiers, input, grappleSide);

    if (grappleSide !== 'both' && input.attackerHasActiveTsm) {
      modifiers.push(modifier(-2, 'TSMActiveBonus', 'TSM Active Bonus'));
    }
  }

  const weightClassModifier = getBreakGrappleWeightClassModifier(input);
  if (weightClassModifier !== 0) {
    modifiers.push(
      modifier(
        weightClassModifier,
        'WeightClassDifference',
        'Weight class difference',
      ),
    );
  }

  return { modifiers };
}
