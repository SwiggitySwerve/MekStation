import { describe, it, expect, beforeEach } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { TurnoverFrequency } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { Money } from '@/types/campaign/Money';

import type { TurnoverReport } from '../../turnover/turnoverCheck';

import { DayPhase, _resetDayPipeline, getDayPipeline } from '../../dayPipeline';
import {
  turnoverProcessor,
  shouldRunTurnover,
  applyTurnoverResults,
  registerTurnoverProcessor,
} from '../turnoverProcessor';

function createTestPerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'person-001',
    name: 'Test Person',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3000-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 200,
    xpSpent: 100,
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
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1000000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
    campaignType: CampaignType.MERCENARY,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides.unitCombatStates ?? {},
  };
}

/**
 * Seed a single roster entry with the given pilotId so applyTurnoverResults
 * has a target to patch via applyPilotPatches (per PR4 of
 * `wire-iperson-hard-cutover`). Resets the rest of the store fields to
 * a clean baseline.
 */
function seedRoster(pilotId: string): void {
  useCampaignRosterStore.setState({
    campaignId: 'campaign-001',
    units: [],
    pilots: [
      {
        pilotId,
        pilotName: pilotId,
        status: CampaignPilotStatus.Active,
        wounds: 0,
        recoveryTime: 0,
        xp: 0,
        campaignXpEarned: 0,
        campaignKills: 0,
        campaignMissions: 0,
        primaryRole: CampaignPersonnelRole.PILOT,
        rankIndex: 0,
        hireDate: new Date('3024-01-01'),
      },
    ],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
}

describe('turnoverProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(turnoverProcessor.id).toBe('turnover');
    expect(turnoverProcessor.phase).toBe(DayPhase.PERSONNEL);
    expect(turnoverProcessor.displayName).toBe('Turnover Check');
  });
});

describe('shouldRunTurnover', () => {
  it('should return true on Monday for weekly frequency', () => {
    // 3025-06-20 is a Monday (UTC day 1)
    const monday = new Date('3025-06-20T00:00:00Z');
    const options = { turnoverCheckFrequency: 'weekly' as TurnoverFrequency };
    expect(shouldRunTurnover(options, monday)).toBe(true);
  });

  it('should return false on Tuesday for weekly frequency', () => {
    // 3025-06-21 is a Tuesday (UTC day 2)
    const tuesday = new Date('3025-06-21T00:00:00Z');
    const options = { turnoverCheckFrequency: 'weekly' as TurnoverFrequency };
    expect(shouldRunTurnover(options, tuesday)).toBe(false);
  });

  it('should return true on 1st of month for monthly frequency', () => {
    const firstOfMonth = new Date('3025-07-01T00:00:00Z');
    const options = { turnoverCheckFrequency: 'monthly' as TurnoverFrequency };
    expect(shouldRunTurnover(options, firstOfMonth)).toBe(true);
  });

  it('should return false on 15th for monthly frequency', () => {
    const midMonth = new Date('3025-06-15T00:00:00Z');
    const options = { turnoverCheckFrequency: 'monthly' as TurnoverFrequency };
    expect(shouldRunTurnover(options, midMonth)).toBe(false);
  });

  it('should return true on Jan 1st for quarterly frequency', () => {
    const jan1 = new Date('3025-01-01T00:00:00Z');
    const options = {
      turnoverCheckFrequency: 'quarterly' as TurnoverFrequency,
    };
    expect(shouldRunTurnover(options, jan1)).toBe(true);
  });

  it('should return true on Apr 1st for quarterly frequency', () => {
    const apr1 = new Date('3025-04-01T00:00:00Z');
    const options = {
      turnoverCheckFrequency: 'quarterly' as TurnoverFrequency,
    };
    expect(shouldRunTurnover(options, apr1)).toBe(true);
  });

  it('should return false on Feb 1st for quarterly frequency', () => {
    const feb1 = new Date('3025-02-01T00:00:00Z');
    const options = {
      turnoverCheckFrequency: 'quarterly' as TurnoverFrequency,
    };
    expect(shouldRunTurnover(options, feb1)).toBe(false);
  });

  it('should return true on Jan 1st for annually frequency', () => {
    const jan1 = new Date('3025-01-01T00:00:00Z');
    const options = { turnoverCheckFrequency: 'annually' as TurnoverFrequency };
    expect(shouldRunTurnover(options, jan1)).toBe(true);
  });

  it('should return false on Jun 15 for annually frequency', () => {
    const midYear = new Date('3025-06-15T00:00:00Z');
    const options = { turnoverCheckFrequency: 'annually' as TurnoverFrequency };
    expect(shouldRunTurnover(options, midYear)).toBe(false);
  });

  it('should return false for never frequency', () => {
    const anyDate = new Date('3025-06-16T00:00:00Z');
    const options = { turnoverCheckFrequency: 'never' as TurnoverFrequency };
    expect(shouldRunTurnover(options, anyDate)).toBe(false);
  });

  it('should default to monthly when frequency not set', () => {
    const firstOfMonth = new Date('3025-07-01T00:00:00Z');
    const options = {};
    expect(shouldRunTurnover(options, firstOfMonth)).toBe(true);
  });
});

describe('applyTurnoverResults', () => {
  it('should mark departed personnel with departureReason=retired', () => {
    seedRoster('p1');
    const campaign = createTestCampaign({});

    const report: TurnoverReport = {
      results: [
        {
          personId: 'p1',
          personName: 'Alice',
          roll: 2,
          targetNumber: 5,
          modifiers: [],
          passed: false,
          departureType: 'retired',
          payout: new Money(12000),
        },
      ],
      totalChecked: 1,
      totalDepartures: 1,
      totalPayout: new Money(12000),
    };

    const date = new Date('3025-06-15T00:00:00Z');
    const updated = applyTurnoverResults(campaign, report, date);
    void updated;
    const person = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 'p1');
    expect(person).toBeDefined();
    // Per PR4: CampaignPilotStatus has no Retired/Deserted variants — the
    // status is preserved (Active here) and departureReason is the marker.
    expect(person!.departureReason).toBe('retired');
  });

  it('should mark departed personnel with departureReason=deserted', () => {
    seedRoster('p1');
    const campaign = createTestCampaign({});

    const report: TurnoverReport = {
      results: [
        {
          personId: 'p1',
          personName: 'Bob',
          roll: 2,
          targetNumber: 10,
          modifiers: [],
          passed: false,
          departureType: 'deserted',
          payout: Money.ZERO,
        },
      ],
      totalChecked: 1,
      totalDepartures: 1,
      totalPayout: Money.ZERO,
    };

    const date = new Date('3025-06-15T00:00:00Z');
    const updated = applyTurnoverResults(campaign, report, date);
    void updated;
    const person = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 'p1');
    expect(person!.departureReason).toBe('deserted');
  });

  it('should record payout as financial transaction', () => {
    const campaign = createTestCampaign({});

    const report: TurnoverReport = {
      results: [
        {
          personId: 'p1',
          personName: 'Alice',
          roll: 2,
          targetNumber: 5,
          modifiers: [],
          passed: false,
          departureType: 'retired',
          payout: new Money(12000),
        },
      ],
      totalChecked: 1,
      totalDepartures: 1,
      totalPayout: new Money(12000),
    };

    const date = new Date('3025-06-15T00:00:00Z');
    const updated = applyTurnoverResults(campaign, report, date);
    expect(updated.finances.transactions.length).toBe(1);
    expect(updated.finances.transactions[0].amount.amount).toBe(12000);
    expect(updated.finances.balance.amount).toBe(1000000 - 12000);
  });

  it('should record departureReason on departed person (departureDate is no longer mirrored on roster)', () => {
    seedRoster('p1');
    const campaign = createTestCampaign({});

    const report: TurnoverReport = {
      results: [
        {
          personId: 'p1',
          personName: 'Alice',
          roll: 2,
          targetNumber: 5,
          modifiers: [],
          passed: false,
          departureType: 'retired',
          payout: new Money(12000),
        },
      ],
      totalChecked: 1,
      totalDepartures: 1,
      totalPayout: new Money(12000),
    };

    const date = new Date('3025-06-15T00:00:00Z');
    const updated = applyTurnoverResults(campaign, report, date);
    void updated;
    void date;
    const person = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 'p1');
    // Per PR4: departureReason is the marker. Future: a `departureDate`
    // field on the entry can mirror the legacy IPerson semantics.
    expect(person!.departureReason).toBe('retired');
  });

  it('should not modify personnel who passed the check', () => {
    seedRoster('p1');
    const campaign = createTestCampaign({});

    const report: TurnoverReport = {
      results: [
        {
          personId: 'p1',
          personName: 'Alice',
          roll: 12,
          targetNumber: 5,
          modifiers: [],
          passed: true,
          departureType: null,
          payout: Money.ZERO,
        },
      ],
      totalChecked: 1,
      totalDepartures: 0,
      totalPayout: Money.ZERO,
    };

    const date = new Date('3025-06-15T00:00:00Z');
    const updated = applyTurnoverResults(campaign, report, date);
    void updated;
    const person = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 'p1');
    expect(person!.status).toBe(CampaignPilotStatus.Active);
    expect(person!.departureReason).toBeUndefined();
    void PersonnelStatus;
  });

  it('should not record transaction for zero payout', () => {
    const campaign = createTestCampaign({});

    const report: TurnoverReport = {
      results: [
        {
          personId: 'p1',
          personName: 'Bob',
          roll: 2,
          targetNumber: 10,
          modifiers: [],
          passed: false,
          departureType: 'deserted',
          payout: Money.ZERO,
        },
      ],
      totalChecked: 1,
      totalDepartures: 1,
      totalPayout: Money.ZERO,
    };

    const date = new Date('3025-06-15T00:00:00Z');
    const updated = applyTurnoverResults(campaign, report, date);
    expect(updated.finances.transactions.length).toBe(0);
  });
});

describe('registerTurnoverProcessor', () => {
  beforeEach(() => {
    _resetDayPipeline();
  });

  it('should register the turnover processor in the pipeline', () => {
    registerTurnoverProcessor();
    const pipeline = getDayPipeline();
    const processors = pipeline.getProcessors();
    const turnover = processors.find((p) => p.id === 'turnover');
    expect(turnover).toBeDefined();
    expect(turnover!.phase).toBe(DayPhase.PERSONNEL);
  });
});
