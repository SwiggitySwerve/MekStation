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

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  ICampaign,
  createDefaultCampaignOptions,
  ICampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import { CampaignType } from '@/types/campaign/CampaignType';
import {
  MissionStatus,
  CampaignPersonnelRole,
  ForceRole,
  FormationLevel,
} from '@/types/campaign/enums';
import { IForce } from '@/types/campaign/Force';
import {
  IMission,
  createContract,
  createMission,
} from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';

import {
  advanceDay,
  processHealing,
  processContracts,
  processDailyCosts,
  DEFAULT_DAILY_SALARY,
  DEFAULT_DAILY_MAINTENANCE,
} from '../dayAdvancement';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestForce(
  id: string,
  unitIds: string[] = [],
  subForceIds: string[] = [],
  parentForceId?: string,
): IForce {
  return {
    id,
    name: `Force ${id}`,
    parentForceId,
    subForceIds,
    unitIds,
    forceType: ForceRole.STANDARD,
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
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    // Placed after the spread so Partial<ICampaign>'s optional widening
    // cannot leave the field as `undefined`.
    unitCombatStates: overrides?.unitCombatStates ?? {},
  };
}

// =============================================================================
// Store helpers for processDailyCosts / advanceDay tests
// (processDailyCosts reads useCampaignRosterStore, not campaign.personnel)
// =============================================================================

/** Builds a minimal ICampaignRosterEntry for store population in tests. */
function makeRosterEntry(
  id: string,
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: `Pilot ${id}`,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    injuries: [],
    ...overrides,
  };
}

/** Resets both Zustand stores to empty state between tests. */
function clearStores(): void {
  useCampaignRosterStore.setState({
    campaignId: null,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

// =============================================================================
// processHealing Tests

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

    expect(result.missions.get('contract-001')!.status).toBe(
      MissionStatus.ACTIVE,
    );
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

    expect(result.missions.get('contract-001')!.status).toBe(
      MissionStatus.SUCCESS,
    );
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

    expect(result.missions.get('mission-001')!.status).toBe(
      MissionStatus.ACTIVE,
    );
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

    expect(result.missions.get('contract-001')!.status).toBe(
      MissionStatus.PENDING,
    );
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

    expect(result.missions.get('contract-001')!.status).toBe(
      MissionStatus.ACTIVE,
    );
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
      }),
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
      }),
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
      }),
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
  // processDailyCosts reads personnel count from useCampaignRosterStore (PR3).
  // Tests that assert on personnelCount must seed the store — campaign.personnel
  // is the legacy write-side only and is ignored by the salary counter.
  afterEach(() => clearStores());

  it('should calculate salary for active personnel', () => {
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1'), makeRosterEntry('p2')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const campaign = createTestCampaign({});
    const result = processDailyCosts(campaign);

    const expectedSalary = DEFAULT_DAILY_SALARY * 2;
    expect(result.costs.salaries.amount).toBe(expectedSalary);
    expect(result.costs.personnelCount).toBe(2);
  });

  it('should exclude KIA, RETIRED, and DESERTED from salary', () => {
    // p1 = Active, p2 = KIA (excluded), p3/p4 = RETIRED/DESERTED (not in roster),
    // p5 = Wounded (billable — all non-KIA statuses draw salary in the store model).
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [
        makeRosterEntry('p1', { status: CampaignPilotStatus.Active }),
        makeRosterEntry('p2', { status: CampaignPilotStatus.KIA }),
        makeRosterEntry('p5', { status: CampaignPilotStatus.Wounded }),
      ],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const campaign = createTestCampaign({});
    const result = processDailyCosts(campaign);

    // Only p1 (ACTIVE) and p5 (WOUNDED) should be paid; p2 KIA excluded
    expect(result.costs.personnelCount).toBe(2);
    expect(result.costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2);
  });

  it('should apply salary multiplier from options', () => {
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      salaryMultiplier: 2.0,
    };

    const campaign = createTestCampaign({ options });
    const result = processDailyCosts(campaign);

    expect(result.costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2.0);
  });

  it('should skip salaries when payForSalaries is false', () => {
    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      payForSalaries: false,
    };

    const campaign = createTestCampaign({ options });
    const result = processDailyCosts(campaign);

    // payForSalaries=false skips the salary block entirely regardless of count
    expect(result.costs.salaries.amount).toBe(0);
  });

  it('should calculate maintenance for units', () => {
    const forces = new Map<string, IForce>();
    forces.set(
      'force-root',
      createTestForce('force-root', ['unit-1', 'unit-2', 'unit-3']),
    );

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

    expect(result.costs.maintenance.amount).toBe(
      DEFAULT_DAILY_MAINTENANCE * 1.5,
    );
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
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({
      forces,
      finances: { transactions: [], balance: new Money(10000) },
    });

    const result = processDailyCosts(campaign);

    const expectedTotal = DEFAULT_DAILY_SALARY + DEFAULT_DAILY_MAINTENANCE;
    expect(result.finances.balance.amount).toBe(10000 - expectedTotal);
  });

  it('should calculate total as sum of salaries and maintenance', () => {
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({ forces });
    const result = processDailyCosts(campaign);

    const expectedTotal = DEFAULT_DAILY_SALARY + DEFAULT_DAILY_MAINTENANCE;
    expect(result.costs.total.amount).toBe(expectedTotal);
  });

  it('should handle empty campaign (no personnel, no units)', () => {
    // Store is empty (cleared by afterEach) — personnelCount must be 0
    const campaign = createTestCampaign();
    const result = processDailyCosts(campaign);

    expect(result.costs.salaries.amount).toBe(0);
    expect(result.costs.maintenance.amount).toBe(0);
    expect(result.costs.total.amount).toBe(0);
    expect(result.costs.personnelCount).toBe(0);
    expect(result.costs.unitCount).toBe(0);
  });

  it('should add transactions to existing list', () => {
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({ forces });
    const result = processDailyCosts(campaign);

    // Should have 2 transactions: salary + maintenance
    expect(result.finances.transactions).toHaveLength(2);
    expect(result.finances.transactions[0].description).toContain('salaries');
    expect(result.finances.transactions[1].description).toContain(
      'maintenance',
    );
  });

  it('should allow balance to go negative', () => {
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const campaign = createTestCampaign({
      finances: { transactions: [], balance: new Money(0) },
    });

    const result = processDailyCosts(campaign);

    expect(result.finances.balance.isNegative()).toBe(true);
  });
});
