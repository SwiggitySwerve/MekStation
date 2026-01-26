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
import { IScenario, createScenario } from '../Scenario';
import { MissionStatus } from '../enums/MissionStatus';
import { ScenarioStatus } from '../enums/ScenarioStatus';
import { Money } from '../Money';
import { createPaymentTerms } from '../PaymentTerms';

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
  describe('IMission Interface', () => {
    it('should have all required fields', () => {
      const mission = createTestMission();

      expect(mission.id).toBe('mission-001');
      expect(mission.name).toBe('Test Mission');
      expect(mission.status).toBe(MissionStatus.PENDING);
      expect(mission.type).toBe('mission');
      expect(mission.systemId).toBe('hesperus-ii');
      expect(mission.scenarioIds).toEqual([]);
      expect(mission.createdAt).toBe('2026-01-26T10:00:00Z');
      expect(mission.updatedAt).toBe('2026-01-26T10:00:00Z');
    });

    it('should support optional description', () => {
      const mission = createTestMission({ description: 'Raid enemy depot' });
      expect(mission.description).toBe('Raid enemy depot');
    });

    it('should support optional briefing', () => {
      const mission = createTestMission({ briefing: 'Intel reports...' });
      expect(mission.briefing).toBe('Intel reports...');
    });

    it('should support optional start/end dates', () => {
      const mission = createTestMission({
        startDate: '3025-06-15',
        endDate: '3025-07-15',
      });
      expect(mission.startDate).toBe('3025-06-15');
      expect(mission.endDate).toBe('3025-07-15');
    });

    it('should support scenario IDs', () => {
      const mission = createTestMission({
        scenarioIds: ['scenario-1', 'scenario-2', 'scenario-3'],
      });
      expect(mission.scenarioIds).toHaveLength(3);
      expect(mission.scenarioIds).toContain('scenario-1');
    });

    it('should support all mission statuses', () => {
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
        expect(mission.status).toBe(status);
      });
    });

    it('should have type discriminator as mission', () => {
      const mission = createTestMission();
      expect(mission.type).toBe('mission');
    });

    it('should default to empty scenarioIds', () => {
      const mission = createTestMission();
      expect(mission.scenarioIds).toEqual([]);
    });

    it('should have undefined optional fields by default', () => {
      const mission = createTestMission();
      expect(mission.description).toBeUndefined();
      expect(mission.briefing).toBeUndefined();
      expect(mission.startDate).toBeUndefined();
      expect(mission.endDate).toBeUndefined();
    });

    it('should store system ID', () => {
      const mission = createTestMission({ systemId: 'terra' });
      expect(mission.systemId).toBe('terra');
    });
  });

  // ===========================================================================
  // IContract Interface Tests
  // ===========================================================================

  describe('IContract Interface', () => {
    it('should have all IMission fields plus contract fields', () => {
      const contract = createTestContract();

      // IMission fields
      expect(contract.id).toBe('contract-001');
      expect(contract.name).toBe('Test Contract');
      expect(contract.status).toBe(MissionStatus.PENDING);
      expect(contract.systemId).toBe('new-avalon');
      expect(contract.scenarioIds).toEqual([]);

      // Contract-specific fields
      expect(contract.type).toBe('contract');
      expect(contract.employerId).toBe('davion');
      expect(contract.targetId).toBe('liao');
      expect(contract.paymentTerms).toBeDefined();
      expect(contract.salvageRights).toBe('Integrated');
      expect(contract.commandRights).toBe('Independent');
    });

    it('should have type discriminator as contract', () => {
      const contract = createTestContract();
      expect(contract.type).toBe('contract');
    });

    it('should support all salvage rights', () => {
      const rights: SalvageRights[] = ['None', 'Exchange', 'Integrated'];
      rights.forEach((right) => {
        const contract = createTestContract({ salvageRights: right });
        expect(contract.salvageRights).toBe(right);
      });
    });

    it('should support all command rights', () => {
      const rights: CommandRights[] = ['Independent', 'House', 'Integrated'];
      rights.forEach((right) => {
        const contract = createTestContract({ commandRights: right });
        expect(contract.commandRights).toBe(right);
      });
    });

    it('should have payment terms with Money values', () => {
      const contract = createTestContract();
      expect(contract.paymentTerms.basePayment).toBeInstanceOf(Money);
      expect(contract.paymentTerms.basePayment.amount).toBe(500000);
    });
  });

  // ===========================================================================
  // Helper Functions Tests
  // ===========================================================================

  describe('Helper Functions', () => {
    describe('isMissionComplete', () => {
      it('should return true for mission with no scenarios', () => {
        const mission = createTestMission({ scenarioIds: [] });
        const scenarios = new Map<string, IScenario>();
        expect(isMissionComplete(mission, scenarios)).toBe(true);
      });

      it('should return true when all scenarios are terminal', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001', status: ScenarioStatus.VICTORY });
        const s2 = createScenario({ id: 's2', name: 'S2', missionId: 'mission-001', status: ScenarioStatus.DEFEAT });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        expect(isMissionComplete(mission, scenarios)).toBe(true);
      });

      it('should return false when some scenarios are active', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001', status: ScenarioStatus.VICTORY });
        const s2 = createScenario({ id: 's2', name: 'S2', missionId: 'mission-001', status: ScenarioStatus.CURRENT });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        expect(isMissionComplete(mission, scenarios)).toBe(false);
      });

      it('should return false when some scenarios are pending', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001', status: ScenarioStatus.VICTORY });
        const s2 = createScenario({ id: 's2', name: 'S2', missionId: 'mission-001', status: ScenarioStatus.PENDING });
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
          const s = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001', status });
          const mission = createTestMission({ scenarioIds: ['s1'] });
          const scenarios = createTestScenarioMap(s);

          expect(isMissionComplete(mission, scenarios)).toBe(true);
        });
      });
    });

    describe('getActiveScenarios', () => {
      it('should return non-terminal scenarios', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001', status: ScenarioStatus.CURRENT });
        const s2 = createScenario({ id: 's2', name: 'S2', missionId: 'mission-001', status: ScenarioStatus.VICTORY });
        const s3 = createScenario({ id: 's3', name: 'S3', missionId: 'mission-001', status: ScenarioStatus.PENDING });
        const mission = createTestMission({ scenarioIds: ['s1', 's2', 's3'] });
        const scenarios = createTestScenarioMap(s1, s2, s3);

        const active = getActiveScenarios(mission, scenarios);
        expect(active).toHaveLength(2);
        expect(active.map((s) => s.id)).toContain('s1');
        expect(active.map((s) => s.id)).toContain('s3');
      });

      it('should return empty array when all scenarios are terminal', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001', status: ScenarioStatus.VICTORY });
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
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001' });
        const s2 = createScenario({ id: 's2', name: 'S2', missionId: 'mission-001' });
        const mission = createTestMission({ scenarioIds: ['s1', 's2'] });
        const scenarios = createTestScenarioMap(s1, s2);

        const result = getMissionScenarios(mission, scenarios);
        expect(result).toHaveLength(2);
      });

      it('should skip missing scenarios', () => {
        const s1 = createScenario({ id: 's1', name: 'S1', missionId: 'mission-001' });
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

  // ===========================================================================
  // Type Guards Tests
  // ===========================================================================

  describe('Type Guards', () => {
    describe('isMission', () => {
      it('should return true for valid mission', () => {
        const mission = createTestMission();
        expect(isMission(mission)).toBe(true);
      });

      it('should return true for valid contract (is also a mission)', () => {
        const contract = createTestContract();
        expect(isMission(contract)).toBe(true);
      });

      it('should return false for null', () => {
        expect(isMission(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isMission(undefined)).toBe(false);
      });

      it('should return false for empty object', () => {
        expect(isMission({})).toBe(false);
      });

      it('should return false for missing required fields', () => {
        expect(isMission({ id: 'test', name: 'Test' })).toBe(false);
      });

      it('should return false for wrong type discriminator', () => {
        const invalid = { ...createTestMission(), type: 'invalid' };
        expect(isMission(invalid)).toBe(false);
      });

      it('should return false for non-string id', () => {
        const invalid = { ...createTestMission(), id: 123 };
        expect(isMission(invalid)).toBe(false);
      });
    });

    describe('isContract', () => {
      it('should return true for valid contract', () => {
        const contract = createTestContract();
        expect(isContract(contract)).toBe(true);
      });

      it('should return false for plain mission', () => {
        const mission = createTestMission();
        expect(isContract(mission)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isContract(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isContract(undefined)).toBe(false);
      });

      it('should return false for mission with type=contract but missing fields', () => {
        const invalid = { ...createTestMission(), type: 'contract' as const };
        expect(isContract(invalid)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Factory Functions Tests
  // ===========================================================================

  describe('Factory Functions', () => {
    describe('createMission', () => {
      it('should create mission with required fields', () => {
        const mission = createMission({
          id: 'mission-001',
          name: 'Raid on Hesperus II',
        });

        expect(mission.id).toBe('mission-001');
        expect(mission.name).toBe('Raid on Hesperus II');
        expect(mission.status).toBe(MissionStatus.PENDING);
        expect(mission.type).toBe('mission');
        expect(mission.systemId).toBe('Unknown System');
        expect(mission.scenarioIds).toEqual([]);
      });

      it('should set timestamps', () => {
        const before = new Date().toISOString();
        const mission = createMission({ id: 'test', name: 'Test' });
        const after = new Date().toISOString();

        expect(mission.createdAt >= before).toBe(true);
        expect(mission.createdAt <= after).toBe(true);
        expect(mission.updatedAt).toBe(mission.createdAt);
      });

      it('should accept optional fields', () => {
        const mission = createMission({
          id: 'mission-001',
          name: 'Test',
          systemId: 'terra',
          status: MissionStatus.ACTIVE,
          scenarioIds: ['s1', 's2'],
          description: 'A mission',
          briefing: 'Briefing text',
          startDate: '3025-06-15',
          endDate: '3025-07-15',
        });

        expect(mission.systemId).toBe('terra');
        expect(mission.status).toBe(MissionStatus.ACTIVE);
        expect(mission.scenarioIds).toEqual(['s1', 's2']);
        expect(mission.description).toBe('A mission');
        expect(mission.briefing).toBe('Briefing text');
        expect(mission.startDate).toBe('3025-06-15');
        expect(mission.endDate).toBe('3025-07-15');
      });

      it('should pass type guard', () => {
        const mission = createMission({ id: 'test', name: 'Test' });
        expect(isMission(mission)).toBe(true);
      });
    });

    describe('createContract', () => {
      it('should create contract with required fields', () => {
        const contract = createContract({
          id: 'contract-001',
          name: 'Garrison Duty',
          employerId: 'davion',
          targetId: 'liao',
        });

        expect(contract.id).toBe('contract-001');
        expect(contract.name).toBe('Garrison Duty');
        expect(contract.type).toBe('contract');
        expect(contract.employerId).toBe('davion');
        expect(contract.targetId).toBe('liao');
        expect(contract.status).toBe(MissionStatus.PENDING);
        expect(contract.salvageRights).toBe('None');
        expect(contract.commandRights).toBe('House');
      });

      it('should accept optional fields', () => {
        const contract = createContract({
          id: 'contract-001',
          name: 'Raid',
          employerId: 'steiner',
          targetId: 'kurita',
          systemId: 'hesperus-ii',
          salvageRights: 'Integrated',
          commandRights: 'Independent',
          paymentTerms: createPaymentTerms({
            basePayment: new Money(1000000),
          }),
        });

        expect(contract.systemId).toBe('hesperus-ii');
        expect(contract.salvageRights).toBe('Integrated');
        expect(contract.commandRights).toBe('Independent');
        expect(contract.paymentTerms.basePayment.amount).toBe(1000000);
      });

      it('should set timestamps', () => {
        const before = new Date().toISOString();
        const contract = createContract({
          id: 'test',
          name: 'Test',
          employerId: 'davion',
          targetId: 'liao',
        });
        const after = new Date().toISOString();

        expect(contract.createdAt >= before).toBe(true);
        expect(contract.createdAt <= after).toBe(true);
      });

      it('should pass isContract type guard', () => {
        const contract = createContract({
          id: 'test',
          name: 'Test',
          employerId: 'davion',
          targetId: 'liao',
        });
        expect(isContract(contract)).toBe(true);
      });

      it('should also pass isMission type guard', () => {
        const contract = createContract({
          id: 'test',
          name: 'Test',
          employerId: 'davion',
          targetId: 'liao',
        });
        expect(isMission(contract)).toBe(true);
      });
    });
  });
});
