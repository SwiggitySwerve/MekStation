/**
 * Campaign System Integration Tests
 *
 * Verifies the complete campaign backend flow works end-to-end:
 * - Create campaign with options
 * - Add personnel with skills and injuries
 * - Create force hierarchy (battalion → company → lance)
 * - Generate and accept contracts
 * - Advance days with healing, contract expiration, and costs
 * - Financial tracking and persistence simulation
 *
 * Uses the same test fixture patterns as dayAdvancement.test.ts
 * and contractMarket.test.ts.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { IPerson, createInjury } from '@/types/campaign/Person';
import { IForce } from '@/types/campaign/Force';
import { IMission, IContract, createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { IFinances } from '@/types/campaign/IFinances';
import {
  PersonnelStatus,
  MissionStatus,
  CampaignPersonnelRole,
  ForceType,
  FormationLevel,
} from '@/types/campaign/enums';

import { generateContracts, acceptContract, calculateForceBV } from '../contractMarket';
import {
  advanceDay,
  DEFAULT_DAILY_SALARY,
  DEFAULT_DAILY_MAINTENANCE,
} from '../dayAdvancement';
import {
  recordTransaction,
  getBalance,
  calculateDailyCosts,
  processContractPayment,
} from '@/lib/finances/FinanceService';
import { TransactionType } from '@/types/campaign/Transaction';

// =============================================================================
// Test Fixtures (matching patterns from sibling test files)
// =============================================================================

function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-001',
    name: 'John Smith',
    callsign: 'Hammer',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3025-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 200,
    xpSpent: 100,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
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
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
   return {
      id: 'campaign-001',
      name: 'Test Mercenary Company',
      currentDate: new Date('3025-06-15T00:00:00Z'),
      factionId: 'mercenary',
      personnel: new Map<string, IPerson>(),
      forces: new Map<string, IForce>(),
      rootForceId: 'force-root',
      missions: new Map<string, IMission>(),
      finances: { transactions: [], balance: new Money(1000000) },
      factionStandings: {},
      shoppingList: { items: [] },
      options: createDefaultCampaignOptions(),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
}

/**
 * Deterministic random for reproducible contract generation.
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Campaign System Integration', () => {
  describe('Complete Campaign Flow', () => {
    it('should support full campaign lifecycle: create → personnel → forces → contracts → advance', () => {
      // ---------------------------------------------------------------
      // 1. Create campaign
      // ---------------------------------------------------------------
      const campaign = createTestCampaign();

      expect(campaign.name).toBe('Test Mercenary Company');
      expect(campaign.factionId).toBe('mercenary');
      expect(campaign.personnel.size).toBe(0);
      expect(campaign.forces.size).toBe(0);
      expect(campaign.missions.size).toBe(0);
      expect(campaign.finances.balance.amount).toBe(1000000);

      // ---------------------------------------------------------------
      // 2. Add personnel with different roles and statuses
      // ---------------------------------------------------------------
      const commander = createTestPerson({
        id: 'cmd-001',
        name: 'Commander Kerensky',
        callsign: 'Alpha',
        primaryRole: CampaignPersonnelRole.PILOT,
        rank: 'Captain',
        pilotSkills: { gunnery: 3, piloting: 4 },
        isCommander: true,
      });

      const pilot2 = createTestPerson({
        id: 'pilot-002',
        name: 'Jane Doe',
        callsign: 'Viper',
        primaryRole: CampaignPersonnelRole.PILOT,
        pilotSkills: { gunnery: 4, piloting: 5 },
      });

      const tech = createTestPerson({
        id: 'tech-001',
        name: 'Bob Wrench',
        primaryRole: CampaignPersonnelRole.TECH,
        rank: 'Technician',
      });

      const doctor = createTestPerson({
        id: 'doc-001',
        name: 'Dr. Allison',
        primaryRole: CampaignPersonnelRole.DOCTOR,
        rank: 'Doctor',
      });

      campaign.personnel.set(commander.id, commander);
      campaign.personnel.set(pilot2.id, pilot2);
      campaign.personnel.set(tech.id, tech);
      campaign.personnel.set(doctor.id, doctor);

      expect(campaign.personnel.size).toBe(4);
      expect(campaign.personnel.get('cmd-001')!.isCommander).toBe(true);
      expect(campaign.personnel.get('cmd-001')!.pilotSkills.gunnery).toBe(3);
      expect(campaign.personnel.get('pilot-002')!.pilotSkills.piloting).toBe(5);
      expect(campaign.personnel.get('tech-001')!.primaryRole).toBe(CampaignPersonnelRole.TECH);
      expect(campaign.personnel.get('doc-001')!.primaryRole).toBe(CampaignPersonnelRole.DOCTOR);

      // ---------------------------------------------------------------
      // 3. Create force hierarchy: Root → Battalion → Company → Lance
      // ---------------------------------------------------------------
      const forces = new Map<string, IForce>();

      const rootForce = createTestForce(
        'force-root',
        'Test Mercenary Company',
        undefined,
        ['force-battalion'],
        []
      );
      forces.set(rootForce.id, rootForce);

      const battalion = createTestForce(
        'force-battalion',
        '1st Battalion',
        'force-root',
        ['force-alpha-co', 'force-bravo-co'],
        []
      );
      forces.set(battalion.id, battalion);

      const alphaCo = createTestForce(
        'force-alpha-co',
        'Alpha Company',
        'force-battalion',
        ['force-lance-1'],
        []
      );
      forces.set(alphaCo.id, alphaCo);

      const bravoCo = createTestForce(
        'force-bravo-co',
        'Bravo Company',
        'force-battalion',
        [],
        ['unit-5', 'unit-6', 'unit-7', 'unit-8']
      );
      forces.set(bravoCo.id, bravoCo);

      const lance1 = createTestForce(
        'force-lance-1',
        'Alpha Lance',
        'force-alpha-co',
        [],
        ['unit-1', 'unit-2', 'unit-3', 'unit-4']
      );
      forces.set(lance1.id, lance1);

      // Build campaign with forces
      const campaignWithForces: ICampaign = {
        ...campaign,
        forces,
        rootForceId: 'force-root',
      };

      expect(campaignWithForces.forces.size).toBe(5);
      expect(battalion.parentForceId).toBe('force-root');
      expect(alphaCo.parentForceId).toBe('force-battalion');
      expect(lance1.parentForceId).toBe('force-alpha-co');

      // Verify BV calculation traverses hierarchy
      const totalBV = calculateForceBV(campaignWithForces);
      // 8 units total (4 in lance1 + 4 in bravoCo) × 1000 BV each
      expect(totalBV).toBe(8000);

      // ---------------------------------------------------------------
      // 4. Generate and accept contracts
      // ---------------------------------------------------------------
      const availableContracts = generateContracts(campaignWithForces, 5, createSeededRandom(42));

      expect(availableContracts.length).toBe(5);
      expect(availableContracts[0].type).toBe('contract');
      expect(availableContracts[0].status).toBe(MissionStatus.PENDING);
      expect(availableContracts[0].employerId).toBeDefined();
      expect(availableContracts[0].targetId).toBeDefined();
      expect(availableContracts[0].paymentTerms).toBeDefined();
      expect(availableContracts[0].paymentTerms.basePayment.amount).toBe(8000000); // 8000 BV × 1000

      // Employer and target must be different
      expect(availableContracts[0].employerId).not.toBe(availableContracts[0].targetId);

      // Accept first contract
      const selectedContract = availableContracts[0];
      const activeCampaign = acceptContract(campaignWithForces, selectedContract);

      expect(activeCampaign.missions.size).toBe(1);
      expect(activeCampaign.missions.has(selectedContract.id)).toBe(true);

      const acceptedContract = activeCampaign.missions.get(selectedContract.id) as IContract;
      expect(acceptedContract.status).toBe(MissionStatus.ACTIVE);
      expect(acceptedContract.employerId).toBe(selectedContract.employerId);

      // ---------------------------------------------------------------
      // 5. Advance day — verify healing, costs, and date progression
      // ---------------------------------------------------------------
      const dayReport = advanceDay(activeCampaign);

      expect(dayReport.date.getTime()).toBe(activeCampaign.currentDate.getTime());
      expect(dayReport.campaign.currentDate.getUTCDate()).toBe(16); // 15 → 16
      expect(dayReport.costs).toBeDefined();
      expect(dayReport.costs.personnelCount).toBe(4); // All 4 are active (not KIA/RETIRED/DESERTED)
      expect(dayReport.costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 4);
      expect(dayReport.costs.unitCount).toBe(8);
      expect(dayReport.costs.maintenance.amount).toBe(DEFAULT_DAILY_MAINTENANCE * 8);
      expect(dayReport.costs.total.amount).toBe(DEFAULT_DAILY_SALARY * 4 + DEFAULT_DAILY_MAINTENANCE * 8);

      // ---------------------------------------------------------------
      // 6. Verify financial transactions recorded
      // ---------------------------------------------------------------
      const finalFinances = dayReport.campaign.finances;
      expect(finalFinances.transactions.length).toBe(2); // salary + maintenance
      expect(finalFinances.transactions[0].description).toContain('salaries');
      expect(finalFinances.transactions[1].description).toContain('maintenance');

      const expectedDeduction = DEFAULT_DAILY_SALARY * 4 + DEFAULT_DAILY_MAINTENANCE * 8;
      expect(finalFinances.balance.amount).toBe(1000000 - expectedDeduction);
    });
  });

  describe('Campaign Persistence Simulation', () => {
    it('should serialize and deserialize campaign state', () => {
      const campaign = createTestCampaign();

      const person = createTestPerson({
        id: 'persist-001',
        name: 'Persistent Person',
      });
      campaign.personnel.set(person.id, person);

      // Simulate serialization (what Zustand persist does)
      const serialized = {
        ...campaign,
        personnel: Array.from(campaign.personnel.entries()),
        forces: Array.from(campaign.forces.entries()),
        missions: Array.from(campaign.missions.entries()),
        currentDate: campaign.currentDate.toISOString(),
      };

      // Simulate deserialization
      const deserialized = {
        ...serialized,
        personnel: new Map(serialized.personnel),
        forces: new Map(serialized.forces),
        missions: new Map(serialized.missions),
        currentDate: new Date(serialized.currentDate),
      };

      expect(deserialized.personnel.size).toBe(1);
      expect(deserialized.personnel.get(person.id)?.name).toBe('Persistent Person');
      expect(deserialized.currentDate).toBeInstanceOf(Date);
      expect(deserialized.currentDate.getUTCFullYear()).toBe(3025);
    });
  });

  describe('Multi-Day Campaign Progression', () => {
    it('should heal injuries over multiple days', () => {
      const injury = createInjury({
        id: 'inj-leg',
        type: 'Broken Leg',
        location: 'Left Leg',
        severity: 3,
        daysToHeal: 5,
        permanent: false,
        acquired: new Date('3025-06-10'),
      });

      const wounded = createTestPerson({
        id: 'wounded-001',
        name: 'Wounded Warrior',
        status: PersonnelStatus.WOUNDED,
        injuries: [injury],
        daysToWaitForHealing: 0,
      });

      const personnel = new Map<string, IPerson>();
      personnel.set(wounded.id, wounded);

      let campaign = createTestCampaign({ personnel });

      // Advance 5 days — injury should heal completely
      for (let i = 0; i < 5; i++) {
        const report = advanceDay(campaign);
        campaign = report.campaign;
      }

      // Verify date advanced by 5 days
      const daysDiff = Math.floor(
        (campaign.currentDate.getTime() - new Date('3025-06-15T00:00:00Z').getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(5);

      // Verify injury fully healed and person returned to active
      const healedPerson = campaign.personnel.get('wounded-001')!;
      expect(healedPerson.injuries).toHaveLength(0);
      expect(healedPerson.status).toBe(PersonnelStatus.ACTIVE);
    });

    it('should not heal permanent injuries', () => {
      const permanentInjury = createInjury({
        id: 'inj-perm',
        type: 'Lost Limb',
        location: 'Right Arm',
        severity: 5,
        daysToHeal: 999,
        permanent: true,
        acquired: new Date('3025-01-01'),
      });

      const person = createTestPerson({
        id: 'perm-001',
        name: 'Scarred Veteran',
        status: PersonnelStatus.WOUNDED,
        injuries: [permanentInjury],
        daysToWaitForHealing: 0,
      });

      const personnel = new Map<string, IPerson>();
      personnel.set(person.id, person);

      let campaign = createTestCampaign({ personnel });

      // Advance 10 days
      for (let i = 0; i < 10; i++) {
        const report = advanceDay(campaign);
        campaign = report.campaign;
      }

      const updatedPerson = campaign.personnel.get('perm-001')!;
      // Permanent injury persists
      expect(updatedPerson.injuries).toHaveLength(1);
      expect(updatedPerson.injuries[0].permanent).toBe(true);
      expect(updatedPerson.injuries[0].daysToHeal).toBe(999);
      // Person returns to active since only permanent injuries remain
      expect(updatedPerson.status).toBe(PersonnelStatus.ACTIVE);
    });
  });

  describe('Contract Lifecycle', () => {
    it('should handle contract from generation through expiration', () => {
      // Setup campaign with units for BV calculation
      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['unit-1', 'unit-2', 'unit-3', 'unit-4'])
      );

      const campaign = createTestCampaign({ forces });

      // Generate contracts
      const contracts = generateContracts(campaign, 3, createSeededRandom(99));
      expect(contracts.length).toBe(3);

      // All contracts should be PENDING
      contracts.forEach((c) => {
        expect(c.status).toBe(MissionStatus.PENDING);
        expect(c.type).toBe('contract');
      });

      // Accept first contract
      const contract = contracts[0];
      const updatedCampaign = acceptContract(campaign, contract);

      expect(updatedCampaign.missions.size).toBe(1);
      const activeContract = updatedCampaign.missions.get(contract.id) as IContract;
      expect(activeContract.status).toBe(MissionStatus.ACTIVE);

      // Simulate contract completion by setting status to SUCCESS
      const completedContract: IContract = {
        ...activeContract,
        status: MissionStatus.SUCCESS,
      };
      updatedCampaign.missions.set(contract.id, completedContract);

      const finalContract = updatedCampaign.missions.get(contract.id) as IContract;
      expect(finalContract.status).toBe(MissionStatus.SUCCESS);
    });

    it('should auto-expire contracts when advancing past end date', () => {
      // Create a contract that ends on 3025-06-15 (same as campaign date)
      const expiredContract = createContract({
        id: 'contract-expired',
        name: 'Expired Garrison',
        employerId: 'Davion',
        targetId: 'Liao',
        status: MissionStatus.ACTIVE,
        startDate: '3025-01-01',
        endDate: '3025-06-15T00:00:00Z', // Same as campaign date
      });

      const missions = new Map<string, IMission>();
      missions.set(expiredContract.id, expiredContract);

      const campaign = createTestCampaign({ missions });

      // Advance one day — contract should expire
      const report = advanceDay(campaign);

      expect(report.expiredContracts.length).toBe(1);
      expect(report.expiredContracts[0].contractId).toBe('contract-expired');
      expect(report.expiredContracts[0].newStatus).toBe(MissionStatus.SUCCESS);

      const updatedContract = report.campaign.missions.get('contract-expired') as IContract;
      expect(updatedContract.status).toBe(MissionStatus.SUCCESS);
    });
  });

  describe('Force Organization', () => {
    it('should support complex force hierarchies with BV calculation', () => {
      const forces = new Map<string, IForce>();

      // Root → Battalion → 3 Companies → 3 Lances each (with 4 units per lance)
      forces.set(
        'force-root',
        createTestForce('force-root', 'Merc Company', undefined, ['force-bn'], [])
      );

      forces.set(
        'force-bn',
        createTestForce('force-bn', '1st Battalion', 'force-root', ['force-co-a', 'force-co-b', 'force-co-c'], [])
      );

      // Alpha Company with 2 lances
      forces.set(
        'force-co-a',
        createTestForce('force-co-a', 'Alpha Company', 'force-bn', ['force-lance-a1', 'force-lance-a2'], [])
      );
      forces.set(
        'force-lance-a1',
        createTestForce('force-lance-a1', 'Alpha Lance 1', 'force-co-a', [], ['u1', 'u2', 'u3', 'u4'])
      );
      forces.set(
        'force-lance-a2',
        createTestForce('force-lance-a2', 'Alpha Lance 2', 'force-co-a', [], ['u5', 'u6', 'u7', 'u8'])
      );

      // Bravo Company with 1 lance
      forces.set(
        'force-co-b',
        createTestForce('force-co-b', 'Bravo Company', 'force-bn', ['force-lance-b1'], [])
      );
      forces.set(
        'force-lance-b1',
        createTestForce('force-lance-b1', 'Bravo Lance 1', 'force-co-b', [], ['u9', 'u10', 'u11', 'u12'])
      );

      // Charlie Company — direct units (no sub-lances)
      forces.set(
        'force-co-c',
        createTestForce('force-co-c', 'Charlie Company', 'force-bn', [], ['u13', 'u14', 'u15', 'u16'])
      );

      const campaign = createTestCampaign({ forces });

      // Verify hierarchy
      expect(campaign.forces.size).toBe(8);
      expect(forces.get('force-bn')!.parentForceId).toBe('force-root');
      expect(forces.get('force-co-a')!.parentForceId).toBe('force-bn');
      expect(forces.get('force-lance-a1')!.parentForceId).toBe('force-co-a');

      // Verify BV: 16 units × 1000 BV = 16000
      const bv = calculateForceBV(campaign);
      expect(bv).toBe(16000);
    });
  });

  describe('Financial Integration', () => {
    it('should track income and expenses through FinanceService', () => {
      let finances: IFinances = { transactions: [], balance: Money.ZERO };

      // Record starting funds
      finances = recordTransaction(finances, {
        id: 'tx-start',
        type: TransactionType.Income,
        amount: new Money(5000000),
        date: new Date('3025-06-15'),
        description: 'Starting funds',
      });

      expect(getBalance(finances).amount).toBe(5000000);
      expect(finances.balance.amount).toBe(5000000);

      // Record salary expense
      finances = recordTransaction(finances, {
        id: 'tx-salary',
        type: TransactionType.Expense,
        amount: new Money(200),
        date: new Date('3025-06-15'),
        description: 'Daily salaries',
      });

      expect(getBalance(finances).amount).toBe(4999800);
      expect(finances.transactions.length).toBe(2);

      // Record maintenance expense
      finances = recordTransaction(finances, {
        id: 'tx-maint',
        type: TransactionType.Maintenance,
        amount: new Money(800),
        date: new Date('3025-06-15'),
        description: 'Daily maintenance',
      });

      expect(getBalance(finances).amount).toBe(4999000);
      expect(finances.transactions.length).toBe(3);
    });

    it('should calculate daily costs using FinanceService', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));
      personnel.set('p2', createTestPerson({ id: 'p2', status: PersonnelStatus.WOUNDED }));
      personnel.set('p3', createTestPerson({ id: 'p3', status: PersonnelStatus.KIA }));

      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['unit-1', 'unit-2'])
      );

      const campaign = createTestCampaign({ personnel, forces });
      const costs = calculateDailyCosts(campaign);

      // p1 (ACTIVE) and p2 (WOUNDED) count for salary; p3 (KIA) excluded
      expect(costs.personnelCount).toBe(2);
      expect(costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2);

      // 2 units for maintenance
      expect(costs.unitCount).toBe(2);
      expect(costs.maintenance.amount).toBe(DEFAULT_DAILY_MAINTENANCE * 2);

      expect(costs.total.amount).toBe(DEFAULT_DAILY_SALARY * 2 + DEFAULT_DAILY_MAINTENANCE * 2);
    });

    it('should process contract payment on completion', () => {
      const completedContract = createContract({
        id: 'contract-done',
        name: 'Completed Garrison',
        employerId: 'Steiner',
        targetId: 'Kurita',
        status: MissionStatus.SUCCESS,
        paymentTerms: {
          basePayment: new Money(100000),
          successPayment: new Money(200000),
          partialPayment: new Money(100000),
          failurePayment: new Money(50000),
          salvagePercent: 50,
          transportPayment: new Money(10000),
          supportPayment: new Money(5000),
        },
      });

      const campaign = createTestCampaign();
      const updatedFinances = processContractPayment(campaign, completedContract);

      // Success payout = base + success + transport + support = 100k + 200k + 10k + 5k = 315k
      expect(updatedFinances.transactions.length).toBe(1);
      expect(updatedFinances.balance.amount).toBe(1000000 + 315000);
    });
  });

  describe('Combined Healing + Costs + Contracts Over Multiple Days', () => {
    it('should process all systems together over 3 days', () => {
      // Setup: wounded person, active person, units, and an expiring contract
      const injury = createInjury({
        id: 'inj-arm',
        type: 'Broken Arm',
        location: 'Left Arm',
        severity: 2,
        daysToHeal: 2,
        permanent: false,
        acquired: new Date('3025-06-10'),
      });

      const personnel = new Map<string, IPerson>();
      personnel.set(
        'p-wounded',
        createTestPerson({
          id: 'p-wounded',
          name: 'Wounded Pilot',
          status: PersonnelStatus.WOUNDED,
          injuries: [injury],
          daysToWaitForHealing: 0,
        })
      );
      personnel.set(
        'p-active',
        createTestPerson({
          id: 'p-active',
          name: 'Active Pilot',
          status: PersonnelStatus.ACTIVE,
        })
      );

      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['unit-1'])
      );

      // Contract that expires on day 2 (3025-06-16)
      const expiringContract = createContract({
        id: 'contract-expiring',
        name: 'Short Contract',
        employerId: 'Davion',
        targetId: 'Liao',
        status: MissionStatus.ACTIVE,
        endDate: '3025-06-16T00:00:00Z',
      });
      const missions = new Map<string, IMission>();
      missions.set(expiringContract.id, expiringContract);

      let campaign = createTestCampaign({
        personnel,
        forces,
        missions,
        finances: { transactions: [], balance: new Money(100000) },
      });

      // Day 1: injury 2→1, contract still active, costs deducted
      let report = advanceDay(campaign);
      expect(report.campaign.personnel.get('p-wounded')!.injuries[0].daysToHeal).toBe(1);
      expect(report.campaign.personnel.get('p-wounded')!.status).toBe(PersonnelStatus.WOUNDED);
      expect(report.expiredContracts.length).toBe(0);
      expect(report.costs.personnelCount).toBe(2);
      campaign = report.campaign;

      // Day 2: injury heals (1→0), contract expires (endDate = 3025-06-16, current = 3025-06-16)
      report = advanceDay(campaign);
      expect(report.campaign.personnel.get('p-wounded')!.injuries).toHaveLength(0);
      expect(report.campaign.personnel.get('p-wounded')!.status).toBe(PersonnelStatus.ACTIVE);
      expect(report.healedPersonnel.length).toBe(1);
      expect(report.healedPersonnel[0].returnedToActive).toBe(true);
      expect(report.expiredContracts.length).toBe(1);
      expect(report.expiredContracts[0].contractId).toBe('contract-expiring');
      campaign = report.campaign;

      // Day 3: all personnel active, contract already completed
      report = advanceDay(campaign);
      expect(report.healedPersonnel.length).toBe(0);
      expect(report.expiredContracts.length).toBe(0);
      expect(report.costs.personnelCount).toBe(2);

      // Verify 3 days of costs accumulated
      const totalTransactions = report.campaign.finances.transactions.length;
      // Each day: 1 salary tx + 1 maintenance tx = 2 per day × 3 days = 6
      expect(totalTransactions).toBe(6);

      // Verify date advanced 3 days
      expect(report.campaign.currentDate.getUTCDate()).toBe(18); // 15 + 3
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty campaign with no personnel, forces, or missions', () => {
      const campaign = createTestCampaign();
      const report = advanceDay(campaign);

      expect(report.healedPersonnel).toHaveLength(0);
      expect(report.expiredContracts).toHaveLength(0);
      expect(report.costs.total.amount).toBe(0);
      expect(report.costs.personnelCount).toBe(0);
      expect(report.costs.unitCount).toBe(0);
      expect(report.campaign.currentDate.getUTCDate()).toBe(16);
    });

    it('should allow balance to go negative', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({ id: 'p1' }));

      const forces = new Map<string, IForce>();
      forces.set(
        'force-root',
        createTestForce('force-root', 'Root', undefined, [], ['unit-1'])
      );

      const campaign = createTestCampaign({
        personnel,
        forces,
        finances: { transactions: [], balance: new Money(0) },
      });

      const report = advanceDay(campaign);
      expect(report.campaign.finances.balance.isNegative()).toBe(true);
    });

    it('should reject duplicate contract acceptance', () => {
      const contract = createContract({
        id: 'contract-dup',
        name: 'Duplicate Test',
        employerId: 'Davion',
        targetId: 'Liao',
      });

      const campaign = createTestCampaign();
      const updated = acceptContract(campaign, contract);

      expect(() => acceptContract(updated, contract)).toThrow(
        `Contract ${contract.id} already exists in campaign`
      );
    });

    it('should advance date across month and year boundaries', () => {
      // Month boundary
      let campaign = createTestCampaign({
        currentDate: new Date('3025-01-31T00:00:00Z'),
      });
      let report = advanceDay(campaign);
      expect(report.campaign.currentDate.getUTCMonth()).toBe(1); // February
      expect(report.campaign.currentDate.getUTCDate()).toBe(1);

      // Year boundary
      campaign = createTestCampaign({
        currentDate: new Date('3025-12-31T00:00:00Z'),
      });
      report = advanceDay(campaign);
      expect(report.campaign.currentDate.getUTCFullYear()).toBe(3026);
      expect(report.campaign.currentDate.getUTCMonth()).toBe(0); // January
      expect(report.campaign.currentDate.getUTCDate()).toBe(1);
    });
  });
});
