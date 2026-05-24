import type { CriticalSlotComponentType } from '@/utils/gameplay/criticalHitResolution';

import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(
  id: CriticalSlotComponentType,
  evidence: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
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
  // Hydration coverage is intentionally separated from full component
  // lifecycle behavior. Full ammo cookoff, weapon disablement, and jump
  // capability effects remain cataloged under damage/effect support rows.
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
  ammo: integrated(
    'ammo',
    'hydrateCriticalSlotManifestFromFullUnit maps catalog Ammo critical-slot strings into runner critical manifests',
  ),
  equipment: integrated(
    'equipment',
    'hydrateCriticalSlotManifestFromFullUnit maps otherwise-unclassified catalog critical-slot strings into generic equipment entries',
  ),
  heat_sink: integrated(
    'heat_sink',
    'hydrateCriticalSlotManifestFromFullUnit maps Heat Sink critical-slot strings into runner manifests and SimulationRunner seeds those manifests for attack/heat critical resolution',
  ),
  jump_jet: integrated(
    'jump_jet',
    'hydrateCriticalSlotManifestFromFullUnit maps Jump Jet critical-slot strings into runner critical manifests',
  ),
  weapon: integrated(
    'weapon',
    'hydrateCriticalSlotManifestFromFullUnit maps catalog weapon critical-slot strings into runner manifests and records runtime weapon ids when hydrated mount aliases match',
  ),
} satisfies Record<CriticalSlotComponentType, ICombatFeatureSupportEntry>;
