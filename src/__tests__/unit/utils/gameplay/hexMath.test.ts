/**
 * Hex Math Tests
 * Tests for hex coordinate calculations.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';
import {
  axialToCube,
  cubeToAxial,
  coordToKey,
  keyToCoord,
  hexAdd,
  hexSubtract,
  hexScale,
  hexEquals,
  hexDistance,
  hexNeighbor,
  hexNeighbors,
  hexRing,
  hexSpiral,
  hexesInRange,
  hexLine,
  angleToFacing,
  facingToAngle,
} from '@/utils/gameplay/hexMath';
import { IHexCoordinate, Facing } from '@/types/gameplay';

describe('hexMath', () => {
  // =========================================================================
  // Coordinate Conversion
  // =========================================================================
  
  describe('axialToCube()', () => {
    it('should convert origin correctly', () => {
      const cube = axialToCube({ q: 0, r: 0 });
      expect(cube.x).toBe(0);
      expect(Object.is(cube.y, 0) || Object.is(cube.y, -0)).toBe(true);
      expect(cube.z).toBe(0);
      expect(cube.x + cube.y + cube.z).toBe(0);
    });

    it('should maintain cube constraint x + y + z = 0', () => {
      const testCases: IHexCoordinate[] = [
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: 1, r: -1 },
        { q: -3, r: 5 },
        { q: 10, r: -7 },
      ];
      
      for (const coord of testCases) {
        const cube = axialToCube(coord);
        expect(cube.x + cube.y + cube.z).toBe(0);
      }
    });
  });

  describe('cubeToAxial()', () => {
    it('should be inverse of axialToCube', () => {
      const testCases: IHexCoordinate[] = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -3, r: 5 },
      ];
      
      for (const coord of testCases) {
        const cube = axialToCube(coord);
        const back = cubeToAxial(cube);
        expect(back.q).toBe(coord.q);
        expect(back.r).toBe(coord.r);
      }
    });
  });

  describe('coordToKey() / keyToCoord()', () => {
    it('should convert coordinates to keys and back', () => {
      const coords: IHexCoordinate[] = [
        { q: 0, r: 0 },
        { q: 5, r: -3 },
        { q: -10, r: 10 },
      ];
      
      for (const coord of coords) {
        const key = coordToKey(coord);
        const back = keyToCoord(key);
        expect(back.q).toBe(coord.q);
        expect(back.r).toBe(coord.r);
      }
    });

    it('should create unique keys for different coordinates', () => {
      const key1 = coordToKey({ q: 1, r: 2 });
      const key2 = coordToKey({ q: 2, r: 1 });
      expect(key1).not.toBe(key2);
    });
  });

  // =========================================================================
  // Coordinate Arithmetic
  // =========================================================================

  describe('hexAdd()', () => {
    it('should add coordinates correctly', () => {
      expect(hexAdd({ q: 1, r: 2 }, { q: 3, r: 4 })).toEqual({ q: 4, r: 6 });
      expect(hexAdd({ q: -1, r: 2 }, { q: 1, r: -2 })).toEqual({ q: 0, r: 0 });
    });
  });

  describe('hexSubtract()', () => {
    it('should subtract coordinates correctly', () => {
      expect(hexSubtract({ q: 5, r: 3 }, { q: 2, r: 1 })).toEqual({ q: 3, r: 2 });
      expect(hexSubtract({ q: 0, r: 0 }, { q: 1, r: 1 })).toEqual({ q: -1, r: -1 });
    });
  });

  describe('hexScale()', () => {
    it('should scale coordinates correctly', () => {
      expect(hexScale({ q: 2, r: 3 }, 2)).toEqual({ q: 4, r: 6 });
      expect(hexScale({ q: 4, r: -2 }, 0.5)).toEqual({ q: 2, r: -1 });
    });
  });

  describe('hexEquals()', () => {
    it('should return true for equal coordinates', () => {
      expect(hexEquals({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
    });

    it('should return false for different coordinates', () => {
      expect(hexEquals({ q: 1, r: 2 }, { q: 2, r: 1 })).toBe(false);
    });
  });

  // =========================================================================
  // Distance Calculation
  // =========================================================================

  describe('hexDistance()', () => {
    it('should return 0 for same coordinate', () => {
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
      expect(hexDistance({ q: 5, r: -3 }, { q: 5, r: -3 })).toBe(0);
    });

    it('should return 1 for adjacent hexes', () => {
      const center: IHexCoordinate = { q: 0, r: 0 };
      expect(hexDistance(center, { q: 1, r: 0 })).toBe(1);
      expect(hexDistance(center, { q: 0, r: 1 })).toBe(1);
      expect(hexDistance(center, { q: -1, r: 0 })).toBe(1);
      expect(hexDistance(center, { q: 1, r: -1 })).toBe(1);
    });

    it('should calculate correct distances for farther hexes', () => {
      const center: IHexCoordinate = { q: 0, r: 0 };
      expect(hexDistance(center, { q: 3, r: 0 })).toBe(3);
      expect(hexDistance(center, { q: 2, r: 2 })).toBe(4);
      expect(hexDistance(center, { q: -5, r: 5 })).toBe(5);
    });

    it('should be symmetric', () => {
      const a: IHexCoordinate = { q: 3, r: -2 };
      const b: IHexCoordinate = { q: -1, r: 4 };
      expect(hexDistance(a, b)).toBe(hexDistance(b, a));
    });
  });

  // =========================================================================
  // Neighbor Calculation
  // =========================================================================

  describe('hexNeighbor()', () => {
    it('should return correct neighbor for each direction', () => {
      const center: IHexCoordinate = { q: 0, r: 0 };
      
      expect(hexNeighbor(center, Facing.North)).toEqual({ q: 0, r: -1 });
      expect(hexNeighbor(center, Facing.Northeast)).toEqual({ q: 1, r: -1 });
      expect(hexNeighbor(center, Facing.Southeast)).toEqual({ q: 1, r: 0 });
      expect(hexNeighbor(center, Facing.South)).toEqual({ q: 0, r: 1 });
      expect(hexNeighbor(center, Facing.Southwest)).toEqual({ q: -1, r: 1 });
      expect(hexNeighbor(center, Facing.Northwest)).toEqual({ q: -1, r: 0 });
    });
  });

  describe('hexNeighbors()', () => {
    it('should return exactly 6 neighbors', () => {
      const neighbors = hexNeighbors({ q: 0, r: 0 });
      expect(neighbors.length).toBe(6);
    });

    it('should return all neighbors at distance 1', () => {
      const center: IHexCoordinate = { q: 0, r: 0 };
      const neighbors = hexNeighbors(center);
      
      for (const neighbor of neighbors) {
        expect(hexDistance(center, neighbor)).toBe(1);
      }
    });
  });

  describe('hexRing()', () => {
    it('should return just center for radius 0', () => {
      const ring = hexRing({ q: 0, r: 0 }, 0);
      expect(ring.length).toBe(1);
      expect(ring[0]).toEqual({ q: 0, r: 0 });
    });

    it('should return 6 hexes for radius 1', () => {
      const ring = hexRing({ q: 0, r: 0 }, 1);
      expect(ring.length).toBe(6);
    });

    it('should return 12 hexes for radius 2', () => {
      const ring = hexRing({ q: 0, r: 0 }, 2);
      expect(ring.length).toBe(12);
    });

    it('should return 6*radius hexes for radius > 0', () => {
      expect(hexRing({ q: 0, r: 0 }, 3).length).toBe(18);
      expect(hexRing({ q: 0, r: 0 }, 4).length).toBe(24);
    });
  });

  describe('hexSpiral()', () => {
    it('should return correct count for radius', () => {
      // 1 + 6 + 12 + 18 = 37 for radius 3
      expect(hexSpiral({ q: 0, r: 0 }, 0).length).toBe(1);
      expect(hexSpiral({ q: 0, r: 0 }, 1).length).toBe(7);
      expect(hexSpiral({ q: 0, r: 0 }, 2).length).toBe(19);
      expect(hexSpiral({ q: 0, r: 0 }, 3).length).toBe(37);
    });
  });

  describe('hexesInRange()', () => {
    it('should return same count as hexSpiral', () => {
      for (let r = 0; r <= 4; r++) {
        const spiral = hexSpiral({ q: 0, r: 0 }, r);
        const inRange = hexesInRange({ q: 0, r: 0 }, r);
        expect(inRange.length).toBe(spiral.length);
      }
    });
  });

  // =========================================================================
  // Line Drawing
  // =========================================================================

  describe('hexLine()', () => {
    it('should return single hex for same start and end', () => {
      const line = hexLine({ q: 0, r: 0 }, { q: 0, r: 0 });
      expect(line.length).toBe(1);
    });

    it('should return correct number of hexes for straight line', () => {
      const line = hexLine({ q: 0, r: 0 }, { q: 3, r: 0 });
      expect(line.length).toBe(4); // 0, 1, 2, 3
    });

    it('should start and end at correct hexes', () => {
      const start: IHexCoordinate = { q: 0, r: 0 };
      const end: IHexCoordinate = { q: 2, r: 2 };
      const line = hexLine(start, end);
      
      expect(hexEquals(line[0], start)).toBe(true);
      expect(hexEquals(line[line.length - 1], end)).toBe(true);
    });
  });

  // =========================================================================
  // Angle Calculation
  // =========================================================================

  describe('facingToAngle()', () => {
    it('should convert facing to correct angle', () => {
      expect(facingToAngle(Facing.North)).toBe(0);
      expect(facingToAngle(Facing.Northeast)).toBe(60);
      expect(facingToAngle(Facing.Southeast)).toBe(120);
      expect(facingToAngle(Facing.South)).toBe(180);
      expect(facingToAngle(Facing.Southwest)).toBe(240);
      expect(facingToAngle(Facing.Northwest)).toBe(300);
    });
  });

  describe('angleToFacing()', () => {
    it('should convert angle to correct facing', () => {
      expect(angleToFacing(0)).toBe(Facing.North);
      expect(angleToFacing(60)).toBe(Facing.Northeast);
      expect(angleToFacing(120)).toBe(Facing.Southeast);
      expect(angleToFacing(180)).toBe(Facing.South);
      expect(angleToFacing(240)).toBe(Facing.Southwest);
      expect(angleToFacing(300)).toBe(Facing.Northwest);
    });

    it('should handle angles within range of each facing', () => {
      // North: -30 to +30 (or 330 to 30)
      expect(angleToFacing(15)).toBe(Facing.North);
      expect(angleToFacing(345)).toBe(Facing.North);
      
      // Northeast: 30 to 90
      expect(angleToFacing(45)).toBe(Facing.Northeast);
      expect(angleToFacing(75)).toBe(Facing.Northeast);
    });
  });
});
