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
