import type {
  IPhysicalAttackInput,
  IPhysicalModifier,
  IPhysicalToHitResult,
} from './types';

import { getJumpJetAttackToHitModifiers } from './jumpJetAttackEligibility';
import { canJumpJetAttackPhysical, canThrashPhysical } from './restrictions';
import {
  AUTOMATIC_SUCCESS_TO_HIT,
  THRASH_AUTOMATIC_HIT_REASON,
  appendAttackerSpotting,
  appendEnvironmentalSpecialistPhysicalModifier,
  appendFrogmanPhysicalModifier,
  appendMeleeSpecialist,
  appendTMM,
  appendTargetEvasion,
  jumpJetTargetObjectIsAutomaticSuccess,
} from './toHitValidationCommon';

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
