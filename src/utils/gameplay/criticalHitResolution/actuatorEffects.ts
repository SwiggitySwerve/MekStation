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

export function applyActuatorHit(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: string,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const actuatorType = slot.actuatorType;
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

function asCombatLocation(location: string): CombatLocation | null {
  switch (location) {
    case 'head':
    case 'center_torso':
    case 'center_torso_rear':
    case 'left_torso':
    case 'left_torso_rear':
    case 'right_torso':
    case 'right_torso_rear':
    case 'left_arm':
    case 'right_arm':
    case 'left_leg':
    case 'right_leg':
      return location;
    default:
      return null;
  }
}

export function getActuatorToHitModifier(actuatorType: ActuatorType): number {
  switch (actuatorType) {
    case ActuatorType.SHOULDER:
      return SHOULDER_TO_HIT_MODIFIER;
    case ActuatorType.UPPER_ARM:
      return UPPER_ARM_TO_HIT_MODIFIER;
    case ActuatorType.LOWER_ARM:
      return LOWER_ARM_TO_HIT_MODIFIER;
    case ActuatorType.HAND:
      return HAND_TO_HIT_MODIFIER;
    case ActuatorType.HIP:
      return 0;
    case ActuatorType.UPPER_LEG:
      return UPPER_LEG_TO_HIT_MODIFIER;
    case ActuatorType.LOWER_LEG:
      return LOWER_LEG_TO_HIT_MODIFIER;
    case ActuatorType.FOOT:
      return FOOT_TO_HIT_MODIFIER;
  }
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
