/**
 * Tests for Personnel Progression Types
 *
 * Validates type definitions for XP sources, aging milestones, special abilities,
 * and trait flags.
 *
 * @module campaign/progression/__tests__/progressionTypes.test.ts
 */

import {
  XPSource,
  IXPAwardEvent,
  IAgingMilestone,
  ISpecialAbility,
  IPersonTraits,
} from '../progressionTypes';

describe('Personnel Progression Types', () => {
  // =========================================================================
  // XPSource Type Tests
  // =========================================================================

  describe('XPSource', () => {
    it('should have 8 valid XP sources', () => {
      const sources: XPSource[] = [
        'scenario',
        'kill',
        'task',
        'vocational',
        'admin',
        'mission',
        'education',
        'award',
      ];

      expect(sources).toHaveLength(8);
      expect(sources).toContain('scenario');
      expect(sources).toContain('kill');
      expect(sources).toContain('task');
      expect(sources).toContain('vocational');
      expect(sources).toContain('admin');
      expect(sources).toContain('mission');
      expect(sources).toContain('education');
      expect(sources).toContain('award');
    });
  });

  // =========================================================================
  // IXPAwardEvent Tests
  // =========================================================================

  describe('IXPAwardEvent', () => {
    it('should create a valid XP award event', () => {
      const event: IXPAwardEvent = {
        personId: 'person-001',
        source: 'scenario',
        amount: 1,
        description: 'Scenario participation',
      };

      expect(event.personId).toBe('person-001');
      expect(event.source).toBe('scenario');
      expect(event.amount).toBe(1);
      expect(event.description).toBe('Scenario participation');
    });

    it('should support all XP sources', () => {
      const sources: XPSource[] = [
        'scenario',
        'kill',
        'task',
        'vocational',
        'admin',
        'mission',
        'education',
        'award',
      ];

      sources.forEach((source) => {
        const event: IXPAwardEvent = {
          personId: 'person-001',
          source,
          amount: 5,
          description: `Award from ${source}`,
        };

        expect(event.source).toBe(source);
      });
    });

    it('should support various amounts', () => {
      const amounts = [0, 1, 5, 10, 100];

      amounts.forEach((amount) => {
        const event: IXPAwardEvent = {
          personId: 'person-001',
          source: 'scenario',
          amount,
          description: 'Test',
        };

        expect(event.amount).toBe(amount);
      });
    });
  });

  // =========================================================================
  // IAgingMilestone Tests
  // =========================================================================

  describe('IAgingMilestone', () => {
    it('should create a valid aging milestone', () => {
      const milestone: IAgingMilestone = {
        minAge: 25,
        maxAge: 30,
        label: '25-30',
        attributeModifiers: {
          STR: 0.5,
          BOD: 0.5,
          DEX: 0,
          REF: 0.5,
          INT: 0.5,
          WIL: 0.5,
          CHA: 0.5,
        },
        appliesSlowLearner: false,
        appliesGlassJaw: false,
      };

      expect(milestone.minAge).toBe(25);
      expect(milestone.maxAge).toBe(30);
      expect(milestone.label).toBe('25-30');
      expect(milestone.appliesSlowLearner).toBe(false);
      expect(milestone.appliesGlassJaw).toBe(false);
    });

    it('should have correct fields for all milestones', () => {
      const milestones: IAgingMilestone[] = [
        {
          minAge: 0,
          maxAge: 24,
          label: '<25',
          attributeModifiers: {},
          appliesSlowLearner: false,
          appliesGlassJaw: false,
        },
        {
          minAge: 61,
          maxAge: 70,
          label: '61-70',
          attributeModifiers: { STR: -1.0, BOD: -1.0 },
          appliesSlowLearner: true,
          appliesGlassJaw: true,
        },
      ];

      milestones.forEach((milestone) => {
        expect(typeof milestone.minAge).toBe('number');
        expect(typeof milestone.maxAge).toBe('number');
        expect(typeof milestone.label).toBe('string');
        expect(typeof milestone.attributeModifiers).toBe('object');
        expect(typeof milestone.appliesSlowLearner).toBe('boolean');
        expect(typeof milestone.appliesGlassJaw).toBe('boolean');
      });
    });

    it('should support attribute modifiers as Record<string, number>', () => {
      const milestone: IAgingMilestone = {
        minAge: 61,
        maxAge: 70,
        label: '61-70',
        attributeModifiers: {
          STR: -1.0,
          BOD: -1.0,
          DEX: -1.0,
          REF: 0,
          INT: 0.5,
          WIL: 0,
          CHA: -0.5,
        },
        appliesSlowLearner: true,
        appliesGlassJaw: true,
      };

      expect(milestone.attributeModifiers['STR']).toBe(-1.0);
      expect(milestone.attributeModifiers['INT']).toBe(0.5);
      expect(milestone.attributeModifiers['REF']).toBe(0);
    });
  });

  // =========================================================================
  // ISpecialAbility Tests
  // =========================================================================

  describe('ISpecialAbility', () => {
    it('should create a valid special ability', () => {
      const spa: ISpecialAbility = {
        id: 'fast_learner',
        name: 'Fast Learner',
        description: '-20% XP cost for skill improvement',
        xpCost: 30,
        isFlaw: false,
        isOriginOnly: false,
        prerequisites: [],
      };

      expect(spa.id).toBe('fast_learner');
      expect(spa.name).toBe('Fast Learner');
      expect(spa.xpCost).toBe(30);
      expect(spa.isFlaw).toBe(false);
      expect(spa.isOriginOnly).toBe(false);
    });

    it('should support flaws with negative XP costs', () => {
      const flaw: ISpecialAbility = {
        id: 'slow_learner',
        name: 'Slow Learner',
        description: '+20% XP cost',
        xpCost: -10,
        isFlaw: true,
        isOriginOnly: false,
      };

      expect(flaw.isFlaw).toBe(true);
      expect(flaw.xpCost).toBeLessThan(0);
    });

    it('should support origin-only abilities', () => {
      const originOnly: ISpecialAbility = {
        id: 'natural_aptitude',
        name: 'Natural Aptitude',
        description: '-1 TN for chosen skill',
        xpCost: 25,
        isFlaw: false,
        isOriginOnly: true,
      };

      expect(originOnly.isOriginOnly).toBe(true);
    });

    it('should support prerequisites', () => {
      const spa: ISpecialAbility = {
        id: 'advanced_tech',
        name: 'Advanced Tech',
        description: 'Advanced tech skills',
        xpCost: 50,
        isFlaw: false,
        isOriginOnly: false,
        prerequisites: ['skill-001', 'skill-002'],
      };

      expect(spa.prerequisites).toHaveLength(2);
      expect(spa.prerequisites).toContain('skill-001');
    });

    it('should have all required fields', () => {
      const spa: ISpecialAbility = {
        id: 'test_spa',
        name: 'Test SPA',
        description: 'A test special ability',
        xpCost: 20,
        isFlaw: false,
        isOriginOnly: false,
      };

      expect(typeof spa.id).toBe('string');
      expect(typeof spa.name).toBe('string');
      expect(typeof spa.description).toBe('string');
      expect(typeof spa.xpCost).toBe('number');
      expect(typeof spa.isFlaw).toBe('boolean');
      expect(typeof spa.isOriginOnly).toBe('boolean');
    });
  });

  // =========================================================================
  // IPersonTraits Tests
  // =========================================================================

  describe('IPersonTraits', () => {
    it('should create a valid person traits object', () => {
      const traits: IPersonTraits = {
        fastLearner: true,
        slowLearner: false,
        gremlins: false,
        techEmpathy: true,
        toughness: false,
        glassJaw: false,
        hasGainedVeterancySPA: false,
        vocationalXPTimer: 15,
      };

      expect(traits.fastLearner).toBe(true);
      expect(traits.slowLearner).toBe(false);
      expect(traits.techEmpathy).toBe(true);
      expect(traits.vocationalXPTimer).toBe(15);
    });

    it('should have all 8 trait flags', () => {
      const traits: IPersonTraits = {
        fastLearner: true,
        slowLearner: true,
        gremlins: true,
        techEmpathy: true,
        toughness: true,
        glassJaw: true,
        hasGainedVeterancySPA: true,
        vocationalXPTimer: 30,
      };

      expect(traits.fastLearner).toBeDefined();
      expect(traits.slowLearner).toBeDefined();
      expect(traits.gremlins).toBeDefined();
      expect(traits.techEmpathy).toBeDefined();
      expect(traits.toughness).toBeDefined();
      expect(traits.glassJaw).toBeDefined();
      expect(traits.hasGainedVeterancySPA).toBeDefined();
      expect(traits.vocationalXPTimer).toBeDefined();
    });

    it('should support optional traits', () => {
      const traits: IPersonTraits = {
        fastLearner: true,
      };

      expect(traits.fastLearner).toBe(true);
      expect(traits.slowLearner).toBeUndefined();
      expect(traits.gremlins).toBeUndefined();
    });

    it('should support empty traits object', () => {
      const traits: IPersonTraits = {};

      expect(Object.keys(traits)).toHaveLength(0);
    });

    it('should support vocational timer as number', () => {
      const traits: IPersonTraits = {
        vocationalXPTimer: 0,
      };

      expect(traits.vocationalXPTimer).toBe(0);

      const traits2: IPersonTraits = {
        vocationalXPTimer: 30,
      };

      expect(traits2.vocationalXPTimer).toBe(30);
    });

    it('should support trait combinations', () => {
      const traits: IPersonTraits = {
        fastLearner: true,
        techEmpathy: true,
        toughness: true,
      };

      expect(traits.fastLearner).toBe(true);
      expect(traits.techEmpathy).toBe(true);
      expect(traits.toughness).toBe(true);
      expect(traits.slowLearner).toBeUndefined();
      expect(traits.gremlins).toBeUndefined();
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('Type Integration', () => {
    it('should work together in a realistic scenario', () => {
      // Create an XP award event
      const xpEvent: IXPAwardEvent = {
        personId: 'person-001',
        source: 'scenario',
        amount: 1,
        description: 'Scenario participation',
      };

      // Create aging milestone
      const milestone: IAgingMilestone = {
        minAge: 61,
        maxAge: 70,
        label: '61-70',
        attributeModifiers: { STR: -1.0, BOD: -1.0 },
        appliesSlowLearner: true,
        appliesGlassJaw: true,
      };

      // Create special ability
      const spa: ISpecialAbility = {
        id: 'fast_learner',
        name: 'Fast Learner',
        description: '-20% XP cost',
        xpCost: 30,
        isFlaw: false,
        isOriginOnly: false,
      };

      // Create person traits
      const traits: IPersonTraits = {
        fastLearner: true,
        vocationalXPTimer: 15,
      };

      expect(xpEvent.personId).toBe('person-001');
      expect(milestone.appliesSlowLearner).toBe(true);
      expect(spa.id).toBe('fast_learner');
      expect(traits.fastLearner).toBe(true);
    });
  });
});
