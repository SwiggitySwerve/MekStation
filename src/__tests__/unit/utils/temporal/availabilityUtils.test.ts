/**
 * Availability Utils Tests
 *
 * Tests for temporal availability filtering.
 *
 * @spec openspec/specs/era-temporal-system/spec.md
 */

import { Era } from '@/types/temporal/Era';
import {
  validateTemporalProperties,
  isAvailableInYear,
  isAvailableInEra,
  filterByYear,
  filterByEra,
  getIntroductionEra,
  getExtinctionEra,
  getAvailableEras,
  MinimalTemporalEntity,
} from '@/utils/temporal/availabilityUtils';

describe('availabilityUtils', () => {
  /**
   * Create a mock temporal entity
   */
  function createEntity(
    introductionYear: number,
    extinctionYear?: number,
  ): MinimalTemporalEntity {
    return { introductionYear, extinctionYear };
  }

  // ============================================================================
  // validateTemporalProperties()
  // ============================================================================
  describe('validateTemporalProperties()', () => {
    it('should validate valid entity with only introduction year', () => {
      const entity = createEntity(3025);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid entity with introduction and extinction', () => {
      const entity = createEntity(3025, 3050);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-finite introduction year', () => {
      const entity = createEntity(NaN);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'introductionYear must be a finite number',
      );
    });

    it('should reject Infinity introduction year', () => {
      const entity = createEntity(Infinity);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(false);
    });

    it('should reject non-finite extinction year', () => {
      const entity = createEntity(3025, NaN);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'extinctionYear must be a finite number if provided',
      );
    });

    it('should reject extinction year before introduction year', () => {
      const entity = createEntity(3050, 3025);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'extinctionYear must be >= introductionYear',
      );
    });

    it('should allow same year for introduction and extinction', () => {
      const entity = createEntity(3025, 3025);
      const result = validateTemporalProperties(entity);

      expect(result.isValid).toBe(true);
    });
  });

  // ============================================================================
  // isAvailableInYear()
  // ============================================================================
  describe('isAvailableInYear()', () => {
    it('should return false for non-finite year', () => {
      const entity = createEntity(3025);

      expect(isAvailableInYear(entity, NaN)).toBe(false);
      expect(isAvailableInYear(entity, Infinity)).toBe(false);
    });

    it('should return false for non-finite introduction year', () => {
      const entity = createEntity(NaN);

      expect(isAvailableInYear(entity, 3025)).toBe(false);
    });

    it('should return false before introduction year', () => {
      const entity = createEntity(3025);

      expect(isAvailableInYear(entity, 3024)).toBe(false);
    });

    it('should return true on introduction year', () => {
      const entity = createEntity(3025);

      expect(isAvailableInYear(entity, 3025)).toBe(true);
    });

    it('should return true after introduction year', () => {
      const entity = createEntity(3025);

      expect(isAvailableInYear(entity, 3050)).toBe(true);
    });

    it('should return true on extinction year', () => {
      const entity = createEntity(3025, 3050);

      expect(isAvailableInYear(entity, 3050)).toBe(true);
    });

    it('should return false after extinction year', () => {
      const entity = createEntity(3025, 3050);

      expect(isAvailableInYear(entity, 3051)).toBe(false);
    });

    it('should return true within availability range', () => {
      const entity = createEntity(3025, 3050);

      expect(isAvailableInYear(entity, 3040)).toBe(true);
    });

    it('should handle entity with no extinction year', () => {
      const entity = createEntity(3025);

      expect(isAvailableInYear(entity, 4000)).toBe(true);
    });
  });

  // ============================================================================
  // isAvailableInEra()
  // ============================================================================
  describe('isAvailableInEra()', () => {
    it('should return false for unknown era', () => {
      const entity = createEntity(3025);

      // @ts-expect-error - testing invalid era
      expect(isAvailableInEra(entity, 'Unknown Era')).toBe(false);
    });

    it('should return true when introduced during era', () => {
      // Clan Invasion era: 3050-3061
      const entity = createEntity(3055);

      expect(isAvailableInEra(entity, Era.CLAN_INVASION)).toBe(true);
    });

    it('should return true when introduced before era', () => {
      // Star League tech available in later eras
      const entity = createEntity(2750);

      expect(isAvailableInEra(entity, Era.CLAN_INVASION)).toBe(true);
    });

    it('should return false when introduced after era', () => {
      // Clan Invasion era ends at 3061
      const entity = createEntity(3100);

      expect(isAvailableInEra(entity, Era.CLAN_INVASION)).toBe(false);
    });

    it('should return false when extinct before era', () => {
      // Entity extinct in 3040, before Clan Invasion (3050-3061)
      const entity = createEntity(2750, 3040);

      expect(isAvailableInEra(entity, Era.CLAN_INVASION)).toBe(false);
    });

    it('should return true when extinct during era', () => {
      // Entity extinct during Clan Invasion era
      const entity = createEntity(2750, 3055);

      expect(isAvailableInEra(entity, Era.CLAN_INVASION)).toBe(true);
    });

    it('should return true when extinct after era', () => {
      const entity = createEntity(2750, 3100);

      expect(isAvailableInEra(entity, Era.CLAN_INVASION)).toBe(true);
    });
  });

  // ============================================================================
  // filterByYear()
  // ============================================================================
  describe('filterByYear()', () => {
    it('should return empty array for empty input', () => {
      const result = filterByYear([], 3025);

      expect(result).toEqual([]);
    });

    it('should filter entities by year availability', () => {
      const entities = [
        createEntity(3000), // Available in 3025
        createEntity(3030), // Not available in 3025
        createEntity(2900, 3020), // Not available in 3025 (extinct)
        createEntity(2900, 3030), // Available in 3025
      ];

      const result = filterByYear(entities, 3025);

      expect(result).toHaveLength(2);
      expect(result[0].introductionYear).toBe(3000);
      expect(result[1].introductionYear).toBe(2900);
    });

    it('should preserve entity type', () => {
      interface ExtendedEntity extends MinimalTemporalEntity {
        name: string;
      }

      const entities: ExtendedEntity[] = [
        { introductionYear: 3000, name: 'Available' },
        { introductionYear: 3050, name: 'Not Available' },
      ];

      const result = filterByYear(entities, 3025);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Available');
    });
  });

  // ============================================================================
  // filterByEra()
  // ============================================================================
  describe('filterByEra()', () => {
    it('should return empty array for empty input', () => {
      const result = filterByEra([], Era.CLAN_INVASION);

      expect(result).toEqual([]);
    });

    it('should filter entities by era availability', () => {
      const entities = [
        createEntity(2750), // Available in Clan Invasion (introduced earlier)
        createEntity(3055), // Available in Clan Invasion (introduced during)
        createEntity(3100), // Not available in Clan Invasion (introduced after)
        createEntity(2750, 3040), // Not available (extinct before era)
      ];

      const result = filterByEra(entities, Era.CLAN_INVASION);

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // getIntroductionEra()
  // ============================================================================
  describe('getIntroductionEra()', () => {
    it('should return era for Age of War introduction', () => {
      const entity = createEntity(2400);

      expect(getIntroductionEra(entity)).toBe(Era.AGE_OF_WAR);
    });

    it('should return era for Star League introduction', () => {
      const entity = createEntity(2750);

      expect(getIntroductionEra(entity)).toBe(Era.STAR_LEAGUE);
    });

    it('should return era for Clan Invasion introduction', () => {
      const entity = createEntity(3055);

      expect(getIntroductionEra(entity)).toBe(Era.CLAN_INVASION);
    });

    it('should return Early Spaceflight for year 1000', () => {
      const entity = createEntity(1000);

      expect(getIntroductionEra(entity)).toBe(Era.EARLY_SPACEFLIGHT);
    });
  });

  // ============================================================================
  // getExtinctionEra()
  // ============================================================================
  describe('getExtinctionEra()', () => {
    it('should return undefined for entities without extinction', () => {
      const entity = createEntity(3025);

      expect(getExtinctionEra(entity)).toBeUndefined();
    });

    it('should return era for extinction year', () => {
      const entity = createEntity(2750, 3055);

      expect(getExtinctionEra(entity)).toBe(Era.CLAN_INVASION);
    });

    it('should return ilClan for extinction year in ongoing era', () => {
      // ilClan era extends to 9999, so year 5000 is within it
      const entity = createEntity(2750, 5000);

      expect(getExtinctionEra(entity)).toBe(Era.IL_CLAN);
    });

    it('should return undefined for extinction year outside all eras', () => {
      const entity = createEntity(2750, 10000);

      expect(getExtinctionEra(entity)).toBeUndefined();
    });
  });

  // ============================================================================
  // getAvailableEras()
  // ============================================================================
  describe('getAvailableEras()', () => {
    it('should return ilClan for entity introduced in year 5000', () => {
      // ilClan era extends to 9999, so year 5000 is within it
      const entity = createEntity(5000);

      expect(getAvailableEras(entity)).toContain(Era.IL_CLAN);
    });

    it('should return empty array for entity introduced after all eras', () => {
      const entity = createEntity(10000);

      expect(getAvailableEras(entity)).toEqual([]);
    });

    it('should return all eras from introduction onward', () => {
      // Entity introduced in Clan Invasion, available through ilClan
      const entity = createEntity(3055);
      const eras = getAvailableEras(entity);

      expect(eras).toContain(Era.CLAN_INVASION);
      expect(eras).toContain(Era.CIVIL_WAR);
      expect(eras).toContain(Era.JIHAD);
      expect(eras).toContain(Era.DARK_AGE);
      expect(eras).toContain(Era.IL_CLAN);
      expect(eras).not.toContain(Era.RENAISSANCE);
    });

    it('should limit to eras before extinction', () => {
      // Entity introduced in Star League, extinct before Clan Invasion
      const entity = createEntity(2750, 3040);
      const eras = getAvailableEras(entity);

      expect(eras).toContain(Era.STAR_LEAGUE);
      expect(eras).toContain(Era.RENAISSANCE);
      expect(eras).not.toContain(Era.CLAN_INVASION);
    });

    it('should return single era for short-lived entity', () => {
      // Entity only available in Clan Invasion
      const entity = createEntity(3050, 3061);
      const eras = getAvailableEras(entity);

      expect(eras).toContain(Era.CLAN_INVASION);
      expect(eras).toHaveLength(1);
    });

    it('should span multiple eras', () => {
      // Entity spanning multiple eras
      const entity = createEntity(2750, 3100);
      const eras = getAvailableEras(entity);

      expect(eras.length).toBeGreaterThan(3);
      expect(eras).toContain(Era.STAR_LEAGUE);
      expect(eras).toContain(Era.CLAN_INVASION);
    });
  });
});
