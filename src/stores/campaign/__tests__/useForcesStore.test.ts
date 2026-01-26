/**
 * Forces Store Tests
 *
 * Comprehensive test suite for useForcesStore with CRUD, queries,
 * persistence, and Map serialization coverage.
 */

import { createForcesStore } from '../useForcesStore';
import { IForce } from '@/types/campaign/Force';
import { ForceType, FormationLevel } from '@/types/campaign/enums';

// =============================================================================
// Test Data Helpers
// =============================================================================

let forceIdCounter = 0;

const createTestForce = (overrides?: Partial<IForce>): IForce => {
  const id = `force-${Date.now()}-${forceIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    name: 'Test Force',
    parentForceId: undefined,
    subForceIds: [],
    unitIds: [],
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// =============================================================================
// Mock localStorage for persistence tests
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// =============================================================================
// Tests
// =============================================================================

describe('useForcesStore', () => {
  let store: ReturnType<typeof createForcesStore>;

  beforeEach(() => {
    forceIdCounter = 0;
    localStorageMock.clear();
    store = createForcesStore('test-campaign');
    store.getState().clear();
  });

  // ===========================================================================
  // Store Creation
  // ===========================================================================

  describe('Store Creation', () => {
    it('should create store with campaignId', () => {
      const testStore = createForcesStore('campaign-001');
      expect(testStore).toBeDefined();
      expect(testStore.getState).toBeDefined();
    });

    it('should initialize with empty Map', () => {
      const state = store.getState();
      expect(state.forces).toBeInstanceOf(Map);
      expect(state.forces.size).toBe(0);
    });

    it('should have all expected methods', () => {
      const state = store.getState();
      // CRUD
      expect(typeof state.addForce).toBe('function');
      expect(typeof state.removeForce).toBe('function');
      expect(typeof state.updateForce).toBe('function');
      expect(typeof state.getForce).toBe('function');
      expect(typeof state.getAllForces).toBe('function');
      expect(typeof state.clear).toBe('function');
      // Queries
      expect(typeof state.getSubForces).toBe('function');
      expect(typeof state.getRootForce).toBe('function');
    });
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('addForce', () => {
      it('should add force to Map', () => {
        const force = createTestForce({ name: 'Alpha Lance' });
        store.getState().addForce(force);

        const retrieved = store.getState().getForce(force.id);
        expect(retrieved).toEqual(force);
        expect(store.getState().forces.size).toBe(1);
      });

      it('should handle duplicate IDs (overwrites)', () => {
        const force1 = createTestForce({ id: 'force-1', name: 'First' });
        const force2 = createTestForce({ id: 'force-1', name: 'Second' });

        store.getState().addForce(force1);
        store.getState().addForce(force2);

        const retrieved = store.getState().getForce('force-1');
        expect(retrieved?.name).toBe('Second');
        expect(store.getState().forces.size).toBe(1);
      });

      it('should add multiple forces', () => {
        const force1 = createTestForce({ name: 'Force 1' });
        const force2 = createTestForce({ name: 'Force 2' });
        const force3 = createTestForce({ name: 'Force 3' });

        store.getState().addForce(force1);
        store.getState().addForce(force2);
        store.getState().addForce(force3);

        expect(store.getState().forces.size).toBe(3);
      });
    });

    describe('removeForce', () => {
      it('should remove force from Map', () => {
        const force = createTestForce();
        store.getState().addForce(force);
        expect(store.getState().forces.size).toBe(1);

        store.getState().removeForce(force.id);
        expect(store.getState().forces.size).toBe(0);
        expect(store.getState().getForce(force.id)).toBeUndefined();
      });

      it('should handle non-existent ID (no-op)', () => {
        const force = createTestForce();
        store.getState().addForce(force);

        store.getState().removeForce('non-existent-id');
        expect(store.getState().forces.size).toBe(1);
      });
    });

    describe('updateForce', () => {
      it('should update existing force', () => {
        const force = createTestForce({ name: 'Original Name' });
        store.getState().addForce(force);

        store.getState().updateForce(force.id, { name: 'Updated Name' });

        const updated = store.getState().getForce(force.id);
        expect(updated?.name).toBe('Updated Name');
      });

      it('should update updatedAt timestamp', async () => {
        const force = createTestForce();
        const originalUpdatedAt = force.updatedAt;
        store.getState().addForce(force);

        // Wait 10ms to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 10));
        store.getState().updateForce(force.id, { name: 'New Name' });

        const updated = store.getState().getForce(force.id);
        expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
        expect(updated?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should handle partial updates', () => {
        const force = createTestForce({
          name: 'Alpha Lance',
          forceType: ForceType.STANDARD,
          formationLevel: FormationLevel.LANCE,
        });
        store.getState().addForce(force);

        store.getState().updateForce(force.id, { forceType: ForceType.RECON });

        const updated = store.getState().getForce(force.id);
        expect(updated?.name).toBe('Alpha Lance');
        expect(updated?.forceType).toBe(ForceType.RECON);
        expect(updated?.formationLevel).toBe(FormationLevel.LANCE);
      });

      it('should handle non-existent ID (no-op)', () => {
        const force = createTestForce();
        store.getState().addForce(force);

        store.getState().updateForce('non-existent-id', { name: 'New Name' });

        // Original force unchanged
        const retrieved = store.getState().getForce(force.id);
        expect(retrieved).toEqual(force);
      });

      it('should update subForceIds', () => {
        const force = createTestForce({ subForceIds: [] });
        store.getState().addForce(force);

        store.getState().updateForce(force.id, {
          subForceIds: ['sub-1', 'sub-2'],
        });

        const updated = store.getState().getForce(force.id);
        expect(updated?.subForceIds).toEqual(['sub-1', 'sub-2']);
      });

      it('should update unitIds', () => {
        const force = createTestForce({ unitIds: [] });
        store.getState().addForce(force);

        store.getState().updateForce(force.id, {
          unitIds: ['unit-1', 'unit-2', 'unit-3'],
        });

        const updated = store.getState().getForce(force.id);
        expect(updated?.unitIds).toEqual(['unit-1', 'unit-2', 'unit-3']);
      });
    });

    describe('getForce', () => {
      it('should return force by ID', () => {
        const force = createTestForce({ name: 'Test Force' });
        store.getState().addForce(force);

        const retrieved = store.getState().getForce(force.id);
        expect(retrieved).toEqual(force);
      });

      it('should return undefined for non-existent ID', () => {
        const retrieved = store.getState().getForce('non-existent-id');
        expect(retrieved).toBeUndefined();
      });
    });

    describe('getAllForces', () => {
      it('should return all forces as array', () => {
        const force1 = createTestForce({ name: 'Force 1' });
        const force2 = createTestForce({ name: 'Force 2' });

        store.getState().addForce(force1);
        store.getState().addForce(force2);

        const all = store.getState().getAllForces();
        expect(Array.isArray(all)).toBe(true);
        expect(all).toHaveLength(2);
        expect(all).toContainEqual(force1);
        expect(all).toContainEqual(force2);
      });

      it('should return empty array for empty store', () => {
        const all = store.getState().getAllForces();
        expect(all).toEqual([]);
      });
    });

    describe('clear', () => {
      it('should remove all forces', () => {
        const force1 = createTestForce();
        const force2 = createTestForce();
        const force3 = createTestForce();

        store.getState().addForce(force1);
        store.getState().addForce(force2);
        store.getState().addForce(force3);

        expect(store.getState().forces.size).toBe(3);

        store.getState().clear();

        expect(store.getState().forces.size).toBe(0);
        expect(store.getState().getAllForces()).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  describe('Query Methods', () => {
    describe('getSubForces', () => {
      it('should return sub-forces of a parent', () => {
        const parent = createTestForce({ id: 'parent', name: 'Parent' });
        const child1 = createTestForce({
          id: 'child-1',
          name: 'Child 1',
          parentForceId: 'parent',
        });
        const child2 = createTestForce({
          id: 'child-2',
          name: 'Child 2',
          parentForceId: 'parent',
        });
        const unrelated = createTestForce({
          id: 'unrelated',
          name: 'Unrelated',
        });

        store.getState().addForce(parent);
        store.getState().addForce(child1);
        store.getState().addForce(child2);
        store.getState().addForce(unrelated);

        const subForces = store.getState().getSubForces('parent');
        expect(subForces).toHaveLength(2);
        expect(subForces).toContainEqual(child1);
        expect(subForces).toContainEqual(child2);
      });

      it('should return empty array for no sub-forces', () => {
        const force = createTestForce({ id: 'force-1' });
        store.getState().addForce(force);

        const subForces = store.getState().getSubForces('force-1');
        expect(subForces).toEqual([]);
      });

      it('should return empty array for non-existent parent', () => {
        const subForces = store.getState().getSubForces('non-existent');
        expect(subForces).toEqual([]);
      });
    });

    describe('getRootForce', () => {
      it('should return force with no parent', () => {
        const root = createTestForce({
          id: 'root',
          name: 'Root Force',
          parentForceId: undefined,
        });
        const child = createTestForce({
          id: 'child',
          name: 'Child Force',
          parentForceId: 'root',
        });

        store.getState().addForce(root);
        store.getState().addForce(child);

        const rootForce = store.getState().getRootForce();
        expect(rootForce).toEqual(root);
      });

      it('should return undefined for empty store', () => {
        const rootForce = store.getState().getRootForce();
        expect(rootForce).toBeUndefined();
      });

      it('should return first root if multiple exist', () => {
        const root1 = createTestForce({
          id: 'root-1',
          name: 'Root 1',
          parentForceId: undefined,
        });
        const root2 = createTestForce({
          id: 'root-2',
          name: 'Root 2',
          parentForceId: undefined,
        });

        store.getState().addForce(root1);
        store.getState().addForce(root2);

        const rootForce = store.getState().getRootForce();
        // Should return one of them (first found)
        expect(rootForce?.parentForceId).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('Persistence', () => {
    it('should persist to localStorage', () => {
      const force = createTestForce({ name: 'Persisted Force' });
      store.getState().addForce(force);

      // Check localStorage was written
      const stored = localStorageMock.getItem('forces-test-campaign');
      expect(stored).toBeTruthy();
    });

    it('should include campaignId in storage key', () => {
      const store1 = createForcesStore('campaign-1');
      const store2 = createForcesStore('campaign-2');

      const force1 = createTestForce({ name: 'Campaign 1 Force' });
      const force2 = createTestForce({ name: 'Campaign 2 Force' });

      store1.getState().addForce(force1);
      store2.getState().addForce(force2);

      const stored1 = localStorageMock.getItem('forces-campaign-1');
      const stored2 = localStorageMock.getItem('forces-campaign-2');

      expect(stored1).toBeTruthy();
      expect(stored2).toBeTruthy();
      expect(stored1).not.toBe(stored2);
    });

    it('should serialize Map to array', () => {
      const force = createTestForce({ name: 'Test Force' });
      store.getState().addForce(force);

      const stored = localStorageMock.getItem('forces-test-campaign');
      const parsed = JSON.parse(stored!) as {
        state?: { forces?: [string, IForce][] };
      };

      expect(parsed.state?.forces).toBeDefined();
      expect(Array.isArray(parsed.state?.forces)).toBe(true);
      expect(parsed.state?.forces).toHaveLength(1);
      expect(parsed.state?.forces?.[0]).toEqual([force.id, expect.any(Object)]);
    });

    it('should deserialize array to Map', () => {
      const force = createTestForce({ name: 'Test Force' });
      store.getState().addForce(force);

      // Create new store instance (simulates page reload)
      const newStore = createForcesStore('test-campaign');

      expect(newStore.getState().forces).toBeInstanceOf(Map);
      expect(newStore.getState().forces.size).toBe(1);

      const retrieved = newStore.getState().getForce(force.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(force.id);
      expect(retrieved?.name).toBe(force.name);
    });

    it('should load persisted data correctly', () => {
      const force1 = createTestForce({ name: 'Force 1' });
      const force2 = createTestForce({ name: 'Force 2' });

      store.getState().addForce(force1);
      store.getState().addForce(force2);

      // Create new store instance
      const newStore = createForcesStore('test-campaign');

      expect(newStore.getState().getAllForces()).toHaveLength(2);

      const retrieved1 = newStore.getState().getForce(force1.id);
      const retrieved2 = newStore.getState().getForce(force2.id);

      expect(retrieved1?.id).toBe(force1.id);
      expect(retrieved1?.name).toBe(force1.name);
      expect(retrieved2?.id).toBe(force2.id);
      expect(retrieved2?.name).toBe(force2.name);
    });

    it('should persist empty Map correctly', () => {
      store.getState().clear();

      const stored = localStorageMock.getItem('forces-test-campaign');
      const parsed = JSON.parse(stored!) as {
        state?: { forces?: [string, IForce][] };
      };
      expect(parsed.state?.forces).toEqual([]);

      // Create new store instance
      const newStore = createForcesStore('test-campaign');
      expect(newStore.getState().forces.size).toBe(0);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should return empty array for queries on empty store', () => {
      expect(store.getState().getSubForces('parent')).toEqual([]);
      expect(store.getState().getRootForce()).toBeUndefined();
    });

    it('should handle force hierarchy', () => {
      // Create a hierarchy: Regiment -> Company -> Lance
      const regiment = createTestForce({
        id: 'regiment',
        name: '1st Regiment',
        formationLevel: FormationLevel.REGIMENT,
        subForceIds: ['company'],
      });
      const company = createTestForce({
        id: 'company',
        name: 'Alpha Company',
        parentForceId: 'regiment',
        formationLevel: FormationLevel.COMPANY,
        subForceIds: ['lance'],
      });
      const lance = createTestForce({
        id: 'lance',
        name: 'Alpha Lance',
        parentForceId: 'company',
        formationLevel: FormationLevel.LANCE,
      });

      store.getState().addForce(regiment);
      store.getState().addForce(company);
      store.getState().addForce(lance);

      // Verify hierarchy
      expect(store.getState().getRootForce()).toEqual(regiment);
      expect(store.getState().getSubForces('regiment')).toContainEqual(company);
      expect(store.getState().getSubForces('company')).toContainEqual(lance);
      expect(store.getState().getSubForces('lance')).toEqual([]);
    });

    it('should handle forces with units', () => {
      const force = createTestForce({
        name: 'Combat Lance',
        unitIds: ['mech-1', 'mech-2', 'mech-3', 'mech-4'],
      });

      store.getState().addForce(force);

      const retrieved = store.getState().getForce(force.id);
      expect(retrieved?.unitIds).toHaveLength(4);
      expect(retrieved?.unitIds).toContain('mech-1');
    });

    it('should handle forces with commander', () => {
      const force = createTestForce({
        name: 'Command Lance',
        commanderId: 'person-commander',
      });

      store.getState().addForce(force);

      const retrieved = store.getState().getForce(force.id);
      expect(retrieved?.commanderId).toBe('person-commander');
    });
  });
});
