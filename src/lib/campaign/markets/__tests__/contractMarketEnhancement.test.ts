import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaign } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { IFinances } from '@/types/campaign/IFinances';
import { IForce } from '@/types/campaign/Force';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import {
  AtBContractType,
  CONTRACT_TYPE_DEFINITIONS,
} from '@/types/campaign/contracts/contractTypes';

import {
  generateFollowupContract,
  generateContractsWithStanding,
  generateContracts,
  generateAtBContracts,
  RandomFn,
  EMPLOYER_FACTIONS,
} from '../../contractMarket';

// =============================================================================
// Helpers
// =============================================================================

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function createTestForce(
  id: string,
  name: string,
  parentForceId?: string,
  subForceIds: string[] = [],
  unitIds: string[] = []
): IForce {
  return {
    id,
    name,
    parentForceId,
    subForceIds,
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}

function createMockCampaign(unitCount: number = 4): ICampaign {
  const unitIds = Array.from({ length: unitCount }, (_, i) => `unit-${i + 1}`);
  const forces = new Map<string, IForce>();
  forces.set('force-root', createTestForce('force-root', 'Root', undefined, [], unitIds));

  return {
    id: 'test',
    name: 'Test',
    currentDate: new Date('3025-01-01'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces,
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1000000) } as IFinances,
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}

function createCompletedContract(overrides?: Partial<IContract>): IContract {
  return {
    id: 'completed-001',
    name: 'Garrison Duty for House Davion',
    status: MissionStatus.SUCCESS,
    type: 'contract',
    systemId: 'New Avalon',
    scenarioIds: [],
    employerId: 'Davion',
    targetId: 'Liao',
    paymentTerms: {
      basePayment: new Money(4000000),
      successPayment: new Money(8000000),
      partialPayment: new Money(6000000),
      failurePayment: new Money(2000000),
      salvagePercent: 50,
      transportPayment: Money.ZERO,
      supportPayment: Money.ZERO,
    },
    salvageRights: 'Integrated',
    commandRights: 'Independent',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function createCompletedAtBContract(
  atbType: AtBContractType = AtBContractType.GARRISON_DUTY
): IContract {
  const typeDef = CONTRACT_TYPE_DEFINITIONS[atbType];
  return createCompletedContract({
    id: 'completed-atb-001',
    name: `${typeDef.name} for House Davion`,
    atbContractType: atbType,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('Contract Market Enhancements', () => {
  describe('generateFollowupContract', () => {
    it('should return null when random chance fails (>= 0.5)', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract();
      // Seed that produces first value >= 0.5
      const alwaysHigh: RandomFn = () => 0.75;
      const result = generateFollowupContract(campaign, completed, alwaysHigh);
      expect(result).toBeNull();
    });

    it('should generate a followup when random chance succeeds (< 0.5)', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract();
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
    });

    it('should retain the same employer as the completed contract', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract({ employerId: 'Steiner' });
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.employerId).toBe('Steiner');
    });

    it('should retain the same system as the completed contract', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract({ systemId: 'Solaris VII' });
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.systemId).toBe('Solaris VII');
    });

    it('should use a different contract type than the completed one', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract({
        name: 'Garrison Duty for House Davion',
      });
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.name).not.toContain('Garrison Duty');
    });

    it('should scale payment up by 10%', () => {
      const campaign = createMockCampaign();
      const baseAmount = 4000000;
      const completed = createCompletedContract({
        paymentTerms: {
          basePayment: new Money(baseAmount),
          successPayment: new Money(baseAmount * 2),
          partialPayment: new Money(baseAmount * 1.5),
          failurePayment: new Money(baseAmount * 0.5),
          salvagePercent: 50,
          transportPayment: Money.ZERO,
          supportPayment: Money.ZERO,
        },
      });
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.paymentTerms.basePayment.amount).toBeCloseTo(baseAmount * 1.1, 0);
    });

    it('should produce ~50% followup rate with seeded random over many trials', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract();
      let generated = 0;
      const trials = 200;

      for (let i = 0; i < trials; i++) {
        const rng = createSeededRandom(i);
        const result = generateFollowupContract(campaign, completed, rng);
        if (result !== null) generated++;
      }

      const rate = generated / trials;
      expect(rate).toBeGreaterThan(0.3);
      expect(rate).toBeLessThan(0.7);
    });

    it('should generate followup for AtB contract with different type from same group', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedAtBContract(AtBContractType.GARRISON_DUTY);
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.atbContractType).toBeDefined();
      expect(result!.atbContractType).not.toBe(AtBContractType.GARRISON_DUTY);

      // Should be from garrison group
      const resultDef = CONTRACT_TYPE_DEFINITIONS[result!.atbContractType!];
      const completedDef = CONTRACT_TYPE_DEFINITIONS[AtBContractType.GARRISON_DUTY];
      expect(resultDef.group).toBe(completedDef.group);
    });

    it('should have valid target different from employer', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract();
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.targetId).not.toBe(result!.employerId);
      expect(EMPLOYER_FACTIONS).toContain(result!.targetId);
    });

    it('should have PENDING status', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract();
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(MissionStatus.PENDING);
    });

    it('should have valid start and end dates', () => {
      const campaign = createMockCampaign();
      const completed = createCompletedContract();
      const alwaysLow: RandomFn = () => 0.1;
      const result = generateFollowupContract(campaign, completed, alwaysLow);
      expect(result).not.toBeNull();
      expect(result!.startDate).toBeDefined();
      expect(result!.endDate).toBeDefined();
      const start = new Date(result!.startDate!).getTime();
      const end = new Date(result!.endDate!).getTime();
      expect(end).toBeGreaterThan(start);
    });
  });

  describe('generateContractsWithStanding', () => {
    it('should generate the requested number of contracts', () => {
      const campaign = createMockCampaign();
      const contracts = generateContractsWithStanding(campaign, 3, createSeededRandom(42));
      expect(contracts).toHaveLength(3);
    });

    it('should default to 5 contracts', () => {
      const campaign = createMockCampaign();
      const contracts = generateContractsWithStanding(campaign, undefined, createSeededRandom(42));
      expect(contracts).toHaveLength(5);
    });

    it('should generate contracts with AtB types', () => {
      const campaign = createMockCampaign();
      const contracts = generateContractsWithStanding(campaign, 5, createSeededRandom(42));
      contracts.forEach((c) => {
        expect(c.atbContractType).toBeDefined();
        expect(Object.values(AtBContractType)).toContain(c.atbContractType);
      });
    });

    it('should generate contracts with valid structure', () => {
      const campaign = createMockCampaign();
      const contracts = generateContractsWithStanding(campaign, 3, createSeededRandom(99));
      contracts.forEach((c) => {
        expect(c.type).toBe('contract');
        expect(c.status).toBe(MissionStatus.PENDING);
        expect(typeof c.employerId).toBe('string');
        expect(typeof c.targetId).toBe('string');
        expect(c.employerId).not.toBe(c.targetId);
        expect(c.paymentTerms).toBeDefined();
        expect(c.paymentTerms.basePayment.amount).toBeGreaterThan(0);
      });
    });

    it('should apply standing modifiers (stubs return neutral values)', () => {
      const campaign = createMockCampaign();
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      const withStanding = generateContractsWithStanding(campaign, 3, rng1);
      const withoutStanding = generateAtBContracts(campaign, 3, 0, 0, rng2);

      // With neutral stubs (multiplier=1.0, mod=0), results should match
      for (let i = 0; i < 3; i++) {
        expect(withStanding[i].paymentTerms.basePayment.amount).toBeCloseTo(
          withoutStanding[i].paymentTerms.basePayment.amount,
          0
        );
      }
    });

    it('should produce deterministic results with seeded random', () => {
      const campaign = createMockCampaign();
      const contracts1 = generateContractsWithStanding(campaign, 3, createSeededRandom(77));
      const contracts2 = generateContractsWithStanding(campaign, 3, createSeededRandom(77));

      for (let i = 0; i < 3; i++) {
        expect(contracts1[i].employerId).toBe(contracts2[i].employerId);
        expect(contracts1[i].targetId).toBe(contracts2[i].targetId);
        expect(contracts1[i].systemId).toBe(contracts2[i].systemId);
        expect(contracts1[i].atbContractType).toBe(contracts2[i].atbContractType);
      }
    });
  });

  describe('Existing contract generation still works', () => {
    it('generateContracts produces valid contracts', () => {
      const campaign = createMockCampaign();
      const contracts = generateContracts(campaign, 3, createSeededRandom(42));
      expect(contracts).toHaveLength(3);
      contracts.forEach((c) => {
        expect(c.type).toBe('contract');
        expect(c.status).toBe(MissionStatus.PENDING);
        expect(typeof c.employerId).toBe('string');
        expect(typeof c.targetId).toBe('string');
      });
    });

    it('generateAtBContracts produces valid contracts', () => {
      const campaign = createMockCampaign();
      const contracts = generateAtBContracts(campaign, 3, 0, 0, createSeededRandom(42));
      expect(contracts).toHaveLength(3);
      contracts.forEach((c) => {
        expect(c.type).toBe('contract');
        expect(c.atbContractType).toBeDefined();
      });
    });
  });
});
