/**
 * Scenario.test.ts - Comprehensive tests for Scenario and Objective entities
 *
 * Tests cover:
 * - IScenario interface structure (10+ tests)
 * - IObjective interface structure (5+ tests)
 * - Helper functions (10+ tests)
 * - Type guards (5+ tests)
 * - Factory functions (5+ tests)
 */

import {
  IScenario,
  IObjective,
  ObjectiveType,
  isScenarioComplete,
  isScenarioSuccess,
  getRequiredObjectives,
  getOptionalObjectives,
  getCompletedObjectives,
  getObjectiveCompletionPercent,
  getDeployedForceCount,
  hasDeployedForces,
  hasObjectives,
  isScenarioPending,
  isScenarioActive,
  isObjective,
  isScenario,
  createObjective,
  createScenario,
} from '../Scenario';
import { ScenarioStatus } from '../enums/ScenarioStatus';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestObjective(overrides?: Partial<IObjective>): IObjective {
  return {
    id: 'obj-001',
    description: 'Destroy enemy command lance',
    type: 'Destroy',
    completed: false,
    required: true,
    ...overrides,
  };
}

function createTestScenario(overrides?: Partial<IScenario>): IScenario {
  return {
    id: 'scenario-001',
    name: 'Supply Depot Raid',
    status: ScenarioStatus.PENDING,
    missionId: 'mission-001',
    deployedForceIds: [],
    objectives: [],
    terrainType: 'Urban',
    mapSize: { width: 30, height: 20 },
    opponentForceDescription: 'One lance of medium mechs',
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// IObjective Interface Tests
// =============================================================================

describe('Scenario System', () => {
  describe('IObjective Interface', () => {
    it('should have all required fields', () => {
      const obj = createTestObjective();

      expect(obj.id).toBe('obj-001');
      expect(obj.description).toBe('Destroy enemy command lance');
      expect(obj.type).toBe('Destroy');
      expect(obj.completed).toBe(false);
      expect(obj.required).toBe(true);
    });

    it('should support all objective types', () => {
      const types: ObjectiveType[] = [
        'Destroy',
        'Capture',
        'Defend',
        'Escort',
        'Recon',
        'Withdraw',
        'Custom',
      ];

      types.forEach((type) => {
        const obj = createTestObjective({ type });
        expect(obj.type).toBe(type);
      });
    });

    it('should support completed state', () => {
      const obj = createTestObjective({ completed: true });
      expect(obj.completed).toBe(true);
    });

    it('should support optional objectives', () => {
      const obj = createTestObjective({ required: false });
      expect(obj.required).toBe(false);
    });

    it('should support custom descriptions', () => {
      const obj = createTestObjective({
        description: 'Hold position for 10 turns',
      });
      expect(obj.description).toBe('Hold position for 10 turns');
    });
  });

  // ===========================================================================
  // IScenario Interface Tests
  // ===========================================================================

  describe('IScenario Interface', () => {
    it('should have all required fields', () => {
      const scenario = createTestScenario();

      expect(scenario.id).toBe('scenario-001');
      expect(scenario.name).toBe('Supply Depot Raid');
      expect(scenario.status).toBe(ScenarioStatus.PENDING);
      expect(scenario.missionId).toBe('mission-001');
      expect(scenario.deployedForceIds).toEqual([]);
      expect(scenario.objectives).toEqual([]);
      expect(scenario.terrainType).toBe('Urban');
      expect(scenario.mapSize).toEqual({ width: 30, height: 20 });
      expect(scenario.opponentForceDescription).toBe('One lance of medium mechs');
      expect(scenario.createdAt).toBe('2026-01-26T10:00:00Z');
      expect(scenario.updatedAt).toBe('2026-01-26T10:00:00Z');
    });

    it('should support optional date', () => {
      const scenario = createTestScenario({ date: '3025-06-20' });
      expect(scenario.date).toBe('3025-06-20');
    });

    it('should support optional report', () => {
      const scenario = createTestScenario({ report: 'After-action report...' });
      expect(scenario.report).toBe('After-action report...');
    });

    it('should support deployed force IDs', () => {
      const scenario = createTestScenario({
        deployedForceIds: ['force-alpha', 'force-bravo'],
      });
      expect(scenario.deployedForceIds).toHaveLength(2);
      expect(scenario.deployedForceIds).toContain('force-alpha');
    });

    it('should support objectives array', () => {
      const obj1 = createTestObjective({ id: 'obj-1' });
      const obj2 = createTestObjective({ id: 'obj-2', required: false });
      const scenario = createTestScenario({ objectives: [obj1, obj2] });

      expect(scenario.objectives).toHaveLength(2);
    });

    it('should support all scenario statuses', () => {
      const statuses = [
        ScenarioStatus.CURRENT,
        ScenarioStatus.VICTORY,
        ScenarioStatus.DEFEAT,
        ScenarioStatus.DRAW,
        ScenarioStatus.PENDING,
        ScenarioStatus.CANCELLED,
        ScenarioStatus.PAUSED,
        ScenarioStatus.MIXED,
      ];

      statuses.forEach((status) => {
        const scenario = createTestScenario({ status });
        expect(scenario.status).toBe(status);
      });
    });

    it('should support various terrain types', () => {
      const terrains = ['Urban', 'Forest', 'Desert', 'Plains', 'Mountain', 'Swamp'];
      terrains.forEach((terrain) => {
        const scenario = createTestScenario({ terrainType: terrain });
        expect(scenario.terrainType).toBe(terrain);
      });
    });

    it('should support custom map sizes', () => {
      const scenario = createTestScenario({
        mapSize: { width: 50, height: 40 },
      });
      expect(scenario.mapSize.width).toBe(50);
      expect(scenario.mapSize.height).toBe(40);
    });

    it('should have undefined optional fields by default', () => {
      const scenario = createTestScenario();
      expect(scenario.date).toBeUndefined();
      expect(scenario.report).toBeUndefined();
    });

    it('should store mission reference', () => {
      const scenario = createTestScenario({ missionId: 'mission-042' });
      expect(scenario.missionId).toBe('mission-042');
    });
  });

  // ===========================================================================
  // Helper Functions Tests
  // ===========================================================================

  describe('Helper Functions', () => {
    describe('isScenarioComplete', () => {
      it('should return true for Victory status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.VICTORY });
        expect(isScenarioComplete(scenario)).toBe(true);
      });

      it('should return true for Defeat status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.DEFEAT });
        expect(isScenarioComplete(scenario)).toBe(true);
      });

      it('should return true for Draw status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.DRAW });
        expect(isScenarioComplete(scenario)).toBe(true);
      });

      it('should return true for Cancelled status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.CANCELLED });
        expect(isScenarioComplete(scenario)).toBe(true);
      });

      it('should return true for Mixed status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.MIXED });
        expect(isScenarioComplete(scenario)).toBe(true);
      });

      it('should return false for Current status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.CURRENT });
        expect(isScenarioComplete(scenario)).toBe(false);
      });

      it('should return false for Pending status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.PENDING });
        expect(isScenarioComplete(scenario)).toBe(false);
      });

      it('should return false for Paused status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.PAUSED });
        expect(isScenarioComplete(scenario)).toBe(false);
      });
    });

    describe('isScenarioSuccess', () => {
      it('should return true when all required objectives are completed', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: true, completed: true }),
            createTestObjective({ id: 'obj-2', required: true, completed: true }),
          ],
        });
        expect(isScenarioSuccess(scenario)).toBe(true);
      });

      it('should return false when some required objectives are incomplete', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: true, completed: true }),
            createTestObjective({ id: 'obj-2', required: true, completed: false }),
          ],
        });
        expect(isScenarioSuccess(scenario)).toBe(false);
      });

      it('should ignore optional objectives', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: true, completed: true }),
            createTestObjective({ id: 'obj-2', required: false, completed: false }),
          ],
        });
        expect(isScenarioSuccess(scenario)).toBe(true);
      });

      it('should return true for Victory status when no required objectives', () => {
        const scenario = createTestScenario({
          status: ScenarioStatus.VICTORY,
          objectives: [],
        });
        expect(isScenarioSuccess(scenario)).toBe(true);
      });

      it('should return false for non-Victory status when no required objectives', () => {
        const scenario = createTestScenario({
          status: ScenarioStatus.DEFEAT,
          objectives: [],
        });
        expect(isScenarioSuccess(scenario)).toBe(false);
      });

      it('should return false when all required objectives are incomplete', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: true, completed: false }),
            createTestObjective({ id: 'obj-2', required: true, completed: false }),
          ],
        });
        expect(isScenarioSuccess(scenario)).toBe(false);
      });
    });

    describe('getRequiredObjectives', () => {
      it('should return only required objectives', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: true }),
            createTestObjective({ id: 'obj-2', required: false }),
            createTestObjective({ id: 'obj-3', required: true }),
          ],
        });
        const required = getRequiredObjectives(scenario);
        expect(required).toHaveLength(2);
        expect(required.map((o) => o.id)).toEqual(['obj-1', 'obj-3']);
      });

      it('should return empty array when no required objectives', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: false }),
          ],
        });
        expect(getRequiredObjectives(scenario)).toHaveLength(0);
      });
    });

    describe('getOptionalObjectives', () => {
      it('should return only optional objectives', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', required: true }),
            createTestObjective({ id: 'obj-2', required: false }),
          ],
        });
        const optional = getOptionalObjectives(scenario);
        expect(optional).toHaveLength(1);
        expect(optional[0].id).toBe('obj-2');
      });
    });

    describe('getCompletedObjectives', () => {
      it('should return only completed objectives', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', completed: true }),
            createTestObjective({ id: 'obj-2', completed: false }),
            createTestObjective({ id: 'obj-3', completed: true }),
          ],
        });
        const completed = getCompletedObjectives(scenario);
        expect(completed).toHaveLength(2);
      });
    });

    describe('getObjectiveCompletionPercent', () => {
      it('should return 100 for all completed', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', completed: true }),
            createTestObjective({ id: 'obj-2', completed: true }),
          ],
        });
        expect(getObjectiveCompletionPercent(scenario)).toBe(100);
      });

      it('should return 0 for none completed', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', completed: false }),
            createTestObjective({ id: 'obj-2', completed: false }),
          ],
        });
        expect(getObjectiveCompletionPercent(scenario)).toBe(0);
      });

      it('should return 50 for half completed', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', completed: true }),
            createTestObjective({ id: 'obj-2', completed: false }),
          ],
        });
        expect(getObjectiveCompletionPercent(scenario)).toBe(50);
      });

      it('should return 100 for no objectives', () => {
        const scenario = createTestScenario({ objectives: [] });
        expect(getObjectiveCompletionPercent(scenario)).toBe(100);
      });

      it('should round to nearest integer', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({ id: 'obj-1', completed: true }),
            createTestObjective({ id: 'obj-2', completed: false }),
            createTestObjective({ id: 'obj-3', completed: false }),
          ],
        });
        expect(getObjectiveCompletionPercent(scenario)).toBe(33);
      });
    });

    describe('getDeployedForceCount', () => {
      it('should return number of deployed forces', () => {
        const scenario = createTestScenario({
          deployedForceIds: ['force-1', 'force-2', 'force-3'],
        });
        expect(getDeployedForceCount(scenario)).toBe(3);
      });

      it('should return 0 for no deployed forces', () => {
        const scenario = createTestScenario({ deployedForceIds: [] });
        expect(getDeployedForceCount(scenario)).toBe(0);
      });
    });

    describe('hasDeployedForces', () => {
      it('should return true when forces are deployed', () => {
        const scenario = createTestScenario({
          deployedForceIds: ['force-1'],
        });
        expect(hasDeployedForces(scenario)).toBe(true);
      });

      it('should return false when no forces deployed', () => {
        const scenario = createTestScenario({ deployedForceIds: [] });
        expect(hasDeployedForces(scenario)).toBe(false);
      });
    });

    describe('hasObjectives', () => {
      it('should return true when objectives exist', () => {
        const scenario = createTestScenario({
          objectives: [createTestObjective()],
        });
        expect(hasObjectives(scenario)).toBe(true);
      });

      it('should return false when no objectives', () => {
        const scenario = createTestScenario({ objectives: [] });
        expect(hasObjectives(scenario)).toBe(false);
      });
    });

    describe('isScenarioPending', () => {
      it('should return true for Pending status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.PENDING });
        expect(isScenarioPending(scenario)).toBe(true);
      });

      it('should return false for non-Pending status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.CURRENT });
        expect(isScenarioPending(scenario)).toBe(false);
      });
    });

    describe('isScenarioActive', () => {
      it('should return true for Current status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.CURRENT });
        expect(isScenarioActive(scenario)).toBe(true);
      });

      it('should return false for non-Current status', () => {
        const scenario = createTestScenario({ status: ScenarioStatus.PENDING });
        expect(isScenarioActive(scenario)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Type Guards Tests
  // ===========================================================================

  describe('Type Guards', () => {
    describe('isObjective', () => {
      it('should return true for valid objective', () => {
        const obj = createTestObjective();
        expect(isObjective(obj)).toBe(true);
      });

      it('should return false for null', () => {
        expect(isObjective(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isObjective(undefined)).toBe(false);
      });

      it('should return false for empty object', () => {
        expect(isObjective({})).toBe(false);
      });

      it('should return false for missing required fields', () => {
        expect(isObjective({ id: 'test', description: 'Test' })).toBe(false);
      });

      it('should return false for wrong field types', () => {
        expect(
          isObjective({
            id: 123,
            description: 'Test',
            type: 'Destroy',
            completed: false,
            required: true,
          })
        ).toBe(false);
      });
    });

    describe('isScenario', () => {
      it('should return true for valid scenario', () => {
        const scenario = createTestScenario();
        expect(isScenario(scenario)).toBe(true);
      });

      it('should return false for null', () => {
        expect(isScenario(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isScenario(undefined)).toBe(false);
      });

      it('should return false for empty object', () => {
        expect(isScenario({})).toBe(false);
      });

      it('should return false for missing required fields', () => {
        expect(isScenario({ id: 'test', name: 'Test' })).toBe(false);
      });

      it('should return false for missing mapSize', () => {
        const invalid = { ...createTestScenario() };
        (invalid as Record<string, unknown>).mapSize = null;
        expect(isScenario(invalid)).toBe(false);
      });

      it('should return false for non-string id', () => {
        const invalid = { ...createTestScenario(), id: 123 };
        expect(isScenario(invalid)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Factory Functions Tests
  // ===========================================================================

  describe('Factory Functions', () => {
    describe('createObjective', () => {
      it('should create objective with required fields', () => {
        const obj = createObjective({
          id: 'obj-001',
          description: 'Destroy enemy lance',
        });

        expect(obj.id).toBe('obj-001');
        expect(obj.description).toBe('Destroy enemy lance');
        expect(obj.type).toBe('Custom');
        expect(obj.completed).toBe(false);
        expect(obj.required).toBe(true);
      });

      it('should accept optional fields', () => {
        const obj = createObjective({
          id: 'obj-001',
          description: 'Capture base',
          type: 'Capture',
          completed: true,
          required: false,
        });

        expect(obj.type).toBe('Capture');
        expect(obj.completed).toBe(true);
        expect(obj.required).toBe(false);
      });

      it('should pass type guard', () => {
        const obj = createObjective({
          id: 'obj-001',
          description: 'Test',
        });
        expect(isObjective(obj)).toBe(true);
      });
    });

    describe('createScenario', () => {
      it('should create scenario with required fields', () => {
        const scenario = createScenario({
          id: 'scenario-001',
          name: 'Supply Depot Raid',
          missionId: 'mission-001',
        });

        expect(scenario.id).toBe('scenario-001');
        expect(scenario.name).toBe('Supply Depot Raid');
        expect(scenario.missionId).toBe('mission-001');
        expect(scenario.status).toBe(ScenarioStatus.PENDING);
        expect(scenario.deployedForceIds).toEqual([]);
        expect(scenario.objectives).toEqual([]);
        expect(scenario.terrainType).toBe('Plains');
        expect(scenario.mapSize).toEqual({ width: 30, height: 20 });
        expect(scenario.opponentForceDescription).toBe('Unknown forces');
      });

      it('should set timestamps', () => {
        const before = new Date().toISOString();
        const scenario = createScenario({
          id: 'test',
          name: 'Test',
          missionId: 'mission-001',
        });
        const after = new Date().toISOString();

        expect(scenario.createdAt >= before).toBe(true);
        expect(scenario.createdAt <= after).toBe(true);
        expect(scenario.updatedAt).toBe(scenario.createdAt);
      });

      it('should accept optional fields', () => {
        const obj = createObjective({ id: 'obj-1', description: 'Test' });
        const scenario = createScenario({
          id: 'scenario-001',
          name: 'Test',
          missionId: 'mission-001',
          status: ScenarioStatus.CURRENT,
          deployedForceIds: ['force-1'],
          objectives: [obj],
          terrainType: 'Desert',
          mapSize: { width: 50, height: 40 },
          opponentForceDescription: 'Heavy lance',
          date: '3025-06-20',
          report: 'After-action report',
        });

        expect(scenario.status).toBe(ScenarioStatus.CURRENT);
        expect(scenario.deployedForceIds).toEqual(['force-1']);
        expect(scenario.objectives).toHaveLength(1);
        expect(scenario.terrainType).toBe('Desert');
        expect(scenario.mapSize).toEqual({ width: 50, height: 40 });
        expect(scenario.opponentForceDescription).toBe('Heavy lance');
        expect(scenario.date).toBe('3025-06-20');
        expect(scenario.report).toBe('After-action report');
      });

      it('should pass type guard', () => {
        const scenario = createScenario({
          id: 'test',
          name: 'Test',
          missionId: 'mission-001',
        });
        expect(isScenario(scenario)).toBe(true);
      });

      it('should create independent instances', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'm1' });
        const s2 = createScenario({ id: 's2', name: 'S2', missionId: 'm1' });

        expect(s1).not.toBe(s2);
        expect(s1.id).not.toBe(s2.id);
      });
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should handle complete scenario workflow', () => {
      // Create scenario with objectives
      const scenario = createTestScenario({
        status: ScenarioStatus.CURRENT,
        deployedForceIds: ['force-alpha', 'force-bravo'],
        objectives: [
          createTestObjective({ id: 'obj-1', required: true, completed: false }),
          createTestObjective({ id: 'obj-2', required: true, completed: false }),
          createTestObjective({ id: 'obj-3', required: false, completed: false }),
        ],
      });

      // Check initial state
      expect(isScenarioComplete(scenario)).toBe(false);
      expect(isScenarioSuccess(scenario)).toBe(false);
      expect(getRequiredObjectives(scenario)).toHaveLength(2);
      expect(getOptionalObjectives(scenario)).toHaveLength(1);
      expect(getObjectiveCompletionPercent(scenario)).toBe(0);
      expect(hasDeployedForces(scenario)).toBe(true);
      expect(getDeployedForceCount(scenario)).toBe(2);

      // Simulate completing required objectives
      const completedScenario = createTestScenario({
        ...scenario,
        status: ScenarioStatus.VICTORY,
        objectives: [
          createTestObjective({ id: 'obj-1', required: true, completed: true }),
          createTestObjective({ id: 'obj-2', required: true, completed: true }),
          createTestObjective({ id: 'obj-3', required: false, completed: false }),
        ],
      });

      expect(isScenarioComplete(completedScenario)).toBe(true);
      expect(isScenarioSuccess(completedScenario)).toBe(true);
      expect(getObjectiveCompletionPercent(completedScenario)).toBe(67);
    });

    it('should handle scenario with all objectives completed', () => {
      const scenario = createTestScenario({
        status: ScenarioStatus.VICTORY,
        objectives: [
          createTestObjective({ id: 'obj-1', required: true, completed: true }),
          createTestObjective({ id: 'obj-2', required: false, completed: true }),
        ],
      });

      expect(isScenarioSuccess(scenario)).toBe(true);
      expect(getObjectiveCompletionPercent(scenario)).toBe(100);
      expect(getCompletedObjectives(scenario)).toHaveLength(2);
    });

    it('should handle failed scenario', () => {
      const scenario = createTestScenario({
        status: ScenarioStatus.DEFEAT,
        objectives: [
          createTestObjective({ id: 'obj-1', required: true, completed: false }),
          createTestObjective({ id: 'obj-2', required: true, completed: false }),
        ],
      });

      expect(isScenarioComplete(scenario)).toBe(true);
      expect(isScenarioSuccess(scenario)).toBe(false);
      expect(getObjectiveCompletionPercent(scenario)).toBe(0);
    });
  });
});
