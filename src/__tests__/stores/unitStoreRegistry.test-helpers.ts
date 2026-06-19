/**
 * Unit Store Registry Tests
 *
 * Tests for the unit store registry, including store registration,
 * lookup, hydration, and cleanup operations.
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { createDefaultUnitState } from '@/stores/unitState';
import {
  getUnitStore,
  hasUnitStore,
  getAllUnitIds,
  getStoreCount,
  createAndRegisterUnit,
  registerStore,
  hydrateOrCreateUnit,
  unregisterStore,
  deleteUnit,
  clearAllStores,
  duplicateUnit,
  createUnitFromFullState,
} from '@/stores/unitStoreRegistry';
import { createUnitStore } from '@/stores/useUnitStore';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  TechBaseComponent,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { isValidUUID } from '@/utils/uuid';

import {
  setupMockLocalStorage,
  createTestUnitOptions,
} from '../helpers/storeTestHelpers';

describe('unitStoreRegistry', () => {
  let mockStorage: ReturnType<typeof setupMockLocalStorage>;

  beforeEach(() => {
    mockStorage = setupMockLocalStorage();
    clearAllStores(true); // Clear registry and localStorage
  });

  afterEach(() => {
    clearAllStores(true);
    mockStorage.cleanup();
  });

  // ===========================================================================
  // Store Creation and Registration
  // ===========================================================================
  describe('createAndRegisterUnit()', () => {
    it('should create and register a new unit store', () => {
      const store = createAndRegisterUnit({
        name: 'Test Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      const state = store.getState();

      expect(state.name).toBe('Test Mech');
      expect(state.tonnage).toBe(50);
      expect(state.techBase).toBe(TechBase.INNER_SPHERE);
      expect(hasUnitStore(state.id)).toBe(true);
    });

    it('should generate unique IDs for each unit', () => {
      const store1 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 1' }),
      );
      const store2 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 2' }),
      );

      expect(store1.getState().id).not.toBe(store2.getState().id);
    });

    it('should add store to registry', () => {
      const initialCount = getStoreCount();

      createAndRegisterUnit(createTestUnitOptions());

      expect(getStoreCount()).toBe(initialCount + 1);
    });
  });

  describe('registerStore()', () => {
    it('should register an existing store', () => {
      const state = createDefaultUnitState(
        createTestUnitOptions({ name: 'Manual Store' }),
      );
      const store = createUnitStore(state);

      registerStore(store);

      expect(hasUnitStore(state.id)).toBe(true);
      expect(getUnitStore(state.id)).toBe(store);
    });
  });

  // ===========================================================================
  // Store Lookup
  // ===========================================================================
  describe('getUnitStore()', () => {
    it('should return store for registered unit', () => {
      const store = createAndRegisterUnit(createTestUnitOptions());
      const unitId = store.getState().id;

      const retrieved = getUnitStore(unitId);

      expect(retrieved).toBe(store);
    });

    it('should return undefined for non-existent unit', () => {
      const retrieved = getUnitStore('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('hasUnitStore()', () => {
    it('should return true for registered unit', () => {
      const store = createAndRegisterUnit(createTestUnitOptions());

      expect(hasUnitStore(store.getState().id)).toBe(true);
    });

    it('should return false for non-existent unit', () => {
      expect(hasUnitStore('non-existent-id')).toBe(false);
    });
  });

  describe('getAllUnitIds()', () => {
    it('should return empty array when no units', () => {
      expect(getAllUnitIds()).toEqual([]);
    });

    it('should return all registered unit IDs', () => {
      const store1 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 1' }),
      );
      const store2 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 2' }),
      );
      const store3 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 3' }),
      );

      const ids = getAllUnitIds();

      expect(ids).toContain(store1.getState().id);
      expect(ids).toContain(store2.getState().id);
      expect(ids).toContain(store3.getState().id);
      expect(ids).toHaveLength(3);
    });
  });

  describe('getStoreCount()', () => {
    it('should return 0 when no stores', () => {
      expect(getStoreCount()).toBe(0);
    });

    it('should return correct count', () => {
      createAndRegisterUnit(createTestUnitOptions({ name: 'Unit 1' }));
      createAndRegisterUnit(createTestUnitOptions({ name: 'Unit 2' }));

      expect(getStoreCount()).toBe(2);
    });
  });

  // ===========================================================================
  // Hydration
  // ===========================================================================
  describe('hydrateOrCreateUnit()', () => {
    it('should return existing store if already registered', () => {
      const existing = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Existing' }),
      );
      const unitId = existing.getState().id;

      const hydrated = hydrateOrCreateUnit(
        unitId,
        createTestUnitOptions({ name: 'Fallback' }),
      );

      expect(hydrated).toBe(existing);
      expect(hydrated.getState().name).toBe('Existing');
    });

    it('should create new store with fallback options if no saved state', () => {
      // Use a valid UUID
      const unitId = '550e8400-e29b-41d4-a716-446655440001';

      const hydrated = hydrateOrCreateUnit(unitId, {
        name: 'New Unit',
        tonnage: 75,
        techBase: TechBase.CLAN,
      });

      expect(hydrated.getState().id).toBe(unitId);
      expect(hydrated.getState().name).toBe('New Unit');
      expect(hydrated.getState().tonnage).toBe(75);
      expect(hydrated.getState().techBase).toBe(TechBase.CLAN);
    });

    it('should restore from localStorage if available', () => {
      // Use a valid UUID
      const unitId = '550e8400-e29b-41d4-a716-446655440002';
      const savedState = {
        state: {
          id: unitId,
          name: 'Saved Unit',
          tonnage: 80,
          techBase: TechBase.CLAN,
          engineType: EngineType.XL_CLAN,
          gyroType: GyroType.XL,
        },
        version: 0,
      };

      mockStorage.mockStorage.setItem(
        `megamek-unit-${unitId}`,
        JSON.stringify(savedState),
      );

      const hydrated = hydrateOrCreateUnit(
        unitId,
        createTestUnitOptions({ name: 'Fallback' }),
      );

      expect(hydrated.getState().name).toBe('Saved Unit');
      expect(hydrated.getState().tonnage).toBe(80);
      expect(hydrated.getState().engineType).toBe(EngineType.XL_CLAN);
    });

    it('should use fallback options if localStorage is corrupted', () => {
      // Use a valid UUID
      const unitId = '550e8400-e29b-41d4-a716-446655440003';

      mockStorage.mockStorage.setItem(
        `megamek-unit-${unitId}`,
        'not valid json',
      );

      const hydrated = hydrateOrCreateUnit(unitId, {
        name: 'Fallback Unit',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      expect(hydrated.getState().name).toBe('Fallback Unit');
      expect(hydrated.getState().tonnage).toBe(50);
    });

    it('should register hydrated store in registry', () => {
      // Use a valid UUID
      const unitId = '550e8400-e29b-41d4-a716-446655440004';

      hydrateOrCreateUnit(unitId, createTestUnitOptions());

      expect(hasUnitStore(unitId)).toBe(true);
    });
  });

  // ===========================================================================
  // Store Cleanup
  // ===========================================================================
  describe('unregisterStore()', () => {
    it('should remove store from registry', () => {
      const store = createAndRegisterUnit(createTestUnitOptions());
      const unitId = store.getState().id;

      expect(hasUnitStore(unitId)).toBe(true);

      const removed = unregisterStore(unitId);

      expect(removed).toBe(true);
      expect(hasUnitStore(unitId)).toBe(false);
    });

    it('should not affect localStorage', () => {
      const store = createAndRegisterUnit(createTestUnitOptions());
      const unitId = store.getState().id;

      // Force a state update to trigger localStorage save
      store.getState().setName('Updated');

      const storageKey = `megamek-unit-${unitId}`;
      const beforeUnregister = mockStorage.mockStorage.getItem(storageKey);

      unregisterStore(unitId);

      const afterUnregister = mockStorage.mockStorage.getItem(storageKey);
      expect(afterUnregister).toBe(beforeUnregister);
    });

    it('should return false for non-existent store', () => {
      const removed = unregisterStore('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('deleteUnit()', () => {
    it('should remove store and localStorage entry', () => {
      const store = createAndRegisterUnit(createTestUnitOptions());
      const unitId = store.getState().id;

      // Force localStorage persistence
      store.getState().setName('Trigger Save');

      const storageKey = `megamek-unit-${unitId}`;

      const deleted = deleteUnit(unitId);

      expect(deleted).toBe(true);
      expect(hasUnitStore(unitId)).toBe(false);
      expect(mockStorage.mockStorage.getItem(storageKey)).toBeNull();
    });

    it('should return false for non-existent unit', () => {
      const deleted = deleteUnit('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('clearAllStores()', () => {
    it('should remove all stores from registry', () => {
      createAndRegisterUnit(createTestUnitOptions({ name: 'Unit 1' }));
      createAndRegisterUnit(createTestUnitOptions({ name: 'Unit 2' }));
      createAndRegisterUnit(createTestUnitOptions({ name: 'Unit 3' }));

      expect(getStoreCount()).toBe(3);

      clearAllStores(false);

      expect(getStoreCount()).toBe(0);
    });

    it('should clear localStorage when requested', () => {
      const store1 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 1' }),
      );
      const store2 = createAndRegisterUnit(
        createTestUnitOptions({ name: 'Unit 2' }),
      );

      // Trigger saves
      store1.getState().setName('Trigger Save 1');
      store2.getState().setName('Trigger Save 2');

      const key1 = `megamek-unit-${store1.getState().id}`;
      const key2 = `megamek-unit-${store2.getState().id}`;

      clearAllStores(true);

      expect(mockStorage.mockStorage.getItem(key1)).toBeNull();
      expect(mockStorage.mockStorage.getItem(key2)).toBeNull();
    });

    it('should preserve localStorage when not requested', () => {
      const store = createAndRegisterUnit(createTestUnitOptions());
      store.getState().setName('Trigger Save');

      const key = `megamek-unit-${store.getState().id}`;
      const beforeClear = mockStorage.mockStorage.getItem(key);

      clearAllStores(false);

      const afterClear = mockStorage.mockStorage.getItem(key);
      expect(afterClear).toBe(beforeClear);
    });
  });

  // ===========================================================================
  // Duplication
  // ===========================================================================
  describe('duplicateUnit()', () => {
    it('should create a copy with new ID', () => {
      const original = createAndRegisterUnit({
        name: 'Original',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      const originalId = original.getState().id;

      // Modify original
      original.getState().setEngineType(EngineType.XL_IS);
      original.getState().setHeatSinkType(HeatSinkType.DOUBLE_IS);

      const duplicate = duplicateUnit(originalId);

      expect(duplicate).not.toBeNull();
      expect(duplicate!.getState().id).not.toBe(originalId);
      expect(duplicate!.getState().name).toContain('(Copy)');
    });

    it('should copy all configuration from source', () => {
      const original = createAndRegisterUnit({
        name: 'Original',
        tonnage: 75,
        techBase: TechBase.CLAN,
      });

      // Modify original with specific configuration
      original.getState().setEngineType(EngineType.XL_CLAN);
      original.getState().setGyroType(GyroType.XL);
      original.getState().setHeatSinkType(HeatSinkType.DOUBLE_CLAN);
      original
        .getState()
        .setInternalStructureType(InternalStructureType.ENDO_STEEL_CLAN);
      original.getState().setTechBaseMode(TechBaseMode.MIXED);
      original
        .getState()
        .setComponentTechBase(TechBaseComponent.ARMOR, TechBase.INNER_SPHERE);

      const duplicate = duplicateUnit(original.getState().id);

      expect(duplicate).not.toBeNull();
      const dupState = duplicate!.getState();

      expect(dupState.tonnage).toBe(75);
      expect(dupState.techBase).toBe(TechBase.CLAN);
      expect(dupState.engineType).toBe(EngineType.XL_CLAN);
      expect(dupState.gyroType).toBe(GyroType.XL);
      expect(dupState.heatSinkType).toBe(HeatSinkType.DOUBLE_CLAN);
      expect(dupState.internalStructureType).toBe(
        InternalStructureType.ENDO_STEEL_CLAN,
      );
      expect(dupState.techBaseMode).toBe(TechBaseMode.MIXED);
      expect(dupState.componentTechBases.armor).toBe(TechBase.INNER_SPHERE);
    });

    it('should use custom name if provided', () => {
      const original = createAndRegisterUnit({
        name: 'Original',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      const duplicate = duplicateUnit(
        original.getState().id,
        'Custom Copy Name',
      );

      expect(duplicate!.getState().name).toBe('Custom Copy Name');
    });

    it('should register duplicate in registry', () => {
      const original = createAndRegisterUnit(createTestUnitOptions());
      const initialCount = getStoreCount();

      const duplicate = duplicateUnit(original.getState().id);

      expect(getStoreCount()).toBe(initialCount + 1);
      expect(hasUnitStore(duplicate!.getState().id)).toBe(true);
    });

    it('should return null for non-existent source', () => {
      const duplicate = duplicateUnit('non-existent-id');

      expect(duplicate).toBeNull();
    });

    it('should create independent copy (not share references)', () => {
      const original = createAndRegisterUnit({
        name: 'Original',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      original
        .getState()
        .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);

      const duplicate = duplicateUnit(original.getState().id);

      // Modify duplicate
      duplicate!
        .getState()
        .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.INNER_SPHERE);
      duplicate!.getState().setEngineType(EngineType.LIGHT);

      // Original should be unchanged
      expect(original.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      expect(original.getState().engineType).toBe(EngineType.STANDARD);

      // Duplicate should have changes
      expect(duplicate!.getState().componentTechBases.engine).toBe(
        TechBase.INNER_SPHERE,
      );
      expect(duplicate!.getState().engineType).toBe(EngineType.LIGHT);
    });
  });

  // ===========================================================================
  // ID Validation
  // ===========================================================================
  describe('ID Validation', () => {
    describe('hydrateOrCreateUnit() with invalid IDs', () => {
      it('should generate valid UUID when called with empty string ID', () => {
        const store = hydrateOrCreateUnit('', {
          name: 'Test Unit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        });

        const state = store.getState();
        expect(state.id).not.toBe('');
        expect(isValidUUID(state.id)).toBe(true);
      });

      it('should generate valid UUID when called with invalid ID', () => {
        const store = hydrateOrCreateUnit('not-a-valid-uuid', {
          name: 'Test Unit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        });

        const state = store.getState();
        expect(state.id).not.toBe('not-a-valid-uuid');
        expect(isValidUUID(state.id)).toBe(true);
      });

      it('should preserve valid UUID when called with valid ID', () => {
        const validId = '550e8400-e29b-41d4-a716-446655440000';

        const store = hydrateOrCreateUnit(validId, {
          name: 'Test Unit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        });

        expect(store.getState().id).toBe(validId);
      });

      it('should repair invalid ID in localStorage state', () => {
        const requestedId = '550e8400-e29b-41d4-a716-446655440000';
        const savedState = {
          state: {
            id: 'corrupted-id-in-storage',
            name: 'Saved Unit',
            tonnage: 80,
            techBase: TechBase.CLAN,
          },
          version: 0,
        };

        mockStorage.mockStorage.setItem(
          `megamek-unit-${requestedId}`,
          JSON.stringify(savedState),
        );

        const store = hydrateOrCreateUnit(requestedId, createTestUnitOptions());

        // Should use the requested ID, not the corrupted one from storage
        expect(store.getState().id).toBe(requestedId);
        expect(store.getState().name).toBe('Saved Unit');
      });
    });

    describe('createUnitFromFullState() with invalid IDs', () => {
      it('should generate valid UUID when state has empty ID', () => {
        const state = createDefaultUnitState({
          name: 'Full State Unit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        });

        // Force empty ID
        const stateWithEmptyId = { ...state, id: '' };

        const store = createUnitFromFullState(stateWithEmptyId);

        expect(store.getState().id).not.toBe('');
        expect(isValidUUID(store.getState().id)).toBe(true);
      });

      it('should generate valid UUID when state has invalid ID', () => {
        const state = createDefaultUnitState({
          name: 'Full State Unit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        });

        // Force invalid ID
        const stateWithInvalidId = { ...state, id: 'invalid-id' };

        const store = createUnitFromFullState(stateWithInvalidId);

        expect(store.getState().id).not.toBe('invalid-id');
        expect(isValidUUID(store.getState().id)).toBe(true);
      });

      it('should preserve valid UUID in state', () => {
        const validId = '550e8400-e29b-41d4-a716-446655440000';
        const state = createDefaultUnitState({
          name: 'Full State Unit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        });

        const stateWithValidId = { ...state, id: validId };

        const store = createUnitFromFullState(stateWithValidId);

        expect(store.getState().id).toBe(validId);
      });
    });
  });

  // ===========================================================================
  // State Persistence Across Operations
  // ===========================================================================
  describe('State Persistence', () => {
    it('should maintain state after unregister and re-hydrate', () => {
      const store = createAndRegisterUnit({
        name: 'Persistent Unit',
        tonnage: 85,
        techBase: TechBase.CLAN,
      });

      // Modify state
      store.getState().setEngineType(EngineType.XL_CLAN);
      store.getState().setGyroType(GyroType.COMPACT);

      const unitId = store.getState().id;

      // Unregister (simulates tab close without delete)
      unregisterStore(unitId);
      expect(hasUnitStore(unitId)).toBe(false);

      // Re-hydrate (simulates tab reopen)
      const rehydrated = hydrateOrCreateUnit(unitId, createTestUnitOptions());

      // State should be preserved from localStorage
      expect(rehydrated.getState().name).toBe('Persistent Unit');
      expect(rehydrated.getState().tonnage).toBe(85);
      expect(rehydrated.getState().engineType).toBe(EngineType.XL_CLAN);
      expect(rehydrated.getState().gyroType).toBe(GyroType.COMPACT);
    });
  });
});
