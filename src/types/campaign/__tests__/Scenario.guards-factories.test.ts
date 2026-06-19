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

import { ScenarioStatus } from '../enums/ScenarioStatus';
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
          }),
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

  describe('Integration', () => {
    it('should handle complete scenario workflow', () => {
      // Create scenario with objectives
      const scenario = createTestScenario({
        status: ScenarioStatus.CURRENT,
        deployedForceIds: ['force-alpha', 'force-bravo'],
        objectives: [
          createTestObjective({
            id: 'obj-1',
            required: true,
            completed: false,
          }),
          createTestObjective({
            id: 'obj-2',
            required: true,
            completed: false,
          }),
          createTestObjective({
            id: 'obj-3',
            required: false,
            completed: false,
          }),
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
          createTestObjective({
            id: 'obj-3',
            required: false,
            completed: false,
          }),
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
          createTestObjective({
            id: 'obj-2',
            required: false,
            completed: true,
          }),
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
          createTestObjective({
            id: 'obj-1',
            required: true,
            completed: false,
          }),
          createTestObjective({
            id: 'obj-2',
            required: true,
            completed: false,
          }),
        ],
      });

      expect(isScenarioComplete(scenario)).toBe(true);
      expect(isScenarioSuccess(scenario)).toBe(false);
      expect(getObjectiveCompletionPercent(scenario)).toBe(0);
    });
  });
});
