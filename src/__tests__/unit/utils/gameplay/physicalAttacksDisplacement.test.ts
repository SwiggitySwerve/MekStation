/**
 * Tests for `physicalAttacks/displacement.ts` — charge miss + push helpers.
 *
 * @spec openspec/changes/implement-physical-attack-phase/specs/physical-attack-system/spec.md
 *  - Requirement "Charge Miss Displaces Attacker To Side Hex"
 *  - Requirement "Push Resolution"
 */

import { describe, it, expect } from '@jest/globals';

import { Facing, IHexCoordinate } from '@/types/gameplay';
import { createHexGrid, placeUnit } from '@/utils/gameplay/hexGrid';
import {
  computeMissedChargeDisplacement,
  computePushDisplacement,
  isValidDisplacement,
  translateHex,
} from '@/utils/gameplay/physicalAttacks/displacement';

describe('physicalAttacks/displacement', () => {
  describe('translateHex', () => {
    it('returns the neighboring hex for each facing', () => {
      const origin: IHexCoordinate = { q: 0, r: 0 };
      const north = translateHex(origin, Facing.North);
      const south = translateHex(origin, Facing.South);
      // North + South should be opposite — verify they negate component-wise
      // using arithmetic comparison (avoids -0 vs 0 strict-equality issue).
      expect(north.q + south.q).toBe(0);
      expect(north.r + south.r).toBe(0);
    });
  });

  describe('isValidDisplacement', () => {
    it('returns false for off-map hexes', () => {
      const grid = createHexGrid({ radius: 2 });
      const offMap: IHexCoordinate = { q: 100, r: 100 };
      expect(isValidDisplacement(grid, offMap)).toBe(false);
    });

    it('returns true for empty in-bounds hexes', () => {
      const grid = createHexGrid({ radius: 2 });
      expect(isValidDisplacement(grid, { q: 0, r: 0 })).toBe(true);
    });

    it('returns false for occupied hexes (different unit)', () => {
      let grid = createHexGrid({ radius: 2 });
      grid = placeUnit(grid, { q: 0, r: 0 }, 'unit-a');
      expect(isValidDisplacement(grid, { q: 0, r: 0 }, 'unit-b')).toBe(false);
    });

    it('returns true when the occupying unit is the one being displaced', () => {
      let grid = createHexGrid({ radius: 2 });
      grid = placeUnit(grid, { q: 0, r: 0 }, 'unit-a');
      expect(isValidDisplacement(grid, { q: 0, r: 0 }, 'unit-a')).toBe(true);
    });
  });

  describe('computeMissedChargeDisplacement', () => {
    it('picks one of the two side hexes 60° off the charge direction', () => {
      const grid = createHexGrid({ radius: 3 });
      const source: IHexCoordinate = { q: 0, r: 0 };
      // Deterministic d6: always returns 1 (picks the "left" side on tie).
      const fixedD6 = () => 1;
      const dest = computeMissedChargeDisplacement(
        grid,
        'attacker',
        source,
        Facing.North,
        fixedD6,
      );
      // Side hex should be at (facing+5)%6 or (facing+1)%6 from source.
      const left = translateHex(source, ((Facing.North + 5) % 6) as Facing);
      const right = translateHex(source, ((Facing.North + 1) % 6) as Facing);
      const isLeft = dest.q === left.q && dest.r === left.r;
      const isRight = dest.q === right.q && dest.r === right.r;
      expect(isLeft || isRight).toBe(true);
    });

    it('returns source hex when both side hexes are off-map', () => {
      const grid = createHexGrid({ radius: 0 });
      // Single-hex grid: only (0,0) exists. All neighbors off-map.
      const source: IHexCoordinate = { q: 0, r: 0 };
      const dest = computeMissedChargeDisplacement(
        grid,
        'attacker',
        source,
        Facing.North,
        () => 1,
      );
      expect(dest).toEqual(source);
    });

    it('prefers the higher-elevation side hex', () => {
      const grid = createHexGrid({ radius: 3 });
      const source: IHexCoordinate = { q: 0, r: 0 };
      // Mutate the right-side hex elevation directly (this is a unit test
      // helper — production would go through a setHexElevation API).
      const rightHex = translateHex(source, ((Facing.North + 1) % 6) as Facing);
      const rightKey = `${rightHex.q},${rightHex.r}`;
      const existing = grid.hexes.get(rightKey)!;
      grid.hexes.set(rightKey, { ...existing, elevation: 3 });

      const dest = computeMissedChargeDisplacement(
        grid,
        'attacker',
        source,
        Facing.North,
        () => 1, // RNG ignored when elevations differ
      );
      expect(dest).toEqual(rightHex);
    });
  });

  describe('computePushDisplacement', () => {
    it('returns the hex one step in the attacker facing from target', () => {
      const target: IHexCoordinate = { q: 2, r: -1 };
      const dest = computePushDisplacement(target, Facing.North);
      const expected = translateHex(target, Facing.North);
      expect(dest).toEqual(expected);
    });
  });
});
