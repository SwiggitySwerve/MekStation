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

// App settings
export * from './useAppSettingsStore';

