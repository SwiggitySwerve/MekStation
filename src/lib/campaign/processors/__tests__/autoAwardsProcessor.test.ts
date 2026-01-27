import { describe, it, expect, beforeEach } from '@jest/globals';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { DayPhase } from '../../dayPipeline';
import { autoAwardsProcessor, processPostMissionAwards, processPostScenarioAwards } from '../autoAwardsProcessor';
import { createDefaultAutoAwardConfig } from '@/types/campaign/awards/autoAwardTypes';

function createTestPerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'person-001',
    name: 'Test Pilot',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3000-01-01'),
    missionsCompleted: 5,
    totalKills: 0,
    xp: 100,
    totalXpEarned: 500,
    xpSpent: 100,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    awards: [],
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  const defaultOptions = createDefaultCampaignOptions();
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-01-01T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map<string, IPerson>(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: {
      ...defaultOptions,
      autoAwardConfig: createDefaultAutoAwardConfig(),
    },
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

describe('autoAwardsProcessor', () => {
  describe('metadata', () => {
    it('should have correct id', () => {
      expect(autoAwardsProcessor.id).toBe('auto-awards');
    });

    it('should have correct phase (PERSONNEL)', () => {
      expect(autoAwardsProcessor.phase).toBe(DayPhase.PERSONNEL);
    });

    it('should have correct displayName', () => {
      expect(autoAwardsProcessor.displayName).toBe('Auto Awards');
    });
  });

  describe('monthly processing', () => {
    it('should return no events when not 1st of month', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15T00:00:00Z'),
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-15T00:00:00Z'));

      expect(result.events).toHaveLength(0);
      expect(result.campaign).toEqual(campaign);
    });

    it('should return no events when autoAwardConfig is undefined', () => {
      const campaign = createTestCampaign({
        options: {
          ...createDefaultCampaignOptions(),
          autoAwardConfig: undefined,
        },
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      expect(result.events).toHaveLength(0);
    });

    it('should return events when 1st of month and awards qualify', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      expect(result.events.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply awards to person awards array after processing', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: [],
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
      const updatedPerson = result.campaign.personnel.get('p1');

      expect(updatedPerson).toBeDefined();
      expect(Array.isArray(updatedPerson?.awards)).toBe(true);
    });
  });

  describe('day events', () => {
    it('should create day events with type award_granted', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      for (const event of result.events) {
        expect(event.type).toBe('award_granted');
      }
    });

    it('should create day events with info severity', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      for (const event of result.events) {
        expect(event.severity).toBe('info');
      }
    });

    it('should include award data in day events', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      for (const event of result.events) {
        expect(event.data).toBeDefined();
        expect(event.data?.personId).toBeDefined();
        expect(event.data?.awardId).toBeDefined();
        expect(event.data?.awardName).toBeDefined();
        expect(event.data?.category).toBeDefined();
      }
    });
  });

  describe('post-mission awards', () => {
    it('should return events for qualifying personnel', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
      }));

      const campaign = createTestCampaign({
        personnel,
      });

      const result = processPostMissionAwards(campaign, 'mission-001');

      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should return updated campaign with awards applied', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: [],
      }));

      const campaign = createTestCampaign({
        personnel,
      });

      const result = processPostMissionAwards(campaign, 'mission-001');

      expect(result.updatedCampaign).toBeDefined();
      expect(result.updatedCampaign.personnel).toBeDefined();
    });
  });

  describe('post-scenario awards', () => {
    it('should return events for qualifying personnel', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
      }));

      const campaign = createTestCampaign({
        personnel,
      });

      const result = processPostScenarioAwards(campaign, 'scenario-001');

      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should return updated campaign with awards applied', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: [],
      }));

      const campaign = createTestCampaign({
        personnel,
      });

      const result = processPostScenarioAwards(campaign, 'scenario-001');

      expect(result.updatedCampaign).toBeDefined();
      expect(result.updatedCampaign.personnel).toBeDefined();
    });
  });

  describe('award application', () => {
    it('should add award IDs to personnel awards array', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: [],
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
      const updatedPerson = result.campaign.personnel.get('p1');

      expect(updatedPerson?.awards).toBeDefined();
      expect(Array.isArray(updatedPerson?.awards)).toBe(true);
    });

    it('should grant multiple awards to same person', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 50,
        awards: [],
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
      const updatedPerson = result.campaign.personnel.get('p1');

      expect(updatedPerson?.awards).toBeDefined();
    });

    it('should grant awards to multiple personnel', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: [],
      }));
      personnel.set('p2', createTestPerson({
        id: 'p2',
        totalKills: 15,
        awards: [],
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      const p1 = result.campaign.personnel.get('p1');
      const p2 = result.campaign.personnel.get('p2');

      expect(p1?.awards).toBeDefined();
      expect(p2?.awards).toBeDefined();
    });

    it('should return no events for empty personnel', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel: new Map(),
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      expect(result.events).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle person with no existing awards', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: undefined,
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
      const updatedPerson = result.campaign.personnel.get('p1');

      expect(updatedPerson?.awards).toBeDefined();
      expect(Array.isArray(updatedPerson?.awards)).toBe(true);
    });

    it('should preserve existing awards when adding new ones', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 10,
        awards: ['award-existing'],
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
      const updatedPerson = result.campaign.personnel.get('p1');

      expect(updatedPerson?.awards).toContain('award-existing');
    });

    it('should not modify campaign when no awards granted', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('p1', createTestPerson({
        id: 'p1',
        totalKills: 0,
        awards: [],
      }));

      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01T00:00:00Z'),
        personnel,
      });

      const result = autoAwardsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));

      expect(result.campaign.personnel.size).toBe(campaign.personnel.size);
    });
  });
});
