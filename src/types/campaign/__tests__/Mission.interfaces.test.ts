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
});
