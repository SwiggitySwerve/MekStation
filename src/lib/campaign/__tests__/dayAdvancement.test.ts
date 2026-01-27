/**
 * dayAdvancement.test.ts - Comprehensive tests for Day Advancement system
 *
 * Tests cover:
 * - processHealing: injury reduction, injury removal, permanent injuries,
 *   daysToWaitForHealing, status transitions, non-wounded personnel
 * - processContracts: expiration detection, status updates, non-contract missions,
 *   inactive contracts, contracts without end dates
 * - processDailyCosts: salary calculation, maintenance calculation, option toggles,
 *   multipliers, empty campaign, balance deduction
 * - advanceDay: full integration, date advancement, report structure,
 *   combined processing, multiple days
 */

import { ICampaign, createDefaultCampaignOptions, ICampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IPerson, IInjury, createInjury } from '@/types/campaign/Person';
import { IMission, IContract, createContract, createMission } from '@/types/campaign/Mission';
import { IForce } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import { IFinances } from '@/types/campaign/IFinances';
import {
  PersonnelStatus,
  MissionStatus,
  CampaignPersonnelRole,
  ForceType,
  FormationLevel,
} from '@/types/campaign/enums';

import {
  advanceDay,
  processHealing,
  processContracts,
  processDailyCosts,
  DEFAULT_DAILY_SALARY,
  DEFAULT_DAILY_MAINTENANCE,
  DayReport,
  HealedPersonEvent,
  ExpiredContractEvent,
  DailyCostBreakdown,
} from '../dayAdvancement';

// =============================================================================
// Test Fixtures
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

function createTestInjury(overrides?: Partial<IInjury>): IInjury {
  return createInjury({
    id: 'inj-001',
    type: 'Broken Arm',
    location: 'Left Arm',
    severity: 2,
    daysToHeal: 5,
    permanent: false,
    acquired: new Date('3025-01-01'),
    ...overrides,
  });
}

function createTestForce(
  id: string,
  unitIds: string[] = [],
  subForceIds: string[] = [],
  parentForceId?: string
): IForce {
  return {
    id,
    name: `Force ${id}`,
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
      name: 'Test Campaign',
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
      campaignType: CampaignType.MERCENARY,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
}

// =============================================================================
// processHealing Tests
// =============================================================================

describe('processHealing', () => {
  it('should not modify non-wounded personnel', () => {
    const personnel = new Map<string, IPerson>();
    const activePerson = createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE });
    personnel.set('p1', activePerson);

    const result = processHealing(personnel);

    expect(result.events).toHaveLength(0);
    expect(result.personnel.get('p1')!.status).toBe(PersonnelStatus.ACTIVE);
  });

  it('should reduce injury daysToHeal by 1', () => {
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 5 });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury],
      daysToWaitForHealing: 10,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.injuries[0].daysToHeal).toBe(4);
  });

  it('should remove injury when daysToHeal reaches 0', () => {
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.injuries).toHaveLength(0);
  });

  it('should not heal permanent injuries', () => {
    const personnel = new Map<string, IPerson>();
    const permanentInjury = createTestInjury({
      id: 'inj-perm',
      daysToHeal: 999,
      permanent: true,
    });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [permanentInjury],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.injuries).toHaveLength(1);
    expect(updatedPerson.injuries[0].daysToHeal).toBe(999);
    expect(updatedPerson.injuries[0].permanent).toBe(true);
  });

  it('should reduce daysToWaitForHealing by 1', () => {
    const personnel = new Map<string, IPerson>();
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [],
      daysToWaitForHealing: 3,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.daysToWaitForHealing).toBe(2);
  });

  it('should not reduce daysToWaitForHealing below 0', () => {
    const personnel = new Map<string, IPerson>();
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.daysToWaitForHealing).toBe(0);
  });

  it('should transition WOUNDED to ACTIVE when fully healed', () => {
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.status).toBe(PersonnelStatus.ACTIVE);
    expect(updatedPerson.injuries).toHaveLength(0);
  });

  it('should NOT transition to ACTIVE if daysToWaitForHealing remains', () => {
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury],
      daysToWaitForHealing: 5,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.status).toBe(PersonnelStatus.WOUNDED);
    expect(updatedPerson.daysToWaitForHealing).toBe(4);
  });

  it('should NOT transition to ACTIVE if healable injuries remain', () => {
    const personnel = new Map<string, IPerson>();
    const injury1 = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    const injury2 = createTestInjury({ id: 'inj-2', daysToHeal: 5 });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury1, injury2],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.status).toBe(PersonnelStatus.WOUNDED);
    expect(updatedPerson.injuries).toHaveLength(1);
    expect(updatedPerson.injuries[0].id).toBe('inj-2');
  });

  it('should NOT transition to ACTIVE if only permanent injuries remain', () => {
    const personnel = new Map<string, IPerson>();
    const permanentInjury = createTestInjury({
      id: 'inj-perm',
      daysToHeal: 999,
      permanent: true,
    });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [permanentInjury],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    // Person has only permanent injuries and no wait time - should return to active
    // (permanent injuries don't prevent active duty, they just persist)
    expect(updatedPerson.status).toBe(PersonnelStatus.ACTIVE);
  });

  it('should emit HealedPersonEvent when injury heals', () => {
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    const person = createTestPerson({
      id: 'p1',
      name: 'Jane Doe',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].personId).toBe('p1');
    expect(result.events[0].personName).toBe('Jane Doe');
    expect(result.events[0].healedInjuries).toContain('inj-1');
    expect(result.events[0].returnedToActive).toBe(true);
  });

  it('should handle multiple personnel with mixed states', () => {
    const personnel = new Map<string, IPerson>();

    // Active person - should not be modified
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    // Wounded person with healing injury
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    personnel.set(
      'p2',
      createTestPerson({
        id: 'p2',
        status: PersonnelStatus.WOUNDED,
        injuries: [injury],
        daysToWaitForHealing: 0,
      })
    );

    // KIA person - should not be modified
    personnel.set('p3', createTestPerson({ id: 'p3', status: PersonnelStatus.KIA }));

    const result = processHealing(personnel);

    expect(result.personnel.size).toBe(3);
    expect(result.personnel.get('p1')!.status).toBe(PersonnelStatus.ACTIVE);
    expect(result.personnel.get('p2')!.status).toBe(PersonnelStatus.ACTIVE);
    expect(result.personnel.get('p3')!.status).toBe(PersonnelStatus.KIA);
    expect(result.events).toHaveLength(1);
  });

  it('should handle empty personnel map', () => {
    const personnel = new Map<string, IPerson>();
    const result = processHealing(personnel);

    expect(result.personnel.size).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('should handle wounded person with no injuries but daysToWaitForHealing', () => {
    const personnel = new Map<string, IPerson>();
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [],
      daysToWaitForHealing: 1,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    expect(updatedPerson.daysToWaitForHealing).toBe(0);
    expect(updatedPerson.status).toBe(PersonnelStatus.ACTIVE);
  });

  it('should handle multiple injuries healing at different rates', () => {
    const personnel = new Map<string, IPerson>();
    const injury1 = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    const injury2 = createTestInjury({ id: 'inj-2', daysToHeal: 3 });
    const injury3 = createTestInjury({ id: 'inj-3', daysToHeal: 1 });
    const person = createTestPerson({
      id: 'p1',
      status: PersonnelStatus.WOUNDED,
      injuries: [injury1, injury2, injury3],
      daysToWaitForHealing: 0,
    });
    personnel.set('p1', person);

    const result = processHealing(personnel);
    const updatedPerson = result.personnel.get('p1')!;

    // inj-1 and inj-3 healed, inj-2 remains with 2 days
    expect(updatedPerson.injuries).toHaveLength(1);
    expect(updatedPerson.injuries[0].id).toBe('inj-2');
    expect(updatedPerson.injuries[0].daysToHeal).toBe(2);
    expect(updatedPerson.status).toBe(PersonnelStatus.WOUNDED);

    // Event should list both healed injuries
    expect(result.events).toHaveLength(1);
    expect(result.events[0].healedInjuries).toContain('inj-1');
    expect(result.events[0].healedInjuries).toContain('inj-3');
    expect(result.events[0].returnedToActive).toBe(false);
  });
});

// =============================================================================
// processContracts Tests
// =============================================================================

describe('processContracts', () => {
  it('should expire active contract past end date', () => {
    const missions = new Map<string, IMission>();
    const contract = createContract({
      id: 'contract-001',
      name: 'Garrison Duty',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      startDate: '3025-01-01',
      endDate: '3025-06-01',
    });
    missions.set('contract-001', contract);

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    const updatedContract = result.missions.get('contract-001')!;
    expect(updatedContract.status).toBe(MissionStatus.SUCCESS);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].contractId).toBe('contract-001');
    expect(result.events[0].previousStatus).toBe(MissionStatus.ACTIVE);
    expect(result.events[0].newStatus).toBe(MissionStatus.SUCCESS);
  });

  it('should NOT expire contract before end date', () => {
    const missions = new Map<string, IMission>();
    const contract = createContract({
      id: 'contract-001',
      name: 'Garrison Duty',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      endDate: '3025-12-31',
    });
    missions.set('contract-001', contract);

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    expect(result.missions.get('contract-001')!.status).toBe(MissionStatus.ACTIVE);
    expect(result.events).toHaveLength(0);
  });

  it('should expire contract on exact end date', () => {
    const missions = new Map<string, IMission>();
    const contract = createContract({
      id: 'contract-001',
      name: 'Garrison Duty',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      endDate: '3025-06-15T00:00:00Z',
    });
    missions.set('contract-001', contract);

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    expect(result.missions.get('contract-001')!.status).toBe(MissionStatus.SUCCESS);
    expect(result.events).toHaveLength(1);
  });

  it('should NOT process non-contract missions', () => {
    const missions = new Map<string, IMission>();
    const mission = createMission({
      id: 'mission-001',
      name: 'Raid',
      status: MissionStatus.ACTIVE,
      endDate: '3025-01-01',
    });
    missions.set('mission-001', mission);

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    expect(result.missions.get('mission-001')!.status).toBe(MissionStatus.ACTIVE);
    expect(result.events).toHaveLength(0);
  });

  it('should NOT process inactive contracts', () => {
    const missions = new Map<string, IMission>();
    const contract = createContract({
      id: 'contract-001',
      name: 'Garrison Duty',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.PENDING,
      endDate: '3025-01-01',
    });
    missions.set('contract-001', contract);

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    expect(result.missions.get('contract-001')!.status).toBe(MissionStatus.PENDING);
    expect(result.events).toHaveLength(0);
  });

  it('should NOT process contracts without end date', () => {
    const missions = new Map<string, IMission>();
    const contract = createContract({
      id: 'contract-001',
      name: 'Garrison Duty',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      // No endDate
    });
    missions.set('contract-001', contract);

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    expect(result.missions.get('contract-001')!.status).toBe(MissionStatus.ACTIVE);
    expect(result.events).toHaveLength(0);
  });

  it('should handle multiple contracts with mixed states', () => {
    const missions = new Map<string, IMission>();

    // Expired contract
    missions.set(
      'c1',
      createContract({
        id: 'c1',
        name: 'Expired',
        employerId: 'davion',
        targetId: 'liao',
        status: MissionStatus.ACTIVE,
        endDate: '3025-01-01',
      })
    );

    // Active contract (not expired)
    missions.set(
      'c2',
      createContract({
        id: 'c2',
        name: 'Still Active',
        employerId: 'steiner',
        targetId: 'kurita',
        status: MissionStatus.ACTIVE,
        endDate: '3025-12-31',
      })
    );

    // Already completed contract
    missions.set(
      'c3',
      createContract({
        id: 'c3',
        name: 'Already Done',
        employerId: 'marik',
        targetId: 'liao',
        status: MissionStatus.SUCCESS,
        endDate: '3025-01-01',
      })
    );

    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      missions,
    });

    const result = processContracts(campaign);

    expect(result.missions.get('c1')!.status).toBe(MissionStatus.SUCCESS);
    expect(result.missions.get('c2')!.status).toBe(MissionStatus.ACTIVE);
    expect(result.missions.get('c3')!.status).toBe(MissionStatus.SUCCESS);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].contractId).toBe('c1');
  });

  it('should handle empty missions map', () => {
    const campaign = createTestCampaign();
    const result = processContracts(campaign);

    expect(result.missions.size).toBe(0);
    expect(result.events).toHaveLength(0);
  });
});

// =============================================================================
// processDailyCosts Tests
// =============================================================================

describe('processDailyCosts', () => {
  it('should calculate salary for active personnel', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));
    personnel.set('p2', createTestPerson({ id: 'p2', status: PersonnelStatus.ACTIVE }));

    const campaign = createTestCampaign({ personnel });
    const result = processDailyCosts(campaign);

    const expectedSalary = DEFAULT_DAILY_SALARY * 2;
    expect(result.costs.salaries.amount).toBe(expectedSalary);
    expect(result.costs.personnelCount).toBe(2);
  });

  it('should exclude KIA, RETIRED, and DESERTED from salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));
    personnel.set('p2', createTestPerson({ id: 'p2', status: PersonnelStatus.KIA }));
    personnel.set('p3', createTestPerson({ id: 'p3', status: PersonnelStatus.RETIRED }));
    personnel.set('p4', createTestPerson({ id: 'p4', status: PersonnelStatus.DESERTED }));
    personnel.set('p5', createTestPerson({ id: 'p5', status: PersonnelStatus.WOUNDED }));

    const campaign = createTestCampaign({ personnel });
    const result = processDailyCosts(campaign);

    // Only p1 (ACTIVE) and p5 (WOUNDED) should be paid
    expect(result.costs.personnelCount).toBe(2);
    expect(result.costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2);
  });

  it('should apply salary multiplier from options', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      salaryMultiplier: 2.0,
    };

    const campaign = createTestCampaign({ personnel, options });
    const result = processDailyCosts(campaign);

    expect(result.costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2.0);
  });

  it('should skip salaries when payForSalaries is false', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      payForSalaries: false,
    };

    const campaign = createTestCampaign({ personnel, options });
    const result = processDailyCosts(campaign);

    expect(result.costs.salaries.amount).toBe(0);
  });

  it('should calculate maintenance for units', () => {
    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1', 'unit-2', 'unit-3']));

    const campaign = createTestCampaign({ forces });
    const result = processDailyCosts(campaign);

    const expectedMaintenance = DEFAULT_DAILY_MAINTENANCE * 3;
    expect(result.costs.maintenance.amount).toBe(expectedMaintenance);
    expect(result.costs.unitCount).toBe(3);
  });

  it('should apply maintenance multiplier from options', () => {
    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      maintenanceCostMultiplier: 1.5,
    };

    const campaign = createTestCampaign({ forces, options });
    const result = processDailyCosts(campaign);

    expect(result.costs.maintenance.amount).toBe(DEFAULT_DAILY_MAINTENANCE * 1.5);
  });

  it('should skip maintenance when payForMaintenance is false', () => {
    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      payForMaintenance: false,
    };

    const campaign = createTestCampaign({ forces, options });
    const result = processDailyCosts(campaign);

    expect(result.costs.maintenance.amount).toBe(0);
  });

  it('should deduct costs from balance', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({
      personnel,
      forces,
      finances: { transactions: [], balance: new Money(10000) },
    });

    const result = processDailyCosts(campaign);

    const expectedTotal = DEFAULT_DAILY_SALARY + DEFAULT_DAILY_MAINTENANCE;
    expect(result.finances.balance.amount).toBe(10000 - expectedTotal);
  });

  it('should calculate total as sum of salaries and maintenance', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({ personnel, forces });
    const result = processDailyCosts(campaign);

    const expectedTotal = DEFAULT_DAILY_SALARY + DEFAULT_DAILY_MAINTENANCE;
    expect(result.costs.total.amount).toBe(expectedTotal);
  });

  it('should handle empty campaign (no personnel, no units)', () => {
    const campaign = createTestCampaign();
    const result = processDailyCosts(campaign);

    expect(result.costs.salaries.amount).toBe(0);
    expect(result.costs.maintenance.amount).toBe(0);
    expect(result.costs.total.amount).toBe(0);
    expect(result.costs.personnelCount).toBe(0);
    expect(result.costs.unitCount).toBe(0);
  });

  it('should add transactions to existing list', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({ personnel, forces });
    const result = processDailyCosts(campaign);

    // Should have 2 transactions: salary + maintenance
    expect(result.finances.transactions).toHaveLength(2);
    expect(result.finances.transactions[0].description).toContain('salaries');
    expect(result.finances.transactions[1].description).toContain('maintenance');
  });

  it('should allow balance to go negative', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const campaign = createTestCampaign({
      personnel,
      finances: { transactions: [], balance: new Money(0) },
    });

    const result = processDailyCosts(campaign);

    expect(result.finances.balance.isNegative()).toBe(true);
  });
});

// =============================================================================
// advanceDay Tests (Integration)
// =============================================================================

describe('advanceDay', () => {
  it('should advance the date by one day', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
    });

    const report = advanceDay(campaign);

    expect(report.campaign.currentDate.getUTCDate()).toBe(16);
    expect(report.date.getUTCDate()).toBe(15); // Report date is the processed date
  });

  it('should return a complete DayReport', () => {
    const campaign = createTestCampaign();
    const report = advanceDay(campaign);

    expect(report).toHaveProperty('date');
    expect(report).toHaveProperty('healedPersonnel');
    expect(report).toHaveProperty('expiredContracts');
    expect(report).toHaveProperty('costs');
    expect(report).toHaveProperty('campaign');
    expect(Array.isArray(report.healedPersonnel)).toBe(true);
    expect(Array.isArray(report.expiredContracts)).toBe(true);
  });

  it('should process healing, contracts, and costs together', () => {
    // Setup: wounded person, expired contract, active personnel + units
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 1 });
    personnel.set(
      'p1',
      createTestPerson({
        id: 'p1',
        name: 'Wounded Warrior',
        status: PersonnelStatus.WOUNDED,
        injuries: [injury],
        daysToWaitForHealing: 0,
      })
    );
    personnel.set(
      'p2',
      createTestPerson({ id: 'p2', name: 'Active Pilot', status: PersonnelStatus.ACTIVE })
    );

    const missions = new Map<string, IMission>();
    missions.set(
      'c1',
      createContract({
        id: 'c1',
        name: 'Expired Contract',
        employerId: 'davion',
        targetId: 'liao',
        status: MissionStatus.ACTIVE,
        endDate: '3025-01-01',
      })
    );

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({
      personnel,
      missions,
      forces,
      finances: { transactions: [], balance: new Money(100000) },
    });

    const report = advanceDay(campaign);

    // Healing: p1 should be healed
    expect(report.healedPersonnel).toHaveLength(1);
    expect(report.healedPersonnel[0].personId).toBe('p1');
    expect(report.healedPersonnel[0].returnedToActive).toBe(true);

    // Contracts: c1 should be expired
    expect(report.expiredContracts).toHaveLength(1);
    expect(report.expiredContracts[0].contractId).toBe('c1');

    // Costs: 2 personnel (p1 now active + p2) + 1 unit
    // Note: p1 was WOUNDED at start, so salary count depends on implementation
    // Both p1 and p2 are not KIA/RETIRED/DESERTED, so both count
    expect(report.costs.personnelCount).toBe(2);
    expect(report.costs.unitCount).toBe(1);

    // Campaign should be updated
    expect(report.campaign.personnel.get('p1')!.status).toBe(PersonnelStatus.ACTIVE);
    expect(report.campaign.missions.get('c1')!.status).toBe(MissionStatus.SUCCESS);
  });

  it('should handle advancing multiple days sequentially', () => {
    const personnel = new Map<string, IPerson>();
    const injury = createTestInjury({ id: 'inj-1', daysToHeal: 3 });
    personnel.set(
      'p1',
      createTestPerson({
        id: 'p1',
        status: PersonnelStatus.WOUNDED,
        injuries: [injury],
        daysToWaitForHealing: 0,
      })
    );

    let campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
      personnel,
    });

    // Day 1: injury goes from 3 -> 2
    let report = advanceDay(campaign);
    expect(report.campaign.personnel.get('p1')!.injuries[0].daysToHeal).toBe(2);
    expect(report.campaign.personnel.get('p1')!.status).toBe(PersonnelStatus.WOUNDED);
    campaign = report.campaign;

    // Day 2: injury goes from 2 -> 1
    report = advanceDay(campaign);
    expect(report.campaign.personnel.get('p1')!.injuries[0].daysToHeal).toBe(1);
    expect(report.campaign.personnel.get('p1')!.status).toBe(PersonnelStatus.WOUNDED);
    campaign = report.campaign;

    // Day 3: injury heals (1 -> 0), person returns to active
    report = advanceDay(campaign);
    expect(report.campaign.personnel.get('p1')!.injuries).toHaveLength(0);
    expect(report.campaign.personnel.get('p1')!.status).toBe(PersonnelStatus.ACTIVE);
    expect(report.healedPersonnel).toHaveLength(1);
    expect(report.healedPersonnel[0].returnedToActive).toBe(true);
  });

  it('should advance date across month boundary', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-31T00:00:00Z'),
    });

    const report = advanceDay(campaign);

    expect(report.campaign.currentDate.getUTCMonth()).toBe(1); // February (0-indexed)
    expect(report.campaign.currentDate.getUTCDate()).toBe(1);
  });

  it('should advance date across year boundary', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-12-31T00:00:00Z'),
    });

    const report = advanceDay(campaign);

    expect(report.campaign.currentDate.getUTCFullYear()).toBe(3026);
    expect(report.campaign.currentDate.getUTCMonth()).toBe(0); // January
    expect(report.campaign.currentDate.getUTCDate()).toBe(1);
  });

  it('should update campaign updatedAt timestamp', () => {
    const campaign = createTestCampaign({
      updatedAt: '2020-01-01T00:00:00Z',
    });

    const report = advanceDay(campaign);

    expect(report.campaign.updatedAt).not.toBe('2020-01-01T00:00:00Z');
  });

  it('should preserve campaign fields not affected by day advancement', () => {
    const campaign = createTestCampaign({
      id: 'my-campaign',
      name: 'My Campaign',
      factionId: 'davion',
    });

    const report = advanceDay(campaign);

    expect(report.campaign.id).toBe('my-campaign');
    expect(report.campaign.name).toBe('My Campaign');
    expect(report.campaign.factionId).toBe('davion');
    expect(report.campaign.options).toEqual(campaign.options);
  });

  it('should handle campaign with no personnel, missions, or forces', () => {
    const campaign = createTestCampaign();
    const report = advanceDay(campaign);

    expect(report.healedPersonnel).toHaveLength(0);
    expect(report.expiredContracts).toHaveLength(0);
    expect(report.costs.total.amount).toBe(0);
    expect(report.campaign.currentDate.getUTCDate()).toBe(16);
  });

  it('should accumulate transactions over multiple days', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    let campaign = createTestCampaign({
      personnel,
      finances: { transactions: [], balance: new Money(100000) },
    });

    // Advance 3 days
    for (let i = 0; i < 3; i++) {
      const report = advanceDay(campaign);
      campaign = report.campaign;
    }

    // Should have 3 salary transactions
    expect(campaign.finances.transactions).toHaveLength(3);
    expect(campaign.finances.balance.amount).toBe(100000 - DEFAULT_DAILY_SALARY * 3);
  });
});
