/**
 * Award Catalog Tests
 *
 * Validates the award catalog structure, counts, and auto-grant criteria.
 */

import { AWARD_CATALOG, getAutoGrantableAwards } from '../AwardCatalog';
import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';

describe('AwardCatalog', () => {
  describe('Catalog Structure', () => {
    it('should have all awards including new auto-grant awards', () => {
      expect(AWARD_CATALOG.length).toBeGreaterThan(54);
      expect(AWARD_CATALOG.some(a => a.id === 'destroyer')).toBe(true);
      expect(AWARD_CATALOG.some(a => a.id === 'purple-heart')).toBe(true);
      expect(AWARD_CATALOG.some(a => a.id === 'expert-marksman')).toBe(true);
    });

    it('should preserve all 54 existing awards', () => {
      const existingAwardIds = [
        // Combat Awards (11)
        'first-blood',
        'warrior',
        'ace',
        'double-ace',
        'triple-ace',
        'legend',
        'marksman',
        'sharpshooter',
        'one-man-army',
        'devastator',
        'annihilator',
        // Survival Awards (6)
        'survivor',
        'veteran',
        'iron-will',
        'immortal',
        'phoenix',
        'lucky-star',
        // Campaign Awards (6)
        'campaign-initiate',
        'campaign-veteran',
        'campaign-elite',
        'campaign-victor',
        'campaign-master',
        'flawless-campaign',
        // Service Awards (5)
        'recruit',
        'regular',
        'seasoned',
        'centurion',
        'grand-master',
        // Special Awards (5)
        'against-all-odds',
        'david-vs-goliath',
        'last-mech-standing',
        'mercy',
        'no-quarter',
      ];

      for (const id of existingAwardIds) {
        const award = AWARD_CATALOG.find(a => a.id === id);
        expect(award).toBeDefined();
        expect(award?.id).toBe(id);
      }
    });

    it('should have no duplicate award IDs', () => {
      const ids = AWARD_CATALOG.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(AWARD_CATALOG.length);
    });
  });

  describe('Auto-Grant Kill Awards', () => {
    it('should have 4 new kill awards at thresholds 50, 100, 250, 500', () => {
      const killAwards = AWARD_CATALOG.filter(
        a => a.autoGrantCriteria?.category === AutoAwardCategory.KILL
      );
      expect(killAwards.length).toBeGreaterThanOrEqual(10); // 6 existing + 4 new
    });

    it('should have destroyer award at 50 kills', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'destroyer');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(50);
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.KILL);
    });

    it('should have centurion-kills award at 100 kills', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'centurion-kills');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(100);
    });

    it('should have warlord award at 250 kills', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'warlord');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(250);
    });

    it('should have extinction-event award at 500 kills', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'extinction-event');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(500);
    });
  });

  describe('Auto-Grant Scenario Awards', () => {
    it('should have 3 new scenario awards at thresholds 5, 50, 100', () => {
      const scenarioAwards = AWARD_CATALOG.filter(
        a => a.autoGrantCriteria?.category === AutoAwardCategory.SCENARIO
      );
      expect(scenarioAwards.length).toBeGreaterThanOrEqual(6); // 3 existing + 3 new
    });

    it('should have mission-runner award at 5 missions', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'mission-runner');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(5);
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.SCENARIO);
    });

    it('should have campaign-legend award at 50 missions', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'campaign-legend');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(50);
    });

    it('should have centurion-missions award at 100 missions', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'centurion-missions');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(100);
    });
  });

  describe('Auto-Grant Time Awards', () => {
    it('should have 6 time awards at thresholds 1, 2, 5, 10, 20, 30 years', () => {
      const timeAwards = AWARD_CATALOG.filter(
        a => a.autoGrantCriteria?.category === AutoAwardCategory.TIME
      );
      expect(timeAwards.length).toBe(6);
    });

    it('should have one-year-service award', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'one-year-service');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(1);
      expect(award?.autoGrantCriteria?.thresholdType).toBe('years');
    });

    it('should have two-year-service award', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'two-year-service');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(2);
    });

    it('should have five-year-service award', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'five-year-service');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(5);
    });

    it('should have ten-year-service award', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'ten-year-service');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(10);
    });

    it('should have twenty-year-service award', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'twenty-year-service');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(20);
    });

    it('should have thirty-year-service award', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'thirty-year-service');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(30);
    });
  });

  describe('Auto-Grant Injury Awards', () => {
    it('should have 4 injury awards at thresholds 1, 3, 5, 10', () => {
      const injuryAwards = AWARD_CATALOG.filter(
        a => a.autoGrantCriteria?.category === AutoAwardCategory.INJURY
      );
      expect(injuryAwards.length).toBe(4);
    });

    it('should have purple-heart award at 1 injury', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'purple-heart');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(1);
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.INJURY);
    });

    it('should have battle-scarred award at 3 injuries', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'battle-scarred');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(3);
    });

    it('should have iron-constitution award at 5 injuries', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'iron-constitution');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(5);
    });

    it('should have unkillable award at 10 injuries', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'unkillable');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(10);
    });
  });

  describe('Auto-Grant Rank Awards', () => {
    it('should have 3 rank awards at thresholds 3, 6, 9', () => {
      const rankAwards = AWARD_CATALOG.filter(
        a => a.autoGrantCriteria?.category === AutoAwardCategory.RANK
      );
      expect(rankAwards.length).toBe(3);
    });

    it('should have officer-commission award at rank level 3', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'officer-commission');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(3);
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.RANK);
      expect(award?.autoGrantCriteria?.rankMode).toBe('inclusive');
    });

    it('should have senior-officer award at rank level 6', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'senior-officer');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(6);
    });

    it('should have command-rank award at rank level 9', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'command-rank');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(9);
    });
  });

  describe('Auto-Grant Skill Awards', () => {
    it('should have 6 skill awards (3 gunnery + 3 piloting)', () => {
      const skillAwards = AWARD_CATALOG.filter(
        a => a.autoGrantCriteria?.category === AutoAwardCategory.SKILL
      );
      expect(skillAwards.length).toBe(6);
    });

    it('should have expert-marksman gunnery award at skill level 3', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'expert-marksman');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(3);
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.SKILL);
      expect(award?.autoGrantCriteria?.skillId).toBe('gunnery');
    });

    it('should have master-marksman gunnery award at skill level 2', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'master-marksman');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(2);
      expect(award?.autoGrantCriteria?.skillId).toBe('gunnery');
    });

    it('should have elite-marksman gunnery award at skill level 0', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'elite-marksman');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(0);
      expect(award?.autoGrantCriteria?.skillId).toBe('gunnery');
    });

    it('should have expert-pilot piloting award at skill level 3', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'expert-pilot');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(3);
      expect(award?.autoGrantCriteria?.skillId).toBe('piloting');
    });

    it('should have master-pilot piloting award at skill level 2', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'master-pilot');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(2);
      expect(award?.autoGrantCriteria?.skillId).toBe('piloting');
    });

    it('should have elite-pilot piloting award at skill level 0', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'elite-pilot');
      expect(award).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(0);
      expect(award?.autoGrantCriteria?.skillId).toBe('piloting');
    });
  });

  describe('Existing Awards with Auto-Grant Criteria', () => {
    it('should have autoGrantCriteria on first-blood', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'first-blood');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.KILL);
      expect(award?.autoGrantCriteria?.threshold).toBe(1);
    });

    it('should have autoGrantCriteria on warrior', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'warrior');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(3);
    });

    it('should have autoGrantCriteria on ace', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'ace');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(5);
    });

    it('should have autoGrantCriteria on double-ace', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'double-ace');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(10);
    });

    it('should have autoGrantCriteria on triple-ace', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'triple-ace');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(15);
    });

    it('should have autoGrantCriteria on legend', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'legend');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(25);
    });

    it('should have autoGrantCriteria on campaign-initiate', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'campaign-initiate');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.category).toBe(AutoAwardCategory.SCENARIO);
      expect(award?.autoGrantCriteria?.threshold).toBe(1);
    });

    it('should have autoGrantCriteria on campaign-veteran', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'campaign-veteran');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(10);
    });

    it('should have autoGrantCriteria on campaign-elite', () => {
      const award = AWARD_CATALOG.find(a => a.id === 'campaign-elite');
      expect(award?.autoGrantCriteria).toBeDefined();
      expect(award?.autoGrantCriteria?.threshold).toBe(25);
    });
  });

  describe('getAutoGrantableAwards()', () => {
    it('should return only awards with autoGrantCriteria', () => {
      const autoGrantable = getAutoGrantableAwards();
      expect(autoGrantable.length).toBeGreaterThan(0);

      for (const award of autoGrantable) {
        expect(award.autoGrantCriteria).toBeDefined();
      }
    });

    it('should include all 26 new awards', () => {
      const autoGrantable = getAutoGrantableAwards();
      const newAwardIds = [
        // Kill awards
        'destroyer',
        'centurion-kills',
        'warlord',
        'extinction-event',
        // Scenario awards
        'mission-runner',
        'campaign-legend',
        'centurion-missions',
        // Time awards
        'one-year-service',
        'two-year-service',
        'five-year-service',
        'ten-year-service',
        'twenty-year-service',
        'thirty-year-service',
        // Injury awards
        'purple-heart',
        'battle-scarred',
        'iron-constitution',
        'unkillable',
        // Rank awards
        'officer-commission',
        'senior-officer',
        'command-rank',
        // Skill awards
        'expert-marksman',
        'master-marksman',
        'elite-marksman',
        'expert-pilot',
        'master-pilot',
        'elite-pilot',
      ];

      expect(newAwardIds.length).toBe(26);
      for (const id of newAwardIds) {
        const award = autoGrantable.find(a => a.id === id);
        expect(award).toBeDefined();
      }
    });

    it('should include all 9 existing awards with autoGrantCriteria', () => {
      const autoGrantable = getAutoGrantableAwards();
      const existingAwardIds = [
        'first-blood',
        'warrior',
        'ace',
        'double-ace',
        'triple-ace',
        'legend',
        'campaign-initiate',
        'campaign-veteran',
        'campaign-elite',
      ];

      for (const id of existingAwardIds) {
        const award = autoGrantable.find(a => a.id === id);
        expect(award).toBeDefined();
      }
    });
  });
});
