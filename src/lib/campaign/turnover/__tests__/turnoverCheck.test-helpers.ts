import { describe, it, expect } from '@jest/globals';

import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import type { RandomFn } from '../turnoverCheck';

import {
  roll2d6,
  checkTurnover,
  runTurnoverChecks,
  getPersonMonthlySalary,
} from '../turnoverCheck';

function createTestEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'person-001',
    pilotName: 'Test Person',
    status: CampaignPilotStatus.Active,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    wounds: 0,
    recoveryTime: 0,
    xp: 100,
    campaignXpEarned: 200,
    campaignKills: 3,
    campaignMissions: 5,
    hireDate: new Date('3000-01-01'),
    injuries: [],
    ...overrides,
  };
}

function createTestPilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'person-001',
    name: 'Test Person',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createTestOptions(): ICampaignOptions {
  return {
    healingRateMultiplier: 1.0,
    salaryMultiplier: 1.0,
    retirementAge: 65,
    healingWaitingPeriod: 1,
    medicalSystem: MedicalSystem.STANDARD,
    maxPatientsPerDoctor: 25,
    doctorsUseAdministration: false,
    xpPerMission: 1,
    xpPerKill: 1,
    xpCostMultiplier: 1.0,
    trackTimeInService: true,
    useEdge: true,
    startingFunds: 0,
    maintenanceCostMultiplier: 1.0,
    repairCostMultiplier: 1.0,
    acquisitionCostMultiplier: 1.0,
    payForMaintenance: true,
    payForRepairs: true,
    payForSalaries: true,
    payForAmmunition: true,
    maintenanceCycleDays: 7,
    useLoanSystem: true,
    useTaxes: true,
    taxRate: 10,
    overheadPercent: 5,
    useRoleBasedSalaries: false,
    payForSecondaryRole: true,
    maxLoanPercent: 50,
    defaultLoanRate: 5,
    taxFrequency: 'annually',
    useFoodAndHousing: true,
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
    useQuirks: false,
    maxUnitsPerLance: 4,
    maxLancesPerCompany: 3,
    enforceFormationRules: false,
    allowMixedFormations: true,
    requireForceCommanders: false,
    useCombatTeams: false,
    dateFormat: 'yyyy-MM-dd',
    useFactionRules: false,
    techLevel: 1,
    limitByYear: true,
    allowClanEquipment: false,
    useRandomEvents: false,
    enableDayReportNotifications: true,
    useTurnover: true,
    turnoverFixedTargetNumber: 3,
    turnoverCheckFrequency: 'monthly',
    turnoverCommanderImmune: true,
    turnoverPayoutMultiplier: 12,
    turnoverUseSkillModifiers: true,
    turnoverUseAgeModifiers: true,
    turnoverUseMissionStatusModifiers: true,
    trackFactionStanding: true,
    regardChangeMultiplier: 1.0,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createTestOptions(),
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
    campaignType: CampaignType.MERCENARY,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides.unitCombatStates ?? {},
  };
}

// Deterministic random that returns fixed values from a sequence
function createSeededRandom(values: number[]): RandomFn {
  let index = 0;
  return () => {
    const val = values[index % values.length];
    index++;
    return val;
  };
}

// Returns a random that always produces a specific 2d6 result
// roll2d6 does: Math.floor(r()*6)+1 + Math.floor(r()*6)+1
// For die value D (1-6): need r() in [D-1/6, D/6)
// e.g. die=6 → r()=5/6=0.833, die=1 → r()=0
function randomFor2d6(die1: number, die2: number): RandomFn {
  return createSeededRandom([(die1 - 1) / 6, (die2 - 1) / 6]);
}

describe('roll2d6', () => {
  it('should return sum of two dice (minimum 2)', () => {
    const random = randomFor2d6(1, 1);
    expect(roll2d6(random)).toBe(2);
  });

  it('should return sum of two dice (maximum 12)', () => {
    const random = randomFor2d6(6, 6);
    expect(roll2d6(random)).toBe(12);
  });

  it('should return 7 for 3+4', () => {
    const random = randomFor2d6(3, 4);
    expect(roll2d6(random)).toBe(7);
  });
});

describe('getPersonMonthlySalary', () => {
  it('should return default 1000 C-bills', () => {
    const entry = createTestEntry();
    const options = createTestOptions();
    const salary = getPersonMonthlySalary(entry, options);
    expect(salary.amount).toBe(1000);
  });
});

describe('checkTurnover', () => {
  it('should return passed=true when roll >= targetNumber (person stays)', () => {
    const entry = createTestEntry();
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    // Base target = 3, regular pilot modifiers sum to ~3
    // Roll high (12) to guarantee staying
    const random = randomFor2d6(6, 6);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(true);
    expect(result.departureType).toBeNull();
  });

  it('should return passed=false when roll < targetNumber (person leaves)', () => {
    const entry = createTestEntry();
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    // Roll minimum (2) — with base target 3, 2 < 3 → leaves
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(false);
    expect(result.departureType).not.toBeNull();
  });

  it('should skip non-Active roster entries (return passed=true)', () => {
    const entry = createTestEntry({ status: CampaignPilotStatus.MIA });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(true);
    expect(result.departureType).toBeNull();
  });

  it('should skip Wounded roster entries', () => {
    const entry = createTestEntry({ status: CampaignPilotStatus.Wounded });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(true);
  });

  it('should skip Critical roster entries', () => {
    const entry = createTestEntry({ status: CampaignPilotStatus.Critical });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(true);
  });

  it('should skip KIA roster entries', () => {
    const entry = createTestEntry({ status: CampaignPilotStatus.KIA });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(true);
  });

  it('should skip commander when commanderImmune option is true', () => {
    const entry = createTestEntry({ isCommander: true });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const options = { ...campaign.options, turnoverCommanderImmune: true };
    const campaignWithImmunity = { ...campaign, options };
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaignWithImmunity, random);
    expect(result.passed).toBe(true);
    expect(result.departureType).toBeNull();
  });

  it('should NOT skip commander when commanderImmune option is false', () => {
    const entry = createTestEntry({ isCommander: true });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const options = { ...campaign.options, turnoverCommanderImmune: false };
    const campaignNoImmunity = { ...campaign, options };
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaignNoImmunity, random);
    expect(result.personId).toBe('person-001');
  });

  it('should set departureType to deserted when roll < targetNumber - 4', () => {
    const entry = createTestEntry({
      injuries: [
        {
          id: 'i1',
          type: 'Broken Bone',
          location: 'Arm',
          severity: 3,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i2',
          type: 'Broken Bone',
          location: 'Leg',
          severity: 3,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i3',
          type: 'Broken Bone',
          location: 'Torso',
          severity: 3,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i4',
          type: 'Broken Bone',
          location: 'Head',
          severity: 3,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i5',
          type: 'Broken Bone',
          location: 'Back',
          severity: 3,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
      ],
    });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    // 5 permanent injuries = +5, base target 3, skill mod +1 (avg 4.5) = 9
    // Roll 2 (1+1), 2 < 9-4=5 → deserted
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(false);
    expect(result.departureType).toBe('deserted');
  });

  it('should set departureType to retired when roll < targetNumber but >= targetNumber - 4', () => {
    const entry = createTestEntry({
      injuries: [
        {
          id: 'i1',
          type: 'Broken Bone',
          location: 'Arm',
          severity: 3,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
      ],
    });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    // 1 permanent injury = +1, base target 3, skill mod +1 (avg 4.5) = 5
    // Roll 3 (1+2), 3 < 5 → leaves, 3 >= 5-4=1 → retired
    const random = randomFor2d6(1, 2);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(false);
    expect(result.departureType).toBe('retired');
  });

  it('should include modifier breakdown in result', () => {
    const entry = createTestEntry({ isFounder: true });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.modifiers).toBeDefined();
    expect(result.modifiers.length).toBeGreaterThan(0);

    const founderMod = result.modifiers.find((m) => m.modifierId === 'founder');
    expect(founderMod).toBeDefined();
    expect(founderMod!.value).toBe(-2);
  });

  it('should calculate payout based on salary × multiplier', () => {
    const entry = createTestEntry();
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    if (!result.passed) {
      // Default salary 1000, default payout multiplier 12
      expect(result.payout.amount).toBe(12000);
    }
  });

  it('should produce deterministic results with seeded random', () => {
    const entry = createTestEntry();
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random1 = randomFor2d6(3, 4);
    const random2 = randomFor2d6(3, 4);
    const result1 = checkTurnover(entry, pilot, campaign, random1);
    const result2 = checkTurnover(entry, pilot, campaign, random2);
    expect(result1.roll).toBe(result2.roll);
    expect(result1.targetNumber).toBe(result2.targetNumber);
    expect(result1.passed).toBe(result2.passed);
  });

  it('should include personId and personName in result', () => {
    const entry = createTestEntry({ pilotId: 'p-42', pilotName: 'Jane Doe' });
    const pilot = createTestPilot({ id: 'p-42', name: 'Jane Doe' });
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.personId).toBe('p-42');
    expect(result.personName).toBe('Jane Doe');
  });

  it('should return zero payout when person stays', () => {
    const entry = createTestEntry();
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const result = checkTurnover(entry, pilot, campaign, random);
    expect(result.passed).toBe(true);
    expect(result.payout.amount).toBe(0);
  });

  it('should return zero payout for deserters', () => {
    const entry = createTestEntry({
      injuries: [
        {
          id: 'i1',
          type: 'X',
          location: 'X',
          severity: 5,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i2',
          type: 'X',
          location: 'X',
          severity: 5,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i3',
          type: 'X',
          location: 'X',
          severity: 5,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i4',
          type: 'X',
          location: 'X',
          severity: 5,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
        {
          id: 'i5',
          type: 'X',
          location: 'X',
          severity: 5,
          daysToHeal: 0,
          permanent: true,
          acquired: new Date(),
        },
      ],
    });
    const pilot = createTestPilot();
    const campaign = createTestCampaign();
    const random = randomFor2d6(1, 1);
    const result = checkTurnover(entry, pilot, campaign, random);
    if (result.departureType === 'deserted') {
      expect(result.payout.amount).toBe(0);
    }
  });

  it('should apply NPC behavior: null pilot still processes turnover roll', () => {
    const entry = createTestEntry();
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    // NPCs (pilot === null) receive turnover rolls — PROCESS domain
    const result = checkTurnover(entry, null, campaign, random);
    expect(result.passed).toBe(true);
    expect(result.modifiers.length).toBeGreaterThan(0);
  });
});

describe('runTurnoverChecks', () => {
  it('should process all Active entries', () => {
    const entries: ICampaignRosterEntry[] = [
      createTestEntry({ pilotId: 'p1', pilotName: 'Alice' }),
      createTestEntry({ pilotId: 'p2', pilotName: 'Bob' }),
      createTestEntry({
        pilotId: 'p3',
        pilotName: 'Charlie',
        status: CampaignPilotStatus.MIA,
      }),
    ];
    const pilotsByPilotId = new Map<string, IPilot>([
      ['p1', createTestPilot({ id: 'p1', name: 'Alice' })],
      ['p2', createTestPilot({ id: 'p2', name: 'Bob' })],
    ]);
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const report = runTurnoverChecks(
      entries,
      pilotsByPilotId,
      campaign,
      random,
    );
    expect(report.results.length).toBe(3);
    const activeResults = report.results.filter(
      (r) => r.personId === 'p1' || r.personId === 'p2',
    );
    activeResults.forEach((r) => expect(r.passed).toBe(true));
  });

  it('should include summary counts in report', () => {
    const entries: ICampaignRosterEntry[] = [
      createTestEntry({ pilotId: 'p1', pilotName: 'Alice' }),
    ];
    const pilotsByPilotId = new Map<string, IPilot>([
      ['p1', createTestPilot({ id: 'p1', name: 'Alice' })],
    ]);
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const report = runTurnoverChecks(
      entries,
      pilotsByPilotId,
      campaign,
      random,
    );
    expect(report.totalChecked).toBeDefined();
    expect(report.totalDepartures).toBeDefined();
    expect(report.totalPayout).toBeDefined();
  });

  it('should return empty results for empty entries array', () => {
    const entries: ICampaignRosterEntry[] = [];
    const pilotsByPilotId = new Map<string, IPilot>();
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const report = runTurnoverChecks(
      entries,
      pilotsByPilotId,
      campaign,
      random,
    );
    expect(report.results).toHaveLength(0);
    expect(report.totalChecked).toBe(0);
    expect(report.totalDepartures).toBe(0);
  });

  it('should resolve NPC entries (no vault counterpart) to null pilot', () => {
    // NPC entry: pilotId not in vault map → pilot resolves to null → still rolls
    const entries: ICampaignRosterEntry[] = [
      createTestEntry({ pilotId: 'npc-001', pilotName: 'NPC Grunt' }),
    ];
    const pilotsByPilotId = new Map<string, IPilot>(); // empty vault
    const campaign = createTestCampaign();
    const random = randomFor2d6(6, 6);
    const report = runTurnoverChecks(
      entries,
      pilotsByPilotId,
      campaign,
      random,
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0].personId).toBe('npc-001');
    expect(report.results[0].passed).toBe(true);
  });
});
