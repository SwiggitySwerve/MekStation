import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import {
  CriticalHitEvent,
  IComponentDamageState,
} from './types';

export function applySensorHit(
  _unitId: string,
  _location: string,
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

export function applyLifeSupportHit(
  _unitId: string,
  _location: string,
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
