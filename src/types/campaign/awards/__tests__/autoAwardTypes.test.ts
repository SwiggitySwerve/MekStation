import type {
  AutoAwardTrigger,
  IAutoAwardConfig,
  IAutoGrantCriteria,
  IAwardGrantEvent,
} from '../autoAwardTypes';

import {
  AutoAwardCategory,
  ALL_AUTO_AWARD_TRIGGERS,
  createDefaultAutoAwardConfig,
  isAutoAwardCategory,
  isAutoAwardTrigger,
  isAutoAwardConfig,
  isAutoGrantCriteria,
  isAwardGrantEvent,
} from '../autoAwardTypes';

describe('AutoAwardCategory', () => {
  it('should have 17 values (12 MekHQ + 5 MekStation)', () => {
    const values = Object.values(AutoAwardCategory);
    expect(values).toHaveLength(17);
  });

  it('should include all 12 MekHQ categories', () => {
    expect(AutoAwardCategory.CONTRACT).toBe('contract');
    expect(AutoAwardCategory.FACTION_HUNTER).toBe('faction_hunter');
    expect(AutoAwardCategory.INJURY).toBe('injury');
    expect(AutoAwardCategory.KILL).toBe('kill');
    expect(AutoAwardCategory.SCENARIO_KILL).toBe('scenario_kill');
    expect(AutoAwardCategory.RANK).toBe('rank');
    expect(AutoAwardCategory.SCENARIO).toBe('scenario');
    expect(AutoAwardCategory.SKILL).toBe('skill');
    expect(AutoAwardCategory.THEATRE_OF_WAR).toBe('theatre_of_war');
    expect(AutoAwardCategory.TIME).toBe('time');
    expect(AutoAwardCategory.TRAINING).toBe('training');
    expect(AutoAwardCategory.MISC).toBe('misc');
  });

  it('should include all 5 MekStation existing categories', () => {
    expect(AutoAwardCategory.COMBAT).toBe('combat');
    expect(AutoAwardCategory.SURVIVAL).toBe('survival');
    expect(AutoAwardCategory.SERVICE).toBe('service');
    expect(AutoAwardCategory.CAMPAIGN).toBe('campaign');
    expect(AutoAwardCategory.SPECIAL).toBe('special');
  });

  it('should have unique values', () => {
    const values = Object.values(AutoAwardCategory);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('AutoAwardTrigger', () => {
  it('should have 5 values', () => {
    expect(ALL_AUTO_AWARD_TRIGGERS).toHaveLength(5);
  });

  it('should include all trigger types', () => {
    expect(ALL_AUTO_AWARD_TRIGGERS).toContain('monthly');
    expect(ALL_AUTO_AWARD_TRIGGERS).toContain('post_mission');
    expect(ALL_AUTO_AWARD_TRIGGERS).toContain('post_scenario');
    expect(ALL_AUTO_AWARD_TRIGGERS).toContain('post_promotion');
    expect(ALL_AUTO_AWARD_TRIGGERS).toContain('manual');
  });
});

describe('IAutoAwardConfig', () => {
  it('should be created with all fields via factory', () => {
    const config = createDefaultAutoAwardConfig();
    expect(typeof config.enableAutoAwards).toBe('boolean');
    expect(typeof config.bestAwardOnly).toBe('boolean');
    expect(typeof config.enabledCategories).toBe('object');
    expect(typeof config.enablePosthumous).toBe('boolean');
  });

  it('should default to all categories enabled', () => {
    const config = createDefaultAutoAwardConfig();
    for (const category of Object.values(AutoAwardCategory)) {
      expect(config.enabledCategories[category]).toBe(true);
    }
  });

  it('should default to enableAutoAwards=true', () => {
    const config = createDefaultAutoAwardConfig();
    expect(config.enableAutoAwards).toBe(true);
  });

  it('should default to bestAwardOnly=false', () => {
    const config = createDefaultAutoAwardConfig();
    expect(config.bestAwardOnly).toBe(false);
  });

  it('should default to enablePosthumous=true', () => {
    const config = createDefaultAutoAwardConfig();
    expect(config.enablePosthumous).toBe(true);
  });

  it('should have enabledCategories with exactly 17 entries', () => {
    const config = createDefaultAutoAwardConfig();
    const entries = Object.keys(config.enabledCategories);
    expect(entries).toHaveLength(17);
  });
});

describe('type guards', () => {
  describe('isAutoAwardCategory', () => {
    it('should return true for valid categories', () => {
      expect(isAutoAwardCategory('kill')).toBe(true);
      expect(isAutoAwardCategory('combat')).toBe(true);
      expect(isAutoAwardCategory('time')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isAutoAwardCategory('invalid')).toBe(false);
      expect(isAutoAwardCategory(42)).toBe(false);
      expect(isAutoAwardCategory(null)).toBe(false);
    });
  });

  describe('isAutoAwardTrigger', () => {
    it('should return true for valid triggers', () => {
      expect(isAutoAwardTrigger('monthly')).toBe(true);
      expect(isAutoAwardTrigger('post_mission')).toBe(true);
      expect(isAutoAwardTrigger('manual')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isAutoAwardTrigger('daily')).toBe(false);
      expect(isAutoAwardTrigger(123)).toBe(false);
    });
  });

  describe('isAutoAwardConfig', () => {
    it('should return true for valid config', () => {
      const config = createDefaultAutoAwardConfig();
      expect(isAutoAwardConfig(config)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isAutoAwardConfig(null)).toBe(false);
      expect(isAutoAwardConfig({})).toBe(false);
      expect(isAutoAwardConfig({ enableAutoAwards: 'yes' })).toBe(false);
    });
  });

  describe('isAutoGrantCriteria', () => {
    it('should return true for valid criteria', () => {
      const criteria: IAutoGrantCriteria = {
        category: AutoAwardCategory.KILL,
        threshold: 5,
        thresholdType: 'kills',
        stackable: false,
      };
      expect(isAutoGrantCriteria(criteria)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isAutoGrantCriteria(null)).toBe(false);
      expect(isAutoGrantCriteria({ category: 'invalid' })).toBe(false);
    });
  });

  describe('isAwardGrantEvent', () => {
    it('should return true for valid events', () => {
      const event: IAwardGrantEvent = {
        personId: 'p-1',
        awardId: 'a-1',
        awardName: 'Test Award',
        category: AutoAwardCategory.KILL,
        trigger: 'monthly',
        timestamp: '3025-01-01T00:00:00Z',
      };
      expect(isAwardGrantEvent(event)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isAwardGrantEvent(null)).toBe(false);
      expect(isAwardGrantEvent({})).toBe(false);
    });
  });
});
