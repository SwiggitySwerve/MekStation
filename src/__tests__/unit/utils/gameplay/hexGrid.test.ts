/**
 * Hex Grid Tests
 * Tests for hex grid creation and management.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';
import {
  createHex,
  createHexGrid,
  createRectangularGrid,
  getHex,
  isInBounds,
  isOccupied,
  getOccupant,
  getHexesInRange,
  getNeighbors,
  getEmptyHexes,
  getOccupiedHexes,
  findUnitHex,
  placeUnit,
  removeUnit,
  moveUnit,
  setTerrain,
  getHexCount,
  getOccupiedCount,
  getEmptyCount,
} from '@/utils/gameplay/hexGrid';
import { IHexCoordinate } from '@/types/gameplay';

describe('hexGrid', () => {
  // =========================================================================
  // Grid Creation
  // =========================================================================

  describe('createHex()', () => {
    it('should create a hex with default values', () => {
      const coord: IHexCoordinate = { q: 1, r: 2 };
      const hex = createHex(coord);
      
      expect(hex.coord).toEqual(coord);
      expect(hex.occupantId).toBeNull();
      expect(hex.terrain).toBe('clear');
      expect(hex.elevation).toBe(0);
    });
  });

  describe('createHexGrid()', () => {
    it('should create a grid with correct number of hexes', () => {
      // Hex count formula: 1 + 3*n*(n+1) for radius n
      expect(createHexGrid({ radius: 0 }).hexes.size).toBe(1);
      expect(createHexGrid({ radius: 1 }).hexes.size).toBe(7);
      expect(createHexGrid({ radius: 2 }).hexes.size).toBe(19);
      expect(createHexGrid({ radius: 3 }).hexes.size).toBe(37);
    });

    it('should contain the center hex', () => {
      const grid = createHexGrid({ radius: 3 });
      const centerHex = getHex(grid, { q: 0, r: 0 });
      expect(centerHex).toBeDefined();
    });

    it('should contain hexes at the edge', () => {
      const grid = createHexGrid({ radius: 2 });
      expect(isInBounds(grid, { q: 2, r: 0 })).toBe(true);
      expect(isInBounds(grid, { q: 0, r: 2 })).toBe(true);
      expect(isInBounds(grid, { q: -2, r: 0 })).toBe(true);
    });

    it('should not contain hexes outside the radius', () => {
      const grid = createHexGrid({ radius: 2 });
      expect(isInBounds(grid, { q: 3, r: 0 })).toBe(false);
      expect(isInBounds(grid, { q: 2, r: 2 })).toBe(false);
    });
  });

  describe('createRectangularGrid()', () => {
    it('should create a rectangular grid', () => {
      const grid = createRectangularGrid(5, 4);
      expect(grid.hexes.size).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Grid Queries
  // =========================================================================

  describe('getHex()', () => {
    it('should return hex at valid coordinate', () => {
      const grid = createHexGrid({ radius: 2 });
      const hex = getHex(grid, { q: 1, r: 0 });
      expect(hex).toBeDefined();
      expect(hex?.coord).toEqual({ q: 1, r: 0 });
    });

    it('should return undefined for coordinate outside grid', () => {
      const grid = createHexGrid({ radius: 2 });
      const hex = getHex(grid, { q: 10, r: 10 });
      expect(hex).toBeUndefined();
    });
  });

  describe('isInBounds()', () => {
    it('should return true for hexes in grid', () => {
      const grid = createHexGrid({ radius: 2 });
      expect(isInBounds(grid, { q: 0, r: 0 })).toBe(true);
      expect(isInBounds(grid, { q: 1, r: 1 })).toBe(true);
    });

    it('should return false for hexes outside grid', () => {
      const grid = createHexGrid({ radius: 2 });
      expect(isInBounds(grid, { q: 5, r: 5 })).toBe(false);
    });
  });

  describe('isOccupied() / getOccupant()', () => {
    it('should return false/null for empty hex', () => {
      const grid = createHexGrid({ radius: 2 });
      const coord: IHexCoordinate = { q: 0, r: 0 };
      
      expect(isOccupied(grid, coord)).toBe(false);
      expect(getOccupant(grid, coord)).toBeNull();
    });

    it('should return true/unitId for occupied hex', () => {
      let grid = createHexGrid({ radius: 2 });
      const coord: IHexCoordinate = { q: 0, r: 0 };
      
      grid = placeUnit(grid, coord, 'unit-1');
      
      expect(isOccupied(grid, coord)).toBe(true);
      expect(getOccupant(grid, coord)).toBe('unit-1');
    });
  });

  describe('getHexesInRange()', () => {
    it('should return hexes within range', () => {
      const grid = createHexGrid({ radius: 5 });
      const hexes = getHexesInRange(grid, { q: 0, r: 0 }, 2);
      
      expect(hexes.length).toBe(19); // 1 + 6 + 12
    });

    it('should not include hexes outside grid bounds', () => {
      const grid = createHexGrid({ radius: 2 });
      const hexes = getHexesInRange(grid, { q: 2, r: 0 }, 3);
      
      // Should be limited by grid boundary
      expect(hexes.length).toBeLessThan(37);
    });
  });

  describe('getNeighbors()', () => {
    it('should return 6 neighbors for center hex', () => {
      const grid = createHexGrid({ radius: 3 });
      const neighbors = getNeighbors(grid, { q: 0, r: 0 });
      expect(neighbors.length).toBe(6);
    });

    it('should return fewer neighbors for edge hex', () => {
      const grid = createHexGrid({ radius: 2 });
      const neighbors = getNeighbors(grid, { q: 2, r: 0 });
      expect(neighbors.length).toBeLessThan(6);
    });
  });

  // =========================================================================
  // Grid Mutations
  // =========================================================================

  describe('placeUnit()', () => {
    it('should place a unit on an empty hex', () => {
      let grid = createHexGrid({ radius: 2 });
      const coord: IHexCoordinate = { q: 0, r: 0 };
      
      grid = placeUnit(grid, coord, 'unit-1');
      
      expect(getOccupant(grid, coord)).toBe('unit-1');
    });

    it('should throw when placing on occupied hex', () => {
      let grid = createHexGrid({ radius: 2 });
      const coord: IHexCoordinate = { q: 0, r: 0 };
      
      grid = placeUnit(grid, coord, 'unit-1');
      
      expect(() => placeUnit(grid, coord, 'unit-2')).toThrow();
    });

    it('should throw when placing outside grid', () => {
      const grid = createHexGrid({ radius: 2 });
      
      expect(() => placeUnit(grid, { q: 10, r: 10 }, 'unit-1')).toThrow();
    });

    it('should return a new grid (immutable)', () => {
      const grid1 = createHexGrid({ radius: 2 });
      const grid2 = placeUnit(grid1, { q: 0, r: 0 }, 'unit-1');
      
      expect(grid1).not.toBe(grid2);
      expect(getOccupant(grid1, { q: 0, r: 0 })).toBeNull();
      expect(getOccupant(grid2, { q: 0, r: 0 })).toBe('unit-1');
    });
  });

  describe('removeUnit()', () => {
    it('should remove a unit from a hex', () => {
      let grid = createHexGrid({ radius: 2 });
      const coord: IHexCoordinate = { q: 0, r: 0 };
      
      grid = placeUnit(grid, coord, 'unit-1');
      expect(getOccupant(grid, coord)).toBe('unit-1');
      
      grid = removeUnit(grid, coord);
      expect(getOccupant(grid, coord)).toBeNull();
    });
  });

  describe('moveUnit()', () => {
    it('should move a unit from one hex to another', () => {
      let grid = createHexGrid({ radius: 2 });
      const from: IHexCoordinate = { q: 0, r: 0 };
      const to: IHexCoordinate = { q: 1, r: 0 };
      
      grid = placeUnit(grid, from, 'unit-1');
      grid = moveUnit(grid, from, to);
      
      expect(getOccupant(grid, from)).toBeNull();
      expect(getOccupant(grid, to)).toBe('unit-1');
    });

    it('should throw when moving from empty hex', () => {
      const grid = createHexGrid({ radius: 2 });
      
      expect(() => moveUnit(grid, { q: 0, r: 0 }, { q: 1, r: 0 })).toThrow();
    });

    it('should throw when moving to occupied hex', () => {
      let grid = createHexGrid({ radius: 2 });
      
      grid = placeUnit(grid, { q: 0, r: 0 }, 'unit-1');
      grid = placeUnit(grid, { q: 1, r: 0 }, 'unit-2');
      
      expect(() => moveUnit(grid, { q: 0, r: 0 }, { q: 1, r: 0 })).toThrow();
    });
  });

  describe('setTerrain()', () => {
    it('should update terrain type', () => {
      let grid = createHexGrid({ radius: 2 });
      const coord: IHexCoordinate = { q: 0, r: 0 };
      
      grid = setTerrain(grid, coord, 'woods');
      
      const hex = getHex(grid, coord);
      expect(hex?.terrain).toBe('woods');
    });
  });

  // =========================================================================
  // Grid Statistics
  // =========================================================================

  describe('getHexCount()', () => {
    it('should return total hex count', () => {
      const grid = createHexGrid({ radius: 2 });
      expect(getHexCount(grid)).toBe(19);
    });
  });

  describe('getOccupiedCount() / getEmptyCount()', () => {
    it('should count occupied and empty hexes', () => {
      let grid = createHexGrid({ radius: 2 });
      
      expect(getEmptyCount(grid)).toBe(19);
      expect(getOccupiedCount(grid)).toBe(0);
      
      grid = placeUnit(grid, { q: 0, r: 0 }, 'unit-1');
      grid = placeUnit(grid, { q: 1, r: 0 }, 'unit-2');
      
      expect(getEmptyCount(grid)).toBe(17);
      expect(getOccupiedCount(grid)).toBe(2);
    });
  });

  describe('findUnitHex()', () => {
    it('should find hex where unit is located', () => {
      let grid = createHexGrid({ radius: 2 });
      grid = placeUnit(grid, { q: 1, r: -1 }, 'unit-1');
      
      const hex = findUnitHex(grid, 'unit-1');
      expect(hex).toBeDefined();
      expect(hex?.coord).toEqual({ q: 1, r: -1 });
    });

    it('should return undefined for non-existent unit', () => {
      const grid = createHexGrid({ radius: 2 });
      const hex = findUnitHex(grid, 'non-existent');
      expect(hex).toBeUndefined();
    });
  });

  describe('getEmptyHexes() / getOccupiedHexes()', () => {
    it('should return correct hex arrays', () => {
      let grid = createHexGrid({ radius: 1 });
      
      expect(getEmptyHexes(grid).length).toBe(7);
      expect(getOccupiedHexes(grid).length).toBe(0);
      
      grid = placeUnit(grid, { q: 0, r: 0 }, 'unit-1');
      
      expect(getEmptyHexes(grid).length).toBe(6);
      expect(getOccupiedHexes(grid).length).toBe(1);
    });
  });
});
