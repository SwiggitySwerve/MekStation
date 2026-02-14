import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import {
  CANNOT_STAND_PENALTY,
  ENGINE_DESTRUCTION_THRESHOLD,
  ENGINE_HEAT_PER_HIT,
  FOOT_PSR_MODIFIER,
  FOOT_TO_HIT_MODIFIER,
  GYRO_CANNOT_STAND_THRESHOLD,
  GYRO_PSR_MODIFIER_PER_HIT,
  HAND_TO_HIT_MODIFIER,
  HIP_PSR_MODIFIER,
  LETHAL_PILOT_WOUNDS,
  LEG_ACTUATOR_PSR_MODIFIER,
  LOWER_ARM_TO_HIT_MODIFIER,
  LOWER_LEG_TO_HIT_MODIFIER,
  SHOULDER_TO_HIT_MODIFIER,
  UPPER_ARM_TO_HIT_MODIFIER,
  UPPER_LEG_TO_HIT_MODIFIER,
} from './criticalHitResolutionConstants';
import {
  CombatLocation,
  CriticalHitEvent,
  ICriticalHitApplicationResult,
  ICriticalSlotEntry,
  IComponentDamageState,
} from './criticalHitResolutionTypes';

export function applyCriticalHitEffect(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: CombatLocation,
  componentDamage: IComponentDamageState,
): ICriticalHitApplicationResult {
  const events: CriticalHitEvent[] = [];
  let updatedDamage = { ...componentDamage };

  let effect: ICriticalEffect;

  switch (slot.componentType) {
    case 'engine':
      ({ effect, updatedDamage } = applyEngineHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'gyro':
      ({ effect, updatedDamage } = applyGyroHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'cockpit':
      ({ effect, updatedDamage } = applyCockpitHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'sensor':
      ({ effect, updatedDamage } = applySensorHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'life_support':
      ({ effect, updatedDamage } = applyLifeSupportHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'actuator':
      ({ effect, updatedDamage } = applyActuatorHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'weapon':
      ({ effect, updatedDamage } = applyWeaponHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'heat_sink':
      ({ effect, updatedDamage } = applyHeatSinkHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'jump_jet':
      ({ effect, updatedDamage } = applyJumpJetHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'ammo':
      ({ effect, updatedDamage } = applyAmmoHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    default:
      effect = {
        type: CriticalEffectType.EquipmentDestroyed,
        equipmentDestroyed: slot.componentName,
      };
      break;
  }

  events.unshift({
    type: 'critical_hit_resolved',
    payload: {
      unitId,
      location,
      slotIndex: slot.slotIndex,
      componentType: slot.componentType,
      componentName: slot.componentName,
      effect: describeEffect(effect),
      destroyed: true,
    },
  });

  return {
    slot,
    effect,
    events,
    updatedComponentDamage: updatedDamage,
  };
}

function applyEngineHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.engineHits + 1;
  const updatedDamage = { ...componentDamage, engineHits: newHits };

  if (newHits >= ENGINE_DESTRUCTION_THRESHOLD) {
    events.push({
      type: 'unit_destroyed',
      payload: {
        unitId,
        cause: 'damage',
      },
    });
  }

  return {
    effect: {
      type: CriticalEffectType.EngineHit,
      heatAdded: ENGINE_HEAT_PER_HIT,
    },
    updatedDamage,
  };
}

function applyGyroHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.gyroHits + 1;
  const updatedDamage = { ...componentDamage, gyroHits: newHits };

  events.push({
    type: 'psr_triggered',
    payload: {
      unitId,
      reason: 'Gyro hit',
      additionalModifier: GYRO_PSR_MODIFIER_PER_HIT * newHits,
      triggerSource: 'gyro_critical',
    },
  });

  return {
    effect: {
      type: CriticalEffectType.GyroHit,
      movementPenalty:
        newHits >= GYRO_CANNOT_STAND_THRESHOLD ? CANNOT_STAND_PENALTY : 0,
    },
    updatedDamage,
  };
}

function applyCockpitHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = { ...componentDamage, cockpitHit: true };

  events.push({
    type: 'pilot_hit',
    payload: {
      unitId,
      wounds: LETHAL_PILOT_WOUNDS,
      totalWounds: LETHAL_PILOT_WOUNDS,
      source: 'head_hit',
      consciousnessCheckRequired: false,
    },
  });

  events.push({
    type: 'unit_destroyed',
    payload: {
      unitId,
      cause: 'pilot_death',
    },
  });

  return {
    effect: {
      type: CriticalEffectType.CockpitHit,
    },
    updatedDamage,
  };
}

function applySensorHit(
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.sensorHits + 1;
  const updatedDamage = { ...componentDamage, sensorHits: newHits };

  return {
    effect: {
      type: CriticalEffectType.SensorHit,
    },
    updatedDamage,
  };
}

function applyLifeSupportHit(
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.lifeSupport + 1;
  const updatedDamage = { ...componentDamage, lifeSupport: newHits };

  return {
    effect: {
      type: CriticalEffectType.LifeSupportHit,
    },
    updatedDamage,
  };
}

function applyActuatorHit(
  slot: ICriticalSlotEntry,
  unitId: string,
  _location: CombatLocation,
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

function applyWeaponHit(
  slot: ICriticalSlotEntry,
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const weaponName = slot.weaponId ?? slot.componentName;
  const updatedDamage = {
    ...componentDamage,
    weaponsDestroyed: [...componentDamage.weaponsDestroyed, weaponName],
  };

  return {
    effect: {
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: slot.componentName,
      weaponDisabled: weaponName,
    },
    updatedDamage,
  };
}

function applyHeatSinkHit(
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = {
    ...componentDamage,
    heatSinksDestroyed: componentDamage.heatSinksDestroyed + 1,
  };

  return {
    effect: {
      type: CriticalEffectType.HeatSinkDestroyed,
    },
    updatedDamage,
  };
}

function applyJumpJetHit(
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = {
    ...componentDamage,
    jumpJetsDestroyed: componentDamage.jumpJetsDestroyed + 1,
  };

  return {
    effect: {
      type: CriticalEffectType.JumpJetDestroyed,
    },
    updatedDamage,
  };
}

function applyAmmoHit(
  slot: ICriticalSlotEntry,
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  return {
    effect: {
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: slot.componentName,
    },
    updatedDamage: componentDamage,
  };
}

function describeEffect(effect: ICriticalEffect): string {
  switch (effect.type) {
    case CriticalEffectType.EngineHit:
      return 'Engine hit — +5 heat/turn';
    case CriticalEffectType.GyroHit:
      return 'Gyro hit — +3 PSR modifier';
    case CriticalEffectType.CockpitHit:
      return 'Cockpit hit — pilot killed';
    case CriticalEffectType.SensorHit:
      return 'Sensor hit — to-hit penalty';
    case CriticalEffectType.LifeSupportHit:
      return 'Life support hit';
    case CriticalEffectType.ActuatorHit:
      return `Actuator destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.WeaponDestroyed:
      return `Weapon destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.HeatSinkDestroyed:
      return 'Heat sink destroyed — -1 dissipation';
    case CriticalEffectType.JumpJetDestroyed:
      return 'Jump jet destroyed — -1 jump MP';
    case CriticalEffectType.AmmoExplosion:
      return `Ammo hit: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.EquipmentDestroyed:
      return `Equipment destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    default:
      return 'Unknown critical effect';
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
