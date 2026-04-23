import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import { LIFE_SUPPORT_DESTRUCTION_THRESHOLD } from './constants';
import { CriticalHitEvent, IComponentDamageState } from './types';

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

/**
 * Per Total Warfare p. 43 and the `fix-combat-rule-accuracy` correction,
 * two life-support critical hits disable the subsystem. Once disabled,
 * subsequent heat-phase processing inflicts pilot damage whenever the
 * unit's mech-heat crosses 15 / 25. This function tracks the hit
 * counter and flags `lifeSupportDisabled` on the effect when the
 * destruction threshold is reached.
 *
 * OpenSpec change: integrate-damage-pipeline / task 10.5.
 */
export function applyLifeSupportHit(
  _unitId: string,
  _location: string,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.lifeSupport + 1;
  const updatedDamage = { ...componentDamage, lifeSupport: newHits };
  const disabled = newHits >= LIFE_SUPPORT_DESTRUCTION_THRESHOLD;

  return {
    effect: {
      type: CriticalEffectType.LifeSupportHit,
      ...(disabled ? { lifeSupportDisabled: true } : {}),
    },
    updatedDamage,
  };
}
