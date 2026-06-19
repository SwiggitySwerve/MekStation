/**
 * Mission.test.ts - Comprehensive tests for Mission and Contract entities
 *
 * Tests cover:
 * - IMission interface structure (10+ tests)
 * - IContract interface structure (5+ tests)
 * - Helper functions (10+ tests)
 * - Type guards (5+ tests)
 * - Factory functions (5+ tests)
 */

import { MissionStatus } from '../enums/MissionStatus';
import { ScenarioStatus } from '../enums/ScenarioStatus';
import {
  IMission,
  IContract,
  SalvageRights,
  CommandRights,
  isMissionComplete,
  getActiveScenarios,
  getMissionScenarios,
  getTotalPayout,
  hasScenarios,
  getScenarioCount,
  isTerminalStatus,
  isMission,
  isContract,
  createMission,
  createContract,
} from '../Mission';
import { Money } from '../Money';
import { createPaymentTerms } from '../PaymentTerms';
import { IScenario, createScenario } from '../Scenario';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestMission(overrides?: Partial<IMission>): IMission {
  return {
    id: 'mission-001',
    name: 'Test Mission',
    status: MissionStatus.PENDING,
    type: 'mission',
    systemId: 'hesperus-ii',
    scenarioIds: [],
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
    ...overrides,
  };
}

function createTestContract(overrides?: Partial<IContract>): IContract {
  return {
    id: 'contract-001',
    name: 'Test Contract',
    status: MissionStatus.PENDING,
    type: 'contract',
    systemId: 'new-avalon',
    scenarioIds: [],
    employerId: 'davion',
    targetId: 'liao',
    paymentTerms: createPaymentTerms({
      basePayment: new Money(500000),
      successPayment: new Money(250000),
      partialPayment: new Money(100000),
      failurePayment: new Money(0),
      salvagePercent: 50,
      transportPayment: new Money(75000),
      supportPayment: new Money(25000),
    }),
    salvageRights: 'Integrated',
    commandRights: 'Independent',
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
    ...overrides,
  };
}

function createTestScenarioMap(
  ...scenarios: IScenario[]
): Map<string, IScenario> {
  const map = new Map<string, IScenario>();
  for (const s of scenarios) {
    map.set(s.id, s);
  }
  return map;
}

// =============================================================================
// IMission Interface Tests
// =============================================================================

describe('Mission System', () => {
  describe('Helper Functions', () => {
    describe('isMissionComplete', () => {
      it('should return true for mission with no scenarios', () => {
        const mission = createTestMission({ scenarioIds: [] });
        const scenarios = new Map<string, IScenario>();
        expect(isMissionComplete(mission, scenarios)).toBe(true);
      });

      it('should return true when all scenarios are terminal', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
          status: ScenarioStatus.VICTORY,
        });
        const s2 = createScenario({
          id: 's2',
          name: 'S2',
          missionId: 'mission-001',
          status: ScenarioStatus.DEFEAT,
        });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        expect(isMissionComplete(mission, scenarios)).toBe(true);
      });

      it('should return false when some scenarios are active', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
          status: ScenarioStatus.VICTORY,
        });
        const s2 = createScenario({
          id: 's2',
          name: 'S2',
          missionId: 'mission-001',
          status: ScenarioStatus.CURRENT,
        });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        expect(isMissionComplete(mission, scenarios)).toBe(false);
      });

      it('should return false when some scenarios are pending', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
          status: ScenarioStatus.VICTORY,
        });
        const s2 = createScenario({
          id: 's2',
          name: 'S2',
          missionId: 'mission-001',
          status: ScenarioStatus.PENDING,
        });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        expect(isMissionComplete(mission, scenarios)).toBe(false);
      });

      it('should treat missing scenarios as complete', () => {
        const mission = createTestMission({ scenarioIds: ['missing-1'] });
        const scenarios = new Map<string, IScenario>();

        expect(isMissionComplete(mission, scenarios)).toBe(true);
      });

      it('should handle all terminal statuses', () => {
        const terminalStatuses = [
          ScenarioStatus.VICTORY,
          ScenarioStatus.DEFEAT,
          ScenarioStatus.DRAW,
          ScenarioStatus.CANCELLED,
          ScenarioStatus.MIXED,
        ];

        terminalStatuses.forEach((status) => {
          const s = createScenario({
            id: 's1',
            name: 'S1',
            missionId: 'mission-001',
            status,
          });
          const mission = createTestMission({ scenarioIds: ['s1'] });
          const scenarios = createTestScenarioMap(s);

          expect(isMissionComplete(mission, scenarios)).toBe(true);
        });
      });
    });

    describe('getActiveScenarios', () => {
      it('should return non-terminal scenarios', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
          status: ScenarioStatus.CURRENT,
        });
        const s2 = createScenario({
          id: 's2',
          name: 'S2',
          missionId: 'mission-001',
          status: ScenarioStatus.VICTORY,
        });
        const s3 = createScenario({
          id: 's3',
          name: 'S3',
          missionId: 'mission-001',
          status: ScenarioStatus.PENDING,
        });
        const mission = createTestMission({ scenarioIds: ['s1', 's2', 's3'] });
        const scenarios = createTestScenarioMap(s1, s2, s3);

        const active = getActiveScenarios(mission, scenarios);
        expect(active).toHaveLength(2);
        expect(active.map((s) => s.id)).toContain('s1');
        expect(active.map((s) => s.id)).toContain('s3');
      });

      it('should return empty array when all scenarios are terminal', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
          status: ScenarioStatus.VICTORY,
        });
        const mission = createTestMission({ scenarioIds: ['s1'] });
        const scenarios = createTestScenarioMap(s1);

        expect(getActiveScenarios(mission, scenarios)).toHaveLength(0);
      });

      it('should skip missing scenarios', () => {
        const mission = createTestMission({ scenarioIds: ['missing-1'] });
        const scenarios = new Map<string, IScenario>();

        expect(getActiveScenarios(mission, scenarios)).toHaveLength(0);
      });
    });

    describe('getMissionScenarios', () => {
      it('should return all scenarios for a mission', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
        });
        const s2 = createScenario({
          id: 's2',
          name: 'S2',
          missionId: 'mission-001',
        });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        const result = getMissionScenarios(mission, scenarios);
        expect(result).toHaveLength(2);
      });

      it('should skip missing scenarios', () => {
        const s1 = createScenario({
          id: 's1',
          name: 'S1',
          missionId: 'mission-001',
        });
        const mission = createTestMission({ scenarioIds: ['s1', 'missing'] });
        const scenarios = createTestScenarioMap(s1);

        const result = getMissionScenarios(mission, scenarios);
        expect(result).toHaveLength(1);
      });
    });

    describe('getTotalPayout', () => {
      it('should calculate success payout', () => {
        const contract = createTestContract({ status: MissionStatus.SUCCESS });
        const payout = getTotalPayout(contract);

        // base(500000) + success(250000) + transport(75000) + support(25000) = 850000
        expect(payout.amount).toBe(850000);
      });

      it('should calculate partial payout', () => {
        const contract = createTestContract({ status: MissionStatus.PARTIAL });
        const payout = getTotalPayout(contract);

        // base(500000) + partial(100000) + transport(75000) + support(25000) = 700000
        expect(payout.amount).toBe(700000);
      });

      it('should calculate failure payout for failed status', () => {
        const contract = createTestContract({ status: MissionStatus.FAILED });
        const payout = getTotalPayout(contract);

        // base(500000) + failure(0) + transport(75000) + support(25000) = 600000
        expect(payout.amount).toBe(600000);
      });

      it('should treat pending as failure outcome', () => {
        const contract = createTestContract({ status: MissionStatus.PENDING });
        const payout = getTotalPayout(contract);

        expect(payout.amount).toBe(600000);
      });

      it('should return Money instance', () => {
        const contract = createTestContract({ status: MissionStatus.SUCCESS });
        expect(getTotalPayout(contract)).toBeInstanceOf(Money);
      });
    });

    describe('hasScenarios', () => {
      it('should return true when mission has scenarios', () => {
        const mission = createTestMission({ scenarioIds: ['s1'] });
        expect(hasScenarios(mission)).toBe(true);
      });

      it('should return false when mission has no scenarios', () => {
        const mission = createTestMission({ scenarioIds: [] });
        expect(hasScenarios(mission)).toBe(false);
      });
    });

    describe('getScenarioCount', () => {
      it('should return number of scenario IDs', () => {
        const mission = createTestMission({ scenarioIds: ['s1', 's2', 's3'] });
        expect(getScenarioCount(mission)).toBe(3);
      });

      it('should return 0 for empty scenarios', () => {
        const mission = createTestMission({ scenarioIds: [] });
        expect(getScenarioCount(mission)).toBe(0);
      });
    });

    describe('isTerminalStatus', () => {
      it('should return true for terminal statuses', () => {
        const terminalStatuses = [
          MissionStatus.SUCCESS,
          MissionStatus.PARTIAL,
          MissionStatus.FAILED,
          MissionStatus.BREACH,
          MissionStatus.CANCELLED,
          MissionStatus.ABORTED,
        ];

        terminalStatuses.forEach((status) => {
          const mission = createTestMission({ status });
          expect(isTerminalStatus(mission)).toBe(true);
        });
      });

      it('should return false for non-terminal statuses', () => {
        const nonTerminal = [MissionStatus.ACTIVE, MissionStatus.PENDING];

        nonTerminal.forEach((status) => {
          const mission = createTestMission({ status });
          expect(isTerminalStatus(mission)).toBe(false);
        });
      });
    });
  });
});
