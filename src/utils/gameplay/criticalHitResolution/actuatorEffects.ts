import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  type CombatLocation,
  CriticalEffectType,
  ICriticalEffect,
  PSRTrigger,
} from '@/types/gameplay';

import {
  SHOULDER_TO_HIT_MODIFIER,
  UPPER_ARM_TO_HIT_MODIFIER,
  LOWER_ARM_TO_HIT_MODIFIER,
  HAND_TO_HIT_MODIFIER,
  HIP_PSR_MODIFIER,
  UPPER_LEG_TO_HIT_MODIFIER,
  LOWER_LEG_TO_HIT_MODIFIER,
  FOOT_PSR_MODIFIER,
  LEG_ACTUATOR_PSR_MODIFIER,
  FOOT_TO_HIT_MODIFIER,
} from './constants';
import {
  CriticalHitEvent,
  IComponentDamageState,
  ICriticalSlotEntry,
} from './types';

const COMBAT_LOCATIONS = new Set<string>([
  'head',
  'center_torso',
  'center_torso_rear',
  'left_torso',
  'left_torso_rear',
  'right_torso',
  'right_torso_rear',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
]);

const ACTUATOR_TO_HIT_MODIFIERS: Readonly<Record<ActuatorType, number>> = {
  [ActuatorType.SHOULDER]: SHOULDER_TO_HIT_MODIFIER,
  [ActuatorType.UPPER_ARM]: UPPER_ARM_TO_HIT_MODIFIER,
  [ActuatorType.LOWER_ARM]: LOWER_ARM_TO_HIT_MODIFIER,
  [ActuatorType.HAND]: HAND_TO_HIT_MODIFIER,
  [ActuatorType.HIP]: 0,
  [ActuatorType.UPPER_LEG]: UPPER_LEG_TO_HIT_MODIFIER,
  [ActuatorType.LOWER_LEG]: LOWER_LEG_TO_HIT_MODIFIER,
  [ActuatorType.FOOT]: FOOT_TO_HIT_MODIFIER,
};

export function applyActuatorHit(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: string,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const actuatorType = slot.actuatorType;
  // Per audit 2026-06-09 A-6: actuator criticals are tracked both globally
  // and per combat location. The per-location map feeds hull-down entry/exit
  // pricing (MegaMek HullDownStep.java:61-82 — 1 MP plus non-hip leg
  // actuator crits, one more for hip), QuadVee conversion gates, and AirMek
  // landing control.
  const combatLocation = asCombatLocation(location);
  const updatedDamage = {
    ...componentDamage,
    actuators: {
      ...componentDamage.actuators,
      ...(actuatorType ? { [actuatorType]: true } : {}),
    },
    ...(actuatorType && combatLocation
      ? {
          actuatorsByLocation: {
            ...componentDamage.actuatorsByLocation,
            [combatLocation]: {
              ...componentDamage.actuatorsByLocation?.[combatLocation],
              [actuatorType]: true,
            },
          },
        }
      : {}),
  };

  if (
    actuatorType === ActuatorType.HIP ||
    actuatorType === ActuatorType.UPPER_LEG ||
    actuatorType === ActuatorType.LOWER_LEG ||
    actuatorType === ActuatorType.FOOT
  ) {
    const modifier =
      actuatorType === ActuatorType.HIP
        ? HIP_PSR_MODIFIER
        : actuatorType === ActuatorType.FOOT
          ? FOOT_PSR_MODIFIER
          : LEG_ACTUATOR_PSR_MODIFIER;

    // Per `structure-psr-reason-as-discriminated-code` (PR E): the
    // crit-driven leg-actuator PSRs map onto the canonical damage-bucket
    // codes so consumers can filter / aggregate by reasonCode the same
    // way they do for runner-initiated PSRs.
    const reasonCode =
      actuatorType === ActuatorType.HIP
        ? PSRTrigger.HipActuatorDestroyed
        : actuatorType === ActuatorType.UPPER_LEG
          ? PSRTrigger.UpperLegActuatorHit
          : actuatorType === ActuatorType.LOWER_LEG
            ? PSRTrigger.LowerLegActuatorHit
            : PSRTrigger.FootActuatorHit;

    events.push({
      type: 'psr_triggered',
      payload: {
        unitId,
        reason: `${slot.componentName} destroyed`,
        additionalModifier: modifier,
        triggerSource: 'actuator_critical',
        reasonCode,
      },
    });
  }

  return {
    effect: {
      type: CriticalEffectType.ActuatorHit,
      equipmentDestroyed: slot.componentName,
    },
    updatedDamage,
  };
}

/**
 * Canonicalizes a raw location string into a `CombatLocation` key, or null
 * when the source data isn't a mech combat location (e.g. vehicle facings).
 * Exported so the event-sourced replay reducer (`gameState/damageResolution`)
 * applies the same guard when mirroring per-location actuator damage.
 */
export function asCombatLocation(location: string): CombatLocation | null {
  return COMBAT_LOCATIONS.has(location) ? (location as CombatLocation) : null;
}

export function getActuatorToHitModifier(actuatorType: ActuatorType): number {
  return ACTUATOR_TO_HIT_MODIFIERS[actuatorType];
}

export function actuatorPreventsAttack(
  actuatorType: ActuatorType,
  attackType: 'punch' | 'kick',
): boolean {
  if (attackType === 'punch') {
    return actuatorType === ActuatorType.SHOULDER;
  }
  if (attackType === 'kick') {
    return actuatorType === ActuatorType.HIP;
  }
  return false;
}

export function actuatorHalvesDamage(
  actuatorType: ActuatorType,
  attackType: 'punch' | 'kick',
): boolean {
  if (attackType === 'punch') {
    return (
      actuatorType === ActuatorType.UPPER_ARM ||
      actuatorType === ActuatorType.LOWER_ARM
    );
  }
  if (attackType === 'kick') {
    return (
      actuatorType === ActuatorType.UPPER_LEG ||
      actuatorType === ActuatorType.LOWER_LEG
    );
  }
  return false;
}
