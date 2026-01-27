/**
 * contractMarket.test.ts - Comprehensive tests for Contract Market system
 *
 * Tests cover:
 * - calculateForceBV: empty campaign, single force, multiple forces, no root force
 * - generateContracts: count, variety, payment scaling, employer/target selection
 * - acceptContract: adds to campaign, validates duplicates, status updates
 * - Helper functions: name generation, random ranges, random selection
 */

import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { IContract, IMission, isContract } from '@/types/campaign/Mission';
import { IForce } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import { IFinances } from '@/types/campaign/IFinances';
import { MissionStatus, ForceType, FormationLevel } from '@/types/campaign/enums';

import {
  calculateForceBV,
  generateContracts,
  acceptContract,
  generateContractName,
  generateRandomDuration,
  generateRandomSalvagePercent,
  randomContractType,
  randomEmployer,
  randomTarget,
  randomSystem,
  CONTRACT_TYPES,
  EMPLOYER_FACTIONS,
  SYSTEMS,
  PLACEHOLDER_BV_PER_UNIT,
  CBILLS_PER_BV,
  PAYMENT_MULTIPLIERS,
  DURATION_MIN_DAYS,
  DURATION_MAX_DAYS,
  SALVAGE_MIN_PERCENT,
  SALVAGE_MAX_PERCENT,
  RandomFn,
} from '../contractMarket';

// =============================================================================
// Test Fixtures
// =============================================================================

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
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestCampaign(overrides?: {
  forces?: Map<string, IForce>;
  rootForceId?: string;
  missions?: Map<string, IMission>;
}): ICampaign {
  const forces = overrides?.forces ?? new Map<string, IForce>();
  const rootForceId = overrides?.rootForceId ?? 'force-root';

    return {
      id: 'campaign-001',
      name: 'Test Campaign',
      currentDate: new Date('3025-06-15T00:00:00Z'),
      factionId: 'mercenary',
      personnel: new Map(),
      forces,
      rootForceId,
      missions: overrides?.missions ?? new Map<string, IMission>(),
      finances: {
        transactions: [],
        balance: new Money(1000000),
      } as IFinances,
      factionStandings: {},
      shoppingList: { items: [] },
      options: createDefaultCampaignOptions(),
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };
}

/**
 * Create a deterministic random function for testing.
 * Uses a simple linear congruential generator.
 */
function createSeededRandom(seed: number): RandomFn {
  let state = seed;
  return () => {
    // Simple LCG: state = (a * state + c) mod m
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Contract Market', () => {
  // ===========================================================================
  // calculateForceBV
  // ===========================================================================
  describe('calculateForceBV', () => {
    it('should return 0 for campaign with no root force', () => {
      const campaign = createTestCampaign({
        forces: new Map(),
        rootForceId: 'nonexistent',
      });
      expect(calculateForceBV(campaign)).toBe(0);
    });

    it('should return 0 for campaign with empty root force', () => {
      const forces = new Map<string, IForce>();
      forces.set('force-root', createTestForce('force-root', 'Root'));
      const campaign = createTestCampaign({ forces });
      expect(calculateForceBV(campaign)).toBe(0);
    });

    it('should calculate BV for single force with units', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['unit-1', 'unit-2', 'unit-3'])
      );
      const campaign = createTestCampaign({ forces });
      expect(calculateForceBV(campaign)).toBe(3 * PLACEHOLDER_BV_PER_UNIT);
    });

    it('should calculate BV across multiple forces', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, ['force-1', 'force-2'], [])
      );
      forces.set(
        'force-1',
        createTestForce('force-1', 'Alpha', 'force-root', [], ['unit-1', 'unit-2'])
      );
      forces.set(
        'force-2',
        createTestForce('force-2', 'Beta', 'force-root', [], ['unit-3', 'unit-4'])
      );
      const campaign = createTestCampaign({ forces });
      expect(calculateForceBV(campaign)).toBe(4 * PLACEHOLDER_BV_PER_UNIT);
    });

    it('should calculate BV for deeply nested forces', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, ['force-1'], ['unit-1'])
      );
      forces.set(
        'force-1',
        createTestForce('force-1', 'Company', 'force-root', ['force-2'], ['unit-2'])
      );
      forces.set(
        'force-2',
        createTestForce('force-2', 'Lance', 'force-1', [], ['unit-3', 'unit-4'])
      );
      const campaign = createTestCampaign({ forces });
      // 1 (root) + 1 (company) + 2 (lance) = 4 units
      expect(calculateForceBV(campaign)).toBe(4 * PLACEHOLDER_BV_PER_UNIT);
    });

    it('should use placeholder BV of 1000 per unit', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['unit-1'])
      );
      const campaign = createTestCampaign({ forces });
      expect(calculateForceBV(campaign)).toBe(1000);
    });
  });

  // ===========================================================================
  // generateContracts
  // ===========================================================================
  describe('generateContracts', () => {
    function createCampaignWithUnits(unitCount: number): ICampaign {
      const unitIds = Array.from({ length: unitCount }, (_, i) => `unit-${i + 1}`);
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], unitIds)
      );
      return createTestCampaign({ forces });
    }

    it('should generate default 5 contracts', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign);
      expect(contracts).toHaveLength(5);
    });

    it('should generate specified number of contracts', () => {
      const campaign = createCampaignWithUnits(4);
      expect(generateContracts(campaign, 1)).toHaveLength(1);
      expect(generateContracts(campaign, 3)).toHaveLength(3);
      expect(generateContracts(campaign, 10)).toHaveLength(10);
    });

    it('should generate 0 contracts when count is 0', () => {
      const campaign = createCampaignWithUnits(4);
      expect(generateContracts(campaign, 0)).toHaveLength(0);
    });

    it('should generate contracts with valid IContract structure', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 1, createSeededRandom(1));
      const contract = contracts[0];

      expect(contract.type).toBe('contract');
      expect(contract.status).toBe(MissionStatus.PENDING);
      expect(typeof contract.id).toBe('string');
      expect(typeof contract.name).toBe('string');
      expect(typeof contract.employerId).toBe('string');
      expect(typeof contract.targetId).toBe('string');
      expect(typeof contract.systemId).toBe('string');
      expect(contract.paymentTerms).toBeDefined();
      expect(contract.startDate).toBeDefined();
      expect(contract.endDate).toBeDefined();
    });

    it('should pass isContract type guard', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 3, createSeededRandom(2));
      contracts.forEach((contract) => {
        expect(isContract(contract)).toBe(true);
      });
    });

    it('should generate contracts with valid contract types', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 20, createSeededRandom(3));
      contracts.forEach((contract) => {
        const hasValidType = CONTRACT_TYPES.some((type) => contract.name.includes(type));
        expect(hasValidType).toBe(true);
      });
    });

    it('should generate contracts with valid employer factions', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 20, createSeededRandom(4));
      contracts.forEach((contract) => {
        expect(EMPLOYER_FACTIONS).toContain(contract.employerId);
      });
    });

    it('should generate contracts with valid target factions', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 20, createSeededRandom(5));
      contracts.forEach((contract) => {
        expect(EMPLOYER_FACTIONS).toContain(contract.targetId);
      });
    });

    it('should ensure target is different from employer', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 50, createSeededRandom(6));
      contracts.forEach((contract) => {
        expect(contract.targetId).not.toBe(contract.employerId);
      });
    });

    it('should generate contracts with valid systems', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 20, createSeededRandom(7));
      contracts.forEach((contract) => {
        expect(SYSTEMS).toContain(contract.systemId);
      });
    });

    it('should scale payment with force BV', () => {
      const campaign2Units = createCampaignWithUnits(2);
      const campaign8Units = createCampaignWithUnits(8);
      const seed = createSeededRandom(8);
      const seed2 = createSeededRandom(8); // Same seed for comparison

      const contracts2 = generateContracts(campaign2Units, 1, seed);
      const contracts8 = generateContracts(campaign8Units, 1, seed2);

      // 8 units should have 4x the base payment of 2 units
      const base2 = contracts2[0].paymentTerms.basePayment.amount;
      const base8 = contracts8[0].paymentTerms.basePayment.amount;
      expect(base8).toBe(base2 * 4);
    });

    it('should calculate correct payment multipliers', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 1, createSeededRandom(9));
      const terms = contracts[0].paymentTerms;

      const baseAmount = terms.basePayment.amount;
      expect(terms.successPayment.amount).toBeCloseTo(baseAmount * PAYMENT_MULTIPLIERS.success, 0);
      expect(terms.partialPayment.amount).toBeCloseTo(baseAmount * PAYMENT_MULTIPLIERS.partial, 0);
      expect(terms.failurePayment.amount).toBeCloseTo(baseAmount * PAYMENT_MULTIPLIERS.failure, 0);
    });

    it('should generate contracts with salvage percent in valid range', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 20, createSeededRandom(10));
      contracts.forEach((contract) => {
        expect(contract.paymentTerms.salvagePercent).toBeGreaterThanOrEqual(SALVAGE_MIN_PERCENT);
        expect(contract.paymentTerms.salvagePercent).toBeLessThanOrEqual(SALVAGE_MAX_PERCENT);
      });
    });

    it('should generate contracts with valid date range', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 20, createSeededRandom(11));
      contracts.forEach((contract) => {
        expect(contract.startDate).toBeDefined();
        expect(contract.endDate).toBeDefined();
        const start = new Date(contract.startDate!).getTime();
        const end = new Date(contract.endDate!).getTime();
        const durationDays = (end - start) / (24 * 60 * 60 * 1000);
        expect(durationDays).toBeGreaterThanOrEqual(DURATION_MIN_DAYS);
        expect(durationDays).toBeLessThanOrEqual(DURATION_MAX_DAYS);
      });
    });

    it('should generate zero-payment contracts for empty campaign', () => {
      const campaign = createTestCampaign({
        forces: new Map(),
        rootForceId: 'nonexistent',
      });
      const contracts = generateContracts(campaign, 1, createSeededRandom(12));
      expect(contracts[0].paymentTerms.basePayment.amount).toBe(0);
    });

    it('should generate unique IDs for each contract', () => {
      const campaign = createCampaignWithUnits(4);
      const contracts = generateContracts(campaign, 10);
      const ids = contracts.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should produce deterministic results with seeded random', () => {
      const campaign = createCampaignWithUnits(4);
      const seed1 = createSeededRandom(99);
      const seed2 = createSeededRandom(99);

      const contracts1 = generateContracts(campaign, 3, seed1);
      const contracts2 = generateContracts(campaign, 3, seed2);

      // Same seed should produce same employer/target/type/system
      for (let i = 0; i < 3; i++) {
        expect(contracts1[i].employerId).toBe(contracts2[i].employerId);
        expect(contracts1[i].targetId).toBe(contracts2[i].targetId);
        expect(contracts1[i].systemId).toBe(contracts2[i].systemId);
        expect(contracts1[i].name).toBe(contracts2[i].name);
      }
    });
  });

  // ===========================================================================
  // acceptContract
  // ===========================================================================
  describe('acceptContract', () => {
    function createTestContract(id: string = 'contract-001'): IContract {
      return {
        id,
        name: 'Garrison Duty for House Davion',
        status: MissionStatus.PENDING,
        type: 'contract',
        systemId: 'New Avalon',
        scenarioIds: [],
        employerId: 'Davion',
        targetId: 'Liao',
        paymentTerms: {
          basePayment: new Money(1000000),
          successPayment: new Money(2000000),
          partialPayment: new Money(1500000),
          failurePayment: new Money(500000),
          salvagePercent: 50,
          transportPayment: Money.ZERO,
          supportPayment: Money.ZERO,
        },
        salvageRights: 'Integrated',
        commandRights: 'Independent',
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      };
    }

    it('should add contract to campaign missions', () => {
      const campaign = createTestCampaign();
      const contract = createTestContract();
      const updated = acceptContract(campaign, contract);

      expect(updated.missions.size).toBe(1);
      expect(updated.missions.has(contract.id)).toBe(true);
    });

    it('should set contract status to ACTIVE', () => {
      const campaign = createTestCampaign();
      const contract = createTestContract();
      const updated = acceptContract(campaign, contract);

      const accepted = updated.missions.get(contract.id) as IContract;
      expect(accepted.status).toBe(MissionStatus.ACTIVE);
    });

    it('should preserve original contract data', () => {
      const campaign = createTestCampaign();
      const contract = createTestContract();
      const updated = acceptContract(campaign, contract);

      const accepted = updated.missions.get(contract.id) as IContract;
      expect(accepted.name).toBe(contract.name);
      expect(accepted.employerId).toBe(contract.employerId);
      expect(accepted.targetId).toBe(contract.targetId);
      expect(accepted.systemId).toBe(contract.systemId);
      expect(accepted.paymentTerms.basePayment.amount).toBe(
        contract.paymentTerms.basePayment.amount
      );
    });

    it('should not modify original campaign', () => {
      const campaign = createTestCampaign();
      const contract = createTestContract();
      acceptContract(campaign, contract);

      expect(campaign.missions.size).toBe(0);
    });

    it('should throw error for duplicate contract', () => {
      const campaign = createTestCampaign();
      const contract = createTestContract();
      const updated = acceptContract(campaign, contract);

      expect(() => acceptContract(updated, contract)).toThrow(
        `Contract ${contract.id} already exists in campaign`
      );
    });

    it('should accept multiple different contracts', () => {
      const campaign = createTestCampaign();
      const contract1 = createTestContract('contract-001');
      const contract2 = createTestContract('contract-002');

      const updated1 = acceptContract(campaign, contract1);
      const updated2 = acceptContract(updated1, contract2);

      expect(updated2.missions.size).toBe(2);
      expect(updated2.missions.has('contract-001')).toBe(true);
      expect(updated2.missions.has('contract-002')).toBe(true);
    });

    it('should preserve existing missions when accepting contract', () => {
      const existingMissions = new Map<string, IMission>();
      existingMissions.set('mission-existing', {
        id: 'mission-existing',
        name: 'Existing Mission',
        status: MissionStatus.ACTIVE,
        type: 'mission',
        systemId: 'Terra',
        scenarioIds: [],
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });

      const campaign = createTestCampaign({ missions: existingMissions });
      const contract = createTestContract();
      const updated = acceptContract(campaign, contract);

      expect(updated.missions.size).toBe(2);
      expect(updated.missions.has('mission-existing')).toBe(true);
      expect(updated.missions.has(contract.id)).toBe(true);
    });

    it('should return valid ICampaign', () => {
      const campaign = createTestCampaign();
      const contract = createTestContract();
      const updated = acceptContract(campaign, contract);

      expect(updated.id).toBe(campaign.id);
      expect(updated.name).toBe(campaign.name);
      expect(updated.currentDate).toBe(campaign.currentDate);
      expect(updated.factionId).toBe(campaign.factionId);
      expect(updated.personnel).toBe(campaign.personnel);
      expect(updated.forces).toBe(campaign.forces);
    });
  });

  // ===========================================================================
  // Helper Functions
  // ===========================================================================
  describe('Helper Functions', () => {
    describe('generateContractName', () => {
      it('should generate name with "House" prefix for Inner Sphere factions', () => {
        expect(generateContractName('Garrison Duty', 'Davion')).toBe(
          'Garrison Duty for House Davion'
        );
        expect(generateContractName('Raid', 'Steiner')).toBe('Raid for House Steiner');
        expect(generateContractName('Recon', 'Liao')).toBe('Recon for House Liao');
        expect(generateContractName('Escort', 'Marik')).toBe('Escort for House Marik');
        expect(generateContractName('Extraction', 'Kurita')).toBe(
          'Extraction for House Kurita'
        );
      });

      it('should generate name with "Clan" prefix for Clan factions', () => {
        expect(generateContractName('Garrison Duty', 'Wolf')).toBe(
          'Garrison Duty for Clan Wolf'
        );
        expect(generateContractName('Raid', 'Jade Falcon')).toBe(
          'Raid for Clan Jade Falcon'
        );
        expect(generateContractName('Recon', 'Ghost Bear')).toBe(
          'Recon for Clan Ghost Bear'
        );
      });

      it('should generate name without prefix for mercenary factions', () => {
        expect(generateContractName('Garrison Duty', 'Kell Hounds')).toBe(
          'Garrison Duty for Kell Hounds'
        );
        expect(generateContractName('Raid', "Wolf's Dragoons")).toBe(
          "Raid for Wolf's Dragoons"
        );
      });
    });

    describe('generateRandomDuration', () => {
      it('should generate duration within valid range', () => {
        for (let i = 0; i < 100; i++) {
          const duration = generateRandomDuration();
          expect(duration).toBeGreaterThanOrEqual(DURATION_MIN_DAYS);
          expect(duration).toBeLessThanOrEqual(DURATION_MAX_DAYS);
        }
      });

      it('should generate integer values', () => {
        for (let i = 0; i < 50; i++) {
          const duration = generateRandomDuration();
          expect(Number.isInteger(duration)).toBe(true);
        }
      });

      it('should produce deterministic results with seeded random', () => {
        const seed1 = createSeededRandom(42);
        const seed2 = createSeededRandom(42);
        expect(generateRandomDuration(seed1)).toBe(generateRandomDuration(seed2));
      });
    });

    describe('generateRandomSalvagePercent', () => {
      it('should generate salvage percent within valid range', () => {
        for (let i = 0; i < 100; i++) {
          const salvage = generateRandomSalvagePercent();
          expect(salvage).toBeGreaterThanOrEqual(SALVAGE_MIN_PERCENT);
          expect(salvage).toBeLessThanOrEqual(SALVAGE_MAX_PERCENT);
        }
      });

      it('should generate integer values', () => {
        for (let i = 0; i < 50; i++) {
          const salvage = generateRandomSalvagePercent();
          expect(Number.isInteger(salvage)).toBe(true);
        }
      });
    });

    describe('randomContractType', () => {
      it('should return a valid contract type', () => {
        for (let i = 0; i < 50; i++) {
          const type = randomContractType();
          expect(CONTRACT_TYPES).toContain(type);
        }
      });

      it('should produce deterministic results with seeded random', () => {
        const seed1 = createSeededRandom(42);
        const seed2 = createSeededRandom(42);
        expect(randomContractType(seed1)).toBe(randomContractType(seed2));
      });
    });

    describe('randomEmployer', () => {
      it('should return a valid employer faction', () => {
        for (let i = 0; i < 50; i++) {
          const employer = randomEmployer();
          expect(EMPLOYER_FACTIONS).toContain(employer);
        }
      });
    });

    describe('randomTarget', () => {
      it('should return a valid target faction', () => {
        for (let i = 0; i < 50; i++) {
          const target = randomTarget('Davion');
          expect(EMPLOYER_FACTIONS).toContain(target);
        }
      });

      it('should never return the employer faction', () => {
        for (const employer of EMPLOYER_FACTIONS) {
          for (let i = 0; i < 20; i++) {
            const target = randomTarget(employer);
            expect(target).not.toBe(employer);
          }
        }
      });
    });

    describe('randomSystem', () => {
      it('should return a valid system', () => {
        for (let i = 0; i < 50; i++) {
          const system = randomSystem();
          expect(SYSTEMS).toContain(system);
        }
      });
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================
  describe('Integration', () => {
    it('should generate and accept contracts end-to-end', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, ['force-1'], [])
      );
      forces.set(
        'force-1',
        createTestForce('force-1', 'Alpha', 'force-root', [], ['unit-1', 'unit-2', 'unit-3', 'unit-4'])
      );

      let campaign = createTestCampaign({ forces });

      // Generate contracts
      const contracts = generateContracts(campaign, 3, createSeededRandom(42));
      expect(contracts).toHaveLength(3);

      // Accept first contract
      campaign = acceptContract(campaign, contracts[0]);
      expect(campaign.missions.size).toBe(1);

      // Accept second contract
      campaign = acceptContract(campaign, contracts[1]);
      expect(campaign.missions.size).toBe(2);

      // Verify accepted contracts are ACTIVE
      const accepted1 = campaign.missions.get(contracts[0].id) as IContract;
      const accepted2 = campaign.missions.get(contracts[1].id) as IContract;
      expect(accepted1.status).toBe(MissionStatus.ACTIVE);
      expect(accepted2.status).toBe(MissionStatus.ACTIVE);
    });

    it('should calculate correct payment for 12-unit force', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, ['force-1', 'force-2', 'force-3'], [])
      );
      forces.set(
        'force-1',
        createTestForce('force-1', 'Alpha', 'force-root', [], ['u1', 'u2', 'u3', 'u4'])
      );
      forces.set(
        'force-2',
        createTestForce('force-2', 'Beta', 'force-root', [], ['u5', 'u6', 'u7', 'u8'])
      );
      forces.set(
        'force-3',
        createTestForce('force-3', 'Gamma', 'force-root', [], ['u9', 'u10', 'u11', 'u12'])
      );

      const campaign = createTestCampaign({ forces });

      // 12 units * 1000 BV/unit = 12000 BV
      expect(calculateForceBV(campaign)).toBe(12000);

      const contracts = generateContracts(campaign, 1, createSeededRandom(42));
      const terms = contracts[0].paymentTerms;

      // Base: 12000 BV * 1000 C-bills/BV = 12,000,000 C-bills
      expect(terms.basePayment.amount).toBe(12000000);
      // Success: base * 2 = 24,000,000
      expect(terms.successPayment.amount).toBe(24000000);
      // Partial: base * 1.5 = 18,000,000
      expect(terms.partialPayment.amount).toBe(18000000);
      // Failure: base * 0.5 = 6,000,000
      expect(terms.failurePayment.amount).toBe(6000000);
    });

    it('should generate variety across many contracts', () => {
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['u1', 'u2', 'u3', 'u4'])
      );
      const campaign = createTestCampaign({ forces });

      const contracts = generateContracts(campaign, 50, createSeededRandom(123));

      // Should have variety in employers
      const employers = new Set(contracts.map((c) => c.employerId));
      expect(employers.size).toBeGreaterThan(1);

      // Should have variety in targets
      const targets = new Set(contracts.map((c) => c.targetId));
      expect(targets.size).toBeGreaterThan(1);

      // Should have variety in systems
      const systems = new Set(contracts.map((c) => c.systemId));
      expect(systems.size).toBeGreaterThan(1);

      // Should have variety in contract types (check names)
      const names = new Set(contracts.map((c) => c.name));
      expect(names.size).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Constants
  // ===========================================================================
  describe('Constants', () => {
    it('should have 5 contract types', () => {
      expect(CONTRACT_TYPES).toHaveLength(5);
    });

    it('should have 10 employer factions', () => {
      expect(EMPLOYER_FACTIONS).toHaveLength(10);
    });

    it('should have 15 systems', () => {
      expect(SYSTEMS).toHaveLength(15);
    });

    it('should have correct BV placeholder', () => {
      expect(PLACEHOLDER_BV_PER_UNIT).toBe(1000);
    });

    it('should have correct C-bills per BV', () => {
      expect(CBILLS_PER_BV).toBe(1000);
    });

    it('should have correct payment multipliers', () => {
      expect(PAYMENT_MULTIPLIERS.success).toBe(2.0);
      expect(PAYMENT_MULTIPLIERS.partial).toBe(1.5);
      expect(PAYMENT_MULTIPLIERS.failure).toBe(0.5);
    });

    it('should have valid duration range', () => {
      expect(DURATION_MIN_DAYS).toBe(30);
      expect(DURATION_MAX_DAYS).toBe(90);
      expect(DURATION_MIN_DAYS).toBeLessThan(DURATION_MAX_DAYS);
    });

    it('should have valid salvage range', () => {
      expect(SALVAGE_MIN_PERCENT).toBe(40);
      expect(SALVAGE_MAX_PERCENT).toBe(60);
      expect(SALVAGE_MIN_PERCENT).toBeLessThan(SALVAGE_MAX_PERCENT);
    });

    it('should have frozen constant arrays', () => {
      expect(Object.isFrozen(CONTRACT_TYPES)).toBe(true);
      expect(Object.isFrozen(EMPLOYER_FACTIONS)).toBe(true);
      expect(Object.isFrozen(SYSTEMS)).toBe(true);
    });
  });
});
