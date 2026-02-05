/**
 * Stores Barrel Export
 *
 * Zustand-based state management for the BattleTech customizer.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

// Legacy store (to be deprecated)
export * from './useCustomizerStore';
export * from './useMultiUnitStore';
export * from './useEquipmentStore';

// New isolated unit store architecture
export * from './unitState';
export * from './useUnitStore';
export * from './unitStoreRegistry';
export { useTabManagerStore } from './useTabManagerStore';
export type { TabInfo, TabManagerState } from './useTabManagerStore';
export { UnitStoreProvider, useHasUnitStore } from './UnitStoreProvider';

// Vehicle store
export * from './vehicleState';
export * from './useVehicleStore';

// Aerospace store
export * from './aerospaceState';
export * from './useAerospaceStore';

// Battle Armor store
export * from './battleArmorState';
export * from './useBattleArmorStore';

// Infantry store
export * from './infantryState';
export * from './useInfantryStore';

// ProtoMech store
export * from './protoMechState';
export * from './useProtoMechStore';

// App settings (main store + focused stores)
export * from './useAppSettingsStore';
export * from './useAppearanceStore';
export * from './useCustomizerSettingsStore';
export * from './useAccessibilityStore';
export * from './useUIBehaviorStore';

// Navigation
export * from './useNavigationStore';

// Pilots
export * from './usePilotStore';

// Theme (light/dark mode)
export * from './useThemeStore';
