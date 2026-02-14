import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import {
  ENGINE_DESTRUCTION_THRESHOLD,
  ENGINE_HEAT_PER_HIT,
  GYRO_PSR_MODIFIER_PER_HIT,
  GYRO_CANNOT_STAND_THRESHOLD,
  CANNOT_STAND_PENALTY,
  LETHAL_PILOT_WOUNDS,
} from './constants';
import { CriticalHitEvent, IComponentDamageState } from './types';

export function applyEngineHit(
  unitId: string,
  _location: string,
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

export function applyGyroHit(
  unitId: string,
  _location: string,
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

export function applyCockpitHit(
  unitId: string,
  _location: string,
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
