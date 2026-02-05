/**
 * XP Award Service Tests
 *
 * Tests for all 8 XP award sources and the applyXPAward function.
 * Covers threshold logic, outcome-based amounts, and immutable updates.
 *
 * @module campaign/progression/__tests__/xpAwards
 */

import type { ICampaignOptions } from '../../../../types/campaign/Campaign';
import type { IPerson } from '../../../../types/campaign/Person';

import {
  PersonnelStatus,
  CampaignPersonnelRole,
} from '../../../../types/campaign/enums';
import { MedicalSystem } from '../../medical/medicalTypes';
import {
  awardScenarioXP,
  awardKillXP,
  awardTaskXP,
  awardMissionXP,
  awardVocationalXP,
  awardAdminXP,
  awardEducationXP,
  awardManualXP,
  applyXPAward,
} from '../xpAwards';

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestPerson = (overrides?: Partial<IPerson>): IPerson => ({
  id: 'person-001',
  name: 'Test Person',
  status: PersonnelStatus.ACTIVE,
  primaryRole: CampaignPersonnelRole.PILOT,
  rank: 'MechWarrior',
  recruitmentDate: new Date('2025-01-01'),
  missionsCompleted: 0,
  totalKills: 0,
  xp: 100,
  totalXpEarned: 500,
  xpSpent: 400,
  hits: 0,
  injuries: [],
  daysToWaitForHealing: 0,
  skills: {},
  attributes: {
    STR: 5,
    BOD: 5,
    REF: 5,
    DEX: 5,
    INT: 5,
    WIL: 5,
    CHA: 5,
    Edge: 0,
  },
  pilotSkills: { gunnery: 4, piloting: 5 },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createTestOptions = (
  overrides?: Partial<ICampaignOptions>,
): ICampaignOptions => ({
  healingRateMultiplier: 1.0,
  salaryMultiplier: 1.0,
  retirementAge: 65,
  healingWaitingPeriod: 7,
  medicalSystem: MedicalSystem.STANDARD,
  maxPatientsPerDoctor: 5,
  doctorsUseAdministration: false,
  xpPerMission: 1,
  xpPerKill: 1,
  xpCostMultiplier: 1.0,
  trackTimeInService: true,
  useEdge: true,
  startingFunds: 100000,
  maintenanceCostMultiplier: 1.0,
  repairCostMultiplier: 1.0,
  acquisitionCostMultiplier: 1.0,
  payForMaintenance: true,
  payForRepairs: true,
  payForSalaries: true,
  payForAmmunition: true,
  maintenanceCycleDays: 7,
  useLoanSystem: false,
  useTaxes: false,
  taxRate: 0,
  overheadPercent: 0,
  useRoleBasedSalaries: false,
  payForSecondaryRole: false,
  maxLoanPercent: 50,
  defaultLoanRate: 5,
  taxFrequency: 'monthly',
  useFoodAndHousing: false,
  clanPriceMultiplier: 2.0,
  mixedTechPriceMultiplier: 1.5,
  usedEquipmentMultiplier: 0.5,
  damagedEquipmentMultiplier: 0.33,
  useAutoResolve: false,
  autoResolveCasualtyRate: 1.0,
  allowPilotCapture: true,
  useRandomInjuries: true,
  pilotDeathChance: 0.1,
  autoEject: true,
  trackAmmunition: true,
  useQuirks: true,
  maxUnitsPerLance: 4,
  maxLancesPerCompany: 4,
  enforceFormationRules: false,
  allowMixedFormations: true,
  requireForceCommanders: false,
  useCombatTeams: false,
  dateFormat: 'yyyy-MM-dd',
  useFactionRules: false,
  techLevel: 1,
  limitByYear: true,
  allowClanEquipment: true,
  useRandomEvents: false,
  enableDayReportNotifications: true,
  useTurnover: false,
  turnoverFixedTargetNumber: 8,
  turnoverCheckFrequency: 'monthly',
  turnoverCommanderImmune: true,
  turnoverPayoutMultiplier: 1.0,
  turnoverUseSkillModifiers: false,
  turnoverUseAgeModifiers: false,
  turnoverUseMissionStatusModifiers: false,
  trackFactionStanding: false,
  regardChangeMultiplier: 1.0,
  ...overrides,
});

// =============================================================================
// Scenario XP Tests
// =============================================================================

describe('awardScenarioXP', () => {
  it('should award default scenario XP (1)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardScenarioXP(person, options);

    expect(event).toEqual({
      personId: 'person-001',
      source: 'scenario',
      amount: 1,
      description: 'Scenario participation',
    });
  });

  it('should award configurable scenario XP', () => {
    const person = createTestPerson();
    const options = createTestOptions({ scenarioXP: 3 });

    const event = awardScenarioXP(person, options);

    expect(event.amount).toBe(3);
  });

  it('should use ?? operator for default', () => {
    const person = createTestPerson();
    const options = createTestOptions({ scenarioXP: undefined });

    const event = awardScenarioXP(person, options);

    expect(event.amount).toBe(1);
  });
});

// =============================================================================
// Kill XP Tests
// =============================================================================

describe('awardKillXP', () => {
  it('should return null if kill count below threshold', () => {
    const person = createTestPerson();
    const options = createTestOptions({ killsForXP: 2, killXPAward: 1 });

    const event = awardKillXP(person, 1, options);

    expect(event).toBeNull();
  });

  it('should award XP when kill count meets threshold', () => {
    const person = createTestPerson();
    const options = createTestOptions({ killsForXP: 2, killXPAward: 1 });

    const event = awardKillXP(person, 2, options);

    expect(event).not.toBeNull();
    expect(event?.amount).toBe(1);
  });

  it('should calculate amount as Math.floor(killCount / threshold) * award', () => {
    const person = createTestPerson();
    const options = createTestOptions({ killsForXP: 2, killXPAward: 1 });

    // 5 kills / 2 threshold = 2.5, floor = 2, * 1 award = 2
    const event = awardKillXP(person, 5, options);

    expect(event?.amount).toBe(2);
  });

  it('should handle multiple awards per kill count', () => {
    const person = createTestPerson();
    const options = createTestOptions({ killsForXP: 1, killXPAward: 2 });

    // 3 kills / 1 threshold = 3, * 2 award = 6
    const event = awardKillXP(person, 3, options);

    expect(event?.amount).toBe(6);
  });

  it('should use default threshold and award', () => {
    const person = createTestPerson();
    const options = createTestOptions({
      killsForXP: undefined,
      killXPAward: undefined,
    });

    const event = awardKillXP(person, 1, options);

    expect(event?.amount).toBe(1);
  });

  it('should include kill count in description', () => {
    const person = createTestPerson();
    const options = createTestOptions({ killsForXP: 1, killXPAward: 1 });

    const event = awardKillXP(person, 5, options);

    expect(event?.description).toBe('5 kills');
  });
});

// =============================================================================
// Task XP Tests
// =============================================================================

describe('awardTaskXP', () => {
  it('should return null if task count below threshold', () => {
    const person = createTestPerson();
    const options = createTestOptions({ nTasksXP: 3, taskXP: 2 });

    const event = awardTaskXP(person, 2, options);

    expect(event).toBeNull();
  });

  it('should award flat XP when task count meets threshold', () => {
    const person = createTestPerson();
    const options = createTestOptions({ nTasksXP: 3, taskXP: 2 });

    const event = awardTaskXP(person, 3, options);

    expect(event).not.toBeNull();
    expect(event?.amount).toBe(2);
  });

  it('should award same amount regardless of task count above threshold', () => {
    const person = createTestPerson();
    const options = createTestOptions({ nTasksXP: 3, taskXP: 2 });

    const event1 = awardTaskXP(person, 3, options);
    const event2 = awardTaskXP(person, 10, options);

    expect(event1?.amount).toBe(2);
    expect(event2?.amount).toBe(2);
  });

  it('should use default threshold and award', () => {
    const person = createTestPerson();
    const options = createTestOptions({
      nTasksXP: undefined,
      taskXP: undefined,
    });

    const event = awardTaskXP(person, 1, options);

    expect(event?.amount).toBe(1);
  });

  it('should include task count in description', () => {
    const person = createTestPerson();
    const options = createTestOptions({ nTasksXP: 1, taskXP: 1 });

    const event = awardTaskXP(person, 5, options);

    expect(event?.description).toBe('5 tasks completed');
  });
});

// =============================================================================
// Mission XP Tests
// =============================================================================

describe('awardMissionXP', () => {
  it('should award fail XP (default 1)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardMissionXP(person, 'fail', options);

    expect(event.amount).toBe(1);
    expect(event.description).toBe('Mission fail');
  });

  it('should award success XP (default 3)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardMissionXP(person, 'success', options);

    expect(event.amount).toBe(3);
    expect(event.description).toBe('Mission success');
  });

  it('should award outstanding XP (default 5)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardMissionXP(person, 'outstanding', options);

    expect(event.amount).toBe(5);
    expect(event.description).toBe('Mission outstanding');
  });

  it('should use configurable fail XP', () => {
    const person = createTestPerson();
    const options = createTestOptions({ missionFailXP: 2 });

    const event = awardMissionXP(person, 'fail', options);

    expect(event.amount).toBe(2);
  });

  it('should use configurable success XP', () => {
    const person = createTestPerson();
    const options = createTestOptions({ missionSuccessXP: 4 });

    const event = awardMissionXP(person, 'success', options);

    expect(event.amount).toBe(4);
  });

  it('should use configurable outstanding XP', () => {
    const person = createTestPerson();
    const options = createTestOptions({ missionOutstandingXP: 10 });

    const event = awardMissionXP(person, 'outstanding', options);

    expect(event.amount).toBe(10);
  });
});

// =============================================================================
// Vocational XP Tests
// =============================================================================

describe('awardVocationalXP', () => {
  it('should award default vocational XP (1)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardVocationalXP(person, options);

    expect(event).toEqual({
      personId: 'person-001',
      source: 'vocational',
      amount: 1,
      description: 'Vocational training',
    });
  });

  it('should award configurable vocational XP', () => {
    const person = createTestPerson();
    const options = createTestOptions({ vocationalXP: 2 });

    const event = awardVocationalXP(person, options);

    expect(event.amount).toBe(2);
  });
});

// =============================================================================
// Admin XP Tests
// =============================================================================

describe('awardAdminXP', () => {
  it('should award default admin XP (0)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardAdminXP(person, options);

    expect(event).toEqual({
      personId: 'person-001',
      source: 'admin',
      amount: 0,
      description: 'Administrative duties',
    });
  });

  it('should award configurable admin XP', () => {
    const person = createTestPerson();
    const options = createTestOptions({ adminXP: 1 });

    const event = awardAdminXP(person, options);

    expect(event.amount).toBe(1);
  });
});

// =============================================================================
// Education XP Tests
// =============================================================================

describe('awardEducationXP', () => {
  it('should return null (not implemented)', () => {
    const person = createTestPerson();
    const options = createTestOptions();

    const event = awardEducationXP(person, options);

    expect(event).toBeNull();
  });
});

// =============================================================================
// Manual XP Tests
// =============================================================================

describe('awardManualXP', () => {
  it('should award manual XP with custom description', () => {
    const person = createTestPerson();

    const event = awardManualXP(person, 5, 'Special commendation');

    expect(event).toEqual({
      personId: 'person-001',
      source: 'award',
      amount: 5,
      description: 'Special commendation',
    });
  });

  it('should support zero amount', () => {
    const person = createTestPerson();

    const event = awardManualXP(person, 0, 'No award');

    expect(event.amount).toBe(0);
  });

  it('should support negative amount (penalty)', () => {
    const person = createTestPerson();

    const event = awardManualXP(person, -10, 'Disciplinary action');

    expect(event.amount).toBe(-10);
  });
});

// =============================================================================
// Apply XP Award Tests
// =============================================================================

describe('applyXPAward', () => {
  it('should increment xp field', () => {
    const person = createTestPerson({ xp: 100 });
    const event = awardScenarioXP(person, createTestOptions());

    const updated = applyXPAward(person, event);

    expect(updated.xp).toBe(101);
  });

  it('should increment totalXpEarned field', () => {
    const person = createTestPerson({ totalXpEarned: 500 });
    const event = awardScenarioXP(person, createTestOptions());

    const updated = applyXPAward(person, event);

    expect(updated.totalXpEarned).toBe(501);
  });

  it('should increment both xp and totalXpEarned by event amount', () => {
    const person = createTestPerson({ xp: 100, totalXpEarned: 500 });
    const event = awardManualXP(person, 25, 'Test');

    const updated = applyXPAward(person, event);

    expect(updated.xp).toBe(125);
    expect(updated.totalXpEarned).toBe(525);
  });

  it('should preserve all other person fields', () => {
    const person = createTestPerson({
      name: 'John Doe',
      rank: 'Captain',
      missionsCompleted: 10,
    });
    const event = awardScenarioXP(person, createTestOptions());

    const updated = applyXPAward(person, event);

    expect(updated.name).toBe('John Doe');
    expect(updated.rank).toBe('Captain');
    expect(updated.missionsCompleted).toBe(10);
  });

  it('should return new object (immutable)', () => {
    const person = createTestPerson();
    const event = awardScenarioXP(person, createTestOptions());

    const updated = applyXPAward(person, event);

    expect(updated).not.toBe(person);
  });

  it('should handle multiple awards sequentially', () => {
    let person = createTestPerson({ xp: 0, totalXpEarned: 0 });

    const event1 = awardScenarioXP(
      person,
      createTestOptions({ scenarioXP: 1 }),
    );
    person = applyXPAward(person, event1);

    const event2 = awardManualXP(person, 5, 'Bonus');
    person = applyXPAward(person, event2);

    expect(person.xp).toBe(6);
    expect(person.totalXpEarned).toBe(6);
  });

  it('should handle negative amounts (penalties)', () => {
    const person = createTestPerson({ xp: 100, totalXpEarned: 500 });
    const event = awardManualXP(person, -10, 'Penalty');

    const updated = applyXPAward(person, event);

    expect(updated.xp).toBe(90);
    expect(updated.totalXpEarned).toBe(490);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('XP Award Integration', () => {
  it('should chain multiple award types', () => {
    let person = createTestPerson({ xp: 0, totalXpEarned: 0 });
    const options = createTestOptions({
      scenarioXP: 1,
      killsForXP: 2,
      killXPAward: 1,
      nTasksXP: 3,
      taskXP: 2,
      missionSuccessXP: 3,
    });

    // Scenario
    let event = awardScenarioXP(person, options);
    person = applyXPAward(person, event);
    expect(person.xp).toBe(1);

    // Kill (below threshold)
    event =
      awardKillXP(person, 1, options) || awardManualXP(person, 0, 'No kill XP');
    person = applyXPAward(person, event);
    expect(person.xp).toBe(1);

    // Kill (meets threshold)
    event = awardKillXP(person, 2, options)!;
    person = applyXPAward(person, event);
    expect(person.xp).toBe(2);

    // Task (below threshold)
    event =
      awardTaskXP(person, 2, options) || awardManualXP(person, 0, 'No task XP');
    person = applyXPAward(person, event);
    expect(person.xp).toBe(2);

    // Task (meets threshold)
    event = awardTaskXP(person, 3, options)!;
    person = applyXPAward(person, event);
    expect(person.xp).toBe(4);

    // Mission
    event = awardMissionXP(person, 'success', options);
    person = applyXPAward(person, event);
    expect(person.xp).toBe(7);

    expect(person.totalXpEarned).toBe(7);
  });

  it('should handle all award sources in one scenario', () => {
    let person = createTestPerson({ xp: 0, totalXpEarned: 0 });
    const options = createTestOptions({
      scenarioXP: 1,
      killXPAward: 1,
      killsForXP: 1,
      taskXP: 1,
      nTasksXP: 1,
      vocationalXP: 1,
      adminXP: 1,
      missionSuccessXP: 3,
    });

    const awards = [
      awardScenarioXP(person, options),
      awardKillXP(person, 1, options)!,
      awardTaskXP(person, 1, options)!,
      awardVocationalXP(person, options),
      awardAdminXP(person, options),
      awardMissionXP(person, 'success', options),
      awardManualXP(person, 2, 'Bonus'),
    ];

    for (const award of awards) {
      person = applyXPAward(person, award);
    }

    // 1 + 1 + 1 + 1 + 1 + 3 + 2 = 10
    expect(person.xp).toBe(10);
    expect(person.totalXpEarned).toBe(10);
  });
});
