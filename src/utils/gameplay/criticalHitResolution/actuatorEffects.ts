import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

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
  _location: string,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const actuatorType = slot.actuatorType;
  const updatedDamage = {
    ...componentDamage,
    actuators: {
      ...componentDamage.actuators,
      ...(actuatorType ? { [actuatorType]: true } : {}),
    },
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

    events.push({
      type: 'psr_triggered',
      payload: {
        unitId,
        reason: `${slot.componentName} destroyed`,
        additionalModifier: modifier,
        triggerSource: 'actuator_critical',
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
