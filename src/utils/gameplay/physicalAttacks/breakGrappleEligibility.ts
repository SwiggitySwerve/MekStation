export type BreakGrappleAttackInvalidReason =
  | 'TacOpsGrapplingDisabled'
  | 'AttackerAirborne'
  | 'CommonImpossible'
  | 'ChainWhipGrappled'
  | 'AttackerNotMekOrProtoMek'
  | 'NotGrappledToTarget';

export type BreakGrappleUnitKind = 'mek' | 'protoMek' | 'other';

export type BreakGrappleAttackModifierReason =
  | 'LeftShoulderActuatorDestroyed'
  | 'LeftUpperArmActuatorDestroyed'
  | 'LeftLowerArmActuatorDestroyed'
  | 'LeftHandActuatorDestroyed'
  | 'RightShoulderActuatorDestroyed'
  | 'RightUpperArmActuatorDestroyed'
  | 'RightLowerArmActuatorDestroyed'
  | 'RightHandActuatorDestroyed'
  | 'ArmAES'
  | 'WeightClassDifference';

export interface IBreakGrappleAttackEligibilityInput {
  readonly tacOpsGrapplingEnabled?: boolean;
  readonly attackerIsMek?: boolean;
  readonly attackerIsProtoMek?: boolean;
  readonly attackerIsAirborneVTOLorWIGE?: boolean;
  readonly commonImpossibleReasonCode?: 'LockedInGrapple' | 'Other';
  readonly attackerChainWhipGrappled?: boolean;
  readonly grappledTargetMatches?: boolean;
}

export interface IBreakGrappleAttackEligibilityResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly reasonCode?: BreakGrappleAttackInvalidReason;
}

export interface IBreakGrappleWeightClassModifierInput {
  readonly attackerUnitKind?: BreakGrappleUnitKind;
  readonly targetUnitKind?: BreakGrappleUnitKind;
  readonly attackerWeightClass?: number;
  readonly targetWeightClass?: number;
}

export interface IBreakGrappleAttackModifierInput extends IBreakGrappleWeightClassModifierInput {
  readonly originalGrappleAttacker?: boolean;
  readonly attackerIsMek?: boolean;
  readonly leftShoulderWorking?: boolean;
  readonly leftUpperArmWorking?: boolean;
  readonly leftLowerArmWorking?: boolean;
  readonly leftHandWorking?: boolean;
  readonly rightShoulderWorking?: boolean;
  readonly rightUpperArmWorking?: boolean;
  readonly rightLowerArmWorking?: boolean;
  readonly rightHandWorking?: boolean;
  readonly bothArmAesFunctional?: boolean;
}

export interface IBreakGrappleAttackModifier {
  readonly value: number;
  readonly reasonCode: BreakGrappleAttackModifierReason;
  readonly description: string;
}

export interface IBreakGrappleAttackToHitModifierResult {
  readonly automaticSuccess: boolean;
  readonly automaticSuccessReason?: string;
  readonly automaticSuccessReasonCode?: 'OriginalGrappleAttacker';
  readonly modifiers: readonly IBreakGrappleAttackModifier[];
}

function blocked(
  reason: string,
  reasonCode: BreakGrappleAttackInvalidReason,
): IBreakGrappleAttackEligibilityResult {
  return { allowed: false, reason, reasonCode };
}

function modifier(
  value: number,
  reasonCode: BreakGrappleAttackModifierReason,
  description: string,
): IBreakGrappleAttackModifier {
  return { value, reasonCode, description };
}

export function canBreakGrapple(
  input: IBreakGrappleAttackEligibilityInput,
): IBreakGrappleAttackEligibilityResult {
  if (input.tacOpsGrapplingEnabled !== true) {
    return blocked(
      'Break-grapple attacks require the TacOps grappling option',
      'TacOpsGrapplingDisabled',
    );
  }

  if (input.attackerIsAirborneVTOLorWIGE) {
    return blocked(
      'Airborne VTOL or WIGE attackers cannot break grapples',
      'AttackerAirborne',
    );
  }

  if (
    input.commonImpossibleReasonCode !== undefined &&
    input.commonImpossibleReasonCode !== 'LockedInGrapple'
  ) {
    return blocked(
      'Break-grapple attacks require the common physical attack state to be locked in grapple',
      'CommonImpossible',
    );
  }

  if (input.attackerChainWhipGrappled) {
    return blocked(
      'A unit cannot break free from a chain whip grapple',
      'ChainWhipGrappled',
    );
  }

  if (input.attackerIsMek !== true && input.attackerIsProtoMek !== true) {
    return blocked(
      'Only Meks and ProtoMeks can break grapples',
      'AttackerNotMekOrProtoMek',
    );
  }

  if (input.grappledTargetMatches !== true) {
    return blocked(
      'Break-grapple attacks require the attacker to be grappled by the target',
      'NotGrappledToTarget',
    );
  }

  return { allowed: true };
}

export function getBreakGrappleWeightClassModifier(
  input: IBreakGrappleWeightClassModifierInput,
): number {
  const attackerWeightClass = input.attackerWeightClass ?? 0;
  const targetWeightClass = input.targetWeightClass ?? 0;

  if (
    input.targetUnitKind === 'protoMek' &&
    input.attackerUnitKind !== 'protoMek'
  ) {
    return attackerWeightClass * -1;
  }

  if (
    input.attackerUnitKind === 'protoMek' &&
    input.targetUnitKind !== 'protoMek'
  ) {
    return targetWeightClass;
  }

  if (input.targetUnitKind === 'protoMek') {
    return 0;
  }

  return targetWeightClass - attackerWeightClass;
}

export function getBreakGrappleAttackToHitModifiers(
  input: IBreakGrappleAttackModifierInput = {},
): IBreakGrappleAttackToHitModifierResult {
  if (input.originalGrappleAttacker) {
    return {
      automaticSuccess: true,
      automaticSuccessReason: 'original attacker',
      automaticSuccessReasonCode: 'OriginalGrappleAttacker',
      modifiers: [],
    };
  }

  const modifiers: IBreakGrappleAttackModifier[] = [];

  if (input.attackerIsMek) {
    if (input.leftShoulderWorking === false) {
      modifiers.push(
        modifier(
          2,
          'LeftShoulderActuatorDestroyed',
          'Left shoulder actuator destroyed',
        ),
      );
    }
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
    if (input.rightShoulderWorking === false) {
      modifiers.push(
        modifier(
          2,
          'RightShoulderActuatorDestroyed',
          'Right shoulder actuator destroyed',
        ),
      );
    }
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
    if (input.bothArmAesFunctional) {
      modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
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

  return { automaticSuccess: false, modifiers };
}
