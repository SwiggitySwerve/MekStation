import type { CriticalSlotComponentType } from '@/utils/gameplay/criticalHitResolution';

import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(
  id: CriticalSlotComponentType,
  evidence: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

function helperOnly(
  id: CriticalSlotComponentType,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

export const CRITICAL_SLOT_COMPONENT_TYPES = [
  'actuator',
  'ammo',
  'cockpit',
  'engine',
  'equipment',
  'gyro',
  'heat_sink',
  'jump_jet',
  'life_support',
  'sensor',
  'weapon',
] as const satisfies readonly CriticalSlotComponentType[];

export const DEFAULT_CRITICAL_SLOT_COMPONENT_TYPES = [
  'actuator',
  'cockpit',
  'engine',
  'gyro',
  'life_support',
  'sensor',
] as const satisfies readonly CriticalSlotComponentType[];

export const CATALOG_CRITICAL_SLOT_HYDRATION_GAPS = [
  'ammo',
  'equipment',
  'heat_sink',
  'jump_jet',
  'weapon',
] as const satisfies readonly CriticalSlotComponentType[];

export const CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT = {
  actuator: integrated(
    'actuator',
    'buildDefaultCriticalSlotManifest hydrates arm and leg actuator slots and applyActuatorHit mutates component damage',
  ),
  cockpit: integrated(
    'cockpit',
    'buildDefaultCriticalSlotManifest hydrates the cockpit slot and applyCockpitHit emits pilot-death effects',
  ),
  engine: integrated(
    'engine',
    'buildDefaultCriticalSlotManifest hydrates center/side torso engine slots and applyEngineHit mutates heat/destruction state',
  ),
  gyro: integrated(
    'gyro',
    'buildDefaultCriticalSlotManifest hydrates gyro slots and applyGyroHit queues gyro PSRs',
  ),
  life_support: integrated(
    'life_support',
    'buildDefaultCriticalSlotManifest hydrates life support slots and applyLifeSupportHit mutates life-support damage',
  ),
  sensor: integrated(
    'sensor',
    'buildDefaultCriticalSlotManifest hydrates sensor slots and applySensorHit mutates sensor damage',
  ),
  ammo: helperOnly(
    'ammo',
    'applyAmmoHit and ammo explosion helpers can resolve ammo-bin critical effects',
    'UnitHydration does not build ammo critical slots from catalog ammo bins',
  ),
  equipment: helperOnly(
    'equipment',
    'applyCriticalHitEffect can resolve generic equipment-destroyed effects',
    'UnitHydration does not build generic equipment critical slots from mounted catalog equipment',
  ),
  heat_sink: helperOnly(
    'heat_sink',
    'applyHeatSinkHit mutates heatSinksDestroyed and runHeatPhase consumes destroyed heat sinks',
    'UnitHydration does not build heat-sink critical slots from catalog heat sink data',
  ),
  jump_jet: helperOnly(
    'jump_jet',
    'applyJumpJetHit mutates jumpJetsDestroyed',
    'UnitHydration does not build jump-jet critical slots from mounted jump jet equipment',
  ),
  weapon: helperOnly(
    'weapon',
    'applyWeaponHit records destroyed weapons for explicit weapon critical slots',
    'UnitHydration does not build weapon critical slots from catalog weapon mounts or disable runner AI weapon mounts',
  ),
} satisfies Record<CriticalSlotComponentType, ICombatFeatureSupportEntry>;
