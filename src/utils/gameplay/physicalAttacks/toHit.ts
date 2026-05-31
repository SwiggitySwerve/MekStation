import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { getBattleFistPunchToHitModifier } from '@/utils/gameplay/quirkModifiers';
import {
  calculateFrogmanPhysicalToHitModifier,
  calculateMeleeSpecialistModifier,
} from '@/utils/gameplay/spaModifiers';
import { calculateTargetEvasionModifier } from '@/utils/gameplay/toHit/movementModifiers';

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
} from './types';

const AUTOMATIC_SUCCESS_TO_HIT = 0;
const GUN_EMPLACEMENT_AUTOMATIC_HIT_REASON =
  'Targeting adjacent gun emplacement.';
const THRASH_AUTOMATIC_HIT_REASON = 'Thrash attacks always hit.';
const PLAYTEST_3_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest3',
  'tacops_playtest_3',
]);

function hasPlaytest3Rule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

function gunEmplacementAutomaticSuccess(
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
function appendTMM(
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

function appendTargetEvasion(
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

function appendAttackerSpotting(
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

function appendMeleeSpecialist(
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

function appendFrogmanPhysicalModifier(
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

function normalizedUnitType(unitType: string | undefined): string {
  return unitType?.toLowerCase().replace(/[\s_-]+/g, '') ?? '';
}

function appendDfaTargetClassModifier(
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

function appendDfaPilotingDifferentialModifier(
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

function selectedPunchArmHasClaw(input: IPhysicalAttackInput): boolean {
  if (input.arm === 'left' || input.limb === 'leftArm') {
    return input.leftArmHasClaw === true;
  }
  if (input.arm === 'right' || input.limb === 'rightArm') {
    return input.rightArmHasClaw === true;
  }
  return input.rightArmHasClaw === true || input.leftArmHasClaw === true;
}

function selectedPunchArm(input: IPhysicalAttackInput): 'left' | 'right' {
  if (input.arm === 'left' || input.limb === 'leftArm') return 'left';
  return 'right';
}

function selectedBrushOffArmHasClaw(input: IPhysicalAttackInput): boolean {
  if (input.arm === 'left' || input.limb === 'leftArm') {
    return input.leftArmHasClaw === true;
  }
  return input.rightArmHasClaw === true;
}

function brushOffModifierSource(reasonCode: string): string {
  if (reasonCode.includes('Actuator') || reasonCode === 'ArmAES') {
    return 'actuator';
  }
  if (reasonCode === 'UsingClaws') return 'physical-equipment';
  if (reasonCode === 'DefenderMagneticClaws') return 'target-equipment';
  if (reasonCode.includes('Sensor')) return 'sensor';
  return 'physical-action';
}

function grappleModifierSource(reasonCode: string): string {
  if (reasonCode.includes('Actuator') || reasonCode === 'ArmAES') {
    return 'actuator';
  }
  if (reasonCode === 'TSMActiveBonus') return 'myomer';
  if (reasonCode === 'WeightClassDifference') return 'weight-class';
  return 'physical-action';
}

function selectedGrappleSide(
  input: IPhysicalAttackInput,
): 'left' | 'right' | 'both' {
  if (input.grappleSide) return input.grappleSide;
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  if (input.limb === 'rightArm' || input.arm === 'right') return 'right';
  return 'both';
}

function attackerHasActiveTsm(input: IPhysicalAttackInput): boolean {
  return input.hasTSM === true && (input.heat ?? 0) >= TSM_ACTIVATION_HEAT;
}

function grappleUnitKind(unitType: string | undefined): 'mek' | 'protoMek' {
  return unitType?.toLowerCase().includes('proto') === true
    ? 'protoMek'
    : 'mek';
}

function attackerIsMekForGrapple(input: IPhysicalAttackInput): boolean {
  const canonical =
    input.attackerUnitType?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
  return (
    canonical === '' ||
    ((canonical.includes('mek') || canonical.includes('mech')) &&
      !canonical.includes('proto'))
  );
}

function appendBattleFistModifier(
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

function jumpJetTargetObjectIsAutomaticSuccess(
  input: IPhysicalAttackInput,
): boolean {
  return (
    input.targetObjectType === 'building' ||
    input.targetObjectType === 'fuelTank' ||
    input.targetObjectType === 'gunEmplacement'
  );
}

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

  // Per task 4.3: target movement modifier (TMM) applies to punch to-hit.
  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendBattleFistModifier(modifiers, input);
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
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateThrashToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canThrashPhysical(input);
  if (!restriction.allowed) {
    return {
      baseToHit: AUTOMATIC_SUCCESS_TO_HIT,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  return {
    baseToHit: AUTOMATIC_SUCCESS_TO_HIT,
    finalToHit: AUTOMATIC_SUCCESS_TO_HIT,
    modifiers: [
      {
        name: 'Thrash attacks always hit',
        value: 0,
        source: 'physical-action',
      },
    ],
    allowed: true,
    automaticHit: true,
    automaticHitReason: THRASH_AUTOMATIC_HIT_REASON,
  };
}

export function calculateJumpJetAttackToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canJumpJetAttackPhysical(input);
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

  const jumpJetModifiers = getJumpJetAttackToHitModifiers({
    attackerProne: input.attackerProne,
    targetIsBuildingFuelTankOrGunEmplacement:
      jumpJetTargetObjectIsAutomaticSuccess(input),
  });
  if (jumpJetModifiers.automaticSuccess) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: AUTOMATIC_SUCCESS_TO_HIT,
      modifiers: [
        {
          name: jumpJetModifiers.automaticSuccessReason ?? 'Jump Jet Attack',
          value: 0,
          source: 'physical-action',
        },
      ],
      allowed: true,
      automaticHit: true,
      automaticHitReason: jumpJetModifiers.automaticSuccessReason,
    };
  }

  const modifiers: IPhysicalModifier[] = jumpJetModifiers.modifiers.map(
    (modifier) => ({
      name: modifier.description,
      value: modifier.value,
      source: 'physical-action',
    }),
  );
  appendTMM(modifiers, input.targetMovementModifier);
  appendTargetEvasion(modifiers, input);
  appendAttackerSpotting(modifiers, input);
  appendMeleeSpecialist(modifiers, input.pilotAbilities);
  appendFrogmanPhysicalModifier(modifiers, input);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

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
  appendFrogmanPhysicalModifier(modifiers, input);
  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculatePhysicalToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  switch (input.attackType) {
    case 'punch':
      return calculatePunchToHit(input);
    case 'kick':
      return calculateKickToHit(input);
    case 'charge':
      return calculateChargeToHit(input);
    case 'dfa':
      return calculateDFAToHit(input);
    case 'push':
      return calculatePushToHit(input);
    case 'trip':
      return calculateTripToHit(input);
    case 'thrash':
      return calculateThrashToHit(input);
    case 'jump-jet-attack':
      return calculateJumpJetAttackToHit(input);
    case 'brush-off':
      return calculateBrushOffToHit(input);
    case 'grapple':
      return calculateGrappleToHit(input);
    case 'hatchet':
    case 'sword':
    case 'mace':
    case 'lance':
    case 'retractable-blade':
    case 'flail':
    case 'wrecking-ball':
      return calculateMeleeWeaponToHit(input);
    default:
      return {
        baseToHit: Infinity,
        finalToHit: Infinity,
        modifiers: [],
        allowed: false,
        restrictionReason: 'Unknown attack type',
        restrictionReasonCode: 'UnsupportedAttackType',
      };
  }
}
