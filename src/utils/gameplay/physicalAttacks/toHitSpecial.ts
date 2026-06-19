import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type {
  IPhysicalAttackInput,
  IPhysicalModifier,
  IPhysicalToHitResult,
} from './types';

import { getBreakGrappleAttackToHitModifiers } from './breakGrappleEligibility';
import { getBrushOffAttackToHitModifiers } from './brushOffEligibility';
import {
  FLAIL_TO_HIT_MODIFIER,
  HATCHET_TO_HIT_MODIFIER,
  LANCE_TO_HIT_MODIFIER,
  MACE_TO_HIT_MODIFIER,
  RETRACTABLE_BLADE_TO_HIT_MODIFIER,
  SWORD_TO_HIT_MODIFIER,
  WRECKING_BALL_TO_HIT_MODIFIER,
} from './constants';
import { getGrappleAttackToHitModifiers } from './grappleEligibility';
import {
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canGrapplePhysical,
  canMeleeWeapon,
} from './restrictions';
import {
  AUTOMATIC_SUCCESS_TO_HIT,
  appendAttackerSpotting,
  appendEnvironmentalSpecialistPhysicalModifier,
  appendFrogmanPhysicalModifier,
  appendMeleeSpecialist,
  appendTMM,
  appendTargetEvasion,
  appendZweihanderOffArmActuatorModifiers,
  attackerHasActiveTsm,
  attackerIsMekForGrapple,
  breakGrappleModifierSource,
  brushOffModifierSource,
  grappleModifierSource,
  grappleUnitKind,
  gunEmplacementAutomaticSuccess,
  selectedBrushOffArmHasClaw,
  selectedGrappleSide,
} from './toHitValidationCommon';

export function calculateBrushOffToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canBrushOffPhysical(input);
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

  const actuators = input.componentDamage.actuators;
  const brushOffModifiers = getBrushOffAttackToHitModifiers({
    upperArmWorking: !actuators[ActuatorType.UPPER_ARM],
    lowerArmWorking:
      input.lowerArmActuatorPresent === false
        ? false
        : !actuators[ActuatorType.LOWER_ARM],
    armAesFunctional: input.armAesFunctional,
    hasClaws: selectedBrushOffArmHasClaw(input),
    handActuatorPresent: input.handActuatorPresent,
    handWorking: !actuators[ActuatorType.HAND],
    torsoMountedCockpit: input.torsoMountedCockpit,
    headSensorHits: input.headSensorHits,
    centerTorsoSensorHits: input.centerTorsoSensorHits,
    defenderHasMagneticClaws: input.defenderHasMagneticClaws,
  });

  const modifiers: IPhysicalModifier[] = brushOffModifiers.modifiers.map(
    (modifier) => ({
      name: modifier.description,
      value: modifier.value,
      source: brushOffModifierSource(modifier.reasonCode),
    }),
  );

  if (!brushOffModifiers.possible) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers,
      allowed: false,
      restrictionReason: brushOffModifiers.impossibleReason,
      restrictionReasonCode: 'InvalidPhysicalTarget',
    };
  }

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

export function calculateGrappleToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canGrapplePhysical(input);
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

  const actuators = input.componentDamage.actuators;
  const grappleModifiers = getGrappleAttackToHitModifiers({
    grappleSide: selectedGrappleSide(input),
    attackerIsMek: attackerIsMekForGrapple(input),
    leftUpperArmWorking: !actuators[ActuatorType.UPPER_ARM],
    leftLowerArmWorking: !actuators[ActuatorType.LOWER_ARM],
    leftHandWorking: !actuators[ActuatorType.HAND],
    rightUpperArmWorking: !actuators[ActuatorType.UPPER_ARM],
    rightLowerArmWorking: !actuators[ActuatorType.LOWER_ARM],
    rightHandWorking: !actuators[ActuatorType.HAND],
    leftArmAesFunctional: input.leftArmAesFunctional,
    rightArmAesFunctional: input.rightArmAesFunctional,
    attackerHasActiveTsm: attackerHasActiveTsm(input),
    attackerUnitKind: grappleUnitKind(input.attackerUnitType),
    targetUnitKind: grappleUnitKind(input.targetUnitType),
    attackerWeightClass: input.attackerWeightClass,
    targetWeightClass: input.targetWeightClass,
  });

  const modifiers: IPhysicalModifier[] = grappleModifiers.modifiers.map(
    (modifier) => ({
      name: modifier.description,
      value: modifier.value,
      source: grappleModifierSource(modifier.reasonCode),
    }),
  );

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

export function calculateBreakGrappleToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canBreakGrapplePhysical(input);
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

  const actuators = input.componentDamage.actuators;
  const breakGrappleModifiers = getBreakGrappleAttackToHitModifiers({
    originalGrappleAttacker: input.attackerIsGrappleAttacker,
    attackerIsMek: attackerIsMekForGrapple(input),
    leftShoulderWorking: !actuators[ActuatorType.SHOULDER],
    leftUpperArmWorking: !actuators[ActuatorType.UPPER_ARM],
    leftLowerArmWorking: !actuators[ActuatorType.LOWER_ARM],
    leftHandWorking: !actuators[ActuatorType.HAND],
    rightShoulderWorking: !actuators[ActuatorType.SHOULDER],
    rightUpperArmWorking: !actuators[ActuatorType.UPPER_ARM],
    rightLowerArmWorking: !actuators[ActuatorType.LOWER_ARM],
    rightHandWorking: !actuators[ActuatorType.HAND],
    bothArmAesFunctional:
      input.leftArmAesFunctional === true &&
      input.rightArmAesFunctional === true,
    attackerUnitKind: grappleUnitKind(input.attackerUnitType),
    targetUnitKind: grappleUnitKind(input.targetUnitType),
    attackerWeightClass: input.attackerWeightClass,
    targetWeightClass: input.targetWeightClass,
  });

  if (breakGrappleModifiers.automaticSuccess) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: AUTOMATIC_SUCCESS_TO_HIT,
      modifiers: [],
      allowed: true,
      automaticHit: true,
      automaticHitReason: breakGrappleModifiers.automaticSuccessReason,
    };
  }

  const modifiers: IPhysicalModifier[] = breakGrappleModifiers.modifiers.map(
    (modifier) => ({
      name: modifier.description,
      value: modifier.value,
      source: breakGrappleModifierSource(modifier.reasonCode),
    }),
  );

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

export function calculateMeleeWeaponToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canMeleeWeapon(input);
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

  let weaponMod = 0;
  switch (input.attackType) {
    case 'hatchet':
      weaponMod = HATCHET_TO_HIT_MODIFIER;
      break;
    case 'sword':
      weaponMod = SWORD_TO_HIT_MODIFIER;
      break;
    case 'mace':
      weaponMod = MACE_TO_HIT_MODIFIER;
      break;
    case 'lance':
      weaponMod = LANCE_TO_HIT_MODIFIER;
      break;
    case 'retractable-blade':
      weaponMod = RETRACTABLE_BLADE_TO_HIT_MODIFIER;
      break;
    case 'flail':
      weaponMod = FLAIL_TO_HIT_MODIFIER;
      break;
    case 'wrecking-ball':
      weaponMod = WRECKING_BALL_TO_HIT_MODIFIER;
      break;
  }

  const automaticSuccess = gunEmplacementAutomaticSuccess(input);
  if (automaticSuccess) return automaticSuccess;

  const modifiers: IPhysicalModifier[] = [
    {
      name: `${input.attackType} modifier`,
      value: weaponMod,
      source: 'weapon',
    },
  ];

  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendEnvironmentalSpecialistPhysicalModifier(modifiers, input);
  appendFrogmanPhysicalModifier(modifiers, input);
  appendZweihanderOffArmActuatorModifiers(modifiers, input);
  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}
