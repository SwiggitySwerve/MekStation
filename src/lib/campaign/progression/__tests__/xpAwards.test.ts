/**
 * XP Awards Tests
 *
 * Covers all 8 XP award functions plus buildXPAwardDelta:
 * - NPC rule: null pilot → null return
 * - Scenario, kill, task, mission, vocational, admin, education, manual XP
 * - Kill threshold logic (Math.floor(kills/threshold)*award)
 * - Task threshold logic (flat award when count >= threshold)
 * - Mission outcome amounts (fail/success/outstanding)
 * - buildXPAwardDelta: delta shape with xpDelta and campaignXpDelta
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums';
import { PilotType, PilotStatus } from '@/types/pilot/PilotInterfaces';

import {
  awardScenarioXP,
  awardKillXP,
  awardTaskXP,
  awardMissionXP,
  awardVocationalXP,
  awardAdminXP,
  awardEducationXP,
  awardManualXP,
  buildXPAwardDelta,
} from '../xpAwards';

// =============================================================================
// Test Factories
// =============================================================================

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'John Smith',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 500,
    campaignXpEarned: 1500,
    campaignKills: 8,
    campaignMissions: 12,
    hireDate: new Date('3000-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'John Smith',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-01-25T00:00:00Z',
    ...overrides,
  };
}

function makeOptions(
  overrides: Partial<ICampaignOptions> = {},
): ICampaignOptions {
  return {
    scenarioXP: 1,
    killsForXP: 1,
    killXPAward: 1,
    nTasksXP: 1,
    taskXP: 1,
    missionFailXP: 1,
    missionSuccessXP: 3,
    missionOutstandingXP: 5,
    vocationalXP: 1,
    adminXP: 0,
    useAgingEffects: true,
    healingRateMultiplier: 1.0,
    salaryMultiplier: 1.0,
    retirementAge: 65,
    healingWaitingPeriod: 7,
    maxPatientsPerDoctor: 4,
    doctorsUseAdministration: false,
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
    maintenanceCycleDays: 30,
    useLoanSystem: false,
    useTaxes: false,
    taxRate: 0,
    overheadPercent: 5,
    useRoleBasedSalaries: false,
    payForSecondaryRole: false,
    maxLoanPercent: 50,
    defaultLoanRate: 5,
    taxFrequency: 'monthly' as const,
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
    limitByYear: false,
    allowClanEquipment: true,
    useRandomEvents: false,
    enableDayReportNotifications: true,
    useTurnover: false,
    turnoverFixedTargetNumber: 7,
    turnoverCheckFrequency: 'monthly',
    turnoverCommanderImmune: true,
    turnoverPayoutMultiplier: 1.0,
    turnoverUseSkillModifiers: false,
    turnoverUseAgeModifiers: false,
    turnoverUseMissionStatusModifiers: false,
    trackFactionStanding: false,
    regardChangeMultiplier: 1.0,
    ...overrides,
  } as ICampaignOptions;
}

// =============================================================================
// awardScenarioXP
// =============================================================================

describe('awardScenarioXP', () => {
  it('should award scenario XP to NPC entries (pilot === null) — campaign XP is roster-side', () => {
    const entry = makeEntry();
    const options = makeOptions({ scenarioXP: 2 });
    const event = awardScenarioXP(entry, null, options);
    expect(event).not.toBeNull();
    expect(event?.amount).toBe(2);
  });

  it('should return event with scenarioXP amount from options', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ scenarioXP: 2 });
    const event = awardScenarioXP(entry, pilot, options);
    expect(event).not.toBeNull();
    expect(event?.personId).toBe('pilot-001');
    expect(event?.source).toBe('scenario');
    expect(event?.amount).toBe(2);
    expect(event?.description).toBe('Scenario participation');
  });

  it('should default to 1 if scenarioXP not set', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ scenarioXP: undefined });
    const event = awardScenarioXP(entry, pilot, options);
    expect(event?.amount).toBe(1);
  });
});

// =============================================================================
// awardKillXP
// =============================================================================

describe('awardKillXP', () => {
  it('should award kill XP to NPC entries (pilot === null) — campaign kills are roster-side', () => {
    const entry = makeEntry();
    const options = makeOptions({ killsForXP: 2, killXPAward: 1 });
    const event = awardKillXP(entry, null, 5, options);
    expect(event).not.toBeNull();
    expect(event?.amount).toBe(2);
  });

  it('should return null if killCount < threshold', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ killsForXP: 2, killXPAward: 1 });
    expect(awardKillXP(entry, pilot, 1, options)).toBeNull();
  });

  it('should return null if killCount exactly below threshold', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ killsForXP: 3, killXPAward: 1 });
    expect(awardKillXP(entry, pilot, 2, options)).toBeNull();
  });

  it('should award floor(kills/threshold)*award at threshold', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    // threshold=2, award=1, kills=2 → floor(2/2)*1 = 1
    const options = makeOptions({ killsForXP: 2, killXPAward: 1 });
    const event = awardKillXP(entry, pilot, 2, options);
    expect(event?.amount).toBe(1);
    expect(event?.source).toBe('kill');
    expect(event?.description).toBe('2 kills');
  });

  it('should calculate floor correctly: kills=5, threshold=2, award=1 → 2', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ killsForXP: 2, killXPAward: 1 });
    const event = awardKillXP(entry, pilot, 5, options);
    expect(event?.amount).toBe(2); // floor(5/2)*1 = 2
  });

  it('should scale with killXPAward: kills=4, threshold=2, award=3 → 6', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ killsForXP: 2, killXPAward: 3 });
    const event = awardKillXP(entry, pilot, 4, options);
    expect(event?.amount).toBe(6); // floor(4/2)*3 = 6
  });

  it('should default threshold=1 and award=1 if not set', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({
      killsForXP: undefined,
      killXPAward: undefined,
    });
    const event = awardKillXP(entry, pilot, 3, options);
    expect(event?.amount).toBe(3); // floor(3/1)*1 = 3
  });
});

// =============================================================================
// awardTaskXP
// =============================================================================

describe('awardTaskXP', () => {
  it('should return null for NPC (pilot === null)', () => {
    const entry = makeEntry();
    const options = makeOptions({ nTasksXP: 1, taskXP: 1 });
    expect(awardTaskXP(entry, null, 3, options)).toBeNull();
  });

  it('should return null if taskCount < threshold', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ nTasksXP: 3, taskXP: 2 });
    expect(awardTaskXP(entry, pilot, 2, options)).toBeNull();
  });

  it('should return flat award amount when count >= threshold', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ nTasksXP: 3, taskXP: 2 });
    const event = awardTaskXP(entry, pilot, 5, options);
    expect(event?.amount).toBe(2);
    expect(event?.source).toBe('task');
    expect(event?.description).toBe('5 tasks completed');
  });

  it('should award at exactly threshold count', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ nTasksXP: 3, taskXP: 2 });
    const event = awardTaskXP(entry, pilot, 3, options);
    expect(event?.amount).toBe(2);
  });

  it('should default threshold=1 and award=1 if not set', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ nTasksXP: undefined, taskXP: undefined });
    const event = awardTaskXP(entry, pilot, 1, options);
    expect(event?.amount).toBe(1);
  });
});

// =============================================================================
// awardMissionXP
// =============================================================================

describe('awardMissionXP', () => {
  it('should return null for NPC (pilot === null)', () => {
    const entry = makeEntry();
    const options = makeOptions();
    expect(awardMissionXP(entry, null, 'success', options)).toBeNull();
  });

  it('should award missionFailXP for fail outcome', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({
      missionFailXP: 1,
      missionSuccessXP: 3,
      missionOutstandingXP: 5,
    });
    const event = awardMissionXP(entry, pilot, 'fail', options);
    expect(event?.amount).toBe(1);
    expect(event?.source).toBe('mission');
    expect(event?.description).toBe('Mission fail');
  });

  it('should award missionSuccessXP for success outcome', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({
      missionFailXP: 1,
      missionSuccessXP: 3,
      missionOutstandingXP: 5,
    });
    const event = awardMissionXP(entry, pilot, 'success', options);
    expect(event?.amount).toBe(3);
    expect(event?.description).toBe('Mission success');
  });

  it('should award missionOutstandingXP for outstanding outcome', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({
      missionFailXP: 1,
      missionSuccessXP: 3,
      missionOutstandingXP: 5,
    });
    const event = awardMissionXP(entry, pilot, 'outstanding', options);
    expect(event?.amount).toBe(5);
    expect(event?.description).toBe('Mission outstanding');
  });

  it('should use defaults (fail=1, success=3, outstanding=5) if not set', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({
      missionFailXP: undefined,
      missionSuccessXP: undefined,
      missionOutstandingXP: undefined,
    });
    expect(awardMissionXP(entry, pilot, 'fail', options)?.amount).toBe(1);
    expect(awardMissionXP(entry, pilot, 'success', options)?.amount).toBe(3);
    expect(awardMissionXP(entry, pilot, 'outstanding', options)?.amount).toBe(
      5,
    );
  });
});

// =============================================================================
// awardVocationalXP
// =============================================================================

describe('awardVocationalXP', () => {
  it('should return null for NPC (pilot === null)', () => {
    const entry = makeEntry();
    const options = makeOptions();
    expect(awardVocationalXP(entry, null, options)).toBeNull();
  });

  it('should return event with vocationalXP amount', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ vocationalXP: 2 });
    const event = awardVocationalXP(entry, pilot, options);
    expect(event?.amount).toBe(2);
    expect(event?.source).toBe('vocational');
    expect(event?.description).toBe('Vocational training');
  });

  it('should default to 1 if vocationalXP not set', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ vocationalXP: undefined });
    const event = awardVocationalXP(entry, pilot, options);
    expect(event?.amount).toBe(1);
  });
});

// =============================================================================
// awardAdminXP
// =============================================================================

describe('awardAdminXP', () => {
  it('should return null for NPC (pilot === null)', () => {
    const entry = makeEntry();
    const options = makeOptions();
    expect(awardAdminXP(entry, null, options)).toBeNull();
  });

  it('should return event with adminXP amount', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ adminXP: 1 });
    const event = awardAdminXP(entry, pilot, options);
    expect(event?.amount).toBe(1);
    expect(event?.source).toBe('admin');
    expect(event?.description).toBe('Administrative duties');
  });

  it('should default to 0 if adminXP not set', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ adminXP: undefined });
    const event = awardAdminXP(entry, pilot, options);
    expect(event?.amount).toBe(0);
  });
});

// =============================================================================
// awardEducationXP
// =============================================================================

describe('awardEducationXP', () => {
  it('should return null (stub)', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions();
    expect(awardEducationXP(entry, pilot, options)).toBeNull();
  });

  it('should return null for NPC too (stub)', () => {
    const entry = makeEntry();
    const options = makeOptions();
    expect(awardEducationXP(entry, null, options)).toBeNull();
  });
});

// =============================================================================
// awardManualXP
// =============================================================================

describe('awardManualXP', () => {
  it('should return null for NPC (pilot === null)', () => {
    const entry = makeEntry();
    expect(awardManualXP(entry, null, 5, 'Special commendation')).toBeNull();
  });

  it('should return event with given amount and description', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const event = awardManualXP(entry, pilot, 5, 'Special commendation');
    expect(event?.amount).toBe(5);
    expect(event?.source).toBe('award');
    expect(event?.description).toBe('Special commendation');
    expect(event?.personId).toBe('pilot-001');
  });

  it('should handle zero amount', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const event = awardManualXP(entry, pilot, 0, 'Participation');
    expect(event?.amount).toBe(0);
  });
});

// =============================================================================
// buildXPAwardDelta
// =============================================================================

describe('buildXPAwardDelta', () => {
  it('should build delta with correct pilotId from event', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ scenarioXP: 3 });
    const event = awardScenarioXP(entry, pilot, options);
    expect(event).not.toBeNull();
    const delta = buildXPAwardDelta(event!);
    expect(delta.vault).toBeNull();
    expect(delta.roster?.pilotId).toBe('pilot-001');
  });

  it('should set xpDelta equal to event amount', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ scenarioXP: 3 });
    const event = awardScenarioXP(entry, pilot, options);
    const delta = buildXPAwardDelta(event!);
    expect(delta.roster?.xpDelta).toBe(3);
  });

  it('should set campaignXpDelta equal to event amount', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ scenarioXP: 3 });
    const event = awardScenarioXP(entry, pilot, options);
    const delta = buildXPAwardDelta(event!);
    expect(delta.roster?.campaignXpDelta).toBe(3);
  });

  it('should produce null vault for all award types', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions({ missionSuccessXP: 4 });
    const event = awardMissionXP(entry, pilot, 'success', options);
    const delta = buildXPAwardDelta(event!);
    expect(delta.vault).toBeNull();
  });

  it('should correctly reflect kill XP amount in delta', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    // kills=6, threshold=2, award=2 → floor(6/2)*2 = 6
    const options = makeOptions({ killsForXP: 2, killXPAward: 2 });
    const event = awardKillXP(entry, pilot, 6, options);
    expect(event).not.toBeNull();
    const delta = buildXPAwardDelta(event!);
    expect(delta.roster?.xpDelta).toBe(6);
    expect(delta.roster?.campaignXpDelta).toBe(6);
  });

  it('should reflect manual award in delta', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const event = awardManualXP(entry, pilot, 10, 'Heroic action');
    const delta = buildXPAwardDelta(event!);
    expect(delta.roster?.xpDelta).toBe(10);
    expect(delta.roster?.campaignXpDelta).toBe(10);
    expect(delta.roster?.pilotId).toBe('pilot-001');
  });
});
