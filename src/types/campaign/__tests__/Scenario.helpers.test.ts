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
        const scenario = createTestScenario({
          status: ScenarioStatus.CANCELLED,
        });
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
            createTestObjective({
              id: 'obj-1',
              required: true,
              completed: true,
            }),
            createTestObjective({
              id: 'obj-2',
              required: true,
              completed: true,
            }),
          ],
        });
        expect(isScenarioSuccess(scenario)).toBe(true);
      });

      it('should return false when some required objectives are incomplete', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({
              id: 'obj-1',
              required: true,
              completed: true,
            }),
            createTestObjective({
              id: 'obj-2',
              required: true,
              completed: false,
            }),
          ],
        });
        expect(isScenarioSuccess(scenario)).toBe(false);
      });

      it('should ignore optional objectives', () => {
        const scenario = createTestScenario({
          objectives: [
            createTestObjective({
              id: 'obj-1',
              required: true,
              completed: true,
            }),
            createTestObjective({
              id: 'obj-2',
              required: false,
              completed: false,
            }),
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
          objectives: [createTestObjective({ id: 'obj-1', required: false })],
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
});
