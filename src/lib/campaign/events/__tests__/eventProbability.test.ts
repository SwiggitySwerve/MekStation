import {
  rollForEvent,
  selectRandomEvent,
  selectWeightedEvent,
  isMonday,
  isFirstOfMonth,
  isBirthday,
  isSpecificDate,
  calculateAge,
  createSeededRandom,
} from '../eventProbability';

describe('eventProbability', () => {
  // ===========================================================================
  // rollForEvent
  // ===========================================================================

  describe('rollForEvent', () => {
    it('always returns true with probability 1.0', () => {
      const random = () => 0.999;
      expect(rollForEvent(1.0, random)).toBe(true);
    });

    it('always returns false with probability 0.0', () => {
      const random = () => 0.0;
      expect(rollForEvent(0.0, random)).toBe(false);
    });

    it('returns true when random < probability', () => {
      const random = () => 0.3;
      expect(rollForEvent(0.5, random)).toBe(true);
    });

    it('returns false when random >= probability', () => {
      const random = () => 0.7;
      expect(rollForEvent(0.5, random)).toBe(false);
    });

    it('returns false when random equals probability', () => {
      const random = () => 0.5;
      expect(rollForEvent(0.5, random)).toBe(false);
    });
  });

  // ===========================================================================
  // selectRandomEvent
  // ===========================================================================

  describe('selectRandomEvent', () => {
    it('selects deterministically with seeded random', () => {
      const random = createSeededRandom(42);
      const events = ['a', 'b', 'c', 'd', 'e'];
      const result = selectRandomEvent(events, random);
      expect(events).toContain(result);
    });

    it('returns the only element from single-element array', () => {
      const random = () => 0.5;
      expect(selectRandomEvent(['only'], random)).toBe('only');
    });

    it('selects first element when random returns 0', () => {
      const random = () => 0.0;
      expect(selectRandomEvent(['a', 'b', 'c'], random)).toBe('a');
    });

    it('selects last element when random approaches 1', () => {
      const random = () => 0.999;
      expect(selectRandomEvent(['a', 'b', 'c'], random)).toBe('c');
    });

    it('produces consistent results with same seed', () => {
      const events = ['alpha', 'beta', 'gamma', 'delta'];
      const r1 = createSeededRandom(42);
      const r2 = createSeededRandom(42);
      expect(selectRandomEvent(events, r1)).toBe(selectRandomEvent(events, r2));
    });
  });

  // ===========================================================================
  // selectWeightedEvent
  // ===========================================================================

  describe('selectWeightedEvent', () => {
    it('selects higher-weighted items more often', () => {
      const events = [
        { item: 'rare', weight: 1 },
        { item: 'common', weight: 99 },
      ];
      const random = () => 0.5;
      expect(selectWeightedEvent(events, random)).toBe('common');
    });

    it('selects first item when roll is very low', () => {
      const events = [
        { item: 'first', weight: 10 },
        { item: 'second', weight: 90 },
      ];
      const random = () => 0.05;
      expect(selectWeightedEvent(events, random)).toBe('first');
    });

    it('returns last item as fallback', () => {
      const events = [
        { item: 'a', weight: 50 },
        { item: 'b', weight: 50 },
      ];
      const random = () => 0.999999;
      expect(selectWeightedEvent(events, random)).toBe('b');
    });

    it('handles single weighted event', () => {
      const events = [{ item: 'only', weight: 1 }];
      const random = () => 0.5;
      expect(selectWeightedEvent(events, random)).toBe('only');
    });

    it('works with seeded random', () => {
      const events = [
        { item: 'low', weight: 10 },
        { item: 'mid', weight: 30 },
        { item: 'high', weight: 60 },
      ];
      const random = createSeededRandom(42);
      const result = selectWeightedEvent(events, random);
      expect(['low', 'mid', 'high']).toContain(result);
    });
  });

  // ===========================================================================
  // isMonday
  // ===========================================================================

  describe('isMonday', () => {
    it('returns true for a known Monday (3025-01-03)', () => {
      expect(isMonday('3025-01-03')).toBe(true);
    });

    it('returns false for a known Tuesday (3025-01-04)', () => {
      expect(isMonday('3025-01-04')).toBe(false);
    });

    it('returns false for a known Saturday (3025-01-01)', () => {
      expect(isMonday('3025-01-01')).toBe(false);
    });
  });

  // ===========================================================================
  // isFirstOfMonth
  // ===========================================================================

  describe('isFirstOfMonth', () => {
    it('returns true for the 1st of a month', () => {
      expect(isFirstOfMonth('3025-03-01')).toBe(true);
    });

    it('returns false for the 2nd of a month', () => {
      expect(isFirstOfMonth('3025-03-02')).toBe(false);
    });

    it('returns true for January 1st', () => {
      expect(isFirstOfMonth('3025-01-01')).toBe(true);
    });

    it('returns false for the 15th', () => {
      expect(isFirstOfMonth('3025-06-15')).toBe(false);
    });
  });

  // ===========================================================================
  // isBirthday
  // ===========================================================================

  describe('isBirthday', () => {
    it('returns true when month and day match', () => {
      expect(isBirthday('3000-06-15', '3025-06-15')).toBe(true);
    });

    it('returns false when month differs', () => {
      expect(isBirthday('3000-06-15', '3025-07-15')).toBe(false);
    });

    it('returns false when day differs', () => {
      expect(isBirthday('3000-06-15', '3025-06-16')).toBe(false);
    });

    it('returns false when birthDate is undefined', () => {
      expect(isBirthday(undefined, '3025-06-15')).toBe(false);
    });

    it('works with Date object as birthDate', () => {
      const birth = new Date(Date.UTC(3000, 5, 15));
      expect(isBirthday(birth, '3025-06-15')).toBe(true);
    });
  });

  // ===========================================================================
  // isSpecificDate
  // ===========================================================================

  describe('isSpecificDate', () => {
    it('returns true for matching month and day', () => {
      expect(isSpecificDate(1, 1, '3025-01-01')).toBe(true);
    });

    it('returns false for non-matching month', () => {
      expect(isSpecificDate(2, 1, '3025-01-01')).toBe(false);
    });

    it('returns false for non-matching day', () => {
      expect(isSpecificDate(1, 2, '3025-01-01')).toBe(false);
    });

    it('handles December 25th', () => {
      expect(isSpecificDate(12, 25, '3025-12-25')).toBe(true);
    });
  });

  // ===========================================================================
  // calculateAge
  // ===========================================================================

  describe('calculateAge', () => {
    it('calculates age 16 for a 16-year-old', () => {
      expect(calculateAge('3009-01-01', '3025-06-15')).toBe(16);
    });

    it('calculates age correctly on birthday', () => {
      expect(calculateAge('3009-06-15', '3025-06-15')).toBe(16);
    });

    it('returns one less when birthday has not yet passed', () => {
      expect(calculateAge('3009-06-15', '3025-06-14')).toBe(15);
    });

    it('handles birthday in later month', () => {
      expect(calculateAge('3009-12-01', '3025-06-15')).toBe(15);
    });

    it('works with Date object as birthDate', () => {
      const birth = new Date(Date.UTC(3009, 0, 1));
      expect(calculateAge(birth, '3025-06-15')).toBe(16);
    });
  });

  // ===========================================================================
  // createSeededRandom
  // ===========================================================================

  describe('createSeededRandom', () => {
    it('produces deterministic output with same seed', () => {
      const r1 = createSeededRandom(42);
      const r2 = createSeededRandom(42);
      expect(r1()).toBe(r2());
      expect(r1()).toBe(r2());
      expect(r1()).toBe(r2());
    });

    it('produces different output with different seeds', () => {
      const r1 = createSeededRandom(42);
      const r2 = createSeededRandom(99);
      expect(r1()).not.toBe(r2());
    });

    it('returns values between 0 and 1', () => {
      const random = createSeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const val = random();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('produces a sequence of different values', () => {
      const random = createSeededRandom(42);
      const values = new Set<number>();
      for (let i = 0; i < 10; i++) {
        values.add(random());
      }
      expect(values.size).toBeGreaterThan(1);
    });
  });
});
