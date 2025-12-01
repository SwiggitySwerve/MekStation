/**
 * Store Test Helpers
 * 
 * Utilities for testing Zustand stores, including localStorage mocking
 * and test factory functions.
 */

import { StoreApi } from 'zustand';
import { TechBase } from '@/types/enums/TechBase';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { 
  UnitState, 
  UnitStore, 
  CreateUnitOptions,
  createDefaultUnitState,
  generateUnitId,
} from '@/stores/unitState';
import { createUnitStore, createNewUnitStore } from '@/stores/useUnitStore';
import { IComponentTechBases, createDefaultComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { IComponentSelections } from '@/stores/useMultiUnitStore';

// =============================================================================
// LocalStorage Mock
// =============================================================================

/**
 * Mock localStorage implementation for testing
 */
export class MockLocalStorage implements Storage {
  private store: Record<string, string> = {};
  
  get length(): number {
    return Object.keys(this.store).length;
  }
  
  clear(): void {
    this.store = {};
  }
  
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  
  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }
  
  removeItem(key: string): void {
    delete this.store[key];
  }
  
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  
  /**
   * Get all stored keys (for testing)
   */
  getAllKeys(): string[] {
    return Object.keys(this.store);
  }
  
  /**
   * Get raw store (for testing)
   */
  getRawStore(): Record<string, string> {
    return { ...this.store };
  }
}

/**
 * Setup mock localStorage for tests
 * Returns cleanup function
 */
export function setupMockLocalStorage(): { 
  mockStorage: MockLocalStorage; 
  cleanup: () => void;
  originalLocalStorage: Storage;
} {
  const mockStorage = new MockLocalStorage();
  const originalLocalStorage = global.localStorage;
  
  Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  
  return {
    mockStorage,
    originalLocalStorage,
    cleanup: () => {
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      });
    },
  };
}

// =============================================================================
// Test Unit Factory
// =============================================================================

/**
 * Default test unit options
 */
export const DEFAULT_TEST_UNIT_OPTIONS: CreateUnitOptions = {
  name: 'Test Mech',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
  walkMP: 4,
};

/**
 * Create test unit options with overrides
 */
export function createTestUnitOptions(
  overrides: Partial<CreateUnitOptions> = {}
): CreateUnitOptions {
  return {
    ...DEFAULT_TEST_UNIT_OPTIONS,
    ...overrides,
  };
}

/**
 * Create a test unit state with overrides
 */
export function createTestUnitState(
  overrides: Partial<CreateUnitOptions & Partial<UnitState>> = {}
): UnitState {
  const options = createTestUnitOptions(overrides);
  const defaultState = createDefaultUnitState(options);
  
  // Apply any direct state overrides
  return {
    ...defaultState,
    ...(overrides.engineType !== undefined && { engineType: overrides.engineType }),
    ...(overrides.gyroType !== undefined && { gyroType: overrides.gyroType }),
    ...(overrides.internalStructureType !== undefined && { internalStructureType: overrides.internalStructureType }),
    ...(overrides.cockpitType !== undefined && { cockpitType: overrides.cockpitType }),
    ...(overrides.heatSinkType !== undefined && { heatSinkType: overrides.heatSinkType }),
    ...(overrides.heatSinkCount !== undefined && { heatSinkCount: overrides.heatSinkCount }),
    ...(overrides.armorType !== undefined && { armorType: overrides.armorType }),
  } as UnitState;
}

/**
 * Create a test store with optional overrides
 */
export function createTestStore(
  overrides: Partial<CreateUnitOptions & Partial<UnitState>> = {}
): StoreApi<UnitStore> {
  const state = createTestUnitState(overrides);
  return createUnitStore(state);
}

/**
 * Create an Inner Sphere test store
 */
export function createISTestStore(
  overrides: Partial<CreateUnitOptions & Partial<UnitState>> = {}
): StoreApi<UnitStore> {
  return createTestStore({
    techBase: TechBase.INNER_SPHERE,
    ...overrides,
  });
}

/**
 * Create a Clan test store
 */
export function createClanTestStore(
  overrides: Partial<CreateUnitOptions & Partial<UnitState>> = {}
): StoreApi<UnitStore> {
  return createTestStore({
    techBase: TechBase.CLAN,
    ...overrides,
  });
}

// =============================================================================
// Component Tech Bases Helpers
// =============================================================================

/**
 * Create Inner Sphere component tech bases
 */
export function createISComponentTechBases(): IComponentTechBases {
  return createDefaultComponentTechBases(TechBase.INNER_SPHERE);
}

/**
 * Create Clan component tech bases
 */
export function createClanComponentTechBases(): IComponentTechBases {
  return createDefaultComponentTechBases(TechBase.CLAN);
}

/**
 * Create mixed component tech bases
 */
export function createMixedComponentTechBases(): IComponentTechBases {
  return {
    chassis: TechBase.INNER_SPHERE,
    gyro: TechBase.INNER_SPHERE,
    engine: TechBase.CLAN,
    heatsink: TechBase.CLAN,
    targeting: TechBase.INNER_SPHERE,
    myomer: TechBase.INNER_SPHERE,
    movement: TechBase.INNER_SPHERE,
    armor: TechBase.CLAN,
  };
}

// =============================================================================
// Component Selections Helpers
// =============================================================================

/**
 * Create default IS component selections
 */
export function createISComponentSelections(tonnage: number = 50): IComponentSelections {
  return {
    engineType: EngineType.STANDARD,
    engineRating: tonnage * 4, // Walk 4
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.STANDARD,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    heatSinkCount: 10,
    armorType: ArmorTypeEnum.STANDARD,
  };
}

/**
 * Create IS component selections with XL engine
 */
export function createISXLComponentSelections(tonnage: number = 50): IComponentSelections {
  return {
    ...createISComponentSelections(tonnage),
    engineType: EngineType.XL_IS,
    heatSinkType: HeatSinkType.DOUBLE_IS,
    internalStructureType: InternalStructureType.ENDO_STEEL_IS,
    armorType: ArmorTypeEnum.FERRO_FIBROUS_IS,
  };
}

/**
 * Create Clan component selections
 */
export function createClanComponentSelections(tonnage: number = 50): IComponentSelections {
  return {
    engineType: EngineType.XL_CLAN,
    engineRating: tonnage * 4, // Walk 4
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.ENDO_STEEL_CLAN,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.DOUBLE_CLAN,
    heatSinkCount: 10,
    armorType: ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  };
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert all component tech bases match expected tech base
 */
export function expectAllComponentTechBases(
  componentTechBases: IComponentTechBases,
  expectedTechBase: TechBase
): void {
  expect(componentTechBases.chassis).toBe(expectedTechBase);
  expect(componentTechBases.gyro).toBe(expectedTechBase);
  expect(componentTechBases.engine).toBe(expectedTechBase);
  expect(componentTechBases.heatsink).toBe(expectedTechBase);
  expect(componentTechBases.targeting).toBe(expectedTechBase);
  expect(componentTechBases.myomer).toBe(expectedTechBase);
  expect(componentTechBases.movement).toBe(expectedTechBase);
  expect(componentTechBases.armor).toBe(expectedTechBase);
}

/**
 * Assert store state has expected tech base mode
 */
export function expectTechBaseMode(
  store: StoreApi<UnitStore>,
  expectedMode: 'inner_sphere' | 'clan' | 'mixed'
): void {
  expect(store.getState().techBaseMode).toBe(expectedMode);
}

// =============================================================================
// Reset Helpers
// =============================================================================

/**
 * Clear the unit store registry
 * Import this dynamically to avoid circular dependencies
 */
export async function clearStoreRegistry(): Promise<void> {
  const { clearAllStores } = await import('@/stores/unitStoreRegistry');
  clearAllStores(true);
}

/**
 * Reset all test state
 */
export async function resetTestState(mockStorage?: MockLocalStorage): Promise<void> {
  if (mockStorage) {
    mockStorage.clear();
  }
  await clearStoreRegistry();
}


