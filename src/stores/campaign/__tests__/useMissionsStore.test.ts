/**
 * Missions Store Tests
 *
 * Comprehensive test suite for useMissionsStore with CRUD,
 * query methods, scenario management, and persistence coverage.
 */

import { createMissionsStore } from '../useMissionsStore';
import { IMission, IContract, createMission, createContract } from '@/types/campaign/Mission';
import { IScenario, createScenario } from '@/types/campaign/Scenario';
import { MissionStatus } from '@/types/campaign/enums';
import { ScenarioStatus } from '@/types/campaign/enums/ScenarioStatus';

// =============================================================================
// Test Data Helpers
// =============================================================================

let missionIdCounter = 0;
let scenarioIdCounter = 0;

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

const createTestContract = (overrides?: {
  id?: string;
  name?: string;
  employerId?: string;
  targetId?: string;
  status?: MissionStatus;
  systemId?: string;
  description?: string;
}): IContract => {
  return createContract({
    id: overrides?.id ?? `contract-${Date.now()}-${missionIdCounter++}`,
    name: overrides?.name ?? 'Test Contract',
    employerId: overrides?.employerId ?? 'davion',
    targetId: overrides?.targetId ?? 'liao',
    status: overrides?.status,
    systemId: overrides?.systemId,
    description: overrides?.description,
  });
};

const createTestScenario = (overrides?: {
  id?: string;
  name?: string;
  missionId?: string;
  status?: ScenarioStatus;
  terrainType?: string;
}): IScenario => {
  return createScenario({
    id: overrides?.id ?? `scenario-${Date.now()}-${scenarioIdCounter++}`,
    name: overrides?.name ?? 'Test Scenario',
    missionId: overrides?.missionId ?? 'mission-1',
    status: overrides?.status,
    terrainType: overrides?.terrainType,
  });
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
    scenarioIdCounter = 0;
    localStorageMock.clear();
    store = createMissionsStore('test-campaign');
    store.getState().clear();
    store.getState().clearScenarios();
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

    it('should initialize with empty missions Map', () => {
      const state = store.getState();
      expect(state.missions).toBeInstanceOf(Map);
      expect(state.missions.size).toBe(0);
    });

    it('should initialize with empty scenarios Map', () => {
      const state = store.getState();
      expect(state.scenarios).toBeInstanceOf(Map);
      expect(state.scenarios.size).toBe(0);
    });

    it('should have all expected methods', () => {
      const state = store.getState();
      // Mission CRUD
      expect(typeof state.addMission).toBe('function');
      expect(typeof state.removeMission).toBe('function');
      expect(typeof state.updateMission).toBe('function');
      expect(typeof state.getMission).toBe('function');
      expect(typeof state.getAllMissions).toBe('function');
      expect(typeof state.clear).toBe('function');
      // Mission Queries
      expect(typeof state.getActiveMissions).toBe('function');
      expect(typeof state.getCompletedMissions).toBe('function');
      expect(typeof state.getMissionsByStatus).toBe('function');
      expect(typeof state.getActiveContracts).toBe('function');
      expect(typeof state.getContractsByEmployer).toBe('function');
      // Scenario CRUD
      expect(typeof state.addScenario).toBe('function');
      expect(typeof state.removeScenario).toBe('function');
      expect(typeof state.updateScenario).toBe('function');
      expect(typeof state.getScenario).toBe('function');
      expect(typeof state.getScenariosByMission).toBe('function');
      expect(typeof state.clearScenarios).toBe('function');
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
  // Mission Query Methods
  // ===========================================================================

  describe('Mission Query Methods', () => {
    describe('getActiveMissions', () => {
      it('should return only ACTIVE missions', () => {
        const active1 = createTestMission({ name: 'Active 1', status: MissionStatus.ACTIVE });
        const active2 = createTestMission({ name: 'Active 2', status: MissionStatus.ACTIVE });
        const pending = createTestMission({ name: 'Pending', status: MissionStatus.PENDING });
        const success = createTestMission({ name: 'Success', status: MissionStatus.SUCCESS });

        store.getState().addMission(active1);
        store.getState().addMission(active2);
        store.getState().addMission(pending);
        store.getState().addMission(success);

        const result = store.getState().getActiveMissions();
        expect(result).toHaveLength(2);
        expect(result.map((m) => m.name)).toContain('Active 1');
        expect(result.map((m) => m.name)).toContain('Active 2');
      });

      it('should return empty array when no active missions', () => {
        const pending = createTestMission({ status: MissionStatus.PENDING });
        store.getState().addMission(pending);

        expect(store.getState().getActiveMissions()).toEqual([]);
      });
    });

    describe('getCompletedMissions', () => {
      it('should return SUCCESS, PARTIAL, and FAILED missions', () => {
        const success = createTestMission({ name: 'Success', status: MissionStatus.SUCCESS });
        const partial = createTestMission({ name: 'Partial', status: MissionStatus.PARTIAL });
        const failed = createTestMission({ name: 'Failed', status: MissionStatus.FAILED });
        const active = createTestMission({ name: 'Active', status: MissionStatus.ACTIVE });
        const pending = createTestMission({ name: 'Pending', status: MissionStatus.PENDING });

        store.getState().addMission(success);
        store.getState().addMission(partial);
        store.getState().addMission(failed);
        store.getState().addMission(active);
        store.getState().addMission(pending);

        const result = store.getState().getCompletedMissions();
        expect(result).toHaveLength(3);
        expect(result.map((m) => m.name)).toContain('Success');
        expect(result.map((m) => m.name)).toContain('Partial');
        expect(result.map((m) => m.name)).toContain('Failed');
      });

      it('should return empty array when no completed missions', () => {
        const active = createTestMission({ status: MissionStatus.ACTIVE });
        store.getState().addMission(active);

        expect(store.getState().getCompletedMissions()).toEqual([]);
      });
    });

    describe('getMissionsByStatus', () => {
      it('should filter by specific status', () => {
        const pending1 = createTestMission({ name: 'P1', status: MissionStatus.PENDING });
        const pending2 = createTestMission({ name: 'P2', status: MissionStatus.PENDING });
        const active = createTestMission({ name: 'A1', status: MissionStatus.ACTIVE });

        store.getState().addMission(pending1);
        store.getState().addMission(pending2);
        store.getState().addMission(active);

        const result = store.getState().getMissionsByStatus(MissionStatus.PENDING);
        expect(result).toHaveLength(2);
        expect(result.every((m) => m.status === MissionStatus.PENDING)).toBe(true);
      });

      it('should return empty array for status with no matches', () => {
        const active = createTestMission({ status: MissionStatus.ACTIVE });
        store.getState().addMission(active);

        expect(store.getState().getMissionsByStatus(MissionStatus.BREACH)).toEqual([]);
      });

      it('should work with all MissionStatus values', () => {
        const statuses = [
          MissionStatus.ACTIVE,
          MissionStatus.SUCCESS,
          MissionStatus.PARTIAL,
          MissionStatus.FAILED,
          MissionStatus.BREACH,
          MissionStatus.CANCELLED,
          MissionStatus.PENDING,
          MissionStatus.ABORTED,
        ];

        statuses.forEach((status) => {
          const mission = createTestMission({ status });
          store.getState().addMission(mission);
        });

        statuses.forEach((status) => {
          const result = store.getState().getMissionsByStatus(status);
          expect(result).toHaveLength(1);
          expect(result[0].status).toBe(status);
        });
      });
    });

    describe('getActiveContracts', () => {
      it('should return only active contracts (not regular missions)', () => {
        const contract1 = createTestContract({
          name: 'Active Contract',
          status: MissionStatus.ACTIVE,
        });
        const contract2 = createTestContract({
          name: 'Pending Contract',
          status: MissionStatus.PENDING,
        });
        const mission = createTestMission({
          name: 'Active Mission',
          status: MissionStatus.ACTIVE,
        });

        store.getState().addMission(contract1);
        store.getState().addMission(contract2);
        store.getState().addMission(mission);

        const result = store.getState().getActiveContracts();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Active Contract');
        expect(result[0].type).toBe('contract');
      });

      it('should return empty array when no active contracts', () => {
        const pendingContract = createTestContract({ status: MissionStatus.PENDING });
        store.getState().addMission(pendingContract);

        expect(store.getState().getActiveContracts()).toEqual([]);
      });
    });

    describe('getContractsByEmployer', () => {
      it('should return contracts for specific employer', () => {
        const davionContract1 = createTestContract({
          name: 'Davion 1',
          employerId: 'davion',
        });
        const davionContract2 = createTestContract({
          name: 'Davion 2',
          employerId: 'davion',
        });
        const steinerContract = createTestContract({
          name: 'Steiner 1',
          employerId: 'steiner',
        });
        const mission = createTestMission({ name: 'Regular Mission' });

        store.getState().addMission(davionContract1);
        store.getState().addMission(davionContract2);
        store.getState().addMission(steinerContract);
        store.getState().addMission(mission);

        const result = store.getState().getContractsByEmployer('davion');
        expect(result).toHaveLength(2);
        expect(result.every((c) => c.employerId === 'davion')).toBe(true);
      });

      it('should return empty array for unknown employer', () => {
        const contract = createTestContract({ employerId: 'davion' });
        store.getState().addMission(contract);

        expect(store.getState().getContractsByEmployer('unknown')).toEqual([]);
      });

      it('should not return regular missions', () => {
        const mission = createTestMission({ name: 'Regular Mission' });
        store.getState().addMission(mission);

        expect(store.getState().getContractsByEmployer('davion')).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // Scenario CRUD Operations
  // ===========================================================================

  describe('Scenario CRUD Operations', () => {
    describe('addScenario', () => {
      it('should add scenario to Map', () => {
        const scenario = createTestScenario({ name: 'Battle Alpha' });
        store.getState().addScenario(scenario);

        const retrieved = store.getState().getScenario(scenario.id);
        expect(retrieved).toEqual(scenario);
        expect(store.getState().scenarios.size).toBe(1);
      });

      it('should handle duplicate IDs (overwrites)', () => {
        const s1 = createTestScenario({ id: 'scenario-1', name: 'First' });
        const s2 = createTestScenario({ id: 'scenario-1', name: 'Second' });

        store.getState().addScenario(s1);
        store.getState().addScenario(s2);

        const retrieved = store.getState().getScenario('scenario-1');
        expect(retrieved?.name).toBe('Second');
        expect(store.getState().scenarios.size).toBe(1);
      });

      it('should add multiple scenarios', () => {
        const s1 = createTestScenario({ name: 'Scenario 1' });
        const s2 = createTestScenario({ name: 'Scenario 2' });
        const s3 = createTestScenario({ name: 'Scenario 3' });

        store.getState().addScenario(s1);
        store.getState().addScenario(s2);
        store.getState().addScenario(s3);

        expect(store.getState().scenarios.size).toBe(3);
      });
    });

    describe('removeScenario', () => {
      it('should remove scenario from Map', () => {
        const scenario = createTestScenario();
        store.getState().addScenario(scenario);
        expect(store.getState().scenarios.size).toBe(1);

        store.getState().removeScenario(scenario.id);
        expect(store.getState().scenarios.size).toBe(0);
        expect(store.getState().getScenario(scenario.id)).toBeUndefined();
      });

      it('should handle non-existent ID (no-op)', () => {
        const scenario = createTestScenario();
        store.getState().addScenario(scenario);

        store.getState().removeScenario('non-existent-id');
        expect(store.getState().scenarios.size).toBe(1);
      });
    });

    describe('updateScenario', () => {
      it('should update existing scenario', () => {
        const scenario = createTestScenario({ name: 'Original' });
        store.getState().addScenario(scenario);

        store.getState().updateScenario(scenario.id, { name: 'Updated' });

        const updated = store.getState().getScenario(scenario.id);
        expect(updated?.name).toBe('Updated');
      });

      it('should update updatedAt timestamp', async () => {
        const scenario = createTestScenario();
        const originalUpdatedAt = scenario.updatedAt;
        store.getState().addScenario(scenario);

        await new Promise((resolve) => setTimeout(resolve, 10));
        store.getState().updateScenario(scenario.id, { name: 'New Name' });

        const updated = store.getState().getScenario(scenario.id);
        expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
      });

      it('should handle partial updates preserving other fields', () => {
        const scenario = createTestScenario({
          name: 'Battle Alpha',
          terrainType: 'Urban',
          status: ScenarioStatus.PENDING,
        });
        store.getState().addScenario(scenario);

        store.getState().updateScenario(scenario.id, {
          status: ScenarioStatus.CURRENT,
        });

        const updated = store.getState().getScenario(scenario.id);
        expect(updated?.name).toBe('Battle Alpha');
        expect(updated?.terrainType).toBe('Urban');
        expect(updated?.status).toBe(ScenarioStatus.CURRENT);
      });

      it('should handle non-existent ID (no-op)', () => {
        const scenario = createTestScenario();
        store.getState().addScenario(scenario);

        store.getState().updateScenario('non-existent-id', { name: 'New' });

        const retrieved = store.getState().getScenario(scenario.id);
        expect(retrieved).toEqual(scenario);
      });
    });

    describe('getScenario', () => {
      it('should return scenario by ID', () => {
        const scenario = createTestScenario({ name: 'Test Scenario' });
        store.getState().addScenario(scenario);

        const retrieved = store.getState().getScenario(scenario.id);
        expect(retrieved).toEqual(scenario);
      });

      it('should return undefined for non-existent ID', () => {
        expect(store.getState().getScenario('non-existent')).toBeUndefined();
      });
    });

    describe('getScenariosByMission', () => {
      it('should return scenarios for a specific mission', () => {
        const s1 = createTestScenario({ name: 'S1', missionId: 'mission-A' });
        const s2 = createTestScenario({ name: 'S2', missionId: 'mission-A' });
        const s3 = createTestScenario({ name: 'S3', missionId: 'mission-B' });

        store.getState().addScenario(s1);
        store.getState().addScenario(s2);
        store.getState().addScenario(s3);

        const result = store.getState().getScenariosByMission('mission-A');
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.name)).toContain('S1');
        expect(result.map((s) => s.name)).toContain('S2');
      });

      it('should return empty array for mission with no scenarios', () => {
        const scenario = createTestScenario({ missionId: 'mission-A' });
        store.getState().addScenario(scenario);

        expect(store.getState().getScenariosByMission('mission-B')).toEqual([]);
      });

      it('should return empty array when store is empty', () => {
        expect(store.getState().getScenariosByMission('any-mission')).toEqual([]);
      });
    });

    describe('clearScenarios', () => {
      it('should remove all scenarios', () => {
        const s1 = createTestScenario();
        const s2 = createTestScenario();

        store.getState().addScenario(s1);
        store.getState().addScenario(s2);
        expect(store.getState().scenarios.size).toBe(2);

        store.getState().clearScenarios();
        expect(store.getState().scenarios.size).toBe(0);
      });

      it('should not affect missions', () => {
        const mission = createTestMission();
        const scenario = createTestScenario();

        store.getState().addMission(mission);
        store.getState().addScenario(scenario);

        store.getState().clearScenarios();

        expect(store.getState().scenarios.size).toBe(0);
        expect(store.getState().missions.size).toBe(1);
      });
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('Persistence', () => {
    it('should persist missions to localStorage', () => {
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

    it('should serialize missions Map to array', () => {
      const mission = createTestMission({ name: 'Test Mission' });
      store.getState().addMission(mission);

      const stored = localStorageMock.getItem('missions-test-campaign');
      const parsed = JSON.parse(stored!) as {
        state?: { missions?: [string, IMission][]; scenarios?: [string, IScenario][] };
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

    it('should persist scenarios to localStorage', () => {
      const scenario = createTestScenario({ name: 'Persisted Scenario' });
      store.getState().addScenario(scenario);

      const stored = localStorageMock.getItem('missions-test-campaign');
      const parsed = JSON.parse(stored!) as {
        state?: { scenarios?: [string, IScenario][] };
      };

      expect(parsed.state?.scenarios).toBeDefined();
      expect(Array.isArray(parsed.state?.scenarios)).toBe(true);
      expect(parsed.state?.scenarios).toHaveLength(1);
    });

    it('should deserialize scenarios on reload', () => {
      const scenario = createTestScenario({ name: 'Persisted Scenario' });
      store.getState().addScenario(scenario);

      const newStore = createMissionsStore('test-campaign');

      expect(newStore.getState().scenarios).toBeInstanceOf(Map);
      expect(newStore.getState().scenarios.size).toBe(1);

      const retrieved = newStore.getState().getScenario(scenario.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Persisted Scenario');
    });

    it('should persist both missions and scenarios together', () => {
      const mission = createTestMission({ name: 'Mission' });
      const scenario = createTestScenario({ name: 'Scenario', missionId: mission.id });

      store.getState().addMission(mission);
      store.getState().addScenario(scenario);

      const newStore = createMissionsStore('test-campaign');

      expect(newStore.getState().missions.size).toBe(1);
      expect(newStore.getState().scenarios.size).toBe(1);
      expect(newStore.getState().getMission(mission.id)?.name).toBe('Mission');
      expect(newStore.getState().getScenario(scenario.id)?.name).toBe('Scenario');
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

    it('should store contracts alongside missions', () => {
      const mission = createTestMission({ name: 'Regular Mission' });
      const contract = createTestContract({ name: 'Garrison Duty' });

      store.getState().addMission(mission);
      store.getState().addMission(contract);

      expect(store.getState().missions.size).toBe(2);
      expect(store.getState().getAllMissions()).toHaveLength(2);

      const retrieved = store.getState().getMission(contract.id);
      expect(retrieved?.type).toBe('contract');
    });

    it('should clear missions without affecting scenarios', () => {
      const mission = createTestMission();
      const scenario = createTestScenario();

      store.getState().addMission(mission);
      store.getState().addScenario(scenario);

      store.getState().clear();

      expect(store.getState().missions.size).toBe(0);
      expect(store.getState().scenarios.size).toBe(1);
    });

    it('should handle scenario status transitions', () => {
      const scenario = createTestScenario({ status: ScenarioStatus.PENDING });
      store.getState().addScenario(scenario);

      store.getState().updateScenario(scenario.id, {
        status: ScenarioStatus.CURRENT,
      });
      expect(store.getState().getScenario(scenario.id)?.status).toBe(
        ScenarioStatus.CURRENT
      );

      store.getState().updateScenario(scenario.id, {
        status: ScenarioStatus.VICTORY,
      });
      expect(store.getState().getScenario(scenario.id)?.status).toBe(
        ScenarioStatus.VICTORY
      );
    });
  });
});
