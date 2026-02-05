/**
 * Era Utils Tests
 *
 * Tests for era determination and boundary functions.
 *
 * @spec openspec/specs/era-temporal-system/spec.md
 */

import { Era, ERA_DEFINITIONS } from '@/types/temporal/Era';
import {
  getEraForYear,
  getEraDefinitionForYear,
  isYearInEra,
  getEraStartYear,
  getEraEndYear,
  compareEras,
  getErasFromYear,
  getErasUntilYear,
} from '@/utils/temporal/eraUtils';

describe('eraUtils', () => {
  // ============================================================================
  // getEraForYear()
  // ============================================================================
  describe('getEraForYear()', () => {
    it('should return undefined for non-finite year', () => {
      expect(getEraForYear(NaN)).toBeUndefined();
      expect(getEraForYear(Infinity)).toBeUndefined();
      expect(getEraForYear(-Infinity)).toBeUndefined();
    });

    it('should return Age of War for early years', () => {
      expect(getEraForYear(2200)).toBe(Era.AGE_OF_WAR);
      expect(getEraForYear(2400)).toBe(Era.AGE_OF_WAR);
      expect(getEraForYear(2570)).toBe(Era.AGE_OF_WAR);
    });

    it('should return Star League for its era', () => {
      expect(getEraForYear(2571)).toBe(Era.STAR_LEAGUE);
      expect(getEraForYear(2750)).toBe(Era.STAR_LEAGUE);
      expect(getEraForYear(2780)).toBe(Era.STAR_LEAGUE);
    });

    it('should return Early Succession Wars for its era', () => {
      expect(getEraForYear(2781)).toBe(Era.EARLY_SUCCESSION_WARS);
      expect(getEraForYear(2850)).toBe(Era.EARLY_SUCCESSION_WARS);
      expect(getEraForYear(2900)).toBe(Era.EARLY_SUCCESSION_WARS);
    });

    it('should return Late Succession Wars for its era', () => {
      expect(getEraForYear(2901)).toBe(Era.LATE_SUCCESSION_WARS);
      expect(getEraForYear(3000)).toBe(Era.LATE_SUCCESSION_WARS);
      expect(getEraForYear(3019)).toBe(Era.LATE_SUCCESSION_WARS);
    });

    it('should return Renaissance for its era', () => {
      expect(getEraForYear(3020)).toBe(Era.RENAISSANCE);
      expect(getEraForYear(3025)).toBe(Era.RENAISSANCE);
      expect(getEraForYear(3049)).toBe(Era.RENAISSANCE);
    });

    it('should return Clan Invasion for its era', () => {
      expect(getEraForYear(3050)).toBe(Era.CLAN_INVASION);
      expect(getEraForYear(3055)).toBe(Era.CLAN_INVASION);
      expect(getEraForYear(3061)).toBe(Era.CLAN_INVASION);
    });

    it('should return Civil War for its era', () => {
      expect(getEraForYear(3062)).toBe(Era.CIVIL_WAR);
      expect(getEraForYear(3065)).toBe(Era.CIVIL_WAR);
      expect(getEraForYear(3067)).toBe(Era.CIVIL_WAR);
    });

    it('should return Jihad for its era', () => {
      expect(getEraForYear(3068)).toBe(Era.JIHAD);
      expect(getEraForYear(3075)).toBe(Era.JIHAD);
      expect(getEraForYear(3081)).toBe(Era.JIHAD);
    });

    it('should return Dark Age for its era', () => {
      expect(getEraForYear(3082)).toBe(Era.DARK_AGE);
      expect(getEraForYear(3100)).toBe(Era.DARK_AGE);
      expect(getEraForYear(3150)).toBe(Era.DARK_AGE);
    });

    it('should return ilClan for its era', () => {
      expect(getEraForYear(3152)).toBe(Era.IL_CLAN);
      expect(getEraForYear(3160)).toBe(Era.IL_CLAN);
    });

    it('should return Early Spaceflight for year 1500', () => {
      expect(getEraForYear(1500)).toBe(Era.EARLY_SPACEFLIGHT);
    });
  });

  // ============================================================================
  // getEraDefinitionForYear()
  // ============================================================================
  describe('getEraDefinitionForYear()', () => {
    it('should return undefined for non-finite year', () => {
      expect(getEraDefinitionForYear(NaN)).toBeUndefined();
    });

    it('should return full era definition', () => {
      const def = getEraDefinitionForYear(3055);

      expect(def).toBeDefined();
      expect(def?.era).toBe(Era.CLAN_INVASION);
      expect(def?.name).toBe('Clan Invasion');
      expect(def?.startYear).toBe(3050);
      expect(def?.endYear).toBe(3061);
      expect(def?.description).toBeDefined();
    });

    it('should return Early Spaceflight for year 1000', () => {
      const def = getEraDefinitionForYear(1000);
      expect(def).toBeDefined();
      expect(def?.era).toBe(Era.EARLY_SPACEFLIGHT);
    });
  });

  // ============================================================================
  // isYearInEra()
  // ============================================================================
  describe('isYearInEra()', () => {
    it('should return false for non-finite year', () => {
      expect(isYearInEra(NaN, Era.CLAN_INVASION)).toBe(false);
    });

    it('should return false for unknown era', () => {
      // @ts-expect-error - testing invalid era
      expect(isYearInEra(3055, 'Unknown Era')).toBe(false);
    });

    it('should return true for year within era', () => {
      expect(isYearInEra(3055, Era.CLAN_INVASION)).toBe(true);
    });

    it('should return true for start year of era', () => {
      expect(isYearInEra(3050, Era.CLAN_INVASION)).toBe(true);
    });

    it('should return true for end year of era', () => {
      expect(isYearInEra(3061, Era.CLAN_INVASION)).toBe(true);
    });

    it('should return false for year before era', () => {
      expect(isYearInEra(3049, Era.CLAN_INVASION)).toBe(false);
    });

    it('should return false for year after era', () => {
      expect(isYearInEra(3062, Era.CLAN_INVASION)).toBe(false);
    });
  });

  // ============================================================================
  // getEraStartYear()
  // ============================================================================
  describe('getEraStartYear()', () => {
    it('should return start year for valid era', () => {
      expect(getEraStartYear(Era.STAR_LEAGUE)).toBe(2571);
      expect(getEraStartYear(Era.CLAN_INVASION)).toBe(3050);
      expect(getEraStartYear(Era.DARK_AGE)).toBe(3082);
    });

    it('should return undefined for unknown era', () => {
      // @ts-expect-error - testing invalid era
      expect(getEraStartYear('Unknown Era')).toBeUndefined();
    });
  });

  // ============================================================================
  // getEraEndYear()
  // ============================================================================
  describe('getEraEndYear()', () => {
    it('should return end year for valid era', () => {
      expect(getEraEndYear(Era.STAR_LEAGUE)).toBe(2780);
      expect(getEraEndYear(Era.CLAN_INVASION)).toBe(3061);
    });

    it('should return undefined for unknown era', () => {
      // @ts-expect-error - testing invalid era
      expect(getEraEndYear('Unknown Era')).toBeUndefined();
    });
  });

  // ============================================================================
  // compareEras()
  // ============================================================================
  describe('compareEras()', () => {
    it('should return negative when first era is earlier', () => {
      const result = compareEras(Era.STAR_LEAGUE, Era.CLAN_INVASION);
      expect(result).toBeLessThan(0);
    });

    it('should return positive when first era is later', () => {
      const result = compareEras(Era.CLAN_INVASION, Era.STAR_LEAGUE);
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 for same era', () => {
      const result = compareEras(Era.CLAN_INVASION, Era.CLAN_INVASION);
      expect(result).toBe(0);
    });

    it('should return 0 for unknown eras', () => {
      // @ts-expect-error - testing invalid era
      expect(compareEras('Unknown', Era.CLAN_INVASION)).toBe(0);
      // @ts-expect-error - testing invalid era
      expect(compareEras(Era.CLAN_INVASION, 'Unknown')).toBe(0);
    });

    it('should work for sorting', () => {
      const eras = [Era.DARK_AGE, Era.STAR_LEAGUE, Era.CLAN_INVASION];
      const sorted = [...eras].sort(compareEras);

      expect(sorted[0]).toBe(Era.STAR_LEAGUE);
      expect(sorted[1]).toBe(Era.CLAN_INVASION);
      expect(sorted[2]).toBe(Era.DARK_AGE);
    });
  });

  // ============================================================================
  // getErasFromYear()
  // ============================================================================
  describe('getErasFromYear()', () => {
    it('should return all eras from a given year', () => {
      const eras = getErasFromYear(3050);

      expect(eras).toContain(Era.CLAN_INVASION);
      expect(eras).toContain(Era.CIVIL_WAR);
      expect(eras).toContain(Era.JIHAD);
      expect(eras).toContain(Era.DARK_AGE);
      expect(eras).toContain(Era.IL_CLAN);
    });

    it('should include era that contains the year', () => {
      // Year is in Renaissance era (3020-3049)
      const eras = getErasFromYear(3040);

      expect(eras).toContain(Era.RENAISSANCE);
    });

    it('should not include eras that end before the year', () => {
      const eras = getErasFromYear(3050);

      expect(eras).not.toContain(Era.RENAISSANCE);
      expect(eras).not.toContain(Era.STAR_LEAGUE);
    });

    it('should return all eras for early year', () => {
      const eras = getErasFromYear(2000);

      expect(eras.length).toBe(ERA_DEFINITIONS.length);
    });

    it('should return empty array for year after all eras', () => {
      const eras = getErasFromYear(10000);

      expect(eras).toHaveLength(0);
    });
  });

  // ============================================================================
  // getErasUntilYear()
  // ============================================================================
  describe('getErasUntilYear()', () => {
    it('should return all eras up to a given year', () => {
      const eras = getErasUntilYear(3055);

      expect(eras).toContain(Era.AGE_OF_WAR);
      expect(eras).toContain(Era.STAR_LEAGUE);
      expect(eras).toContain(Era.CLAN_INVASION);
    });

    it('should include era that contains the year', () => {
      const eras = getErasUntilYear(3055);

      expect(eras).toContain(Era.CLAN_INVASION);
    });

    it('should not include eras that start after the year', () => {
      const eras = getErasUntilYear(3055);

      expect(eras).not.toContain(Era.CIVIL_WAR);
      expect(eras).not.toContain(Era.JIHAD);
    });

    it('should return all eras for late year', () => {
      const eras = getErasUntilYear(4000);

      expect(eras.length).toBe(ERA_DEFINITIONS.length);
    });

    it('should return Early Spaceflight for year 1000', () => {
      const eras = getErasUntilYear(1000);

      expect(eras).toHaveLength(1);
      expect(eras).toContain(Era.EARLY_SPACEFLIGHT);
    });
  });

  // ============================================================================
  // Era Boundary Edge Cases
  // ============================================================================
  describe('Era Boundary Edge Cases', () => {
    it('should handle year at era boundary correctly', () => {
      // End of Star League era
      expect(getEraForYear(2780)).toBe(Era.STAR_LEAGUE);
      // Start of Early Succession Wars
      expect(getEraForYear(2781)).toBe(Era.EARLY_SUCCESSION_WARS);
    });

    it('should have no gaps between eras', () => {
      // Check all consecutive eras
      for (let i = 0; i < ERA_DEFINITIONS.length - 1; i++) {
        const current = ERA_DEFINITIONS[i];
        const next = ERA_DEFINITIONS[i + 1];

        // End of current should be 1 less than start of next
        expect(next.startYear).toBe(current.endYear + 1);
      }
    });
  });
});
