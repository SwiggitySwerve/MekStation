/**
 * Missions Store Tests
 *
 * Comprehensive test suite for useMissionsStore with CRUD,
 * persistence, and Map serialization coverage.
 */

import { createMissionsStore } from '../useMissionsStore';
import { IMission, createMission } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums';

// =============================================================================
// Test Data Helpers
// =============================================================================

let missionIdCounter = 0;

const createTestMission = (overrides?: Partial<IMission>): IMission => {
  const id = `mission-${Date.now()}-${missionIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    name: 'Test Mission',
    status: MissionStatus.PENDING,
    type: 'mission',
    systemId: 'Unknown System',
    scenarioIds: [],
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

describe('useMissionsStore', () => {
  let store: ReturnType<typeof createMissionsStore>;

  beforeEach(() => {
    missionIdCounter = 0;
    localStorageMock.clear();
    store = createMissionsStore('test-campaign');
    store.getState().clear();
  });

  // ===========================================================================
  // Store Creation
  // ===========================================================================

  describe('Store Creation', () => {
    it('should create store with campaignId', () => {
      const testStore = createMissionsStore('campaign-001');
      expect(testStore).toBeDefined();
      expect(testStore.getState).toBeDefined();
    });

    it('should initialize with empty Map', () => {
      const state = store.getState();
      expect(state.missions).toBeInstanceOf(Map);
      expect(state.missions.size).toBe(0);
    });

    it('should have all expected methods', () => {
      const state = store.getState();
      // CRUD
      expect(typeof state.addMission).toBe('function');
      expect(typeof state.removeMission).toBe('function');
      expect(typeof state.updateMission).toBe('function');
      expect(typeof state.getMission).toBe('function');
      expect(typeof state.getAllMissions).toBe('function');
      expect(typeof state.clear).toBe('function');
    });
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('addMission', () => {
      it('should add mission to Map', () => {
        const mission = createTestMission({ name: 'Raid Mission' });
        store.getState().addMission(mission);

        const retrieved = store.getState().getMission(mission.id);
        expect(retrieved).toEqual(mission);
        expect(store.getState().missions.size).toBe(1);
      });

      it('should handle duplicate IDs (overwrites)', () => {
        const mission1 = createTestMission({ id: 'mission-1', name: 'First' });
        const mission2 = createTestMission({ id: 'mission-1', name: 'Second' });

        store.getState().addMission(mission1);
        store.getState().addMission(mission2);

        const retrieved = store.getState().getMission('mission-1');
        expect(retrieved?.name).toBe('Second');
        expect(store.getState().missions.size).toBe(1);
      });

      it('should add multiple missions', () => {
        const mission1 = createTestMission({ name: 'Mission 1' });
        const mission2 = createTestMission({ name: 'Mission 2' });
        const mission3 = createTestMission({ name: 'Mission 3' });

        store.getState().addMission(mission1);
        store.getState().addMission(mission2);
        store.getState().addMission(mission3);

        expect(store.getState().missions.size).toBe(3);
      });
    });

    describe('removeMission', () => {
      it('should remove mission from Map', () => {
        const mission = createTestMission();
        store.getState().addMission(mission);
        expect(store.getState().missions.size).toBe(1);

        store.getState().removeMission(mission.id);
        expect(store.getState().missions.size).toBe(0);
        expect(store.getState().getMission(mission.id)).toBeUndefined();
      });

      it('should handle non-existent ID (no-op)', () => {
        const mission = createTestMission();
        store.getState().addMission(mission);

        store.getState().removeMission('non-existent-id');
        expect(store.getState().missions.size).toBe(1);
      });
    });

    describe('updateMission', () => {
      it('should update existing mission', () => {
        const mission = createTestMission({ name: 'Original Name' });
        store.getState().addMission(mission);

        store.getState().updateMission(mission.id, { name: 'Updated Name' });

        const updated = store.getState().getMission(mission.id);
        expect(updated?.name).toBe('Updated Name');
      });

      it('should update updatedAt timestamp', async () => {
        const mission = createTestMission();
        const originalUpdatedAt = mission.updatedAt;
        store.getState().addMission(mission);

        // Wait 10ms to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 10));
        store.getState().updateMission(mission.id, { name: 'New Name' });

        const updated = store.getState().getMission(mission.id);
        expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
        expect(updated?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should handle partial updates', () => {
        const mission = createTestMission({
          name: 'Raid Mission',
          status: MissionStatus.PENDING,
          description: 'A raid mission',
        });
        store.getState().addMission(mission);

        store.getState().updateMission(mission.id, {
          status: MissionStatus.ACTIVE,
        });

        const updated = store.getState().getMission(mission.id);
        expect(updated?.name).toBe('Raid Mission');
        expect(updated?.status).toBe(MissionStatus.ACTIVE);
        expect(updated?.description).toBe('A raid mission');
      });

      it('should handle non-existent ID (no-op)', () => {
        const mission = createTestMission();
        store.getState().addMission(mission);

        store.getState().updateMission('non-existent-id', { name: 'New Name' });

        // Original mission unchanged
        const retrieved = store.getState().getMission(mission.id);
        expect(retrieved).toEqual(mission);
      });

      it('should update status', () => {
        const mission = createTestMission({ status: MissionStatus.PENDING });
        store.getState().addMission(mission);

        store.getState().updateMission(mission.id, {
          status: MissionStatus.SUCCESS,
        });

        const updated = store.getState().getMission(mission.id);
        expect(updated?.status).toBe(MissionStatus.SUCCESS);
      });
    });

    describe('getMission', () => {
      it('should return mission by ID', () => {
        const mission = createTestMission({ name: 'Test Mission' });
        store.getState().addMission(mission);

        const retrieved = store.getState().getMission(mission.id);
        expect(retrieved).toEqual(mission);
      });

      it('should return undefined for non-existent ID', () => {
        const retrieved = store.getState().getMission('non-existent-id');
        expect(retrieved).toBeUndefined();
      });
    });

    describe('getAllMissions', () => {
      it('should return all missions as array', () => {
        const mission1 = createTestMission({ name: 'Mission 1' });
        const mission2 = createTestMission({ name: 'Mission 2' });

        store.getState().addMission(mission1);
        store.getState().addMission(mission2);

        const all = store.getState().getAllMissions();
        expect(Array.isArray(all)).toBe(true);
        expect(all).toHaveLength(2);
        expect(all).toContainEqual(mission1);
        expect(all).toContainEqual(mission2);
      });

      it('should return empty array for empty store', () => {
        const all = store.getState().getAllMissions();
        expect(all).toEqual([]);
      });
    });

    describe('clear', () => {
      it('should remove all missions', () => {
        const mission1 = createTestMission();
        const mission2 = createTestMission();
        const mission3 = createTestMission();

        store.getState().addMission(mission1);
        store.getState().addMission(mission2);
        store.getState().addMission(mission3);

        expect(store.getState().missions.size).toBe(3);

        store.getState().clear();

        expect(store.getState().missions.size).toBe(0);
        expect(store.getState().getAllMissions()).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('Persistence', () => {
    it('should persist to localStorage', () => {
      const mission = createTestMission({ name: 'Persisted Mission' });
      store.getState().addMission(mission);

      // Check localStorage was written
      const stored = localStorageMock.getItem('missions-test-campaign');
      expect(stored).toBeTruthy();
    });

    it('should include campaignId in storage key', () => {
      const store1 = createMissionsStore('campaign-1');
      const store2 = createMissionsStore('campaign-2');

      const mission1 = createTestMission({ name: 'Campaign 1 Mission' });
      const mission2 = createTestMission({ name: 'Campaign 2 Mission' });

      store1.getState().addMission(mission1);
      store2.getState().addMission(mission2);

      const stored1 = localStorageMock.getItem('missions-campaign-1');
      const stored2 = localStorageMock.getItem('missions-campaign-2');

      expect(stored1).toBeTruthy();
      expect(stored2).toBeTruthy();
      expect(stored1).not.toBe(stored2);
    });

    it('should serialize Map to array', () => {
      const mission = createTestMission({ name: 'Test Mission' });
      store.getState().addMission(mission);

      const stored = localStorageMock.getItem('missions-test-campaign');
      const parsed = JSON.parse(stored!) as {
        state?: { missions?: [string, IMission][] };
      };

      expect(parsed.state?.missions).toBeDefined();
      expect(Array.isArray(parsed.state?.missions)).toBe(true);
      expect(parsed.state?.missions).toHaveLength(1);
      expect(parsed.state?.missions?.[0]).toEqual([
        mission.id,
        expect.any(Object),
      ]);
    });

    it('should deserialize array to Map', () => {
      const mission = createTestMission({ name: 'Test Mission' });
      store.getState().addMission(mission);

      // Create new store instance (simulates page reload)
      const newStore = createMissionsStore('test-campaign');

      expect(newStore.getState().missions).toBeInstanceOf(Map);
      expect(newStore.getState().missions.size).toBe(1);

      const retrieved = newStore.getState().getMission(mission.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mission.id);
      expect(retrieved?.name).toBe(mission.name);
    });

    it('should load persisted data correctly', () => {
      const mission1 = createTestMission({ name: 'Mission 1' });
      const mission2 = createTestMission({ name: 'Mission 2' });

      store.getState().addMission(mission1);
      store.getState().addMission(mission2);

      // Create new store instance
      const newStore = createMissionsStore('test-campaign');

      expect(newStore.getState().getAllMissions()).toHaveLength(2);

      const retrieved1 = newStore.getState().getMission(mission1.id);
      const retrieved2 = newStore.getState().getMission(mission2.id);

      expect(retrieved1?.id).toBe(mission1.id);
      expect(retrieved1?.name).toBe(mission1.name);
      expect(retrieved2?.id).toBe(mission2.id);
      expect(retrieved2?.name).toBe(mission2.name);
    });

    it('should persist empty Map correctly', () => {
      store.getState().clear();

      const stored = localStorageMock.getItem('missions-test-campaign');
      const parsed = JSON.parse(stored!) as {
        state?: { missions?: [string, IMission][] };
      };
      expect(parsed.state?.missions).toEqual([]);

      // Create new store instance
      const newStore = createMissionsStore('test-campaign');
      expect(newStore.getState().missions.size).toBe(0);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle mission with all optional fields', () => {
      const mission = createTestMission({
        name: 'Full Mission',
        status: MissionStatus.ACTIVE,
        description: 'A detailed mission description',
        startDate: '3025-06-15',
        endDate: '3025-06-30',
        briefing: 'Mission briefing text',
      });

      store.getState().addMission(mission);

      const retrieved = store.getState().getMission(mission.id);
      expect(retrieved?.description).toBe('A detailed mission description');
      expect(retrieved?.startDate).toBe('3025-06-15');
      expect(retrieved?.briefing).toBe('Mission briefing text');
    });

    it('should handle mission status transitions', () => {
      const mission = createTestMission({ status: MissionStatus.PENDING });
      store.getState().addMission(mission);

      // Pending -> Active
      store.getState().updateMission(mission.id, {
        status: MissionStatus.ACTIVE,
      });
      expect(store.getState().getMission(mission.id)?.status).toBe(
        MissionStatus.ACTIVE
      );

      // Active -> Success
      store.getState().updateMission(mission.id, {
        status: MissionStatus.SUCCESS,
      });
      expect(store.getState().getMission(mission.id)?.status).toBe(
        MissionStatus.SUCCESS
      );
    });

    it('should use createMission factory function', () => {
      const mission = createMission({
        id: 'factory-mission',
        name: 'Factory Created Mission',
        status: MissionStatus.ACTIVE,
      });

      store.getState().addMission(mission);

      const retrieved = store.getState().getMission('factory-mission');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Factory Created Mission');
      expect(retrieved?.status).toBe(MissionStatus.ACTIVE);
      expect(retrieved?.createdAt).toBeDefined();
      expect(retrieved?.updatedAt).toBeDefined();
    });
  });
});
