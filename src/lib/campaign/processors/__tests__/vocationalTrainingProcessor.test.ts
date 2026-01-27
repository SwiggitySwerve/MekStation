import { describe, it, expect, beforeEach } from '@jest/globals';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { DayPhase, _resetDayPipeline, getDayPipeline } from '../../dayPipeline';
import {
  vocationalTrainingProcessor,
  processVocationalTraining,
  registerVocationalTrainingProcessor,
} from '../vocationalTrainingProcessor';

type RandomFn = () => number;

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
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

/**
 * Helper to create a seeded random function that returns specific die values.
 * Maps die values (1-6) to random() inputs via (die-1)/6.
 */
function randomFor2d6(die1: number, die2: number): RandomFn {
  let callCount = 0;
  return () => {
    const die = callCount === 0 ? die1 : die2;
    callCount++;
    return (die - 1) / 6;
  };
}

describe('vocationalTrainingProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(vocationalTrainingProcessor.id).toBe('vocational-training');
    expect(vocationalTrainingProcessor.phase).toBe(DayPhase.EVENTS);
    expect(vocationalTrainingProcessor.displayName).toBe('Vocational Training');
  });
});

describe('processVocationalTraining', () => {
  it('should increment timer for eligible person', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 28 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
    });

    const { updatedCampaign } = processVocationalTraining(campaign, () => 0);
    const updated = updatedCampaign.personnel.get('person-001');

    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should award vocational XP when roll >= TN', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXP: 1,
        vocationalXPTargetNumber: 7,
        vocationalXPCheckFrequency: 30,
      },
    });

    // Roll 7 (3+4) vs TN 7 = success
    const random = randomFor2d6(3, 4);
    const { updatedCampaign, events } = processVocationalTraining(campaign, random);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('vocational');
    expect(events[0].description).toContain('rolled 7');
    expect(events[0].description).toContain('TN 7');

    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(0);
  });

  it('should not award XP when roll < TN', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXP: 1,
        vocationalXPTargetNumber: 7,
        vocationalXPCheckFrequency: 30,
      },
    });

    // Roll 6 (2+4) vs TN 7 = failure
    const random = randomFor2d6(2, 4);
    const { updatedCampaign, events } = processVocationalTraining(campaign, random);

    expect(events).toHaveLength(0);

    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(0);
  });

  it('should skip inactive personnel', () => {
    const person = createTestPerson({
      status: PersonnelStatus.RETIRED,
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
    });

    const { updatedCampaign, events } = processVocationalTraining(campaign, () => 0);

    expect(events).toHaveLength(0);
    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should skip child personnel', () => {
    const person = createTestPerson({
      birthDate: new Date('3020-01-01'), // 5 years old
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
      currentDate: new Date('3025-06-15'),
    });

    const { updatedCampaign, events } = processVocationalTraining(campaign, () => 0);

    expect(events).toHaveLength(0);
    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should skip dependent personnel', () => {
    const person = createTestPerson({
      primaryRole: CampaignPersonnelRole.DEPENDENT,
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
    });

    const { updatedCampaign, events } = processVocationalTraining(campaign, () => 0);

    expect(events).toHaveLength(0);
    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should skip prisoner personnel', () => {
    const person = createTestPerson({
      status: PersonnelStatus.POW,
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
    });

    const { updatedCampaign, events } = processVocationalTraining(campaign, () => 0);

    expect(events).toHaveLength(0);
    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should reset timer after check regardless of success', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXPTargetNumber: 12, // Impossible to roll
      },
    });

    // Roll 2 (1+1) vs TN 12 = failure
    const random = randomFor2d6(1, 1);
    const { updatedCampaign } = processVocationalTraining(campaign, random);

    const updated = updatedCampaign.personnel.get('person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(0);
  });

  it('should use default values when options not set', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
      options: createDefaultCampaignOptions(),
    });

    // Roll 7 (3+4) vs default TN 7 = success
    const random = randomFor2d6(3, 4);
    const { events } = processVocationalTraining(campaign, random);

    expect(events).toHaveLength(1);
    expect(events[0].description).toContain('rolled 7');
  });

  it('should handle multiple personnel', () => {
    const person1 = createTestPerson({
      id: 'person-001',
      traits: { vocationalXPTimer: 29 },
    });
    const person2 = createTestPerson({
      id: 'person-002',
      traits: { vocationalXPTimer: 15 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([
        ['person-001', person1],
        ['person-002', person2],
      ]),
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXPTargetNumber: 7,
        vocationalXPCheckFrequency: 30,
      },
    });

    // Roll 7 (3+4) vs TN 7 = success for person 1
    const random = randomFor2d6(3, 4);
    const { updatedCampaign, events } = processVocationalTraining(campaign, random);

    expect(events).toHaveLength(1);
    expect(events[0].data?.personId).toBe('person-001');

    const updated1 = updatedCampaign.personnel.get('person-001');
    const updated2 = updatedCampaign.personnel.get('person-002');
    expect(updated1?.traits?.vocationalXPTimer).toBe(0);
    expect(updated2?.traits?.vocationalXPTimer).toBe(16);
  });

  it('should be deterministic with seeded random', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 29 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXPTargetNumber: 7,
      },
    });

    const random1 = randomFor2d6(3, 4);
    const { events: events1 } = processVocationalTraining(campaign, random1);

    const random2 = randomFor2d6(3, 4);
    const { events: events2 } = processVocationalTraining(campaign, random2);

    expect(events1).toEqual(events2);
  });
});

describe('vocationalTrainingProcessor.process', () => {
  it('should process vocational training on each day', () => {
    const person = createTestPerson({
      traits: { vocationalXPTimer: 28 },
    });
    const campaign = createTestCampaign({
      personnel: new Map([['person-001', person]]),
    });

    const result = vocationalTrainingProcessor.process(campaign, new Date('3025-06-15'));

    expect(result.campaign.personnel.get('person-001')?.traits?.vocationalXPTimer).toBe(29);
  });
});

describe('registerVocationalTrainingProcessor', () => {
  beforeEach(() => {
    _resetDayPipeline();
  });

  it('should register processor in pipeline', () => {
    registerVocationalTrainingProcessor();
    const pipeline = getDayPipeline();
    const processors = pipeline.getProcessors();
    const processor = processors.find((p) => p.id === 'vocational-training');

    expect(processor).toBeDefined();
    expect(processor?.id).toBe('vocational-training');
  });
});
