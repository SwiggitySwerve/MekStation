import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

const STATIC_EFFECT_DESCRIPTIONS: Partial<Record<CriticalEffectType, string>> =
  {
    [CriticalEffectType.EngineHit]: 'Engine hit - +5 heat/turn',
    [CriticalEffectType.GyroHit]: 'Gyro hit - +3 PSR modifier',
    [CriticalEffectType.CockpitHit]: 'Cockpit hit - pilot killed',
    [CriticalEffectType.SensorHit]: 'Sensor hit - to-hit penalty',
    [CriticalEffectType.HeatSinkDestroyed]:
      'Heat sink destroyed - -1 dissipation',
    [CriticalEffectType.JumpJetDestroyed]: 'Jump jet destroyed - -1 jump MP',
  };

export function describeEffect(effect: ICriticalEffect): string {
  const staticDescription = STATIC_EFFECT_DESCRIPTIONS[effect.type];
  if (staticDescription) {
    return staticDescription;
  }

  if (effect.type === CriticalEffectType.LifeSupportHit) {
    return effect.lifeSupportDisabled
      ? 'Life support disabled - pilot heat damage at 15+/25+ heat'
      : 'Life support hit';
  }

  if (effect.type === CriticalEffectType.ActuatorHit) {
    return `Actuator destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
  }

  if (effect.type === CriticalEffectType.WeaponDestroyed) {
    return `Weapon destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
  }

  if (effect.type === CriticalEffectType.AmmoExplosion) {
    return describeAmmoExplosion(effect);
  }

  if (effect.type === CriticalEffectType.EquipmentDestroyed) {
    return `Equipment destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
  }

  if (effect.type === CriticalEffectType.EquipmentHit) {
    return `Equipment hit: ${effect.equipmentHit ?? 'unknown'}`;
  }

  return 'Unknown critical effect';
}

function describeAmmoExplosion(effect: ICriticalEffect): string {
  if (effect.additionalDamage !== undefined) {
    return `Equipment explosion: ${
      effect.equipmentDestroyed ?? 'unknown'
    } (${effect.additionalDamage} damage)`;
  }

  return `Ammo hit: ${effect.equipmentDestroyed ?? 'unknown'}`;
}
