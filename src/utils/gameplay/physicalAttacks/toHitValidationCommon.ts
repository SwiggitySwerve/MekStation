import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { calculateEnvironmentalSpecialistPhysicalToHitModifier } from '@/utils/gameplay/environmentalModifiers';
import { getBattleFistPunchToHitModifier } from '@/utils/gameplay/quirkModifiers';
import {
  calculateFrogmanPhysicalToHitModifier,
  calculateMeleeSpecialistModifier,
} from '@/utils/gameplay/spaModifiers';
import { calculateTargetEvasionModifier } from '@/utils/gameplay/toHit/movementModifiers';

import { getBreakGrappleAttackToHitModifiers } from './breakGrappleEligibility';
import { getBrushOffAttackToHitModifiers } from './brushOffEligibility';
import {
  FOOT_KICK_MODIFIER,
  CLAW_PUNCH_TO_HIT_MODIFIER,
  FLAIL_TO_HIT_MODIFIER,
  HAND_PUNCH_MODIFIER,
  HATCHET_TO_HIT_MODIFIER,
  KICK_TO_HIT_BONUS,
  LANCE_TO_HIT_MODIFIER,
  LOWER_ARM_PUNCH_MODIFIER,
  LOWER_LEG_KICK_MODIFIER,
  MACE_TO_HIT_MODIFIER,
  PUSH_TO_HIT_BONUS,
  RETRACTABLE_BLADE_TO_HIT_MODIFIER,
  SWORD_TO_HIT_MODIFIER,
  TSM_ACTIVATION_HEAT,
  UPPER_ARM_PUNCH_MODIFIER,
  UPPER_LEG_KICK_MODIFIER,
  WRECKING_BALL_TO_HIT_MODIFIER,
} from './constants';
import { getGrappleAttackToHitModifiers } from './grappleEligibility';
import { getJumpJetAttackToHitModifiers } from './jumpJetAttackEligibility';
import {
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canGrapplePhysical,
  canJumpJetAttackPhysical,
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
  canPush,
  canThrashPhysical,
  canTripPhysical,
} from './restrictions';
import { getTripAttackBaseToHitAdjustment } from './tripEligibility';
import {
  IPhysicalAttackInput,
  IPhysicalModifier,
  IPhysicalToHitResult,
  PhysicalAttackType,
} from './types';

export const AUTOMATIC_SUCCESS_TO_HIT = 0;
export const GUN_EMPLACEMENT_AUTOMATIC_HIT_REASON =
  'Targeting adjacent gun emplacement.';
export const THRASH_AUTOMATIC_HIT_REASON = 'Thrash attacks always hit.';
export const PLAYTEST_3_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest3',
  'tacops_playtest_3',
]);

export function hasPlaytest3Rule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

export function gunEmplacementAutomaticSuccess(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult | undefined {
  if (input.targetObjectType !== 'gunEmplacement') return undefined;
  if (input.attackType === 'push' || input.attackType === 'charge') {
    return undefined;
  }

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: AUTOMATIC_SUCCESS_TO_HIT,
    modifiers: [
      {
        name: 'Targeting adjacent gun emplacement',
        value: 0,
        source: 'target-object',
      },
    ],
    allowed: true,
    automaticHit: true,
    automaticHitReason: GUN_EMPLACEMENT_AUTOMATIC_HIT_REASON,
  };
}

/**
 * Per `implement-physical-attack-phase` tasks 4.3 / 5.3: append the target
 * movement modifier (TMM) as a labelled modifier. Callers derive TMM from
 * the target's movementType + hexesMoved via
 * `movement/modifiers.ts#calculateTMM`.
 */
export function appendTMM(
  modifiers: IPhysicalModifier[],
  tmm: number | undefined,
): void {
  if (tmm === undefined || tmm === 0) return;
  modifiers.push({
    name: 'Target movement modifier',
    value: tmm,
    source: 'movement',
  });
}

export function appendTargetEvasion(
  modifiers: IPhysicalModifier[],
  input: IPhysicalAttackInput,
): void {
  const modifier = calculateTargetEvasionModifier(
    input.targetEvading,
    input.targetProne === true,
    input.targetEvasionBonus,
  );
  if (!modifier) return;

  modifiers.push({
    name: modifier.name,
    value: modifier.value,
    source: 'movement',
  });
}

export function appendAttackerSpotting(
  modifiers: IPhysicalModifier[],
  input: IPhysicalAttackInput,
): void {
  if (!input.attackerSpotting) return;

  modifiers.push({
    name: 'Attacker spotting',
    value: 1,
    source: 'other',
  });
}

export function appendMeleeSpecialist(
  modifiers: IPhysicalModifier[],
  abilities: readonly string[] | undefined,
): void {
  const modifier = calculateMeleeSpecialistModifier(abilities ?? []);
  if (!modifier) return;
  modifiers.push({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
  });
}

export function appendFrogmanPhysicalModifier(
  modifiers: IPhysicalModifier[],
  input: IPhysicalAttackInput,
): void {
  const modifier = calculateFrogmanPhysicalToHitModifier(
    input.pilotAbilities ?? [],
    input.attackerWaterDepth,
    input.attackerUnitType,
  );
  if (!modifier) return;

  modifiers.push({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
  });
}

export function appendEnvironmentalSpecialistPhysicalModifier(
  modifiers: IPhysicalModifier[],
  input: IPhysicalAttackInput,
): void {
  const modifier = calculateEnvironmentalSpecialistPhysicalToHitModifier(
    input.environmentalLight,
    {
      designatedEnvironment: input.designatedEnvironment,
      pilotAbilities: input.pilotAbilities,
      targetIlluminated: input.targetIlluminated,
    },
  );
  if (!modifier) return;

  modifiers.push({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
  });
}

export function selectedPunchArmLocation(
  input: IPhysicalAttackInput,
): 'left_arm' | 'right_arm' {
  if (input.arm === 'left' || input.limb === 'leftArm') return 'left_arm';
  return 'right_arm';
}

export function oppositeArmLocation(
  location: 'left_arm' | 'right_arm',
): 'left_arm' | 'right_arm' {
  return location === 'left_arm' ? 'right_arm' : 'left_arm';
}

export function locationActuatorDestroyed(
  input: IPhysicalAttackInput,
  location: 'left_arm' | 'right_arm',
  actuator: ActuatorType,
): boolean {
  return (
    input.componentDamage.actuatorsByLocation?.[location]?.[actuator] === true
  );
}

export function appendZweihanderOffArmActuatorModifiers(
  modifiers: IPhysicalModifier[],
  input: IPhysicalAttackInput,
): void {
  if (input.twoHandedZweihander !== true) return;

  const offArm = oppositeArmLocation(selectedPunchArmLocation(input));
  if (locationActuatorDestroyed(input, offArm, ActuatorType.UPPER_ARM)) {
    modifiers.push({
      name: 'Off-arm upper arm actuator destroyed',
      value: UPPER_ARM_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  if (locationActuatorDestroyed(input, offArm, ActuatorType.LOWER_ARM)) {
    modifiers.push({
      name: 'Off-arm lower arm actuator destroyed',
      value: LOWER_ARM_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }
}

export function normalizedUnitType(unitType: string | undefined): string {
  return unitType?.toLowerCase().replace(/[\s_-]+/g, '') ?? '';
}

export function appendDfaTargetClassModifier(
  modifiers: IPhysicalModifier[],
  targetUnitType: string | undefined,
): void {
  switch (normalizedUnitType(targetUnitType)) {
    case 'infantry':
      modifiers.push({
        name: 'Infantry target',
        value: 3,
        source: 'target-class',
      });
      break;
    case 'battlearmor':
      modifiers.push({
        name: 'Battle Armor target',
        value: 1,
        source: 'target-class',
      });
      break;
  }
}

export function appendDfaPilotingDifferentialModifier(
  modifiers: IPhysicalModifier[],
  attackerPilotingSkill: number,
  targetPilotingSkill: number | undefined,
): void {
  if (
    targetPilotingSkill === undefined ||
    attackerPilotingSkill === targetPilotingSkill
  ) {
    return;
  }

  modifiers.push({
    name: 'Piloting skill differential',
    value: attackerPilotingSkill - targetPilotingSkill,
    source: 'pilot-skill',
  });
}

export function selectedPunchArmHasClaw(input: IPhysicalAttackInput): boolean {
  if (input.arm === 'left' || input.limb === 'leftArm') {
    return input.leftArmHasClaw === true;
  }
  if (input.arm === 'right' || input.limb === 'rightArm') {
    return input.rightArmHasClaw === true;
  }
  return input.rightArmHasClaw === true || input.leftArmHasClaw === true;
}

export function selectedPunchArm(
  input: IPhysicalAttackInput,
): 'left' | 'right' {
  if (input.arm === 'left' || input.limb === 'leftArm') return 'left';
  return 'right';
}

export function selectedBrushOffArmHasClaw(
  input: IPhysicalAttackInput,
): boolean {
  if (input.arm === 'left' || input.limb === 'leftArm') {
    return input.leftArmHasClaw === true;
  }
  return input.rightArmHasClaw === true;
}

export function brushOffModifierSource(reasonCode: string): string {
  if (reasonCode.includes('Actuator') || reasonCode === 'ArmAES') {
    return 'actuator';
  }
  if (reasonCode === 'UsingClaws') return 'physical-equipment';
  if (reasonCode === 'DefenderMagneticClaws') return 'target-equipment';
  if (reasonCode.includes('Sensor')) return 'sensor';
  return 'physical-action';
}

export function grappleModifierSource(reasonCode: string): string {
  if (reasonCode.includes('Actuator') || reasonCode === 'ArmAES') {
    return 'actuator';
  }
  if (reasonCode === 'TSMActiveBonus') return 'myomer';
  if (reasonCode === 'WeightClassDifference') return 'weight-class';
  return 'physical-action';
}

export function breakGrappleModifierSource(reasonCode: string): string {
  if (reasonCode.includes('Actuator') || reasonCode === 'ArmAES') {
    return 'actuator';
  }
  if (reasonCode === 'WeightClassDifference') return 'weight-class';
  return 'physical-action';
}

export function selectedGrappleSide(
  input: IPhysicalAttackInput,
): 'left' | 'right' | 'both' {
  if (input.grappleSide) return input.grappleSide;
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  if (input.limb === 'rightArm' || input.arm === 'right') return 'right';
  return 'both';
}

export function attackerHasActiveTsm(input: IPhysicalAttackInput): boolean {
  return input.hasTSM === true && (input.heat ?? 0) >= TSM_ACTIVATION_HEAT;
}

export function grappleUnitKind(
  unitType: string | undefined,
): 'mek' | 'protoMek' {
  return unitType?.toLowerCase().includes('proto') === true
    ? 'protoMek'
    : 'mek';
}

export function attackerIsMekForGrapple(input: IPhysicalAttackInput): boolean {
  const canonical =
    input.attackerUnitType?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
  return (
    canonical === '' ||
    ((canonical.includes('mek') || canonical.includes('mech')) &&
      !canonical.includes('proto'))
  );
}

export function appendBattleFistModifier(
  modifiers: IPhysicalModifier[],
  input: IPhysicalAttackInput,
): void {
  const actuators = input.componentDamage.actuators;
  if (input.handActuatorPresent === false || actuators[ActuatorType.HAND]) {
    return;
  }

  const modifier = getBattleFistPunchToHitModifier(
    input.unitQuirks ?? [],
    selectedPunchArm(input),
  );
  if (modifier === 0) return;

  modifiers.push({
    name: 'Battle Fists',
    value: modifier,
    source: 'quirk',
  });
}

export function jumpJetTargetObjectIsAutomaticSuccess(
  input: IPhysicalAttackInput,
): boolean {
  return (
    input.targetObjectType === 'building' ||
    input.targetObjectType === 'fuelTank' ||
    input.targetObjectType === 'gunEmplacement'
  );
}
