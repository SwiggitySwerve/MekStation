import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { hexNeighbor } from '../hexMath';
import { physicalElevationRestriction } from './elevation';
import {
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackLimb,
} from './types';

/**
 * Per `implement-physical-attack-phase` task 3.5: same limb (arm or leg)
 * SHALL NOT be used for both a kick and a punch in the same turn.
 * Returns the conflict when `input.limb` is already in the used-list.
 */
function limbConflict(
  limb: PhysicalAttackLimb | undefined,
  usedThisTurn: readonly PhysicalAttackLimb[] | undefined,
): boolean {
  if (!limb) return false;
  if (!usedThisTurn || usedThisTurn.length === 0) return false;
  return usedThisTurn.includes(limb);
}

function isRepresentedMek(unitType: UnitType | undefined): boolean {
  if (unitType === undefined) return true;
  return (
    unitType === UnitType.BATTLEMECH ||
    unitType === UnitType.OMNIMECH ||
    unitType === UnitType.INDUSTRIALMECH
  );
}

export function canPunch(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const actuators = input.componentDamage.actuators;

  // Per task 3.1: shoulder destroyed disqualifies the arm entirely.
  if (actuators[ActuatorType.SHOULDER]) {
    return {
      allowed: false,
      reason: 'Shoulder actuator destroyed',
      reasonCode: 'ShoulderDestroyed',
    };
  }

  // Per task 3.1: the arm that fired a weapon this turn cannot punch.
  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  // Per task 3.3: punch requires lower arm OR hand actuator present.
  // `undefined` means "caller didn't supply presence info" → fall back
  // to legacy behavior (allowed). Explicit `false` for both blocks the
  // attack.
  if (
    input.lowerArmActuatorPresent === false &&
    input.handActuatorPresent === false
  ) {
    return {
      allowed: false,
      reason: 'Lower-arm and hand actuators both missing',
      reasonCode: 'MissingActuator',
    };
  }

  // Per task 3.5: same limb already used this turn → reject.
  if (limbConflict(input.limb, input.limbsUsedThisTurn)) {
    return {
      allowed: false,
      reason: 'Limb already used this turn',
      reasonCode: 'SameLimbUsedThisTurn',
    };
  }

  const elevationRestriction = physicalElevationRestriction(
    'punch',
    input.elevationContext,
  );
  if (elevationRestriction) {
    return {
      allowed: false,
      reason: elevationRestriction,
      reasonCode: 'TargetElevationNotInRange',
    };
  }

  return { allowed: true };
}

export function canKick(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot kick while prone',
      reasonCode: 'AttackerProne',
    };
  }

  const actuators = input.componentDamage.actuators;
  // Per task 3.2: hip crit disqualifies the leg entirely.
  if (actuators[ActuatorType.HIP]) {
    return {
      allowed: false,
      reason: 'Hip actuator destroyed',
      reasonCode: 'HipDestroyed',
    };
  }

  // Per task 3.4: kick requires upper leg + foot actuators present.
  if (input.upperLegActuatorPresent === false) {
    return {
      allowed: false,
      reason: 'Upper leg actuator missing',
      reasonCode: 'MissingActuator',
    };
  }
  if (input.footActuatorPresent === false) {
    return {
      allowed: false,
      reason: 'Foot actuator missing',
      reasonCode: 'MissingActuator',
    };
  }

  // Per task 3.5: same limb already used this turn → reject.
  if (limbConflict(input.limb, input.limbsUsedThisTurn)) {
    return {
      allowed: false,
      reason: 'Limb already used this turn',
      reasonCode: 'SameLimbUsedThisTurn',
    };
  }

  const elevationRestriction = physicalElevationRestriction(
    'kick',
    input.elevationContext,
  );
  if (elevationRestriction) {
    return {
      allowed: false,
      reason: elevationRestriction,
      reasonCode: 'TargetElevationNotInRange',
    };
  }

  return { allowed: true };
}

export function canMeleeWeapon(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const actuators = input.componentDamage.actuators;

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  if (actuators[ActuatorType.SHOULDER]) {
    return {
      allowed: false,
      reason: 'Shoulder actuator destroyed',
      reasonCode: 'ShoulderDestroyed',
    };
  }

  // Per `physical-weapons-system` delta "Missing hand/lower-arm blocks
  // club attack": destruction of either actuator blocks the attack.
  if (actuators[ActuatorType.LOWER_ARM]) {
    return {
      allowed: false,
      reason: 'Lower arm actuator destroyed',
      reasonCode: 'MissingActuator',
    };
  }

  if (actuators[ActuatorType.HAND]) {
    return {
      allowed: false,
      reason: 'Hand actuator destroyed',
      reasonCode: 'MissingActuator',
    };
  }

  return { allowed: true };
}

export function canPush(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (!isRepresentedMek(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: "Non-meks can't push",
      reasonCode: 'AttackerNotMek',
    };
  }

  if (!isRepresentedMek(input.targetUnitType)) {
    return {
      allowed: false,
      reason: 'Target is not a mek',
      reasonCode: 'TargetNotMek',
    };
  }

  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Attacker is prone',
      reasonCode: 'AttackerProne',
    };
  }

  if (input.targetProne) {
    return {
      allowed: false,
      reason: 'Target is prone',
      reasonCode: 'TargetProne',
    };
  }

  if (input.targetIsAirborne) {
    return {
      allowed: false,
      reason: 'Cannot push an airborne target',
      reasonCode: 'TargetAirborne',
    };
  }

  if (
    input.attackerDestroyedLocations?.includes('left_arm') ||
    input.attackerDestroyedLocations?.includes('right_arm')
  ) {
    return {
      allowed: false,
      reason: 'Arm missing',
      reasonCode: 'LimbMissing',
    };
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Weapons fired from arm this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  if (
    input.attackerPosition &&
    input.targetPosition &&
    input.attackerFacing !== undefined
  ) {
    const expectedTargetHex = hexNeighbor(
      input.attackerPosition,
      input.attackerFacing,
    );
    if (
      expectedTargetHex.q !== input.targetPosition.q ||
      expectedTargetHex.r !== input.targetPosition.r
    ) {
      return {
        allowed: false,
        reason: 'Target not directly ahead of feet',
        reasonCode: 'TargetNotDirectlyAhead',
      };
    }
  }

  const elevationRestriction = physicalElevationRestriction(
    'push',
    input.elevationContext,
  );
  if (elevationRestriction) {
    return {
      allowed: false,
      reason: elevationRestriction,
      reasonCode: 'TargetElevationNotInRange',
    };
  }

  if (
    input.terrainContext?.targetInBuilding === true &&
    input.terrainContext.attackerInBuilding !== true
  ) {
    return {
      allowed: false,
      reason: 'Target is inside building',
      reasonCode: 'TargetInsideBuilding',
    };
  }

  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 3.6: DFA requires the
 * attacker to have jumped this turn.
 */
export function canDFA(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.attackerJumpedThisTurn === false) {
    return {
      allowed: false,
      reason: 'DFA requires a jump this turn',
      reasonCode: 'NoJumpThisTurn',
    };
  }
  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 3.7: charge requires the
 * attacker to have run this turn.
 */
export function canCharge(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.attackerRanThisTurn === false) {
    return {
      allowed: false,
      reason: 'Charge requires a run this turn',
      reasonCode: 'NoRunThisTurn',
    };
  }
  return { allowed: true };
}
