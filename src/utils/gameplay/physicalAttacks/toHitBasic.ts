import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type {
  IPhysicalAttackInput,
  IPhysicalModifier,
  IPhysicalToHitResult,
} from './types';

import {
  FOOT_KICK_MODIFIER,
  CLAW_PUNCH_TO_HIT_MODIFIER,
  HAND_PUNCH_MODIFIER,
  KICK_TO_HIT_BONUS,
  LOWER_ARM_PUNCH_MODIFIER,
  LOWER_LEG_KICK_MODIFIER,
  PUSH_TO_HIT_BONUS,
  UPPER_ARM_PUNCH_MODIFIER,
  UPPER_LEG_KICK_MODIFIER,
} from './constants';
import { getJumpJetAttackToHitModifiers } from './jumpJetAttackEligibility';
import {
  canCharge,
  canDFA,
  canKick,
  canJumpJetAttackPhysical,
  canPunch,
  canPush,
  canThrashPhysical,
  canTripPhysical,
} from './restrictions';
import {
  AUTOMATIC_SUCCESS_TO_HIT,
  THRASH_AUTOMATIC_HIT_REASON,
  appendAttackerSpotting,
  appendBattleFistModifier,
  appendDfaPilotingDifferentialModifier,
  appendDfaTargetClassModifier,
  appendEnvironmentalSpecialistPhysicalModifier,
  appendFrogmanPhysicalModifier,
  appendMeleeSpecialist,
  appendTMM,
  appendTargetEvasion,
  appendZweihanderOffArmActuatorModifiers,
  gunEmplacementAutomaticSuccess,
  hasPlaytest3Rule,
  jumpJetTargetObjectIsAutomaticSuccess,
  selectedPunchArmHasClaw,
} from './toHitValidationCommon';
import { getTripAttackBaseToHitAdjustment } from './tripEligibility';

export function calculatePunchToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canPunch(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const automaticSuccess = gunEmplacementAutomaticSuccess(input);
  if (automaticSuccess) return automaticSuccess;

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_ARM]) {
    modifiers.push({
      name: 'Upper arm actuator destroyed',
      value: UPPER_ARM_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_ARM]) {
    modifiers.push({
      name: 'Lower arm actuator destroyed',
      value: LOWER_ARM_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  const usingClaws = selectedPunchArmHasClaw(input);
  if (actuators[ActuatorType.HAND] && !usingClaws) {
    modifiers.push({
      name: 'Hand actuator destroyed',
      value: HAND_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  if (usingClaws) {
    modifiers.push({
      name: 'Using Claws',
      value: hasPlaytest3Rule(input.optionalRules)
        ? 0
        : CLAW_PUNCH_TO_HIT_MODIFIER,
      source: 'physical-equipment',
    });
  }
  appendZweihanderOffArmActuatorModifiers(modifiers, input);

  // Per task 4.3: target movement modifier (TMM) applies to punch to-hit.
  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendBattleFistModifier(modifiers, input);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateKickToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canKick(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill - KICK_TO_HIT_BONUS,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const automaticSuccess = gunEmplacementAutomaticSuccess(input);
  if (automaticSuccess) {
    return {
      ...automaticSuccess,
      baseToHit: input.pilotingSkill - KICK_TO_HIT_BONUS,
    };
  }

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_LEG]) {
    modifiers.push({
      name: 'Upper leg actuator destroyed',
      value: UPPER_LEG_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_LEG]) {
    modifiers.push({
      name: 'Lower leg actuator destroyed',
      value: LOWER_LEG_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.FOOT]) {
    modifiers.push({
      name: 'Foot actuator destroyed',
      value: FOOT_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  // Per task 5.3: target movement modifier (TMM) applies to kick to-hit.
  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  const baseToHit = input.pilotingSkill - KICK_TO_HIT_BONUS;

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateChargeToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  // Per task 3.7: charge requires the attacker ran this turn.
  const restriction = canCharge(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const modifiers: IPhysicalModifier[] = [];

  // Per task 6.1: charge to-hit = piloting + attacker-movement modifier.
  if (
    input.attackerMovementModifier !== undefined &&
    input.attackerMovementModifier !== 0
  ) {
    modifiers.push({
      name: 'Attacker movement modifier',
      value: input.attackerMovementModifier,
      source: 'movement',
    });
  }

  // Per task 4.3 / 5.3 analog: charge also respects target TMM.
  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateDFAToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  // Per task 3.6: DFA requires the attacker jumped this turn.
  const restriction = canDFA(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const automaticSuccess = gunEmplacementAutomaticSuccess(input);
  if (automaticSuccess) return automaticSuccess;

  const modifiers: IPhysicalModifier[] = [];

  appendDfaTargetClassModifier(modifiers, input.targetUnitType);
  // DFA inherits TMM like punch/kick.
  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendDfaPilotingDifferentialModifier(
    modifiers,
    input.pilotingSkill,
    input.targetPilotingSkill,
  );
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculatePushToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canPush(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill - PUSH_TO_HIT_BONUS,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const baseToHit = input.pilotingSkill - PUSH_TO_HIT_BONUS;
  const modifiers: IPhysicalModifier[] = [];

  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);
  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateTripToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const baseToHit = input.pilotingSkill + getTripAttackBaseToHitAdjustment();
  const restriction = canTripPhysical(input);
  if (!restriction.allowed) {
    return {
      baseToHit,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_LEG]) {
    modifiers.push({
      name: 'Upper leg actuator destroyed',
      value: UPPER_LEG_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_LEG]) {
    modifiers.push({
      name: 'Lower leg actuator destroyed',
      value: LOWER_LEG_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.FOOT]) {
    modifiers.push({
      name: 'Foot actuator destroyed',
      value: FOOT_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (input.legAesFunctional) {
    modifiers.push({
      name: 'Leg AES modifier',
      value: -1,
      source: 'actuator',
    });
  }

  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
    allowed: true,
  };
}
