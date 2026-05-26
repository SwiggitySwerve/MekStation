import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { hexNeighbor } from '../hexMath';
import { HULL_DOWN_KICK_BLOCKED_REASON } from '../hullDownRestrictions';
import { physicalElevationRestriction } from './elevation';
import {
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackLimb,
} from './types';
import { normalizedLamConversionMode } from './unitState';

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

function isRepresentedChargeCapableUnit(
  unitType: UnitType | undefined,
): boolean {
  if (unitType === undefined) return true;
  return (
    isRepresentedMek(unitType) ||
    unitType === UnitType.VEHICLE ||
    unitType === UnitType.SUPPORT_VEHICLE
  );
}

function isKnownRepresentedMek(unitType: UnitType | undefined): boolean {
  return unitType !== undefined && isRepresentedMek(unitType);
}

const NO_HOVER_CHARGE_OPTION_KEYS = new Set([
  'nohovercharge',
  'advancedgroundmovementnohovercharge',
]);

function normalizedOptionalRuleKey(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hasNoHoverChargeOptionalRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (optionalRules ?? []).some((rule) =>
    NO_HOVER_CHARGE_OPTION_KEYS.has(normalizedOptionalRuleKey(rule)),
  );
}

function isChargeBlockedByMovementMode(input: IPhysicalAttackInput): boolean {
  const conversionMode = normalizedLamConversionMode(
    input.attackerConversionMode,
  );

  if (conversionMode === 'fighter') {
    return true;
  }

  if (conversionMode === 'airmek' && input.attackerIsAirborneVTOLOrWiGE) {
    return true;
  }

  switch (input.attackerMovementMode) {
    case 'vtol':
      return true;
    case 'wige':
      return !(
        conversionMode === 'airmek' &&
        isKnownRepresentedMek(input.attackerUnitType)
      );
    case 'hover':
      return hasNoHoverChargeOptionalRule(input.optionalRules);
    default:
      return false;
  }
}

function isChargeBlockedByVehicleCrewStun(
  input: IPhysicalAttackInput,
): boolean {
  return input.attackerVehicleCrewStunned === true;
}

function lamFighterPhysicalRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | null {
  return normalizedLamConversionMode(input.attackerConversionMode) === 'fighter'
    ? {
        allowed: false,
        reason: "LAM fighter mode can't make physical attacks",
        reasonCode: 'AttackerCannotUsePhysical',
      }
    : null;
}

export function canPunch(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (!isRepresentedMek(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: "Non-meks can't punch",
      reasonCode: 'AttackerNotMek',
    };
  }

  const lamRestriction = lamFighterPhysicalRestriction(input);
  if (lamRestriction) return lamRestriction;

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
  if (!isRepresentedMek(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: "Non-meks can't kick",
      reasonCode: 'AttackerNotMek',
    };
  }

  const lamRestriction = lamFighterPhysicalRestriction(input);
  if (lamRestriction) return lamRestriction;

  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot kick while prone',
      reasonCode: 'AttackerProne',
    };
  }

  if (input.attackerHullDown) {
    return {
      allowed: false,
      reason: HULL_DOWN_KICK_BLOCKED_REASON,
      reasonCode: 'AttackerHullDown',
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
  if (!isRepresentedMek(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: "Non-meks can't use mech melee weapons",
      reasonCode: 'AttackerNotMek',
    };
  }

  const lamRestriction = lamFighterPhysicalRestriction(input);
  if (lamRestriction) return lamRestriction;

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

  const lamRestriction = lamFighterPhysicalRestriction(input);
  if (lamRestriction) return lamRestriction;

  if (input.attackerIsAirborneVTOLOrWiGE) {
    return {
      allowed: false,
      reason: 'Cannot push while airborne',
      reasonCode: 'AttackerAirborne',
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

  const terrainContext = input.terrainContext;
  const differentKnownBuilding =
    terrainContext?.attackerBuildingId !== undefined &&
    terrainContext.targetBuildingId !== undefined &&
    terrainContext.attackerBuildingId !== terrainContext.targetBuildingId;
  if (
    terrainContext?.targetInBuilding === true &&
    (terrainContext.attackerInBuilding !== true || differentKnownBuilding)
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
  if (!isRepresentedMek(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: "Non-meks can't DFA",
      reasonCode: 'AttackerNotMek',
    };
  }

  const lamRestriction = lamFighterPhysicalRestriction(input);
  if (lamRestriction) return lamRestriction;

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
  if (!isRepresentedChargeCapableUnit(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: "This unit type can't charge",
      reasonCode: 'AttackerCannotCharge',
    };
  }

  if (isChargeBlockedByMovementMode(input)) {
    return {
      allowed: false,
      reason: "This movement mode can't charge",
      reasonCode: 'AttackerCannotCharge',
    };
  }

  if (isChargeBlockedByVehicleCrewStun(input)) {
    return {
      allowed: false,
      reason: "Stunned vehicle crew can't charge",
      reasonCode: 'AttackerCannotCharge',
    };
  }

  if (input.attackerRanThisTurn === false) {
    return {
      allowed: false,
      reason: 'Charge requires a run this turn',
      reasonCode: 'NoRunThisTurn',
    };
  }
  return { allowed: true };
}
