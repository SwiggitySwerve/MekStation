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

export function canGrapple(
  input: IGrappleAttackEligibilityInput,
): IGrappleAttackEligibilityResult {
  const grappleSide = input.grappleSide ?? 'both';

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

  if (input.attackerProne) {
    return blocked(
      'Prone attackers cannot make grapple attacks',
      'AttackerProne',
    );
  }

  if (input.targetProne) {
    return blocked('Prone targets cannot be grappled', 'TargetProne');
  }

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

  return { allowed: true };
}

export function getGrappleAttackToHitModifiers(
  input: IGrappleAttackModifierInput = {},
): IGrappleAttackToHitModifierResult {
  const modifiers: IGrappleAttackModifier[] = [];
  const grappleSide = input.grappleSide ?? 'both';

  if (input.attackerIsMek) {
    if (isLeftSelected(grappleSide)) {
      if (input.leftUpperArmWorking === false) {
        modifiers.push(
          modifier(
            2,
            'LeftUpperArmActuatorDestroyed',
            'Left upper arm actuator destroyed',
          ),
        );
      }
      if (input.leftLowerArmWorking === false) {
        modifiers.push(
          modifier(
            2,
            'LeftLowerArmActuatorDestroyed',
            'Left lower arm actuator destroyed',
          ),
        );
      }
      if (input.leftHandWorking === false) {
        modifiers.push(
          modifier(
            1,
            'LeftHandActuatorDestroyed',
            'Left hand actuator destroyed',
          ),
        );
      }
      if (input.leftArmAesFunctional && grappleSide === 'left') {
        modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
      }
    }

    if (isRightSelected(grappleSide)) {
      if (input.rightUpperArmWorking === false) {
        modifiers.push(
          modifier(
            2,
            'RightUpperArmActuatorDestroyed',
            'Right upper arm actuator destroyed',
          ),
        );
      }
      if (input.rightLowerArmWorking === false) {
        modifiers.push(
          modifier(
            2,
            'RightLowerArmActuatorDestroyed',
            'Right lower arm actuator destroyed',
          ),
        );
      }
      if (input.rightHandWorking === false) {
        modifiers.push(
          modifier(
            1,
            'RightHandActuatorDestroyed',
            'Right hand actuator destroyed',
          ),
        );
      }
      if (input.rightArmAesFunctional && grappleSide === 'right') {
        modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
      }
    }

    if (
      grappleSide === 'both' &&
      input.leftArmAesFunctional &&
      input.rightArmAesFunctional
    ) {
      modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
    }

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
