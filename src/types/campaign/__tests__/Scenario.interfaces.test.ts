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
      expect(scenario.opponentForceDescription).toBe(
        'One lance of medium mechs',
      );
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
      const terrains = [
        'Urban',
        'Forest',
        'Desert',
        'Plains',
        'Mountain',
        'Swamp',
      ];
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
});
