import { describe, it, expect, beforeEach } from '@jest/globals';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import type { TurnoverFrequency } from '@/types/campaign/Campaign';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { DayPhase, _resetDayPipeline, getDayPipeline } from '../../dayPipeline';
import {
  turnoverProcessor,
  shouldRunTurnover,
  applyTurnoverResults,
  registerTurnoverProcessor,
} from '../turnoverProcessor';
import type { TurnoverReport, TurnoverCheckResult } from '../../turnover/turnoverCheck';

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
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
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
    personnel: new Map<string, IPerson>(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1000000) },
    options: createDefaultCampaignOptions(),
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
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
    const options = { turnoverCheckFrequency: 'quarterly' as TurnoverFrequency };
    expect(shouldRunTurnover(options, jan1)).toBe(true);
  });

  it('should return true on Apr 1st for quarterly frequency', () => {
    const apr1 = new Date('3025-04-01T00:00:00Z');
    const options = { turnoverCheckFrequency: 'quarterly' as TurnoverFrequency };
    expect(shouldRunTurnover(options, apr1)).toBe(true);
  });

  it('should return false on Feb 1st for quarterly frequency', () => {
    const feb1 = new Date('3025-02-01T00:00:00Z');
    const options = { turnoverCheckFrequency: 'quarterly' as TurnoverFrequency };
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
  it('should update departed personnel status to RETIRED', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', name: 'Alice' }));
    const campaign = createTestCampaign({ personnel });

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
    const person = updated.personnel.get('p1');
    expect(person).toBeDefined();
    expect(person!.status).toBe(PersonnelStatus.RETIRED);
    expect(person!.departureDate).toEqual(date);
    expect(person!.departureReason).toBe('retired');
  });

  it('should update departed personnel status to DESERTED', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', name: 'Bob' }));
    const campaign = createTestCampaign({ personnel });

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
    const person = updated.personnel.get('p1');
    expect(person!.status).toBe(PersonnelStatus.DESERTED);
  });

  it('should record payout as financial transaction', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', name: 'Alice' }));
    const campaign = createTestCampaign({ personnel });

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

  it('should set departure date on departed person', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', name: 'Alice' }));
    const campaign = createTestCampaign({ personnel });

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
    const person = updated.personnel.get('p1');
    expect(person!.departureDate).toEqual(date);
  });

  it('should not modify personnel who passed the check', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', name: 'Alice' }));
    const campaign = createTestCampaign({ personnel });

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
    const person = updated.personnel.get('p1');
    expect(person!.status).toBe(PersonnelStatus.ACTIVE);
    expect(person!.departureDate).toBeUndefined();
  });

  it('should not record transaction for zero payout', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', name: 'Bob' }));
    const campaign = createTestCampaign({ personnel });

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
