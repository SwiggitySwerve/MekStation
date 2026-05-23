import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

export const CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT = {
  actuator: integrated(
    'actuator',
    'applyActuatorHit mutates actuator damage and queues PSRs for leg actuator hits',
  ),
  ammo: integrated(
    'ammo',
    'applyAmmoHit returns AmmoExplosion effects for explicit ammo critical slots',
  ),
  cockpit: integrated(
    'cockpit',
    'applyCockpitHit emits cockpit critical pilot-death effects',
  ),
  engine: integrated(
    'engine',
    'applyEngineHit mutates engine-hit state and destruction when the third engine hit lands',
  ),
  equipment: integrated(
    'equipment',
    'applyCriticalHitEffect returns EquipmentDestroyed for generic equipment slots',
  ),
  gyro: integrated(
    'gyro',
    'applyGyroHit mutates gyro-hit state and queues gyro PSRs',
  ),
  heat_sink: integrated(
    'heat_sink',
    'applyHeatSinkHit increments heatSinksDestroyed for heat dissipation loss',
  ),
  jump_jet: integrated(
    'jump_jet',
    'applyJumpJetHit increments jumpJetsDestroyed for jump capability loss',
  ),
  life_support: integrated(
    'life_support',
    'applyLifeSupportHit mutates life-support state and disables life support on the second hit',
  ),
  sensor: integrated(
    'sensor',
    'applySensorHit mutates sensor-hit state for to-hit penalties',
  ),
  weapon: integrated(
    'weapon',
    'applyWeaponHit records destroyed weapons for explicit weapon critical slots',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
