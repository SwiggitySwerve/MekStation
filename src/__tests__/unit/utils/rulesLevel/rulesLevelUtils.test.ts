import { RulesLevel } from '@/types/enums/RulesLevel';
import {
  getRulesLevelIndex,
  compareRulesLevels,
  isWithinRulesLevel,
  getAllowedRulesLevels,
  getMostRestrictiveLevel,
  getLeastRestrictiveLevel,
  filterByRulesLevel,
  getRulesLevelDisplayName,
  getRulesLevelDescription,
} from '@/utils/rulesLevel/rulesLevelUtils';

describe('rulesLevelUtils', () => {
  describe('getRulesLevelIndex()', () => {
    it('should return correct index for each level', () => {
      expect(getRulesLevelIndex(RulesLevel.INTRODUCTORY)).toBe(0);
      expect(getRulesLevelIndex(RulesLevel.STANDARD)).toBe(1);
      expect(getRulesLevelIndex(RulesLevel.ADVANCED)).toBe(2);
      expect(getRulesLevelIndex(RulesLevel.EXPERIMENTAL)).toBe(3);
    });
  });

  describe('compareRulesLevels()', () => {
    it('should return negative when first is less restrictive', () => {
      expect(
        compareRulesLevels(RulesLevel.INTRODUCTORY, RulesLevel.STANDARD),
      ).toBeLessThan(0);
    });

    it('should return positive when first is more restrictive', () => {
      expect(
        compareRulesLevels(RulesLevel.ADVANCED, RulesLevel.STANDARD),
      ).toBeGreaterThan(0);
    });

    it('should return zero when equal', () => {
      expect(compareRulesLevels(RulesLevel.STANDARD, RulesLevel.STANDARD)).toBe(
        0,
      );
    });
  });

  describe('isWithinRulesLevel()', () => {
    it('should return true when level is at or below max', () => {
      expect(
        isWithinRulesLevel(RulesLevel.INTRODUCTORY, RulesLevel.STANDARD),
      ).toBe(true);
      expect(isWithinRulesLevel(RulesLevel.STANDARD, RulesLevel.STANDARD)).toBe(
        true,
      );
    });

    it('should return false when level exceeds max', () => {
      expect(isWithinRulesLevel(RulesLevel.ADVANCED, RulesLevel.STANDARD)).toBe(
        false,
      );
    });
  });

  describe('getAllowedRulesLevels()', () => {
    it('should return all levels at or below max', () => {
      const allowed = getAllowedRulesLevels(RulesLevel.STANDARD);
      expect(allowed).toContain(RulesLevel.INTRODUCTORY);
      expect(allowed).toContain(RulesLevel.STANDARD);
      expect(allowed).not.toContain(RulesLevel.ADVANCED);
    });
  });

  describe('getMostRestrictiveLevel()', () => {
    it('should return most restrictive level', () => {
      const levels = [
        RulesLevel.INTRODUCTORY,
        RulesLevel.ADVANCED,
        RulesLevel.STANDARD,
      ];
      expect(getMostRestrictiveLevel(levels)).toBe(RulesLevel.ADVANCED);
    });

    it('should return INTRODUCTORY for empty array', () => {
      expect(getMostRestrictiveLevel([])).toBe(RulesLevel.INTRODUCTORY);
    });
  });

  describe('getLeastRestrictiveLevel()', () => {
    it('should return least restrictive level', () => {
      const levels = [
        RulesLevel.ADVANCED,
        RulesLevel.INTRODUCTORY,
        RulesLevel.STANDARD,
      ];
      expect(getLeastRestrictiveLevel(levels)).toBe(RulesLevel.INTRODUCTORY);
    });

    it('should return EXPERIMENTAL for empty array', () => {
      expect(getLeastRestrictiveLevel([])).toBe(RulesLevel.EXPERIMENTAL);
    });
  });

  describe('filterByRulesLevel()', () => {
    it('should filter entities by max rules level', () => {
      const entities = [
        { rulesLevel: RulesLevel.INTRODUCTORY, name: 'A' },
        { rulesLevel: RulesLevel.ADVANCED, name: 'B' },
        { rulesLevel: RulesLevel.STANDARD, name: 'C' },
      ];

      const filtered = filterByRulesLevel(entities, RulesLevel.STANDARD);
      expect(filtered.length).toBe(2);
      expect(filtered).toContainEqual(entities[0]);
      expect(filtered).toContainEqual(entities[2]);
    });
  });

  describe('getRulesLevelDisplayName()', () => {
    it('should return display name', () => {
      expect(getRulesLevelDisplayName(RulesLevel.STANDARD)).toBe(
        RulesLevel.STANDARD,
      );
    });
  });

  describe('getRulesLevelDescription()', () => {
    it('should return description for each level', () => {
      expect(getRulesLevelDescription(RulesLevel.INTRODUCTORY)).toContain(
        'Basic rules',
      );
      expect(getRulesLevelDescription(RulesLevel.STANDARD)).toContain(
        'Full BattleTech',
      );
      expect(getRulesLevelDescription(RulesLevel.ADVANCED)).toContain(
        'Complex rules',
      );
      expect(getRulesLevelDescription(RulesLevel.EXPERIMENTAL)).toContain(
        'Cutting-edge',
      );
    });
  });
});
