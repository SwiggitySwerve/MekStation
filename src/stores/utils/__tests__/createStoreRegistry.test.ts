/**
 * createStoreRegistry Tests
 *
 * Tests for the generic store registry factory.
 */

import { StoreApi, create } from 'zustand';
import { createStoreRegistry, BaseStoreState, StoreRegistryConfig } from '../createStoreRegistry';

// =============================================================================
// Test Types & Mocks
// =============================================================================

interface TestState extends BaseStoreState {
  readonly id: string;
  readonly name: string;
  readonly value: number;
}

interface TestStore extends TestState {
  setName: (name: string) => void;
  setValue: (value: number) => void;
}

interface TestOptions {
  readonly id?: string;
  readonly name?: string;
  readonly value?: number;
}

// Mock UUID functions
jest.mock('@/utils/uuid', () => ({
  isValidUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  generateUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
}));

// Store creation helpers
function createTestStore(state: TestState): StoreApi<TestStore> {
  return create<TestStore>()((set) => ({
    ...state,
    setName: (name) => set({ name }),
    setValue: (value) => set({ value }),
  }));
}

function createNewTestStore(options: TestOptions): StoreApi<TestStore> {
  const id = options.id ?? 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  return createTestStore({
    id,
    name: options.name ?? 'Test',
    value: options.value ?? 0,
  });
}

function createDefaultTestState(options: TestOptions, id: string): TestState {
  return {
    id,
    name: options.name ?? 'Test',
    value: options.value ?? 0,
  };
}

// Default config for tests
function createTestConfig(): StoreRegistryConfig<TestStore, TestState, TestOptions> {
  return {
    storageKeyPrefix: 'test-store',
    registryName: 'TestStoreRegistry',
    createStore: createTestStore,
    createNewStore: createNewTestStore,
    createDefaultState: createDefaultTestState,
    getIdFromState: (state) => state.id,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('createStoreRegistry', () => {
  // Save original localStorage
  const originalLocalStorage = global.localStorage;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    mockLocalStorage = {};
    
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    // Suppress console.warn for cleaner test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    jest.restoreAllMocks();
  });

  describe('basic operations', () => {
    it('should create an empty registry', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      expect(registry.getCount()).toBe(0);
      expect(registry.getAllIds()).toEqual([]);
    });

    it('should register a store', () => {
      const registry = createStoreRegistry(createTestConfig());
      const store = createTestStore({ id: '11111111-2222-3333-4444-555555555555', name: 'Test', value: 42 });
      
      registry.register(store);
      
      expect(registry.has('11111111-2222-3333-4444-555555555555')).toBe(true);
      expect(registry.getCount()).toBe(1);
    });

    it('should get a registered store', () => {
      const registry = createStoreRegistry(createTestConfig());
      const store = createTestStore({ id: '11111111-2222-3333-4444-555555555555', name: 'Test', value: 42 });
      
      registry.register(store);
      
      const retrieved = registry.get('11111111-2222-3333-4444-555555555555');
      expect(retrieved).toBe(store);
    });

    it('should return undefined for non-existent store', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      expect(registry.get('non-existent')).toBeUndefined();
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should get all store IDs', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      registry.register(createTestStore({ id: '11111111-1111-1111-1111-111111111111', name: 'A', value: 1 }));
      registry.register(createTestStore({ id: '22222222-2222-2222-2222-222222222222', name: 'B', value: 2 }));
      registry.register(createTestStore({ id: '33333333-3333-3333-3333-333333333333', name: 'C', value: 3 }));
      
      const ids = registry.getAllIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('11111111-1111-1111-1111-111111111111');
      expect(ids).toContain('22222222-2222-2222-2222-222222222222');
      expect(ids).toContain('33333333-3333-3333-3333-333333333333');
    });
  });

  describe('createAndRegister', () => {
    it('should create and register a new store', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const store = registry.createAndRegister({ name: 'Created', value: 100 });
      
      expect(registry.getCount()).toBe(1);
      expect(store.getState().name).toBe('Created');
      expect(store.getState().value).toBe(100);
    });

    it('should auto-register the created store', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const store = registry.createAndRegister({ name: 'Auto', value: 50 });
      const id = store.getState().id;
      
      expect(registry.has(id)).toBe(true);
      expect(registry.get(id)).toBe(store);
    });
  });

  describe('unregister', () => {
    it('should unregister a store', () => {
      const registry = createStoreRegistry(createTestConfig());
      registry.register(createTestStore({ id: '11111111-2222-3333-4444-555555555555', name: 'Test', value: 0 }));
      
      const result = registry.unregister('11111111-2222-3333-4444-555555555555');
      
      expect(result).toBe(true);
      expect(registry.has('11111111-2222-3333-4444-555555555555')).toBe(false);
    });

    it('should return false when unregistering non-existent store', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const result = registry.unregister('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a store and remove from localStorage', () => {
      const registry = createStoreRegistry(createTestConfig());
      registry.register(createTestStore({ id: '11111111-2222-3333-4444-555555555555', name: 'Test', value: 0 }));
      mockLocalStorage['test-store-11111111-2222-3333-4444-555555555555'] = 'saved-data';
      
      const result = registry.delete('11111111-2222-3333-4444-555555555555');
      
      expect(result).toBe(true);
      expect(registry.has('11111111-2222-3333-4444-555555555555')).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('test-store-11111111-2222-3333-4444-555555555555');
    });

    it('should not call removeItem if store did not exist', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const result = registry.delete('non-existent');
      
      expect(result).toBe(false);
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear all stores without clearing storage', () => {
      const registry = createStoreRegistry(createTestConfig());
      registry.register(createTestStore({ id: '11111111-1111-1111-1111-111111111111', name: 'A', value: 1 }));
      registry.register(createTestStore({ id: '22222222-2222-2222-2222-222222222222', name: 'B', value: 2 }));
      
      registry.clearAll();
      
      expect(registry.getCount()).toBe(0);
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should clear all stores and storage when flag is true', () => {
      const registry = createStoreRegistry(createTestConfig());
      registry.register(createTestStore({ id: '11111111-1111-1111-1111-111111111111', name: 'A', value: 1 }));
      registry.register(createTestStore({ id: '22222222-2222-2222-2222-222222222222', name: 'B', value: 2 }));
      
      registry.clearAll(true);
      
      expect(registry.getCount()).toBe(0);
      expect(localStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureValidId', () => {
    it('should return valid UUID as-is', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const result = registry.ensureValidId('11111111-2222-3333-4444-555555555555', 'test');
      
      expect(result).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('should generate new UUID for invalid ID', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const result = registry.ensureValidId('invalid-id', 'test');
      
      expect(result).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should generate new UUID for null/undefined', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      expect(registry.ensureValidId(null, 'test')).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(registry.ensureValidId(undefined, 'test')).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    });
  });

  describe('hydrateOrCreate', () => {
    it('should return existing store if already registered', () => {
      const registry = createStoreRegistry(createTestConfig());
      const existingStore = createTestStore({ id: '11111111-2222-3333-4444-555555555555', name: 'Existing', value: 99 });
      registry.register(existingStore);
      
      const result = registry.hydrateOrCreate('11111111-2222-3333-4444-555555555555', { name: 'Fallback' });
      
      expect(result).toBe(existingStore);
      expect(result.getState().name).toBe('Existing');
    });

    it('should hydrate from localStorage if saved state exists', () => {
      const registry = createStoreRegistry(createTestConfig());
      const savedState = { state: { id: '11111111-2222-3333-4444-555555555555', name: 'Saved', value: 42 } };
      mockLocalStorage['test-store-11111111-2222-3333-4444-555555555555'] = JSON.stringify(savedState);
      
      const result = registry.hydrateOrCreate('11111111-2222-3333-4444-555555555555', { name: 'Fallback' });
      
      expect(result.getState().name).toBe('Saved');
      expect(result.getState().value).toBe(42);
    });

    it('should create new store with fallback options if nothing saved', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const result = registry.hydrateOrCreate('11111111-2222-3333-4444-555555555555', { name: 'Fallback', value: 100 });
      
      expect(result.getState().name).toBe('Fallback');
      expect(result.getState().value).toBe(100);
    });

    it('should create new store if localStorage is corrupted', () => {
      const registry = createStoreRegistry(createTestConfig());
      mockLocalStorage['test-store-11111111-2222-3333-4444-555555555555'] = 'not-valid-json';
      
      const result = registry.hydrateOrCreate('11111111-2222-3333-4444-555555555555', { name: 'Fallback' });
      
      expect(result.getState().name).toBe('Fallback');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should use custom mergeState if provided', () => {
      const config: StoreRegistryConfig<TestStore, TestState, TestOptions> = {
        ...createTestConfig(),
        mergeState: (defaultState: TestState, savedState: Partial<TestState>, id: string): TestState => ({
          id,
          name: `${defaultState.name}-${savedState.name ?? ''}`,
          value: (defaultState.value ?? 0) + (savedState.value ?? 0),
        }),
      };
      
      const registry = createStoreRegistry(config);
      const savedState = { state: { id: '11111111-2222-3333-4444-555555555555', name: 'Saved', value: 10 } };
      mockLocalStorage['test-store-11111111-2222-3333-4444-555555555555'] = JSON.stringify(savedState);
      
      const result = registry.hydrateOrCreate('11111111-2222-3333-4444-555555555555', { name: 'Default', value: 5 });
      
      expect(result.getState().name).toBe('Default-Saved');
      expect(result.getState().value).toBe(15);
    });

    it('should validate and repair invalid IDs', () => {
      const registry = createStoreRegistry(createTestConfig());
      
      const result = registry.hydrateOrCreate('invalid-id', { name: 'Test' });
      
      // Should use generated UUID instead
      expect(result.getState().id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
