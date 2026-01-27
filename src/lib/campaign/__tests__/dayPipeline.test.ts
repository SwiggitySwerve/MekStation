import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IPerson, createInjury } from '@/types/campaign/Person';
import { Money } from '@/types/campaign/Money';
import { IMission } from '@/types/campaign/Mission';
import { IForce } from '@/types/campaign/Force';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';
import {
  DayPhase,
  DayPipelineRegistry,
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
  getDayPipeline,
  _resetDayPipeline,
  isFirstOfMonth,
  isMonday,
  isFirstOfYear,
} from '../dayPipeline';
import { advanceDays } from '../dayAdvancement';

// =============================================================================
// Test Fixtures
// =============================================================================

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

function createNoopProcessor(
  id: string,
  phase: DayPhase,
  events: IDayEvent[] = []
): IDayProcessor {
  return {
    id,
    phase,
    displayName: `Test Processor ${id}`,
    process(campaign: ICampaign): IDayProcessorResult {
      return { events, campaign };
    },
  };
}

function createThrowingProcessor(id: string, phase: DayPhase): IDayProcessor {
  return {
    id,
    phase,
    displayName: `Throwing Processor ${id}`,
    process(): IDayProcessorResult {
      throw new Error(`Processor ${id} failed`);
    },
  };
}

// =============================================================================
// DayPhase Tests
// =============================================================================

describe('DayPhase', () => {
  it('should have correct ascending order', () => {
    expect(DayPhase.SETUP).toBeLessThan(DayPhase.PERSONNEL);
    expect(DayPhase.PERSONNEL).toBeLessThan(DayPhase.FACILITIES);
    expect(DayPhase.FACILITIES).toBeLessThan(DayPhase.MARKETS);
    expect(DayPhase.MARKETS).toBeLessThan(DayPhase.MISSIONS);
    expect(DayPhase.MISSIONS).toBeLessThan(DayPhase.UNITS);
    expect(DayPhase.UNITS).toBeLessThan(DayPhase.FORCES);
    expect(DayPhase.FORCES).toBeLessThan(DayPhase.FINANCES);
    expect(DayPhase.FINANCES).toBeLessThan(DayPhase.EVENTS);
    expect(DayPhase.EVENTS).toBeLessThan(DayPhase.CLEANUP);
  });

  it('should have 10 phases', () => {
    const phases = Object.values(DayPhase).filter((v) => typeof v === 'number');
    expect(phases).toHaveLength(10);
  });

  it('should be spaced by 100 for future insertion', () => {
    expect(DayPhase.SETUP).toBe(0);
    expect(DayPhase.PERSONNEL).toBe(100);
    expect(DayPhase.FACILITIES).toBe(200);
    expect(DayPhase.MARKETS).toBe(300);
    expect(DayPhase.MISSIONS).toBe(400);
    expect(DayPhase.UNITS).toBe(500);
    expect(DayPhase.FORCES).toBe(600);
    expect(DayPhase.FINANCES).toBe(700);
    expect(DayPhase.EVENTS).toBe(800);
    expect(DayPhase.CLEANUP).toBe(900);
  });
});

// =============================================================================
// DayPipelineRegistry Tests
// =============================================================================

describe('DayPipelineRegistry', () => {
  let registry: DayPipelineRegistry;

  beforeEach(() => {
    registry = new DayPipelineRegistry();
  });

  describe('register', () => {
    it('should add a processor', () => {
      const processor = createNoopProcessor('test', DayPhase.PERSONNEL);
      registry.register(processor);

      expect(registry.getProcessors()).toHaveLength(1);
      expect(registry.getProcessors()[0].id).toBe('test');
    });

    it('should replace processor with same ID', () => {
      const processor1 = createNoopProcessor('test', DayPhase.PERSONNEL);
      const processor2 = createNoopProcessor('test', DayPhase.FINANCES);

      registry.register(processor1);
      registry.register(processor2);

      expect(registry.getProcessors()).toHaveLength(1);
      expect(registry.getProcessors()[0].phase).toBe(DayPhase.FINANCES);
    });

    it('should allow multiple processors in same phase', () => {
      registry.register(createNoopProcessor('a', DayPhase.PERSONNEL));
      registry.register(createNoopProcessor('b', DayPhase.PERSONNEL));

      expect(registry.getProcessors()).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('should remove a processor by ID', () => {
      registry.register(createNoopProcessor('test', DayPhase.PERSONNEL));
      registry.unregister('test');

      expect(registry.getProcessors()).toHaveLength(0);
    });

    it('should be a no-op for non-existent ID', () => {
      registry.register(createNoopProcessor('test', DayPhase.PERSONNEL));
      registry.unregister('nonexistent');

      expect(registry.getProcessors()).toHaveLength(1);
    });
  });

  describe('getProcessors', () => {
    it('should return processors sorted by phase', () => {
      registry.register(createNoopProcessor('finances', DayPhase.FINANCES));
      registry.register(createNoopProcessor('personnel', DayPhase.PERSONNEL));
      registry.register(createNoopProcessor('setup', DayPhase.SETUP));

      const processors = registry.getProcessors();
      expect(processors[0].id).toBe('setup');
      expect(processors[1].id).toBe('personnel');
      expect(processors[2].id).toBe('finances');
    });

    it('should return empty array when no processors registered', () => {
      expect(registry.getProcessors()).toHaveLength(0);
    });
  });

  describe('getProcessorsByPhase', () => {
    it('should return only processors for specified phase', () => {
      registry.register(createNoopProcessor('a', DayPhase.PERSONNEL));
      registry.register(createNoopProcessor('b', DayPhase.FINANCES));
      registry.register(createNoopProcessor('c', DayPhase.PERSONNEL));

      const personnelProcessors = registry.getProcessorsByPhase(DayPhase.PERSONNEL);
      expect(personnelProcessors).toHaveLength(2);
      expect(personnelProcessors.map((p) => p.id)).toEqual(['a', 'c']);
    });

    it('should return empty array for phase with no processors', () => {
      registry.register(createNoopProcessor('a', DayPhase.PERSONNEL));
      expect(registry.getProcessorsByPhase(DayPhase.FINANCES)).toHaveLength(0);
    });
  });

  describe('processDay', () => {
    it('should call processors in phase order', () => {
      const callOrder: string[] = [];

      const makeTrackingProcessor = (id: string, phase: DayPhase): IDayProcessor => ({
        id,
        phase,
        displayName: id,
        process(campaign: ICampaign): IDayProcessorResult {
          callOrder.push(id);
          return { events: [], campaign };
        },
      });

      registry.register(makeTrackingProcessor('finances', DayPhase.FINANCES));
      registry.register(makeTrackingProcessor('personnel', DayPhase.PERSONNEL));
      registry.register(makeTrackingProcessor('setup', DayPhase.SETUP));

      const campaign = createTestCampaign();
      registry.processDay(campaign);

      expect(callOrder).toEqual(['setup', 'personnel', 'finances']);
    });

    it('should chain campaign state between processors', () => {
      const mutatingProcessor: IDayProcessor = {
        id: 'mutator',
        phase: DayPhase.PERSONNEL,
        displayName: 'Mutator',
        process(campaign: ICampaign): IDayProcessorResult {
          return {
            events: [],
            campaign: { ...campaign, name: 'Modified by mutator' },
          };
        },
      };

      const verifyingProcessor: IDayProcessor = {
        id: 'verifier',
        phase: DayPhase.FINANCES,
        displayName: 'Verifier',
        process(campaign: ICampaign): IDayProcessorResult {
          expect(campaign.name).toBe('Modified by mutator');
          return { events: [], campaign };
        },
      };

      registry.register(mutatingProcessor);
      registry.register(verifyingProcessor);

      const campaign = createTestCampaign({ name: 'Original' });
      const result = registry.processDay(campaign);

      expect(result.campaign.name).toBe('Modified by mutator');
    });

    it('should aggregate events from all processors', () => {
      const event1: IDayEvent = {
        type: 'healing',
        description: 'Person healed',
        severity: 'info',
      };
      const event2: IDayEvent = {
        type: 'cost',
        description: 'Costs deducted',
        severity: 'info',
      };

      registry.register(createNoopProcessor('a', DayPhase.PERSONNEL, [event1]));
      registry.register(createNoopProcessor('b', DayPhase.FINANCES, [event2]));

      const campaign = createTestCampaign();
      const result = registry.processDay(campaign);

      expect(result.events).toHaveLength(2);
      expect(result.events[0].type).toBe('healing');
      expect(result.events[1].type).toBe('cost');
    });

    it('should track which processors were run', () => {
      registry.register(createNoopProcessor('a', DayPhase.PERSONNEL));
      registry.register(createNoopProcessor('b', DayPhase.FINANCES));

      const campaign = createTestCampaign();
      const result = registry.processDay(campaign);

      expect(result.processorsRun).toEqual(['a', 'b']);
    });

    it('should advance date by one day after all processors', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15T00:00:00Z'),
      });

      const result = registry.processDay(campaign);

      expect(result.date.getUTCDate()).toBe(15);
      expect(result.campaign.currentDate.getUTCDate()).toBe(16);
    });

    it('should skip failing processor and continue pipeline', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const callOrder: string[] = [];
      const trackingProcessor = (id: string, phase: DayPhase): IDayProcessor => ({
        id,
        phase,
        displayName: id,
        process(campaign: ICampaign): IDayProcessorResult {
          callOrder.push(id);
          return { events: [], campaign };
        },
      });

      registry.register(trackingProcessor('before', DayPhase.PERSONNEL));
      registry.register(createThrowingProcessor('broken', DayPhase.FACILITIES));
      registry.register(trackingProcessor('after', DayPhase.FINANCES));

      const campaign = createTestCampaign();
      const result = registry.processDay(campaign);

      expect(callOrder).toEqual(['before', 'after']);
      expect(result.processorsRun).toEqual(['before', 'broken', 'after']);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should use unchanged campaign state when processor fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mutator: IDayProcessor = {
        id: 'mutator',
        phase: DayPhase.SETUP,
        displayName: 'Mutator',
        process(campaign: ICampaign): IDayProcessorResult {
          return {
            events: [],
            campaign: { ...campaign, name: 'Before failure' },
          };
        },
      };

      registry.register(mutator);
      registry.register(createThrowingProcessor('broken', DayPhase.PERSONNEL));

      const verifier: IDayProcessor = {
        id: 'verifier',
        phase: DayPhase.FINANCES,
        displayName: 'Verifier',
        process(campaign: ICampaign): IDayProcessorResult {
          expect(campaign.name).toBe('Before failure');
          return { events: [], campaign };
        },
      };
      registry.register(verifier);

      const campaign = createTestCampaign({ name: 'Original' });
      const result = registry.processDay(campaign);

      expect(result.campaign.name).toBe('Before failure');

      consoleSpy.mockRestore();
    });

    it('should handle empty registry', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15T00:00:00Z'),
      });

      const result = registry.processDay(campaign);

      expect(result.events).toHaveLength(0);
      expect(result.processorsRun).toHaveLength(0);
      expect(result.campaign.currentDate.getUTCDate()).toBe(16);
    });

    it('should set report date to the processed date (before advancement)', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15T00:00:00Z'),
      });

      const result = registry.processDay(campaign);

      expect(result.date.getUTCDate()).toBe(15);
    });
  });
});

// =============================================================================
// Singleton Tests
// =============================================================================

describe('getDayPipeline / _resetDayPipeline', () => {
  afterEach(() => {
    _resetDayPipeline();
  });

  it('should return the same instance on multiple calls', () => {
    const a = getDayPipeline();
    const b = getDayPipeline();
    expect(a).toBe(b);
  });

  it('should return a fresh instance after reset', () => {
    const a = getDayPipeline();
    a.register(createNoopProcessor('test', DayPhase.SETUP));

    _resetDayPipeline();

    const b = getDayPipeline();
    expect(b).not.toBe(a);
    expect(b.getProcessors()).toHaveLength(0);
  });
});

// =============================================================================
// Date Helper Tests
// =============================================================================

describe('date helpers', () => {
  describe('isFirstOfMonth', () => {
    it('should return true for first of month', () => {
      expect(isFirstOfMonth(new Date('3025-06-01T00:00:00Z'))).toBe(true);
    });

    it('should return false for other days', () => {
      expect(isFirstOfMonth(new Date('3025-06-15T00:00:00Z'))).toBe(false);
    });
  });

  describe('isMonday', () => {
    it('should return true for Monday', () => {
      expect(isMonday(new Date('3025-06-20T00:00:00Z'))).toBe(true);
    });

    it('should return false for non-Monday', () => {
      expect(isMonday(new Date('3025-06-15T00:00:00Z'))).toBe(false);
    });
  });

  describe('isFirstOfYear', () => {
    it('should return true for January 1', () => {
      expect(isFirstOfYear(new Date('3025-01-01T00:00:00Z'))).toBe(true);
    });

    it('should return false for other days', () => {
      expect(isFirstOfYear(new Date('3025-06-01T00:00:00Z'))).toBe(false);
    });
  });
});

// =============================================================================
// advanceDays Tests
// =============================================================================

describe('advanceDays', () => {
  it('should return N DayReports for N days', () => {
    const campaign = createTestCampaign();
    const reports = advanceDays(campaign, 7);

    expect(reports).toHaveLength(7);
  });

  it('should chain campaign state between days', () => {
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
    });

    const reports = advanceDays(campaign, 3);

    expect(reports[0].campaign.currentDate.getUTCDate()).toBe(16);
    expect(reports[1].campaign.currentDate.getUTCDate()).toBe(17);
    expect(reports[2].campaign.currentDate.getUTCDate()).toBe(18);
  });

  it('should process healing correctly over multiple days', () => {
    const injury = createInjury({
      id: 'inj-1',
      type: 'Broken Arm',
      location: 'Left Arm',
      severity: 2,
      daysToHeal: 3,
      permanent: false,
      acquired: new Date('3025-01-01'),
    });

    const personnel = new Map<string, IPerson>();
    personnel.set(
      'p1',
      {
        id: 'p1',
        name: 'Test',
        callsign: 'T',
        status: PersonnelStatus.WOUNDED,
        primaryRole: CampaignPersonnelRole.PILOT,
        rank: 'MechWarrior',
        recruitmentDate: new Date('3025-01-01'),
        missionsCompleted: 0,
        totalKills: 0,
        xp: 0,
        totalXpEarned: 0,
        xpSpent: 0,
        hits: 0,
        injuries: [injury],
        daysToWaitForHealing: 0,
        skills: {},
        attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
        pilotSkills: { gunnery: 4, piloting: 5 },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }
    );

    const campaign = createTestCampaign({ personnel });
    const reports = advanceDays(campaign, 5);

    expect(reports[2].campaign.personnel.get('p1')!.status).toBe(PersonnelStatus.ACTIVE);
    expect(reports[2].campaign.personnel.get('p1')!.injuries).toHaveLength(0);
  });

  it('should not stop on negative balance', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', {
      id: 'p1',
      name: 'Test',
      callsign: 'T',
      status: PersonnelStatus.ACTIVE,
      primaryRole: CampaignPersonnelRole.PILOT,
      rank: 'MechWarrior',
      recruitmentDate: new Date('3025-01-01'),
      missionsCompleted: 0,
      totalKills: 0,
      xp: 0,
      totalXpEarned: 0,
      xpSpent: 0,
      hits: 0,
      injuries: [],
      daysToWaitForHealing: 0,
      skills: {},
      attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
      pilotSkills: { gunnery: 4, piloting: 5 },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const campaign = createTestCampaign({
      personnel,
      finances: { transactions: [], balance: new Money(10) },
    });

    const reports = advanceDays(campaign, 5);

    expect(reports).toHaveLength(5);
    expect(reports[4].campaign.finances.balance.isNegative()).toBe(true);
  });

  it('should return empty array for 0 days', () => {
    const campaign = createTestCampaign();
    const reports = advanceDays(campaign, 0);

    expect(reports).toHaveLength(0);
  });
});
