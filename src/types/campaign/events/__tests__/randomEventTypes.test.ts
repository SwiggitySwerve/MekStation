import {
  RandomEventCategory,
  RandomEventSeverity,
  PrisonerEventType,
  LifeEventType,
  HistoricalEventType,
  MINOR_PRISONER_EVENTS,
  MAJOR_PRISONER_EVENTS,
  ALL_PRISONER_EVENT_TYPES,
  isRandomEventCategory,
  isRandomEventSeverity,
  isPrisonerEventType,
} from '../randomEventTypes';
import type { IRandomEvent, IRandomEventEffect } from '../randomEventTypes';

describe('randomEventTypes', () => {
  // ===========================================================================
  // Enum Value Counts
  // ===========================================================================

  describe('RandomEventCategory', () => {
    it('has exactly 4 values', () => {
      const values = Object.values(RandomEventCategory);
      expect(values).toHaveLength(4);
    });

    it('contains expected categories', () => {
      expect(RandomEventCategory.PRISONER).toBe('prisoner');
      expect(RandomEventCategory.LIFE).toBe('life');
      expect(RandomEventCategory.CONTRACT).toBe('contract');
      expect(RandomEventCategory.HISTORICAL).toBe('historical');
    });
  });

  describe('RandomEventSeverity', () => {
    it('has exactly 3 values', () => {
      const values = Object.values(RandomEventSeverity);
      expect(values).toHaveLength(3);
    });

    it('contains expected severities', () => {
      expect(RandomEventSeverity.MINOR).toBe('minor');
      expect(RandomEventSeverity.MAJOR).toBe('major');
      expect(RandomEventSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('PrisonerEventType', () => {
    it('has exactly 30 values', () => {
      const values = Object.values(PrisonerEventType);
      expect(values).toHaveLength(30);
    });

    it('includes minor event ARGUMENT', () => {
      expect(PrisonerEventType.ARGUMENT).toBe('argument');
    });

    it('includes major event BREAKOUT', () => {
      expect(PrisonerEventType.BREAKOUT).toBe('breakout');
    });
  });

  describe('LifeEventType', () => {
    it('has exactly 5 values', () => {
      const values = Object.values(LifeEventType);
      expect(values).toHaveLength(5);
    });

    it('contains expected life events', () => {
      expect(LifeEventType.NEW_YEARS).toBe('new_years');
      expect(LifeEventType.COMING_OF_AGE).toBe('coming_of_age');
    });
  });

  describe('HistoricalEventType', () => {
    it('has exactly 4 values', () => {
      const values = Object.values(HistoricalEventType);
      expect(values).toHaveLength(4);
    });

    it('contains Gray Monday events', () => {
      expect(HistoricalEventType.GRAY_MONDAY_START).toBe('gray_monday_start');
      expect(HistoricalEventType.GRAY_MONDAY_END).toBe('gray_monday_end');
    });
  });

  // ===========================================================================
  // Prisoner Event Classification Arrays
  // ===========================================================================

  describe('MINOR_PRISONER_EVENTS', () => {
    it('has exactly 20 values', () => {
      expect(MINOR_PRISONER_EVENTS).toHaveLength(20);
    });

    it('contains only minor events', () => {
      expect(MINOR_PRISONER_EVENTS).toContain(PrisonerEventType.ARGUMENT);
      expect(MINOR_PRISONER_EVENTS).toContain(PrisonerEventType.PHOTO);
    });

    it('does not contain major events', () => {
      expect(MINOR_PRISONER_EVENTS).not.toContain(PrisonerEventType.BREAKOUT);
      expect(MINOR_PRISONER_EVENTS).not.toContain(PrisonerEventType.RIOT);
    });
  });

  describe('MAJOR_PRISONER_EVENTS', () => {
    it('has exactly 10 values', () => {
      expect(MAJOR_PRISONER_EVENTS).toHaveLength(10);
    });

    it('contains only major events', () => {
      expect(MAJOR_PRISONER_EVENTS).toContain(PrisonerEventType.BREAKOUT);
      expect(MAJOR_PRISONER_EVENTS).toContain(PrisonerEventType.UNITED);
    });

    it('does not contain minor events', () => {
      expect(MAJOR_PRISONER_EVENTS).not.toContain(PrisonerEventType.ARGUMENT);
      expect(MAJOR_PRISONER_EVENTS).not.toContain(PrisonerEventType.SONGS);
    });
  });

  describe('ALL_PRISONER_EVENT_TYPES', () => {
    it('has exactly 30 values', () => {
      expect(ALL_PRISONER_EVENT_TYPES).toHaveLength(30);
    });

    it('is the union of minor and major events', () => {
      const combined = [...MINOR_PRISONER_EVENTS, ...MAJOR_PRISONER_EVENTS];
      expect(ALL_PRISONER_EVENT_TYPES).toEqual(combined);
    });

    it('contains no duplicates', () => {
      const unique = new Set(ALL_PRISONER_EVENT_TYPES);
      expect(unique.size).toBe(ALL_PRISONER_EVENT_TYPES.length);
    });
  });

  // ===========================================================================
  // Type Guards
  // ===========================================================================

  describe('isRandomEventCategory', () => {
    it('returns true for valid categories', () => {
      expect(isRandomEventCategory('prisoner')).toBe(true);
      expect(isRandomEventCategory('life')).toBe(true);
      expect(isRandomEventCategory('contract')).toBe(true);
      expect(isRandomEventCategory('historical')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isRandomEventCategory('invalid')).toBe(false);
      expect(isRandomEventCategory('')).toBe(false);
      expect(isRandomEventCategory(42)).toBe(false);
      expect(isRandomEventCategory(null)).toBe(false);
      expect(isRandomEventCategory(undefined)).toBe(false);
    });
  });

  describe('isRandomEventSeverity', () => {
    it('returns true for valid severities', () => {
      expect(isRandomEventSeverity('minor')).toBe(true);
      expect(isRandomEventSeverity('major')).toBe(true);
      expect(isRandomEventSeverity('critical')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isRandomEventSeverity('extreme')).toBe(false);
      expect(isRandomEventSeverity(0)).toBe(false);
      expect(isRandomEventSeverity(null)).toBe(false);
    });
  });

  describe('isPrisonerEventType', () => {
    it('returns true for valid prisoner event types', () => {
      expect(isPrisonerEventType('argument')).toBe(true);
      expect(isPrisonerEventType('breakout')).toBe(true);
      expect(isPrisonerEventType('united')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isPrisonerEventType('nonexistent')).toBe(false);
      expect(isPrisonerEventType(123)).toBe(false);
      expect(isPrisonerEventType(undefined)).toBe(false);
    });
  });

  // ===========================================================================
  // Interface Shape Verification
  // ===========================================================================

  describe('IRandomEvent interface', () => {
    it('can be constructed with all required fields', () => {
      const event: IRandomEvent = {
        id: 'evt-001',
        category: RandomEventCategory.PRISONER,
        severity: RandomEventSeverity.MINOR,
        title: 'Argument',
        description: 'Two prisoners got into an argument.',
        effects: [],
        timestamp: '3025-01-15T00:00:00Z',
      };
      expect(event.id).toBe('evt-001');
      expect(event.category).toBe(RandomEventCategory.PRISONER);
      expect(event.effects).toHaveLength(0);
    });
  });

  describe('IRandomEventEffect discriminated union', () => {
    it('supports morale_change effect', () => {
      const effect: IRandomEventEffect = { type: 'morale_change', value: -5 };
      expect(effect.type).toBe('morale_change');
    });

    it('supports financial effect', () => {
      const effect: IRandomEventEffect = {
        type: 'financial',
        amount: -1000,
        description: 'Repair costs',
      };
      expect(effect.type).toBe('financial');
    });

    it('supports prisoner_escape effect', () => {
      const effect: IRandomEventEffect = { type: 'prisoner_escape', percentage: 10 };
      expect(effect.type).toBe('prisoner_escape');
    });

    it('supports notification effect', () => {
      const effect: IRandomEventEffect = {
        type: 'notification',
        message: 'Something happened',
        severity: 'info',
      };
      expect(effect.type).toBe('notification');
    });
  });
});
