/**
 * Phase 1 of `add-combat-fidelity-suite` — Atlas AS7-D & Locust LCT-1V
 * hydration anchor tests.
 *
 * Spec contract: openspec/changes/add-combat-fidelity-suite/specs/
 *   simulation-system/spec.md → "Catalog-Hydrated Unit State" requirement
 *
 *   GIVEN an Atlas AS7-D participant with `unitId: 'atlas-as7-d'`
 *   WHEN the runner hydrates initial unit state
 *   THEN IUnitGameState.weapons MUST include 1× AC/20, 1× LRM-20,
 *        4× Medium Laser, and 1× SRM-6
 *   AND the per-location armor map MUST sum to 304 across 11 locations
 *
 *   GIVEN a Locust LCT-1V participant
 *   WHEN the runner hydrates initial unit state
 *   THEN the resulting weapon list MUST match the canonical Locust loadout
 *        (1× Medium Laser, 2× Machine Gun)
 *   AND total armor MUST match the canonical Locust value (64)
 *
 * Catalog source-of-truth: `public/data/units/battlemechs/{path}/Atlas AS7-D.json`
 * and `public/data/units/battlemechs/1-age-of-war/standard/Locust LCT-1V.json`
 * loaded synchronously via `NodeCanonicalUnitService.getById`. Weapon stats
 * resolved from the bundled `equipmentBVCatalogData.WEAPON_CATALOG_FILES`
 * (sync JSON imports — no fetch needed).
 */

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { AttackAI } from '@/simulation/ai/AttackAI';
import {
  CriticalEffectType,
  Facing,
  FiringArc,
  GameSide,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { resolveCriticalHits } from '@/utils/gameplay/criticalHitResolution';
import { calculateCommandConsoleInitiativeBonus } from '@/utils/gameplay/initiativeModifiers';

import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  createMinimalUnitState,
  toCatalogAIUnitState,
} from '../SimulationRunnerSupport';
import {
  buildWeaponLookupFromCatalogFiles,
  createHydratedUnitState,
  hydrateAIWeaponsFromFullUnit,
  hydrateAIWeaponsFromFullUnitStrict,
  hydrateAIWeaponsFromFullUnitWithReport,
  hydrateArmorFromFullUnit,
  hydrateActiveProbesFromFullUnit,
  hydrateC3EquipmentFromFullUnit,
  hydrateECMSuitesFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateInitiativeEquipmentFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  hydrateClawStateFromFullUnit,
  hydrateCriticalSlotManifestFromFullUnit,
  hydrateStructureFromFullUnit,
  hydrateTalonStateFromFullUnit,
  resolveCatalogDamage,
  type IHydratedUnitData,
} from '../UnitHydration';

// Build the weapon lookup once across this file. The catalog files are
// imported synchronously (see equipmentBVCatalogData.ts) so this is a
// pure in-memory pass — no IO, no async.
const weaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
);

const ATLAS_TONNAGE = 100;
const LOCUST_TONNAGE = 20;
// Canonical totals from the Atlas AS7-D / Locust LCT-1V catalog JSONs.
// Atlas: HD=9 + LA=34 + RA=34 + LL=41 + RL=41 + CT=47+14 + LT=32+10 + RT=32+10 = 304
// Locust: HD=8 + LA=4 + RA=4 + LL=8 + RL=8 + CT=10+2 + LT=8+2 + RT=8+2 = 64
const ATLAS_CANONICAL_TOTAL_ARMOR = 304;
const LOCUST_CANONICAL_TOTAL_ARMOR = 64;
const ATLAS_CANONICAL_HEAT_SINKS = 20;

export {
  ATLAS_CANONICAL_HEAT_SINKS,
  ATLAS_CANONICAL_TOTAL_ARMOR,
  ATLAS_TONNAGE,
  AttackAI,
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  Facing,
  FiringArc,
  GameSide,
  GroundMotionType,
  LOCUST_CANONICAL_TOTAL_ARMOR,
  LOCUST_TONNAGE,
  WEAPON_CATALOG_FILES,
  buildWeaponLookupFromCatalogFiles,
  calculateCommandConsoleInitiativeBonus,
  createHydratedUnitState,
  createMinimalUnitState,
  getNodeCanonicalUnitService,
  hydrateAIWeaponsFromFullUnit,
  hydrateAIWeaponsFromFullUnitStrict,
  hydrateAIWeaponsFromFullUnitWithReport,
  hydrateActiveProbesFromFullUnit,
  hydrateArmorFromFullUnit,
  hydrateC3EquipmentFromFullUnit,
  hydrateClawStateFromFullUnit,
  hydrateCriticalSlotManifestFromFullUnit,
  hydrateECMSuitesFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateInitiativeEquipmentFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydrateStructureFromFullUnit,
  hydrateTalonStateFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  resolveCatalogDamage,
  resolveCriticalHits,
  toCatalogAIUnitState,
  weaponLookup,
};
export type { IFullUnit, IHydratedUnitData };
