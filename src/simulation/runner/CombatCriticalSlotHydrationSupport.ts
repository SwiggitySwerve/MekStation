import type { CriticalSlotComponentType } from '@/utils/gameplay/criticalHitResolution';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs';

function integrated(
  id: CriticalSlotComponentType,
  evidence: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence, sourceRefs };
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
    MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  ),
  cockpit: integrated(
    'cockpit',
    'buildDefaultCriticalSlotManifest hydrates the cockpit slot and applyCockpitHit emits pilot-death effects',
    MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  ),
  engine: integrated(
    'engine',
    'buildDefaultCriticalSlotManifest hydrates center/side torso engine slots and applyEngineHit mutates heat/destruction state',
    MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  ),
  gyro: integrated(
    'gyro',
    'buildDefaultCriticalSlotManifest hydrates gyro slots and applyGyroHit queues gyro PSRs',
    MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  ),
  life_support: integrated(
    'life_support',
    'buildDefaultCriticalSlotManifest hydrates life support slots and applyLifeSupportHit mutates life-support damage',
    MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  ),
  sensor: integrated(
    'sensor',
    'buildDefaultCriticalSlotManifest hydrates sensor slots and applySensorHit mutates sensor damage',
    MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  ),
  ammo: integrated(
    'ammo',
    'hydrateCriticalSlotManifestFromFullUnit maps catalog Ammo critical-slot strings into runner critical manifests',
    MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  ),
  equipment: integrated(
    'equipment',
    'hydrateCriticalSlotManifestFromFullUnit maps otherwise-unclassified catalog critical-slot strings into generic equipment entries',
    MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  ),
  heat_sink: integrated(
    'heat_sink',
    'hydrateCriticalSlotManifestFromFullUnit maps Heat Sink critical-slot strings into runner manifests and SimulationRunner seeds those manifests for attack/heat critical resolution',
    MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  ),
  jump_jet: integrated(
    'jump_jet',
    'hydrateCriticalSlotManifestFromFullUnit maps Jump Jet critical-slot strings into runner critical manifests',
    MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  ),
  weapon: integrated(
    'weapon',
    'hydrateCriticalSlotManifestFromFullUnit maps catalog weapon critical-slot strings into runner manifests and records runtime weapon ids when hydrated mount aliases match',
    MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  ),
} satisfies Record<CriticalSlotComponentType, ICombatFeatureSupportEntry>;
