/**
 * Per-change smoke test for add-bot-retreat-behavior.
 *
 * Asserts:
 * - shouldRetreat fires on structural threshold + on vital crit
 * - shouldRetreat is suppressed when retreatEdge='none'
 * - resolveEdge returns the explicit edge for explicit configs
 * - resolveEdge('nearest') picks the closest edge by axial distance
 *   with deterministic tie-break (north → east → south → west)
 * - scoreRetreatMove rewards progress toward edge + facing alignment
 * - effectiveSafeHeatThreshold drops by 2 when retreating
 * - retreatMovementType prefers Run, falls back to Walk, never Jump
 *
 * @spec openspec/changes/add-bot-retreat-behavior/tasks.md § 2-6
 */

import { describe, it, expect } from '@jest/globals';

import type { IAIUnitState, IBotBehavior } from '@/simulation/ai/types';

import {
  effectiveSafeHeatThreshold,
  resolveEdge,
  retreatMovementType,
  scoreRetreatMove,
  shouldRetreat,
} from '@/simulation/ai/RetreatAI';
import { Facing, MovementType } from '@/types/gameplay';

const baseBehavior: IBotBehavior = {
  retreatThreshold: 0.5,
  retreatEdge: 'nearest',
  // safeHeatThreshold lives in #315; cast preserves test independence
  ...({ safeHeatThreshold: 13 } as object),
};

const stationaryUnit: IAIUnitState = {
  unitId: 'u1',
  position: { q: 0, r: 0 },
  facing: Facing.North,
  heat: 0,
  weapons: [],
  ammo: {},
  destroyed: false,
  gunnery: 4,
  movementType: MovementType.Stationary,
  hexesMoved: 0,
};

describe('add-bot-retreat-behavior — smoke test', () => {
  describe('shouldRetreat (task 2)', () => {
    it('fires when destruction ratio exceeds threshold', () => {
      expect(shouldRetreat(baseBehavior, 0.6, false)).toBe(true);
    });

    it('does NOT fire when destruction ratio is at or below threshold', () => {
      expect(shouldRetreat(baseBehavior, 0.5, false)).toBe(false);
      expect(shouldRetreat(baseBehavior, 0.3, false)).toBe(false);
    });

    it('fires on through-armor crit even at 0% structural loss', () => {
      expect(shouldRetreat(baseBehavior, 0, true)).toBe(true);
    });

    it("retreatEdge='none' suppresses the trigger entirely", () => {
      const noneBehavior: IBotBehavior = {
        ...baseBehavior,
        retreatEdge: 'none',
      };
      expect(shouldRetreat(noneBehavior, 0.99, true)).toBe(false);
    });
  });

  describe('resolveEdge (task 3)', () => {
    it('returns the explicit edge for explicit configs', () => {
      expect(
        resolveEdge(
          { ...baseBehavior, retreatEdge: 'north' },
          { q: 0, r: 0 },
          5,
        ),
      ).toBe('north');
      expect(
        resolveEdge(
          { ...baseBehavior, retreatEdge: 'south' },
          { q: 0, r: 0 },
          5,
        ),
      ).toBe('south');
    });

    it('returns null when retreatEdge is none', () => {
      expect(
        resolveEdge(
          { ...baseBehavior, retreatEdge: 'none' },
          { q: 0, r: 0 },
          5,
        ),
      ).toBeNull();
    });

    it("'nearest' picks the closest edge by axial distance", () => {
      // Unit close to the north edge (positive r side per implementation):
      // r=4, mapRadius=5 → dNorth=1, dSouth=9, dEast=5, dWest=5 → north
      // (Unit far from south).
      const result = resolveEdge(baseBehavior, { q: 0, r: 4 }, 5);
      expect(result).toBe('north');
    });

    it('breaks ties in canonical order (north → east → south → west)', () => {
      // Center of map: equidistant from all 4 edges → north wins
      const result = resolveEdge(baseBehavior, { q: 0, r: 0 }, 5);
      expect(result).toBe('north');
    });
  });

  describe('scoreRetreatMove (task 4)', () => {
    it('rewards progress toward the edge by 1000 per hex closer', () => {
      const score = scoreRetreatMove({
        previousDistanceToEdge: 5,
        newDistanceToEdge: 3,
        endingFacingTowardEdge: false,
        isJumpMove: false,
      });
      expect(score).toBe(2000);
    });

    it('adds +200 for facing the retreat edge after the move', () => {
      const score = scoreRetreatMove({
        previousDistanceToEdge: 5,
        newDistanceToEdge: 4,
        endingFacingTowardEdge: true,
        isJumpMove: false,
      });
      expect(score).toBe(1200);
    });

    it('penalizes jump moves by 50', () => {
      const jump = scoreRetreatMove({
        previousDistanceToEdge: 5,
        newDistanceToEdge: 4,
        endingFacingTowardEdge: false,
        isJumpMove: true,
      });
      const run = scoreRetreatMove({
        previousDistanceToEdge: 5,
        newDistanceToEdge: 4,
        endingFacingTowardEdge: false,
        isJumpMove: false,
      });
      expect(jump).toBe(950);
      expect(run).toBe(1000);
      expect(run).toBeGreaterThan(jump);
    });

    it('returns negative score when move is AWAY from the edge', () => {
      const score = scoreRetreatMove({
        previousDistanceToEdge: 3,
        newDistanceToEdge: 5,
        endingFacingTowardEdge: false,
        isJumpMove: false,
      });
      expect(score).toBe(-2000);
    });
  });

  describe('effectiveSafeHeatThreshold (task 6.1)', () => {
    it('returns the baseline value when not retreating', () => {
      expect(effectiveSafeHeatThreshold(stationaryUnit, baseBehavior)).toBe(13);
    });

    it('drops the threshold by 2 when retreating', () => {
      const retreating: IAIUnitState = {
        ...stationaryUnit,
        isRetreating: true,
      };
      expect(effectiveSafeHeatThreshold(retreating, baseBehavior)).toBe(11);
    });

    it('floors at 0', () => {
      // safeHeatThreshold lives in #315; cast preserves independence
      const lowThreshold: IBotBehavior = {
        ...baseBehavior,
        ...({ safeHeatThreshold: 1 } as object),
      };
      const retreating: IAIUnitState = {
        ...stationaryUnit,
        isRetreating: true,
      };
      expect(effectiveSafeHeatThreshold(retreating, lowThreshold)).toBe(0);
    });
  });

  describe('retreatMovementType (task 5)', () => {
    it('returns Run when both Walk and Run are available', () => {
      expect(
        retreatMovementType({ walkAvailable: true, runAvailable: true }),
      ).toBe('run');
    });

    it('falls back to Walk when Run is disabled', () => {
      expect(
        retreatMovementType({ walkAvailable: true, runAvailable: false }),
      ).toBe('walk');
    });

    it('returns stationary when neither Walk nor Run is available', () => {
      expect(
        retreatMovementType({ walkAvailable: false, runAvailable: false }),
      ).toBe('stationary');
    });
  });

  describe('IAIUnitState retreat fields (task 1.1)', () => {
    it('isRetreating defaults to undefined / false-y', () => {
      expect(stationaryUnit.isRetreating).toBeUndefined();
      expect(stationaryUnit.retreatTargetEdge).toBeUndefined();
    });

    it('accepts isRetreating + retreatTargetEdge values', () => {
      const retreating: IAIUnitState = {
        ...stationaryUnit,
        isRetreating: true,
        retreatTargetEdge: 'north',
      };
      expect(retreating.isRetreating).toBe(true);
      expect(retreating.retreatTargetEdge).toBe('north');
    });
  });
});
