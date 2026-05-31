import type { IPhysicalAttackInput } from './types';

import { calculatePunchDamage } from './damage';

export type BrushOffAttackInvalidReason =
  | 'AttackerNotMek'
  | 'InvalidArmSelection'
  | 'InvalidTarget'
  | 'AttackerQuad'
  | 'ArmsFlipped'
  | 'ArmMissing'
  | 'NoArmsQuirk'
  | 'ShoulderDestroyed'
  | 'ArmWeaponFiredThisTurn'
  | 'TargetMakingDfa'
  | 'AttackerProne'
  | 'InvalidExplicitTarget';

export type BrushOffAttackModifierReason =
  | 'BrushOffSwarmingInfantry'
  | 'UpperArmActuatorDestroyed'
  | 'LowerArmActuatorMissingOrDestroyed'
  | 'ArmAES'
  | 'HandActuatorMissing'
  | 'HandActuatorDestroyed'
  | 'UsingClaws'
  | 'TorsoMountedCockpitHeadSensorsDestroyed'
  | 'DefenderMagneticClaws';

export type BrushOffAttackSelectedArm = 'left' | 'right' | 'both';

export interface IBrushOffAttackEligibilityInput {
  readonly attackerIsMek?: boolean;
  readonly selectedArm?: BrushOffAttackSelectedArm;
  readonly targetIsSwarmingInfantryOnAttacker?: boolean;
  readonly targetIsINarcPod?: boolean;
  readonly attackerIsQuad?: boolean;
  readonly armsFlipped?: boolean;
  readonly selectedArmMissing?: boolean;
  readonly noMinimalArmsQuirk?: boolean;
  readonly shoulderWorking?: boolean;
  readonly armWeaponFiredThisTurn?: boolean;
  readonly targetMakingDfa?: boolean;
  readonly attackerProne?: boolean;
  readonly targetIsBuildingFuelTankOrHex?: boolean;
}

export interface IBrushOffAttackEligibilityResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly reasonCode?: BrushOffAttackInvalidReason;
}

export interface IBrushOffAttackModifierInput {
  readonly upperArmWorking?: boolean;
  readonly lowerArmWorking?: boolean;
  readonly armAesFunctional?: boolean;
  readonly hasClaws?: boolean;
  readonly handActuatorPresent?: boolean;
  readonly handWorking?: boolean;
  readonly torsoMountedCockpit?: boolean;
  readonly headSensorHits?: number;
  readonly centerTorsoSensorHits?: number;
  readonly defenderHasMagneticClaws?: boolean;
}

export interface IBrushOffAttackModifier {
  readonly value: number;
  readonly reasonCode: BrushOffAttackModifierReason;
  readonly description: string;
}

export interface IBrushOffAttackToHitModifierResult {
  readonly possible: boolean;
  readonly modifiers: readonly IBrushOffAttackModifier[];
  readonly impossibleReason?: string;
  readonly impossibleReasonCode?: 'TorsoMountedCockpitSensorsDestroyed';
}

function blocked(
  reason: string,
  reasonCode: BrushOffAttackInvalidReason,
): IBrushOffAttackEligibilityResult {
  return { allowed: false, reason, reasonCode };
}

function modifier(
  value: number,
  reasonCode: BrushOffAttackModifierReason,
  description: string,
): IBrushOffAttackModifier {
  return { value, reasonCode, description };
}

export function canBrushOff(
  input: IBrushOffAttackEligibilityInput,
): IBrushOffAttackEligibilityResult {
  if (input.attackerIsMek === false) {
    return blocked(
      'Only Meks can brush off swarming infantry or iNarc pods',
      'AttackerNotMek',
    );
  }

  if (input.selectedArm !== 'left' && input.selectedArm !== 'right') {
    return blocked(
      'Brush-off attacks must select the left or right arm',
      'InvalidArmSelection',
    );
  }

  if (
    input.targetIsSwarmingInfantryOnAttacker !== true &&
    input.targetIsINarcPod !== true
  ) {
    return blocked(
      'Brush-off attacks can only target swarming infantry or iNarc pods',
      'InvalidTarget',
    );
  }

  if (input.attackerIsQuad) {
    return blocked('Quad Meks cannot brush off targets', 'AttackerQuad');
  }

  if (input.armsFlipped) {
    return blocked(
      'Brush-off attacks cannot use flipped rear arms',
      'ArmsFlipped',
    );
  }

  if (input.selectedArmMissing) {
    return blocked('Brush-off attacks require the selected arm', 'ArmMissing');
  }

  if (input.noMinimalArmsQuirk) {
    return blocked('Brush-off attacks require normal arms', 'NoArmsQuirk');
  }

  if (input.shoulderWorking === false) {
    return blocked(
      'Brush-off attacks require a working shoulder actuator',
      'ShoulderDestroyed',
    );
  }

  if (input.armWeaponFiredThisTurn) {
    return blocked(
      'The selected arm cannot have fired weapons this turn',
      'ArmWeaponFiredThisTurn',
    );
  }

  if (input.targetMakingDfa) {
    return blocked(
      'Brush-off attacks cannot target a unit making a DFA attack',
      'TargetMakingDfa',
    );
  }

  if (input.attackerProne) {
    return blocked('Prone attackers cannot brush off targets', 'AttackerProne');
  }

  if (input.targetIsBuildingFuelTankOrHex) {
    return blocked(
      'Brush-off attacks cannot target buildings, fuel tanks, or hexes',
      'InvalidExplicitTarget',
    );
  }

  return { allowed: true };
}

export function getBrushOffAttackToHitModifiers(
  input: IBrushOffAttackModifierInput = {},
): IBrushOffAttackToHitModifierResult {
  const modifiers: IBrushOffAttackModifier[] = [
    modifier(4, 'BrushOffSwarmingInfantry', 'brush off swarming infantry'),
  ];

  if (input.upperArmWorking === false) {
    modifiers.push(
      modifier(2, 'UpperArmActuatorDestroyed', 'Upper arm actuator destroyed'),
    );
  }

  if (input.lowerArmWorking === false) {
    modifiers.push(
      modifier(
        2,
        'LowerArmActuatorMissingOrDestroyed',
        'Lower arm actuator missing or destroyed',
      ),
    );
  }

  if (input.armAesFunctional) {
    modifiers.push(modifier(-1, 'ArmAES', 'AES modifier'));
  }

  const hasClaws = input.hasClaws === true;
  const lowerArmPresent = input.lowerArmWorking !== false;
  const handPresent = input.handActuatorPresent !== false;

  if (!hasClaws && !handPresent && lowerArmPresent) {
    modifiers.push(modifier(1, 'HandActuatorMissing', 'Hand actuator missing'));
  } else if (!hasClaws && handPresent && input.handWorking === false) {
    modifiers.push(
      modifier(1, 'HandActuatorDestroyed', 'Hand actuator destroyed'),
    );
  } else if (hasClaws) {
    modifiers.push(modifier(1, 'UsingClaws', 'Using Claws'));
  }

  if (input.torsoMountedCockpit) {
    const totalSensorHits =
      (input.headSensorHits ?? 0) + (input.centerTorsoSensorHits ?? 0);
    if (totalSensorHits === 3) {
      return {
        possible: false,
        modifiers,
        impossibleReason:
          'Sensors Completely Destroyed for Torso-Mounted Cockpit',
        impossibleReasonCode: 'TorsoMountedCockpitSensorsDestroyed',
      };
    }
    if ((input.headSensorHits ?? 0) === 2) {
      modifiers.push(
        modifier(
          4,
          'TorsoMountedCockpitHeadSensorsDestroyed',
          'Head Sensors Destroyed for Torso-Mounted Cockpit',
        ),
      );
    }
  }

  if (input.defenderHasMagneticClaws) {
    modifiers.push(
      modifier(1, 'DefenderMagneticClaws', 'defender has magnetic claws'),
    );
  }

  return { possible: true, modifiers };
}

export function calculateBrushOffAttackDamage(
  input: IPhysicalAttackInput,
): number {
  return calculatePunchDamage(input);
}
