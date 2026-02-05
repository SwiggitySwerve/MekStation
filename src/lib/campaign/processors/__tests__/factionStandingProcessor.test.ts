import type { ICampaign } from '@/types/campaign/Campaign';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { FactionStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';
import { Money } from '@/types/campaign/Money';

import { DayPhase, _resetDayPipeline, getDayPipeline } from '../../dayPipeline';
import { AccoladeLevel, CensureLevel } from '../../factionStanding/escalation';
import {
  factionStandingProcessor,
  registerFactionStandingProcessor,
} from '../factionStandingProcessor';

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
  const options = createDefaultCampaignOptions();
  const now = new Date().toISOString();
  return {
    id: 'test-campaign',
    name: 'Test Campaign',
    currentDate: new Date('2025-01-15'),
    factionId: 'test-faction',
    rootForceId: 'force-root',
    createdAt: now,
    updatedAt: now,
    options,
    factionStandings: {},
    shoppingList: { items: [] },
    personnel: new Map(),
    finances: {
      balance: new Money(100000),
      transactions: [],
    },
    forces: new Map(),
    missions: new Map(),
    ...overrides,
    campaignType: CampaignType.MERCENARY,
  };
}

describe('factionStandingProcessor', () => {
  describe('processor configuration', () => {
    it('should have correct id', () => {
      expect(factionStandingProcessor.id).toBe('faction-standing');
    });

    it('should have correct phase', () => {
      expect(factionStandingProcessor.phase).toBe(DayPhase.EVENTS);
    });

    it('should have displayName', () => {
      expect(factionStandingProcessor.displayName).toBeDefined();
    });
  });

  describe('daily regard decay', () => {
    it('should process regard decay for all tracked factions', () => {
      const campaign = createTestCampaign({
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 30,
            level: FactionStandingLevel.LEVEL_2,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
          'faction-2': {
            factionId: 'faction-2',
            regard: -20,
            level: FactionStandingLevel.LEVEL_5,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].regard).toBeLessThan(
        30,
      );
      expect(
        result.campaign.factionStandings['faction-2'].regard,
      ).toBeGreaterThan(-20);
      expect(result.events.length).toBe(0);
    });

    it('should not decay regard at zero', () => {
      const campaign = createTestCampaign({
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 0,
            level: FactionStandingLevel.LEVEL_4,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].regard).toBe(0);
    });
  });

  describe('monthly escalation (1st of month)', () => {
    it('should check accolade escalation on 1st of month', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('2025-01-01'),
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 15,
            level: FactionStandingLevel.LEVEL_2,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].accoladeLevel).toBe(
        1,
      );
      expect(result.events.some((e) => e.type === 'faction_accolade')).toBe(
        true,
      );
    });

    it('should check censure escalation on 1st of month', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('2025-02-01'),
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: -5,
            level: FactionStandingLevel.LEVEL_5,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].censureLevel).toBe(
        1,
      );
      expect(result.events.some((e) => e.type === 'faction_censure')).toBe(
        true,
      );
    });

    it('should emit accolade event with correct data', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('2025-01-01'),
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 20,
            level: FactionStandingLevel.LEVEL_2,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      const accoladeEvent = result.events.find(
        (e) => e.type === 'faction_accolade',
      );
      expect(accoladeEvent).toBeDefined();
      expect(accoladeEvent?.data?.factionId).toBe('faction-1');
      expect(accoladeEvent?.data?.accoladeLevel).toBe(1);
    });

    it('should emit censure event with correct data', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('2025-02-01'),
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: -10,
            level: FactionStandingLevel.LEVEL_5,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      const censureEvent = result.events.find(
        (e) => e.type === 'faction_censure',
      );
      expect(censureEvent).toBeDefined();
      expect(censureEvent?.data?.factionId).toBe('faction-1');
      expect(censureEvent?.data?.censureLevel).toBe(1);
    });

    it('should not escalate beyond max levels', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('2025-01-01'),
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 50,
            level: FactionStandingLevel.LEVEL_1,
            accoladeLevel: 5,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].accoladeLevel).toBe(
        5,
      );
      expect(
        result.events.filter((e) => e.type === 'faction_accolade'),
      ).toHaveLength(0);
    });
  });

  describe('skip when trackFactionStanding is false', () => {
    it('should skip processing when trackFactionStanding is false', () => {
      const campaign = createTestCampaign({
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: false,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 30,
            level: FactionStandingLevel.LEVEL_2,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].regard).toBe(30);
      expect(result.events).toHaveLength(0);
    });

    it('should process when trackFactionStanding is undefined (defaults to true)', () => {
      const campaign = createTestCampaign({
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 30,
            level: FactionStandingLevel.LEVEL_2,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].regard).toBeLessThan(
        30,
      );
      expect(result.events).toHaveLength(0);
    });
  });

  describe('empty standings', () => {
    it('should handle empty standings map', () => {
      const campaign = createTestCampaign({
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {},
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings).toEqual({});
      expect(result.events).toHaveLength(0);
    });
  });

  describe('registration', () => {
    afterEach(() => {
      _resetDayPipeline();
    });

    it('should register processor with pipeline', () => {
      registerFactionStandingProcessor();
      const pipeline = getDayPipeline();
      const processors = pipeline.getProcessors();

      expect(processors.some((p) => p.id === 'faction-standing')).toBe(true);
    });

    it('should register in EVENTS phase', () => {
      registerFactionStandingProcessor();
      const pipeline = getDayPipeline();
      const processor = pipeline
        .getProcessors()
        .find((p) => p.id === 'faction-standing');

      expect(processor?.phase).toBe(DayPhase.EVENTS);
    });
  });

  describe('combined daily and monthly processing', () => {
    it('should process decay and escalation on 1st of month', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('2025-01-01'),
        options: {
          ...createDefaultCampaignOptions(),
          trackFactionStanding: true,
        },
        factionStandings: {
          'faction-1': {
            factionId: 'faction-1',
            regard: 15,
            level: FactionStandingLevel.LEVEL_2,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
          'faction-2': {
            factionId: 'faction-2',
            regard: -5,
            level: FactionStandingLevel.LEVEL_5,
            accoladeLevel: 0,
            censureLevel: 0,
            history: [],
          },
        },
      });

      const result = factionStandingProcessor.process(
        campaign,
        campaign.currentDate,
      );

      expect(result.campaign.factionStandings['faction-1'].regard).toBeLessThan(
        15,
      );
      expect(
        result.campaign.factionStandings['faction-2'].regard,
      ).toBeGreaterThan(-5);

      expect(result.campaign.factionStandings['faction-1'].accoladeLevel).toBe(
        1,
      );
      expect(result.campaign.factionStandings['faction-2'].censureLevel).toBe(
        1,
      );

      expect(
        result.events.filter(
          (e) => e.type === 'faction_accolade' || e.type === 'faction_censure',
        ),
      ).toHaveLength(2);
    });
  });
});
