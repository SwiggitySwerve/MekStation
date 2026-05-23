import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  hasNoArms,
  isLowArmsRestricted,
} from '@/utils/gameplay/quirkModifiers';

import {
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
} from './types';

function blocked(
  reason: string,
  reasonCode: PhysicalAttackInvalidReason,
): IPhysicalAttackRestriction {
  return { allowed: false, reason, reasonCode };
}

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

function sharedPhysicalTargetRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.targetExists === false) {
    return blocked(
      'Physical attacks require an existing target',
      'TargetMissing',
    );
  }

  if (input.targetDestroyed) {
    return blocked(
      'Physical attacks cannot target destroyed units',
      'TargetDestroyed',
    );
  }

  if (input.targetIsSelf) {
    return blocked('Physical attacks cannot target the attacker', 'SelfTarget');
  }

  if (input.targetIsFriendly) {
    return blocked(
      'Physical attacks cannot target friendly units',
      'FriendlyTarget',
    );
  }

  if (input.targetDistance !== undefined && input.targetDistance !== 1) {
    return blocked(
      'Physical attacks require an adjacent target',
      'TargetNotAdjacent',
    );
  }

  return { allowed: true };
}

const MEK_UNIT_TYPES = new Set([
  'battlemech',
  'mek',
  'mech',
  'omnimech',
  'industrialmech',
]);
const INFANTRY_UNIT_TYPES = new Set(['infantry', 'battlearmor']);
const DEFAULT_STANDING_MEK_HEIGHT = 1;

function canonicalUnitType(value: string | undefined): string | undefined {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function explicitNonMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && !MEK_UNIT_TYPES.has(canonical);
}

function legacyOrMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical === undefined || MEK_UNIT_TYPES.has(canonical);
}

function infantryUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && INFANTRY_UNIT_TYPES.has(canonical);
}

function verticalBandsOverlap(input: IPhysicalAttackInput): boolean {
  if (input.elevationDifference === undefined) return true;

  const attackerBottom = 0;
  const attackerTop = input.attackerHeight ?? DEFAULT_STANDING_MEK_HEIGHT;
  const targetBottom = input.elevationDifference;
  const targetTop =
    input.elevationDifference +
    (input.targetHeight ?? DEFAULT_STANDING_MEK_HEIGHT);

  return attackerBottom <= targetTop && attackerTop >= targetBottom;
}

export function canPunch(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const unitQuirks = input.unitQuirks ?? [];

  if (hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents punch attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  if (isLowArmsRestricted(unitQuirks, input.elevationDifference ?? 0)) {
    return {
      allowed: false,
      reason: 'Low Arms quirk prevents attacks against higher targets',
      reasonCode: 'LowArmsQuirk',
    };
  }

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

  return { allowed: true };
}

export function canKick(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

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

  return { allowed: true };
}

export function canMeleeWeapon(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const unitQuirks = input.unitQuirks ?? [];

  if (hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents arm-mounted melee attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  if (isLowArmsRestricted(unitQuirks, input.elevationDifference ?? 0)) {
    return {
      allowed: false,
      reason: 'Low Arms quirk prevents attacks against higher targets',
      reasonCode: 'LowArmsQuirk',
    };
  }

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

/**
 * Per `implement-physical-attack-phase` task 3.6: DFA requires the
 * attacker to have jumped this turn.
 */
export function canDFA(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  if (input.attackerJumpedThisTurn === false) {
    return {
      allowed: false,
      reason: 'DFA requires a jump this turn',
      reasonCode: 'NoJumpThisTurn',
    };
  }
  if (infantryUnitType(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: 'Infantry cannot DFA',
      reasonCode: 'AttackerInfantry',
    };
  }
  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot DFA while prone',
      reasonCode: 'AttackerProne',
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
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  if (input.attackerRanThisTurn === false) {
    return blocked('Charge requires a run this turn', 'NoRunThisTurn');
  }
  if (legacyOrMekUnitType(input.attackerUnitType)) {
    if (explicitNonMekUnitType(input.targetUnitType)) {
      return blocked('Charge target must be a Mek', 'TargetNotMek');
    }
    if (input.targetProne) {
      return blocked('Charge target must be standing', 'TargetProne');
    }
  } else if (
    infantryUnitType(input.targetUnitType) ||
    canonicalUnitType(input.targetUnitType) === 'protomech'
  ) {
    return blocked(
      'Cannot charge Infantry or ProtoMech targets',
      'TargetInfantryOrProtoMek',
    );
  }
  if (!verticalBandsOverlap(input)) {
    return blocked(
      'Charge target must overlap attacker elevation',
      'ElevationMismatch',
    );
  }
  if (input.targetMovementComplete === false && input.targetImmobile !== true) {
    return blocked(
      'Charge target must be done with movement',
      'TargetMovementIncomplete',
    );
  }
  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 8.5: a push cannot be
 * declared when the target's displacement hex is blocked or off-map.
 */
export function canPush(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const unitQuirks = input.unitQuirks ?? [];
  const destroyedLocations = input.attackerDestroyedLocations ?? [];

  if (explicitNonMekUnitType(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: 'Non-Meks cannot push',
      reasonCode: 'AttackerNotMek',
    };
  }

  if (input.attackerIsQuad) {
    return {
      allowed: false,
      reason: 'Quad BattleMechs cannot push',
      reasonCode: 'AttackerQuad',
    };
  }

  if (explicitNonMekUnitType(input.targetUnitType)) {
    return {
      allowed: false,
      reason: 'Push target must be a Mek',
      reasonCode: 'TargetNotMek',
    };
  }

  if (
    destroyedLocations.includes('left_arm') ||
    destroyedLocations.includes('right_arm')
  ) {
    return {
      allowed: false,
      reason: 'Both arms must be present to push',
      reasonCode: 'LimbMissing',
    };
  }

  if (hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents push attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  if (
    input.elevationDifference !== undefined &&
    input.elevationDifference !== 0
  ) {
    return {
      allowed: false,
      reason: 'Push requires the target to be at the same elevation',
      reasonCode: 'ElevationMismatch',
    };
  }

  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot push while prone',
      reasonCode: 'AttackerProne',
    };
  }

  if (input.targetProne) {
    return {
      allowed: false,
      reason: 'Cannot push prone targets',
      reasonCode: 'TargetProne',
    };
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  if (input.pushDestinationValid === false) {
    return {
      allowed: false,
      reason: 'Push destination blocked',
      reasonCode: 'DestinationBlocked',
    };
  }
  if (input.pushTargetDirectlyAhead === false) {
    return {
      allowed: false,
      reason: 'Push target must be directly ahead of attacker facing',
      reasonCode: 'TargetNotDirectlyAhead',
    };
  }
  return { allowed: true };
}
