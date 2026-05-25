import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs';

function integrated(
  id: string,
  evidence: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence, sourceRefs };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap, sourceRefs };
}

export const CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT = {
  actuator: integrated(
    'actuator',
    'applyActuatorHit mutates actuator damage and queues PSRs for leg actuator hits',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  ammo: integrated(
    'ammo',
    'applyAmmoHit returns AmmoExplosion effects for explicit ammo critical slots',
    MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  cockpit: integrated(
    'cockpit',
    'applyCockpitHit emits cockpit critical pilot-death effects',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  engine: integrated(
    'engine',
    'applyEngineHit mutates engine-hit state and destruction when the third engine hit lands',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  equipment: helperOnly(
    'equipment',
    'applyCriticalHitEffect returns EquipmentDestroyed for generic equipment slots',
    'MegaMek equipment criticals have equipment-specific branches for shields, SCM, emergency coolant, HarJel, stealth-linked ECM, explosions, ammo exhaustion, bomb bays, and AC playtest behavior that do not all cascade through MekStation generic equipment state yet',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  gyro: integrated(
    'gyro',
    'applyGyroHit mutates gyro-hit state and queues gyro PSRs',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  heat_sink: integrated(
    'heat_sink',
    'applyHeatSinkHit increments heatSinksDestroyed for heat dissipation loss',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  jump_jet: integrated(
    'jump_jet',
    'applyJumpJetHit increments jumpJetsDestroyed for jump capability loss',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  life_support: integrated(
    'life_support',
    'applyLifeSupportHit mutates life-support state and disables life support on the second hit',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  sensor: integrated(
    'sensor',
    'applySensorHit mutates sensor-hit state for to-hit penalties',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  weapon: integrated(
    'weapon',
    'applyWeaponHit records destroyed weapons for explicit weapon critical slots',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
