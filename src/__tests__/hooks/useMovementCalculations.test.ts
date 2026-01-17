/**
 * Tests for useMovementCalculations hook
 */

import { renderHook } from '@testing-library/react';
import {
  useMovementCalculations,
  getWalkMPRange,
  calculateRunMP,
  calculateWalkMP,
  calculateEngineRating,
  getEnhancementOptions,
  MAX_ENGINE_RATING,
  MIN_ENGINE_RATING,
} from '@/hooks/useMovementCalculations';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';

describe('useMovementCalculations', () => {
  describe('pure functions', () => {
    describe('getWalkMPRange', () => {
      it('returns correct range for 20-ton mech', () => {
        const range = getWalkMPRange(20);
        // Min: ceil(10/20) = 1, Max: min(12, floor(400/20)) = 12
        expect(range.min).toBe(1);
        expect(range.max).toBe(12);
      });

      it('returns correct range for 100-ton mech', () => {
        const range = getWalkMPRange(100);
        // Min: ceil(10/100) = 1, Max: min(12, floor(400/100)) = 4
        expect(range.min).toBe(1);
        expect(range.max).toBe(4);
      });

      it('returns correct range for 50-ton mech', () => {
        const range = getWalkMPRange(50);
        // Min: ceil(10/50) = 1, Max: min(12, floor(400/50)) = 8
        expect(range.min).toBe(1);
        expect(range.max).toBe(8);
      });
    });

    describe('calculateRunMP', () => {
      it('calculates run MP as ceil of walk * 1.5', () => {
        expect(calculateRunMP(4)).toBe(6); // 4 * 1.5 = 6
        expect(calculateRunMP(5)).toBe(8); // 5 * 1.5 = 7.5 -> 8
        expect(calculateRunMP(6)).toBe(9); // 6 * 1.5 = 9
        expect(calculateRunMP(7)).toBe(11); // 7 * 1.5 = 10.5 -> 11
      });
    });

    describe('calculateWalkMP', () => {
      it('calculates walk MP from engine rating and tonnage', () => {
        expect(calculateWalkMP(200, 50)).toBe(4);
        expect(calculateWalkMP(300, 100)).toBe(3);
        expect(calculateWalkMP(240, 20)).toBe(12);
      });
    });

    describe('calculateEngineRating', () => {
      it('calculates engine rating from walk MP and tonnage', () => {
        expect(calculateEngineRating(4, 50)).toBe(200);
        expect(calculateEngineRating(3, 100)).toBe(300);
        expect(calculateEngineRating(12, 20)).toBe(240);
      });
    });

    describe('getEnhancementOptions', () => {
      it('returns all enhancement options', () => {
        const options = getEnhancementOptions();
        expect(options).toHaveLength(3);
        expect(options[0].value).toBeNull();
        expect(options[1].value).toBe(MovementEnhancementType.MASC);
        expect(options[2].value).toBe(MovementEnhancementType.TSM);
      });
    });
  });

  describe('hook', () => {
    it('calculates walk and run MP correctly', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 50,
          engineRating: 200,
          jumpMP: 0,
          jumpJetType: JumpJetType.STANDARD,
          enhancement: null,
        })
      );

      expect(result.current.walkMP).toBe(4);
      expect(result.current.runMP).toBe(6);
    });

    it('calculates walk MP range correctly', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 100,
          engineRating: 300,
          jumpMP: 0,
          jumpJetType: JumpJetType.STANDARD,
          enhancement: null,
        })
      );

      expect(result.current.walkMPRange.min).toBe(1);
      expect(result.current.walkMPRange.max).toBe(4);
    });

    it('detects max engine rating', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 50,
          engineRating: MAX_ENGINE_RATING,
          jumpMP: 0,
          jumpJetType: JumpJetType.STANDARD,
          enhancement: null,
        })
      );

      expect(result.current.isAtMaxEngineRating).toBe(true);
    });

    it('calculates max jump MP for standard jets (equals walk)', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 50,
          engineRating: 200, // Walk 4
          jumpMP: 0,
          jumpJetType: JumpJetType.STANDARD,
          enhancement: null,
        })
      );

      expect(result.current.maxJumpMP).toBe(4); // Equals walk
    });

    it('calculates max jump MP for improved jets (equals run)', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 50,
          engineRating: 200, // Walk 4, Run 6
          jumpMP: 0,
          jumpJetType: JumpJetType.IMPROVED,
          enhancement: null,
        })
      );

      expect(result.current.maxJumpMP).toBe(6); // Equals run
    });

    it('returns undefined maxRunMP when no enhancement', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 50,
          engineRating: 200,
          jumpMP: 0,
          jumpJetType: JumpJetType.STANDARD,
          enhancement: null,
        })
      );

      expect(result.current.maxRunMP).toBeUndefined();
    });

    it('calculates enhanced max run MP with MASC', () => {
      const { result } = renderHook(() =>
        useMovementCalculations({
          tonnage: 50,
          engineRating: 200, // Walk 4
          jumpMP: 0,
          jumpJetType: JumpJetType.STANDARD,
          enhancement: MovementEnhancementType.MASC,
        })
      );

      // MASC: Sprint = Walk × 2 = 8
      expect(result.current.maxRunMP).toBe(8);
    });

    describe('helper functions', () => {
      it('clampWalkMP clamps to valid range', () => {
        const { result } = renderHook(() =>
          useMovementCalculations({
            tonnage: 100,
            engineRating: 300,
            jumpMP: 0,
            jumpJetType: JumpJetType.STANDARD,
            enhancement: null,
          })
        );

        // Range for 100t is 1-4
        expect(result.current.clampWalkMP(0)).toBe(1);
        expect(result.current.clampWalkMP(10)).toBe(4);
        expect(result.current.clampWalkMP(3)).toBe(3);
      });

      it('clampJumpMP clamps to valid range', () => {
        const { result } = renderHook(() =>
          useMovementCalculations({
            tonnage: 50,
            engineRating: 200, // Walk 4
            jumpMP: 0,
            jumpJetType: JumpJetType.STANDARD,
            enhancement: null,
          })
        );

        // Max jump for walk 4 with standard jets is 4
        expect(result.current.clampJumpMP(-1)).toBe(0);
        expect(result.current.clampJumpMP(10)).toBe(4);
        expect(result.current.clampJumpMP(2)).toBe(2);
      });

      it('getEngineRatingForWalkMP calculates correctly', () => {
        const { result } = renderHook(() =>
          useMovementCalculations({
            tonnage: 50,
            engineRating: 200,
            jumpMP: 0,
            jumpJetType: JumpJetType.STANDARD,
            enhancement: null,
          })
        );

        expect(result.current.getEngineRatingForWalkMP(4)).toBe(200);
        expect(result.current.getEngineRatingForWalkMP(6)).toBe(300);
      });
    });
  });

  describe('constants', () => {
    it('exports correct engine rating limits', () => {
      expect(MAX_ENGINE_RATING).toBe(400);
      expect(MIN_ENGINE_RATING).toBe(10);
    });
  });
});
