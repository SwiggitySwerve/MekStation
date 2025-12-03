/**
 * Engine Calculations Tests
 * 
 * Tests for engine weight, rating, and related calculations.
 * These are pure functions - no mocks needed.
 * 
 * @spec openspec/specs/engine-system/spec.md
 */

import {
  validateEngineRating,
  getBaseEngineWeight,
  calculateEngineWeight,
  calculateEngineRating,
  calculateWalkMP,
  getEngineCTSlots,
  getEngineSideTorsoSlots,
  getTotalEngineSlots,
  calculateIntegralHeatSinks,
  validateEngineForTonnage,
  isFusionEngine,
  getAllValidEngineRatings,
} from '@/utils/construction/engineCalculations';
import { EngineType } from '@/types/construction/EngineType';

// Import custom assertions
import '@/__tests__/helpers/assertions';

describe('Engine Calculations', () => {
  // ============================================================================
  // validateEngineRating
  // ============================================================================
  describe('validateEngineRating', () => {
    describe('valid ratings', () => {
      it.each([
        [10, 'minimum rating'],
        [100, 'common rating'],
        [300, 'standard heavy mech rating'],
        [500, 'maximum rating'],
        [250, 'mid-range rating'],
      ])('should accept %d (%s)', (rating) => {
        const result = validateEngineRating(rating);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid ratings', () => {
      it('should reject ratings below minimum', () => {
        const result = validateEngineRating(5);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Engine rating must be between 10 and 500');
      });

      it('should reject ratings above maximum', () => {
        const result = validateEngineRating(505);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Engine rating must be between 10 and 500');
      });

      it('should reject non-multiples of 5', () => {
        const result = validateEngineRating(102);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Engine rating must be a multiple of 5');
      });

      it('should reject non-integers', () => {
        const result = validateEngineRating(100.5);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Engine rating must be an integer');
      });
    });

    describe('custom matchers', () => {
      it.each([10, 100, 250, 300, 400])(
        '%d should be a valid engine rating',
        (rating) => {
          expect(rating).toBeValidEngineRating();
        }
      );

      it.each([5, 405, 500, 103, 100.5])(
        '%d should not be a valid engine rating',
        (rating) => {
          expect(rating).not.toBeValidEngineRating();
        }
      );
    });
  });

  // ============================================================================
  // getBaseEngineWeight (Standard Fusion weight table)
  // ============================================================================
  describe('getBaseEngineWeight', () => {
    describe('weight table lookups (per TechManual p.49)', () => {
      it.each([
        // Low ratings
        [10, 0.5],
        [20, 0.5],
        [25, 0.5],
        [30, 1.0],
        [50, 1.5],
        // Common ratings
        [100, 3.0],
        [150, 5.5],
        [200, 8.5],
        [250, 12.5],
        [300, 19.0],
        // High ratings
        [350, 29.5],
        [400, 52.5],
        [450, 133.5],
        [500, 462.5],
      ])('rating %d should weigh %s tons', (rating, expectedWeight) => {
        expect(getBaseEngineWeight(rating)).toBe(expectedWeight);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for invalid ratings', () => {
        expect(getBaseEngineWeight(7)).toBe(0);  // Not multiple of 5
        expect(getBaseEngineWeight(505)).toBe(0); // Above max
      });
    });
  });

  // ============================================================================
  // calculateEngineWeight
  // ============================================================================
  describe('calculateEngineWeight', () => {
    describe('Standard Fusion Engine (multiplier 1.0)', () => {
      it.each([
        [100, 3.0],
        [200, 8.5],
        [300, 19.0],
        [400, 52.5],
      ])('rating %d should weigh %s tons', (rating, expected) => {
        expect(calculateEngineWeight(rating, EngineType.STANDARD)).toBe(expected);
      });
    });

    describe('XL Engine (multiplier 0.5)', () => {
      // From engine-system/spec.md:
      // #### Scenario: XL Engine variants
      // - **AND** weight SHALL be 50% of standard fusion weight
      it.each([
        [100, 1.5],   // 3.0 × 0.5 = 1.5
        [200, 4.5],   // 8.5 × 0.5 = 4.25 → ceil to 4.5
        [300, 9.5],   // 19.0 × 0.5 = 9.5
        [400, 26.5],  // 52.5 × 0.5 = 26.25 → ceil to 26.5
      ])('IS XL rating %d should weigh %s tons', (rating, expected) => {
        expect(calculateEngineWeight(rating, EngineType.XL_IS)).toBe(expected);
      });

      it.each([
        [100, 1.5],
        [200, 4.5],
        [300, 9.5],
      ])('Clan XL rating %d should weigh %s tons', (rating, expected) => {
        expect(calculateEngineWeight(rating, EngineType.XL_CLAN)).toBe(expected);
      });
    });

    describe('Light Engine (multiplier 0.75)', () => {
      it.each([
        [100, 2.5],   // 3.0 × 0.75 = 2.25 → ceil to 2.5
        [200, 6.5],   // 8.5 × 0.75 = 6.375 → ceil to 6.5
        [300, 14.5],  // 19.0 × 0.75 = 14.25 → ceil to 14.5
      ])('rating %d should weigh %s tons', (rating, expected) => {
        expect(calculateEngineWeight(rating, EngineType.LIGHT)).toBe(expected);
      });
    });

    describe('Compact Engine (multiplier 1.5)', () => {
      it.each([
        [100, 4.5],   // 3.0 × 1.5 = 4.5
        [200, 13.0],  // 8.5 × 1.5 = 12.75 → ceil to 13
      ])('rating %d should weigh %s tons', (rating, expected) => {
        expect(calculateEngineWeight(rating, EngineType.COMPACT)).toBe(expected);
      });
    });

    describe('ICE Engine (multiplier 2.0)', () => {
      it.each([
        [100, 6.0],   // 3.0 × 2.0 = 6.0
        [200, 17.0],  // 8.5 × 2.0 = 17.0
      ])('rating %d should weigh %s tons', (rating, expected) => {
        expect(calculateEngineWeight(rating, EngineType.ICE)).toBe(expected);
      });
    });
  });

  // ============================================================================
  // calculateEngineRating
  // ============================================================================
  describe('calculateEngineRating', () => {
    describe('standard calculations', () => {
      // Rating = tonnage × walkMP
      it.each([
        [20, 8, 160],   // Locust: 20 tons × 8 walk = 160
        [50, 4, 200],   // Hunchback: 50 tons × 4 walk = 200
        [75, 4, 300],   // Marauder: 75 tons × 4 walk = 300
        [100, 3, 300],  // Atlas: 100 tons × 3 walk = 300
        [75, 5, 375],   // Timber Wolf: 75 tons × 5 walk = 375
      ])('%d tons with %d walk = rating %d', (tonnage, walkMP, expected) => {
        expect(calculateEngineRating(tonnage, walkMP)).toBe(expected);
      });
    });

    describe('rounding to nearest 5', () => {
      it.each([
        [33, 3, 100],   // 33 × 3 = 99 → rounds to 100
        [35, 4, 140],   // 35 × 4 = 140 (exact)
        [27, 5, 135],   // 27 × 5 = 135 (exact)
      ])('%d tons with %d walk rounds to %d', (tonnage, walkMP, expected) => {
        expect(calculateEngineRating(tonnage, walkMP)).toBe(expected);
      });
    });
  });

  // ============================================================================
  // calculateWalkMP
  // ============================================================================
  describe('calculateWalkMP', () => {
    describe('standard calculations', () => {
      // walkMP = floor(rating / tonnage)
      it.each([
        [160, 20, 8],   // 160 / 20 = 8
        [200, 50, 4],   // 200 / 50 = 4
        [300, 75, 4],   // 300 / 75 = 4
        [300, 100, 3],  // 300 / 100 = 3
        [375, 75, 5],   // 375 / 75 = 5
      ])('rating %d with %d tons = %d walk', (rating, tonnage, expected) => {
        expect(calculateWalkMP(rating, tonnage)).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for zero tonnage', () => {
        expect(calculateWalkMP(300, 0)).toBe(0);
      });

      it('should return 0 for zero rating', () => {
        expect(calculateWalkMP(0, 50)).toBe(0);
      });

      it('should return 0 for negative values', () => {
        expect(calculateWalkMP(-300, 50)).toBe(0);
        expect(calculateWalkMP(300, -50)).toBe(0);
      });
    });
  });

  // ============================================================================
  // Engine Slots
  // ============================================================================
  describe('Engine Slots', () => {
    describe('getEngineCTSlots', () => {
      it('Standard engine uses 6 CT slots', () => {
        expect(getEngineCTSlots(300, EngineType.STANDARD)).toBe(6);
      });

      it('Compact engine uses 3 CT slots', () => {
        expect(getEngineCTSlots(300, EngineType.COMPACT)).toBe(3);
      });

      it.each([EngineType.XL_IS, EngineType.XL_CLAN, EngineType.LIGHT, EngineType.XXL])(
        '%s uses 6 CT slots',
        (engineType) => {
          expect(getEngineCTSlots(300, engineType)).toBe(6);
        }
      );
    });

    describe('getEngineSideTorsoSlots', () => {
      it('Standard engine uses 0 side torso slots', () => {
        expect(getEngineSideTorsoSlots(EngineType.STANDARD)).toBe(0);
      });

      // From spec: IS XL uses 3 side torso slots per side
      it('IS XL engine uses 3 side torso slots per side', () => {
        expect(getEngineSideTorsoSlots(EngineType.XL_IS)).toBe(3);
      });

      // From spec: Clan XL uses 2 side torso slots per side
      it('Clan XL engine uses 2 side torso slots per side', () => {
        expect(getEngineSideTorsoSlots(EngineType.XL_CLAN)).toBe(2);
      });

      it('Light engine uses 2 side torso slots per side', () => {
        expect(getEngineSideTorsoSlots(EngineType.LIGHT)).toBe(2);
      });
    });

    describe('getTotalEngineSlots', () => {
      it.each([
        [EngineType.STANDARD, 6],   // 6 CT + 0 + 0
        [EngineType.XL_IS, 12],     // 6 CT + 3 + 3
        [EngineType.XL_CLAN, 10],   // 6 CT + 2 + 2
        [EngineType.LIGHT, 10],     // 6 CT + 2 + 2
        [EngineType.COMPACT, 3],    // 3 CT + 0 + 0
      ])('%s uses %d total slots', (engineType, expected) => {
        expect(getTotalEngineSlots(300, engineType)).toBe(expected);
      });
    });
  });

  // ============================================================================
  // calculateIntegralHeatSinks
  // ============================================================================
  describe('calculateIntegralHeatSinks', () => {
    // From heat-sink-system/spec.md:
    // #### Scenario: Integral heat sinks
    // - **THEN** capacity = floor(engineRating / 25) with no maximum cap
    describe('fusion engines', () => {
      it.each([
        [50, 2],    // floor(50/25) = 2
        [75, 3],    // floor(75/25) = 3
        [100, 4],   // floor(100/25) = 4
        [200, 8],   // floor(200/25) = 8
        [250, 10],  // floor(250/25) = 10
        [275, 11],  // floor(275/25) = 11
        [300, 12],  // floor(300/25) = 12
        [400, 16],  // floor(400/25) = 16
        [500, 20],  // floor(500/25) = 20 (max rating)
      ])('Standard Fusion rating %d has %d integral heat sinks', (rating, expected) => {
        expect(calculateIntegralHeatSinks(rating, EngineType.STANDARD)).toBe(expected);
      });
    });

    describe('non-fusion engines', () => {
      it.each([
        [EngineType.ICE, 'ICE'],
        [EngineType.FUEL_CELL, 'Fuel Cell'],
        [EngineType.FISSION, 'Fission'],
      ])('%s has 0 integral heat sinks', (engineType) => {
        expect(calculateIntegralHeatSinks(300, engineType)).toBe(0);
      });
    });
  });

  // ============================================================================
  // validateEngineForTonnage
  // ============================================================================
  describe('validateEngineForTonnage', () => {
    describe('valid configurations', () => {
      it.each([
        [160, 20],   // Locust: walk 8
        [200, 50],   // Hunchback: walk 4
        [300, 75],   // Marauder: walk 4
        [300, 100],  // Atlas: walk 3
      ])('rating %d for %d tons is valid', (rating, tonnage) => {
        const result = validateEngineForTonnage(rating, tonnage);
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid configurations', () => {
      it('should reject rating too low for tonnage', () => {
        const result = validateEngineForTonnage(50, 100); // walk = 0.5 → 0
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('walk MP < 1'))).toBe(true);
      });

      it('should reject rating too high for tonnage', () => {
        const result = validateEngineForTonnage(500, 20); // walk = 25
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('walk MP > 20'))).toBe(true);
      });
    });
  });

  // ============================================================================
  // isFusionEngine
  // ============================================================================
  describe('isFusionEngine', () => {
    it.each([
      [EngineType.STANDARD, true],
      [EngineType.XL_IS, true],
      [EngineType.XL_CLAN, true],
      [EngineType.LIGHT, true],
      [EngineType.XXL, true],
      [EngineType.COMPACT, true],
      [EngineType.ICE, false],
      [EngineType.FUEL_CELL, false],
      [EngineType.FISSION, false],
    ])('%s isFusion = %s', (engineType, expected) => {
      expect(isFusionEngine(engineType)).toBe(expected);
    });
  });

  // ============================================================================
  // getAllValidEngineRatings
  // ============================================================================
  describe('getAllValidEngineRatings', () => {
    it('should return all ratings from 10 to 500', () => {
      const ratings = getAllValidEngineRatings();
      expect(ratings[0]).toBe(10);
      expect(ratings[ratings.length - 1]).toBe(500);
    });

    it('should return ratings in multiples of 5', () => {
      const ratings = getAllValidEngineRatings();
      ratings.forEach(rating => {
        expect(rating % 5).toBe(0);
      });
    });

    it('should be sorted in ascending order', () => {
      const ratings = getAllValidEngineRatings();
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeGreaterThan(ratings[i - 1]);
      }
    });
  });
});

