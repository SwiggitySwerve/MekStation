/**
 * Unit Hydration facade.
 *
 * Callers keep importing from this module while cohesive hydration stages live
 * in sibling `UnitHydration.*` modules.
 */

export {
  buildAmmoLookupFromCatalogFiles,
  buildWeaponLookupFromCatalogFiles,
} from './UnitHydrationCatalogLookup';

export type {
  AmmoLookup,
  CriticalSlotMap,
  HeatSinkKind,
  ICatalogAmmoStats,
  ICatalogWeaponStats,
  IHydratedActiveProbeData,
  IHydratedAIWeaponsReport,
  IHydratedC3EquipmentData,
  IHydratedClawState,
  IHydratedECMSuiteData,
  IHydratedTalonState,
  IHydratedUnitData,
  IHydratableEquipmentSignal,
  IUnitEquipmentEntry,
  WeaponLookup,
} from './UnitHydrationTypes';

export {
  ammoBinIdForCriticalSlot,
  ammoStatsForCriticalSlot,
  defaultCatalogAmmoLookup,
  hydrateAmmoStateFromFullUnit,
} from './UnitHydrationAmmo';
export {
  hydrateArmorFromFullUnit,
  hydrateArmorTypeByLocationFromFullUnit,
  hydrateStructureFromFullUnit,
} from './UnitHydrationArmor';
export { hydrateCASEProtectionFromFullUnit } from './UnitHydrationCase';
export { hydrateCriticalSlotManifestFromFullUnit } from './UnitHydrationCriticalSlots';
export {
  hydrateActiveProbesFromFullUnit,
  hydrateC3EquipmentFromFullUnit,
  hydrateECMSuitesFromFullUnit,
} from './UnitHydrationElectronics';
export {
  criticalSlotsFromFullUnit,
  equipmentEntriesFromFullUnit,
  equipmentSignalsFromFullUnit,
  locationSlotTexts,
} from './UnitHydrationEquipment';
export { hydrateInitiativeEquipmentFromFullUnit } from './UnitHydrationInitiative';
export {
  hydrateClawStateFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateMotionTypeFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydrateTalonStateFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  hydrateUnitQuirksFromFullUnit,
} from './UnitHydrationMovement';
export {
  createHydratedUnitState,
  weaponLocationByIdFromWeapons,
} from './UnitHydrationState';
export {
  hydrateAIWeaponsFromFullUnit,
  hydrateAIWeaponsFromFullUnitStrict,
  hydrateAIWeaponsFromFullUnitWithReport,
  resolveCatalogDamage,
  toAIWeapon,
} from './UnitHydrationWeapons';
