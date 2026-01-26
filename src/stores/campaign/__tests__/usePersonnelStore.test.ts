/**
 * Personnel Store Tests
 *
 * Comprehensive test suite for usePersonnelStore with CRUD, queries,
 * persistence, and Map serialization coverage.
 */

import { createPersonnelStore } from '../usePersonnelStore';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';
import { createDefaultAttributes } from '@/types/campaign/Person';

// =============================================================================
// Test Data Helpers
// =============================================================================

let personIdCounter = 0;

const createTestPerson = (overrides?: Partial<IPerson>): IPerson => {
  const id = `person-${Date.now()}-${personIdCounter++}`;
  const now = new Date().toISOString();

  return {
    // Core identity
    id,
    name: 'Test Person',
    createdAt: now,
    updatedAt: now,

    // Status and roles
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,

    // Career
    rank: 'MechWarrior',
    recruitmentDate: new Date(),
    missionsCompleted: 0,
    totalKills: 0,

    // Experience
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,

    // Combat state
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,

    // Skills and attributes
    skills: {},
    attributes: createDefaultAttributes(),
    pilotSkills: { gunnery: 4, piloting: 5 },

    // Apply overrides
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

describe('usePersonnelStore', () => {
  let store: ReturnType<typeof createPersonnelStore>;

  beforeEach(() => {
    personIdCounter = 0;
    localStorageMock.clear();
    store = createPersonnelStore('test-campaign');
    store.getState().clear();
  });

  // ===========================================================================
  // Store Creation
  // ===========================================================================

  describe('Store Creation', () => {
    it('should create store with campaignId', () => {
      const testStore = createPersonnelStore('campaign-001');
      expect(testStore).toBeDefined();
      expect(testStore.getState).toBeDefined();
    });

    it('should initialize with empty Map', () => {
      const state = store.getState();
      expect(state.personnel).toBeInstanceOf(Map);
      expect(state.personnel.size).toBe(0);
    });

    it('should have all expected methods', () => {
      const state = store.getState();
      // CRUD
      expect(typeof state.addPerson).toBe('function');
      expect(typeof state.removePerson).toBe('function');
      expect(typeof state.updatePerson).toBe('function');
      expect(typeof state.getPerson).toBe('function');
      expect(typeof state.getAll).toBe('function');
      expect(typeof state.clear).toBe('function');
      // Queries
      expect(typeof state.getByStatus).toBe('function');
      expect(typeof state.getByRole).toBe('function');
      expect(typeof state.getByUnit).toBe('function');
      expect(typeof state.getActive).toBe('function');
    });
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('addPerson', () => {
      it('should add person to Map', () => {
        const person = createTestPerson({ name: 'John Doe' });
        store.getState().addPerson(person);

        const retrieved = store.getState().getPerson(person.id);
        expect(retrieved).toEqual(person);
        expect(store.getState().personnel.size).toBe(1);
      });

      it('should handle duplicate IDs (overwrites)', () => {
        const person1 = createTestPerson({ id: 'person-1', name: 'First' });
        const person2 = createTestPerson({ id: 'person-1', name: 'Second' });

        store.getState().addPerson(person1);
        store.getState().addPerson(person2);

        const retrieved = store.getState().getPerson('person-1');
        expect(retrieved?.name).toBe('Second');
        expect(store.getState().personnel.size).toBe(1);
      });

      it('should add multiple personnel', () => {
        const person1 = createTestPerson({ name: 'Person 1' });
        const person2 = createTestPerson({ name: 'Person 2' });
        const person3 = createTestPerson({ name: 'Person 3' });

        store.getState().addPerson(person1);
        store.getState().addPerson(person2);
        store.getState().addPerson(person3);

        expect(store.getState().personnel.size).toBe(3);
      });
    });

    describe('removePerson', () => {
      it('should remove person from Map', () => {
        const person = createTestPerson();
        store.getState().addPerson(person);
        expect(store.getState().personnel.size).toBe(1);

        store.getState().removePerson(person.id);
        expect(store.getState().personnel.size).toBe(0);
        expect(store.getState().getPerson(person.id)).toBeUndefined();
      });

      it('should handle non-existent ID (no-op)', () => {
        const person = createTestPerson();
        store.getState().addPerson(person);

        store.getState().removePerson('non-existent-id');
        expect(store.getState().personnel.size).toBe(1);
      });
    });

    describe('updatePerson', () => {
      it('should update existing person', () => {
        const person = createTestPerson({ name: 'Original Name' });
        store.getState().addPerson(person);

        store.getState().updatePerson(person.id, { name: 'Updated Name' });

        const updated = store.getState().getPerson(person.id);
        expect(updated?.name).toBe('Updated Name');
      });

      it('should update updatedAt timestamp', async () => {
        const person = createTestPerson();
        const originalUpdatedAt = person.updatedAt;
        store.getState().addPerson(person);

        // Wait 10ms to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 10));
        store.getState().updatePerson(person.id, { name: 'New Name' });

        const updated = store.getState().getPerson(person.id);
        expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
        expect(updated?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should handle partial updates', () => {
        const person = createTestPerson({
          name: 'John Doe',
          rank: 'Private',
          xp: 100,
        });
        store.getState().addPerson(person);

        store.getState().updatePerson(person.id, { rank: 'Sergeant' });

        const updated = store.getState().getPerson(person.id);
        expect(updated?.name).toBe('John Doe');
        expect(updated?.rank).toBe('Sergeant');
        expect(updated?.xp).toBe(100);
      });

      it('should handle non-existent ID (no-op)', () => {
        const person = createTestPerson();
        store.getState().addPerson(person);

        store.getState().updatePerson('non-existent-id', { name: 'New Name' });

        // Original person unchanged
        const retrieved = store.getState().getPerson(person.id);
        expect(retrieved).toEqual(person);
      });

      it('should update status', () => {
        const person = createTestPerson({ status: PersonnelStatus.ACTIVE });
        store.getState().addPerson(person);

        store.getState().updatePerson(person.id, { status: PersonnelStatus.WOUNDED });

        const updated = store.getState().getPerson(person.id);
        expect(updated?.status).toBe(PersonnelStatus.WOUNDED);
      });
    });

    describe('getPerson', () => {
      it('should return person by ID', () => {
        const person = createTestPerson({ name: 'Test Person' });
        store.getState().addPerson(person);

        const retrieved = store.getState().getPerson(person.id);
        expect(retrieved).toEqual(person);
      });

      it('should return undefined for non-existent ID', () => {
        const retrieved = store.getState().getPerson('non-existent-id');
        expect(retrieved).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('should return all personnel as array', () => {
        const person1 = createTestPerson({ name: 'Person 1' });
        const person2 = createTestPerson({ name: 'Person 2' });

        store.getState().addPerson(person1);
        store.getState().addPerson(person2);

        const all = store.getState().getAll();
        expect(Array.isArray(all)).toBe(true);
        expect(all).toHaveLength(2);
        expect(all).toContainEqual(person1);
        expect(all).toContainEqual(person2);
      });

      it('should return empty array for empty store', () => {
        const all = store.getState().getAll();
        expect(all).toEqual([]);
      });
    });

    describe('clear', () => {
      it('should remove all personnel', () => {
        const person1 = createTestPerson();
        const person2 = createTestPerson();
        const person3 = createTestPerson();

        store.getState().addPerson(person1);
        store.getState().addPerson(person2);
        store.getState().addPerson(person3);

        expect(store.getState().personnel.size).toBe(3);

        store.getState().clear();

        expect(store.getState().personnel.size).toBe(0);
        expect(store.getState().getAll()).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  describe('Query Methods', () => {
    describe('getByStatus', () => {
      it('should filter by status', () => {
        const active1 = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const active2 = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const wounded = createTestPerson({ status: PersonnelStatus.WOUNDED });
        const kia = createTestPerson({ status: PersonnelStatus.KIA });

        store.getState().addPerson(active1);
        store.getState().addPerson(active2);
        store.getState().addPerson(wounded);
        store.getState().addPerson(kia);

        const activePersonnel = store.getState().getByStatus(PersonnelStatus.ACTIVE);
        expect(activePersonnel).toHaveLength(2);
        expect(activePersonnel).toContainEqual(active1);
        expect(activePersonnel).toContainEqual(active2);
      });

      it('should return empty array for no matches', () => {
        const active = createTestPerson({ status: PersonnelStatus.ACTIVE });
        store.getState().addPerson(active);

        const mia = store.getState().getByStatus(PersonnelStatus.MIA);
        expect(mia).toEqual([]);
      });

      it('should filter WOUNDED personnel', () => {
        const wounded1 = createTestPerson({ status: PersonnelStatus.WOUNDED });
        const wounded2 = createTestPerson({ status: PersonnelStatus.WOUNDED });
        const active = createTestPerson({ status: PersonnelStatus.ACTIVE });

        store.getState().addPerson(wounded1);
        store.getState().addPerson(wounded2);
        store.getState().addPerson(active);

        const woundedPersonnel = store.getState().getByStatus(PersonnelStatus.WOUNDED);
        expect(woundedPersonnel).toHaveLength(2);
      });
    });

    describe('getByRole', () => {
      it('should filter by primary role', () => {
        const pilot1 = createTestPerson({ primaryRole: CampaignPersonnelRole.PILOT });
        const pilot2 = createTestPerson({ primaryRole: CampaignPersonnelRole.PILOT });
        const tech = createTestPerson({ primaryRole: CampaignPersonnelRole.TECH });

        store.getState().addPerson(pilot1);
        store.getState().addPerson(pilot2);
        store.getState().addPerson(tech);

        const pilots = store.getState().getByRole(CampaignPersonnelRole.PILOT);
        expect(pilots).toHaveLength(2);
        expect(pilots).toContainEqual(pilot1);
        expect(pilots).toContainEqual(pilot2);
      });

      it('should filter by secondary role', () => {
        const person = createTestPerson({
          primaryRole: CampaignPersonnelRole.PILOT,
          secondaryRole: CampaignPersonnelRole.TECH,
        });

        store.getState().addPerson(person);

        const techs = store.getState().getByRole(CampaignPersonnelRole.TECH);
        expect(techs).toHaveLength(1);
        expect(techs).toContainEqual(person);
      });

      it('should return personnel with either primary or secondary role', () => {
        const primaryPilot = createTestPerson({
          primaryRole: CampaignPersonnelRole.PILOT,
        });
        const secondaryPilot = createTestPerson({
          primaryRole: CampaignPersonnelRole.TECH,
          secondaryRole: CampaignPersonnelRole.PILOT,
        });
        const tech = createTestPerson({
          primaryRole: CampaignPersonnelRole.TECH,
        });

        store.getState().addPerson(primaryPilot);
        store.getState().addPerson(secondaryPilot);
        store.getState().addPerson(tech);

        const pilots = store.getState().getByRole(CampaignPersonnelRole.PILOT);
        expect(pilots).toHaveLength(2);
        expect(pilots).toContainEqual(primaryPilot);
        expect(pilots).toContainEqual(secondaryPilot);
      });

      it('should return empty array for no matches', () => {
        const pilot = createTestPerson({ primaryRole: CampaignPersonnelRole.PILOT });
        store.getState().addPerson(pilot);

        const doctors = store.getState().getByRole(CampaignPersonnelRole.DOCTOR);
        expect(doctors).toEqual([]);
      });
    });

    describe('getByUnit', () => {
      it('should filter by unitId', () => {
        const unit1Person1 = createTestPerson({ unitId: 'unit-1' });
        const unit1Person2 = createTestPerson({ unitId: 'unit-1' });
        const unit2Person = createTestPerson({ unitId: 'unit-2' });

        store.getState().addPerson(unit1Person1);
        store.getState().addPerson(unit1Person2);
        store.getState().addPerson(unit2Person);

        const unit1Personnel = store.getState().getByUnit('unit-1');
        expect(unit1Personnel).toHaveLength(2);
        expect(unit1Personnel).toContainEqual(unit1Person1);
        expect(unit1Personnel).toContainEqual(unit1Person2);
      });

      it('should handle undefined unitId', () => {
        const unassigned1 = createTestPerson({ unitId: undefined });
        const unassigned2 = createTestPerson({ unitId: undefined });
        const assigned = createTestPerson({ unitId: 'unit-1' });

        store.getState().addPerson(unassigned1);
        store.getState().addPerson(unassigned2);
        store.getState().addPerson(assigned);

        // Test undefined unitId (unassigned personnel)
        const unassignedPersonnel = store.getState().getByUnit(undefined!);
        expect(unassignedPersonnel).toHaveLength(2);
      });

      it('should return empty array for no matches', () => {
        const person = createTestPerson({ unitId: 'unit-1' });
        store.getState().addPerson(person);

        const unit2Personnel = store.getState().getByUnit('unit-2');
        expect(unit2Personnel).toEqual([]);
      });
    });

    describe('getActive', () => {
      it('should return only ACTIVE personnel', () => {
        const active1 = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const active2 = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const wounded = createTestPerson({ status: PersonnelStatus.WOUNDED });

        store.getState().addPerson(active1);
        store.getState().addPerson(active2);
        store.getState().addPerson(wounded);

        const activePersonnel = store.getState().getActive();
        expect(activePersonnel).toHaveLength(2);
        expect(activePersonnel).toContainEqual(active1);
        expect(activePersonnel).toContainEqual(active2);
      });

      it('should exclude WOUNDED personnel', () => {
        const active = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const wounded = createTestPerson({ status: PersonnelStatus.WOUNDED });

        store.getState().addPerson(active);
        store.getState().addPerson(wounded);

        const activePersonnel = store.getState().getActive();
        expect(activePersonnel).toHaveLength(1);
        expect(activePersonnel[0]).toEqual(active);
      });

      it('should exclude MIA personnel', () => {
        const active = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const mia = createTestPerson({ status: PersonnelStatus.MIA });

        store.getState().addPerson(active);
        store.getState().addPerson(mia);

        const activePersonnel = store.getState().getActive();
        expect(activePersonnel).toHaveLength(1);
      });

      it('should exclude KIA personnel', () => {
        const active = createTestPerson({ status: PersonnelStatus.ACTIVE });
        const kia = createTestPerson({ status: PersonnelStatus.KIA });

        store.getState().addPerson(active);
        store.getState().addPerson(kia);

        const activePersonnel = store.getState().getActive();
        expect(activePersonnel).toHaveLength(1);
      });
    });

    describe('Query Independence', () => {
      it('should allow multiple filters to work independently', () => {
        const activePilot = createTestPerson({
          status: PersonnelStatus.ACTIVE,
          primaryRole: CampaignPersonnelRole.PILOT,
        });
        const activeTech = createTestPerson({
          status: PersonnelStatus.ACTIVE,
          primaryRole: CampaignPersonnelRole.TECH,
        });
        const woundedPilot = createTestPerson({
          status: PersonnelStatus.WOUNDED,
          primaryRole: CampaignPersonnelRole.PILOT,
        });

        store.getState().addPerson(activePilot);
        store.getState().addPerson(activeTech);
        store.getState().addPerson(woundedPilot);

        const active = store.getState().getActive();
        const pilots = store.getState().getByRole(CampaignPersonnelRole.PILOT);

        expect(active).toHaveLength(2);
        expect(pilots).toHaveLength(2);
      });

      it('should return arrays, not Maps', () => {
        const person = createTestPerson();
        store.getState().addPerson(person);

        const byStatus = store.getState().getByStatus(PersonnelStatus.ACTIVE);
        const byRole = store.getState().getByRole(CampaignPersonnelRole.PILOT);
        const byUnit = store.getState().getByUnit('unit-1');
        const active = store.getState().getActive();

        expect(Array.isArray(byStatus)).toBe(true);
        expect(Array.isArray(byRole)).toBe(true);
        expect(Array.isArray(byUnit)).toBe(true);
        expect(Array.isArray(active)).toBe(true);
      });

      it('should not mutate store when querying', () => {
        const person = createTestPerson();
        store.getState().addPerson(person);

        const sizeBefore = store.getState().personnel.size;

        store.getState().getByStatus(PersonnelStatus.ACTIVE);
        store.getState().getByRole(CampaignPersonnelRole.PILOT);
        store.getState().getActive();

        expect(store.getState().personnel.size).toBe(sizeBefore);
      });
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('Persistence', () => {
    it('should persist to localStorage', () => {
      const person = createTestPerson({ name: 'Persisted Person' });
      store.getState().addPerson(person);

      // Check localStorage was written
      const stored = localStorageMock.getItem('personnel-test-campaign');
      expect(stored).toBeTruthy();
    });

    it('should include campaignId in storage key', () => {
      const store1 = createPersonnelStore('campaign-1');
      const store2 = createPersonnelStore('campaign-2');

      const person1 = createTestPerson({ name: 'Campaign 1 Person' });
      const person2 = createTestPerson({ name: 'Campaign 2 Person' });

      store1.getState().addPerson(person1);
      store2.getState().addPerson(person2);

      const stored1 = localStorageMock.getItem('personnel-campaign-1');
      const stored2 = localStorageMock.getItem('personnel-campaign-2');

      expect(stored1).toBeTruthy();
      expect(stored2).toBeTruthy();
      expect(stored1).not.toBe(stored2);
    });

    it('should serialize Map to array', () => {
      const person = createTestPerson({ name: 'Test Person' });
      store.getState().addPerson(person);

      const stored = localStorageMock.getItem('personnel-test-campaign');
      const parsed = JSON.parse(stored!) as { state?: { personnel?: [string, IPerson][] } };

      expect(parsed.state?.personnel).toBeDefined();
      expect(Array.isArray(parsed.state?.personnel)).toBe(true);
      expect(parsed.state?.personnel).toHaveLength(1);
      expect(parsed.state?.personnel?.[0]).toEqual([person.id, expect.any(Object)]);
    });

    it('should deserialize array to Map', () => {
      const person = createTestPerson({ name: 'Test Person' });
      store.getState().addPerson(person);

      // Create new store instance (simulates page reload)
      const newStore = createPersonnelStore('test-campaign');

      expect(newStore.getState().personnel).toBeInstanceOf(Map);
      expect(newStore.getState().personnel.size).toBe(1);
      
      const retrieved = newStore.getState().getPerson(person.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(person.id);
      expect(retrieved?.name).toBe(person.name);
      // Note: recruitmentDate becomes string after JSON serialization
      expect(typeof retrieved?.recruitmentDate).toBe('string');
    });

    it('should load persisted data correctly', () => {
      const person1 = createTestPerson({ name: 'Person 1' });
      const person2 = createTestPerson({ name: 'Person 2' });

      store.getState().addPerson(person1);
      store.getState().addPerson(person2);

      // Create new store instance
      const newStore = createPersonnelStore('test-campaign');

      expect(newStore.getState().getAll()).toHaveLength(2);
      
      const retrieved1 = newStore.getState().getPerson(person1.id);
      const retrieved2 = newStore.getState().getPerson(person2.id);
      
      expect(retrieved1?.id).toBe(person1.id);
      expect(retrieved1?.name).toBe(person1.name);
      expect(retrieved2?.id).toBe(person2.id);
      expect(retrieved2?.name).toBe(person2.name);
    });

    it('should persist empty Map correctly', () => {
      store.getState().clear();

      const stored = localStorageMock.getItem('personnel-test-campaign');
      const parsed = JSON.parse(stored!) as { state?: { personnel?: [string, IPerson][] } };
      expect(parsed.state?.personnel).toEqual([]);

      // Create new store instance
      const newStore = createPersonnelStore('test-campaign');
      expect(newStore.getState().personnel.size).toBe(0);
    });

    it('should persist large personnel sets', () => {
      // Add 100 personnel
      for (let i = 0; i < 100; i++) {
        const person = createTestPerson({ name: `Person ${i}` });
        store.getState().addPerson(person);
      }

      expect(store.getState().personnel.size).toBe(100);

      // Create new store instance
      const newStore = createPersonnelStore('test-campaign');
      expect(newStore.getState().personnel.size).toBe(100);
    });

    it('should survive store recreation', () => {
      const person = createTestPerson({ name: 'Persistent Person' });
      store.getState().addPerson(person);

      // Recreate store multiple times
      const store2 = createPersonnelStore('test-campaign');
      const retrieved2 = store2.getState().getPerson(person.id);
      expect(retrieved2?.id).toBe(person.id);
      expect(retrieved2?.name).toBe(person.name);

      const store3 = createPersonnelStore('test-campaign');
      const retrieved3 = store3.getState().getPerson(person.id);
      expect(retrieved3?.id).toBe(person.id);
      expect(retrieved3?.name).toBe(person.name);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should return empty array for queries on empty store', () => {
      expect(store.getState().getByStatus(PersonnelStatus.ACTIVE)).toEqual([]);
      expect(store.getState().getByRole(CampaignPersonnelRole.PILOT)).toEqual([]);
      expect(store.getState().getByUnit('unit-1')).toEqual([]);
      expect(store.getState().getActive()).toEqual([]);
    });

    it('should handle large personnel sets efficiently', () => {
      // Add 1000 personnel
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const person = createTestPerson({
          name: `Person ${i}`,
          status: i % 2 === 0 ? PersonnelStatus.ACTIVE : PersonnelStatus.WOUNDED,
        });
        store.getState().addPerson(person);
      }
      const addTime = Date.now() - startTime;

      expect(store.getState().personnel.size).toBe(1000);
      expect(addTime).toBeLessThan(2000); // Should complete in under 2 seconds

      // Query should be fast
      const queryStart = Date.now();
      const active = store.getState().getActive();
      const queryTime = Date.now() - queryStart;

      expect(active).toHaveLength(500);
      expect(queryTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle concurrent updates', () => {
      const person = createTestPerson({ name: 'Original' });
      store.getState().addPerson(person);

      // Simulate concurrent updates
      store.getState().updatePerson(person.id, { name: 'Update 1' });
      store.getState().updatePerson(person.id, { rank: 'Sergeant' });
      store.getState().updatePerson(person.id, { xp: 100 });

      const updated = store.getState().getPerson(person.id);
      expect(updated?.name).toBe('Update 1');
      expect(updated?.rank).toBe('Sergeant');
      expect(updated?.xp).toBe(100);
    });

    it('should handle personnel with complex data', () => {
      const person = createTestPerson({
        name: 'Complex Person',
        injuries: [
          {
            id: 'injury-1',
            type: 'Broken Arm',
            location: 'Left Arm',
            severity: 2,
            daysToHeal: 14,
            permanent: false,
            acquired: new Date(),
          },
        ],
        skills: {
          gunnery: { level: 5, bonus: 1, xpProgress: 50, typeId: 'gunnery' },
          piloting: { level: 4, bonus: 0, xpProgress: 25, typeId: 'piloting' },
        },
        awards: ['award-1', 'award-2', 'award-3'],
      });

      store.getState().addPerson(person);

      const retrieved = store.getState().getPerson(person.id);
      expect(retrieved).toEqual(person);
      expect(retrieved?.injuries).toHaveLength(1);
      expect(retrieved?.awards).toHaveLength(3);
    });

    it('should handle removal during iteration', () => {
      const person1 = createTestPerson();
      const person2 = createTestPerson();
      const person3 = createTestPerson();

      store.getState().addPerson(person1);
      store.getState().addPerson(person2);
      store.getState().addPerson(person3);

      const all = store.getState().getAll();
      expect(all).toHaveLength(3);

      // Remove one person
      store.getState().removePerson(person2.id);

      // Original array unchanged
      expect(all).toHaveLength(3);

      // New query reflects removal
      const newAll = store.getState().getAll();
      expect(newAll).toHaveLength(2);
    });
  });
});
