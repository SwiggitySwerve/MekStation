import { describeEffect } from './effectDescriptions';
import { resolveCriticalSlotEffect } from './slotEffectResolution';
import {
  CriticalHitEvent,
  IComponentDamageState,
  ICriticalEffectOptions,
  ICriticalHitApplicationResult,
  ICriticalSlotEntry,
} from './types';

export function applyCriticalHitEffect(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: string,
  componentDamage: IComponentDamageState,
  options: ICriticalEffectOptions = {},
): ICriticalHitApplicationResult {
  const events: CriticalHitEvent[] = [];
  const effectResolution = resolveCriticalSlotEffect({
    slot,
    unitId,
    location,
    componentDamage: { ...componentDamage },
    events,
    effectOptions: options,
  });

  events.unshift({
    type: 'critical_hit_resolved',
    payload: {
      unitId,
      location,
      slotIndex: slot.slotIndex,
      componentType: slot.componentType,
      componentName: slot.componentName,
      ...(slot.weaponId !== undefined ? { weaponId: slot.weaponId } : {}),
      ...(slot.ammoBinId !== undefined ? { ammoBinId: slot.ammoBinId } : {}),
      ...(slot.hotLoaded === true ? { hotLoaded: true } : {}),
      ...(effectResolution.linkedCriticalWeaponId !== undefined
        ? { linkedCriticalWeaponId: effectResolution.linkedCriticalWeaponId }
        : {}),
      ...(effectResolution.linkedCriticalWeaponName !== undefined
        ? {
            linkedCriticalWeaponName: effectResolution.linkedCriticalWeaponName,
          }
        : {}),
      ...(effectResolution.representedExplosionDamage !== undefined
        ? { explosionDamage: effectResolution.representedExplosionDamage }
        : {}),
      effect: describeEffect(effectResolution.effect),
      destroyed: effectResolution.destroyed,
      ...(effectResolution.breached === true ? { breached: true } : {}),
    },
  });

  return {
    slot,
    effect: effectResolution.effect,
    events,
    updatedComponentDamage: effectResolution.updatedDamage,
    slotDestroyed: effectResolution.slotDestroyed,
    ...(effectResolution.secondaryCriticals > 0
      ? { secondaryCriticals: effectResolution.secondaryCriticals }
      : {}),
  };
}

export {
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './actuatorEffects';
