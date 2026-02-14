import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import {
  applyActuatorHit,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './actuatorEffects';
import { applyEngineHit, applyGyroHit, applyCockpitHit } from './engineEffects';
import {
  applyWeaponHit,
  applyHeatSinkHit,
  applyJumpJetHit,
  applyAmmoHit,
} from './equipmentEffects';
import { applySensorHit, applyLifeSupportHit } from './sensorEffects';
import {
  CriticalHitEvent,
  IComponentDamageState,
  ICriticalSlotEntry,
  ICriticalHitApplicationResult,
} from './types';

export function applyCriticalHitEffect(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: string,
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

export {
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './actuatorEffects';
