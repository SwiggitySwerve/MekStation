/**
 * Movement Tests
 * Tests for movement calculations.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import {
  IUnitPosition,
  MovementType,
  Facing,
  IHexGrid,
  IHexCoordinate,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createHexGrid, placeUnit } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  calculateRunMP,
  createMovementCapability,
  getMaxMP,
  calculateMovementHeat,
  calculateTMM,
  validateMovement,
  getValidDestinations,
  calculateAttackerMovementModifier,
  findPath,
  getHexMovementCost,
} from '@/utils/gameplay/movement';

function setHexTerrain(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: string,
  elevation: number = 0,
): IHexGrid {
  const key = coordToKey(coord);
  const existingHex = grid.hexes.get(key);
  if (!existingHex) {
    throw new Error(`Hex at ${key} does not exist in grid`);
  }

  const newHexes = new Map(grid.hexes);
  newHexes.set(key, { ...existingHex, terrain, elevation });

  return {
    ...grid,
    hexes: newHexes,
  };
}

describe('movement', () => {
  // =========================================================================
  // Movement Point Calculations
  // =========================================================================

  describe('calculateRunMP()', () => {
    it('should calculate run MP as ceil(walk * 1.5)', () => {
      expect(calculateRunMP(4)).toBe(6); // 4 * 1.5 = 6
      expect(calculateRunMP(5)).toBe(8); // 5 * 1.5 = 7.5 -> 8
      expect(calculateRunMP(6)).toBe(9); // 6 * 1.5 = 9
      expect(calculateRunMP(3)).toBe(5); // 3 * 1.5 = 4.5 -> 5
    });
  });

  describe('createMovementCapability()', () => {
    it('should create capability with calculated run MP', () => {
      const cap = createMovementCapability(4, 4);
      expect(cap.walkMP).toBe(4);
      expect(cap.runMP).toBe(6);
      expect(cap.jumpMP).toBe(4);
    });

    it('should default jump MP to 0', () => {
      const cap = createMovementCapability(5);
      expect(cap.jumpMP).toBe(0);
    });
  });

  describe('getMaxMP()', () => {
    it('should return correct MP for movement type', () => {
      const cap = createMovementCapability(4, 4);

      expect(getMaxMP(cap, MovementType.Stationary)).toBe(0);
      expect(getMaxMP(cap, MovementType.Walk)).toBe(4);
      expect(getMaxMP(cap, MovementType.Run)).toBe(6);
      expect(getMaxMP(cap, MovementType.Jump)).toBe(4);
    });
  });

  // =========================================================================
  // Heat Generation
  // =========================================================================

  describe('calculateMovementHeat()', () => {
    it('should return 0 for stationary', () => {
      expect(calculateMovementHeat(MovementType.Stationary, 0)).toBe(0);
    });

    it('should return 1 for walking', () => {
      expect(calculateMovementHeat(MovementType.Walk, 4)).toBe(1);
    });

    it('should return 2 for running', () => {
      expect(calculateMovementHeat(MovementType.Run, 6)).toBe(2);
    });

    it('should return max(hexes, 3) for jumping', () => {
      expect(calculateMovementHeat(MovementType.Jump, 2)).toBe(3);
      expect(calculateMovementHeat(MovementType.Jump, 4)).toBe(4);
      expect(calculateMovementHeat(MovementType.Jump, 6)).toBe(6);
    });
  });

  // =========================================================================
  // Target Movement Modifier (TMM)
  // =========================================================================

  describe('calculateTMM()', () => {
    it('should return 0 for stationary', () => {
      expect(calculateTMM(MovementType.Stationary, 0)).toBe(0);
    });

    it('should return minimum 1 for any movement', () => {
      expect(calculateTMM(MovementType.Walk, 1)).toBe(1);
      expect(calculateTMM(MovementType.Walk, 2)).toBe(1);
    });

    it('should calculate TMM as ceil(hexes / 5)', () => {
      expect(calculateTMM(MovementType.Walk, 5)).toBe(1);
      expect(calculateTMM(MovementType.Walk, 6)).toBe(2);
      expect(calculateTMM(MovementType.Walk, 10)).toBe(2);
      expect(calculateTMM(MovementType.Walk, 11)).toBe(3);
    });

    it('should add +1 for jumping', () => {
      expect(calculateTMM(MovementType.Jump, 3)).toBe(2); // 1 + 1
      expect(calculateTMM(MovementType.Jump, 6)).toBe(3); // 2 + 1
    });
  });

  // =========================================================================
  // Movement Validation
  // =========================================================================

  describe('validateMovement()', () => {
    const grid = createHexGrid({ radius: 5 });
    const capability = createMovementCapability(4, 4);
    const position: IUnitPosition = {
      unitId: 'test',
      coord: { q: 0, r: 0 },
      facing: Facing.North,
      prone: false,
    };

    it('should validate movement within range', () => {
      const result = validateMovement(
        grid,
        position,
        { q: 2, r: 0 },
        Facing.North,
        MovementType.Walk,
        capability,
      );

      expect(result.valid).toBe(true);
      expect(result.mpCost).toBe(2);
    });

    it('should reject movement outside grid bounds', () => {
      const result = validateMovement(
        grid,
        position,
        { q: 10, r: 0 },
        Facing.North,
        MovementType.Walk,
        capability,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside map bounds');
    });

    it('should reject movement beyond MP range', () => {
      const result = validateMovement(
        grid,
        position,
        { q: 5, r: 0 },
        Facing.North,
        MovementType.Walk,
        capability,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('max range');
    });

    it('should reject jump movement without jump jets', () => {
      const noJumpCap = createMovementCapability(4, 0);
      const result = validateMovement(
        grid,
        position,
        { q: 2, r: 0 },
        Facing.North,
        MovementType.Jump,
        noJumpCap,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot jump');
    });

    it('should reject movement to occupied hex', () => {
      const gridWithUnit = placeUnit(grid, { q: 2, r: 0 }, 'blocker');
      const result = validateMovement(
        gridWithUnit,
        position,
        { q: 2, r: 0 },
        Facing.North,
        MovementType.Walk,
        capability,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('occupied');
    });
  });

  // =========================================================================
  // Valid Destinations
  // =========================================================================

  describe('getValidDestinations()', () => {
    it('should return destinations within walk range', () => {
      const grid = createHexGrid({ radius: 5 });
      const capability = createMovementCapability(2, 0);
      const position: IUnitPosition = {
        unitId: 'test',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      const destinations = getValidDestinations(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      expect(destinations.length).toBeGreaterThan(0);
      // Should include hexes at distance 0, 1, and 2
      expect(destinations.some((d) => d.q === 0 && d.r === 0)).toBe(true); // Stay
      expect(destinations.some((d) => d.q === 1 && d.r === 0)).toBe(true); // Distance 1
      expect(destinations.some((d) => d.q === 2 && d.r === 0)).toBe(true); // Distance 2
    });

    it('should return only current position for stationary', () => {
      const grid = createHexGrid({ radius: 5 });
      const capability = createMovementCapability(4, 4);
      const position: IUnitPosition = {
        unitId: 'test',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      const destinations = getValidDestinations(
        grid,
        position,
        MovementType.Stationary,
        capability,
      );

      expect(destinations.length).toBe(1);
      expect(destinations[0]).toEqual({ q: 0, r: 0 });
    });
  });

  // =========================================================================
  // Terrain Movement Cost
  // =========================================================================

  describe('getHexMovementCost()', () => {
    it('should return 1 for clear terrain', () => {
      const grid = createHexGrid({ radius: 3 });
      const cost = getHexMovementCost(grid, { q: 0, r: 0 }, 'walk');
      expect(cost).toBe(1);
    });

    it('should return 2 for light woods with walk', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.LightWoods);
      const cost = getHexMovementCost(grid, { q: 0, r: 0 }, 'walk');
      expect(cost).toBe(2);
    });

    it('should return 3 for heavy woods with walk', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.HeavyWoods);
      const cost = getHexMovementCost(grid, { q: 0, r: 0 }, 'walk');
      expect(cost).toBe(3);
    });

    it('should return 1 for heavy woods with jump', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.HeavyWoods);
      const cost = getHexMovementCost(grid, { q: 0, r: 0 }, 'jump');
      expect(cost).toBe(1);
    });

    it('should return Infinity for water with walk', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Water);
      const cost = getHexMovementCost(grid, { q: 0, r: 0 }, 'walk');
      expect(cost).toBe(Infinity);
    });

    it('should add 1 MP for elevation change going up', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
      grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.Clear, 1);
      const cost = getHexMovementCost(grid, { q: 1, r: 0 }, 'walk', {
        q: 0,
        r: 0,
      });
      expect(cost).toBe(2);
    });

    it('should add 2 MP for two level elevation change', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
      grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.Clear, 2);
      const cost = getHexMovementCost(grid, { q: 1, r: 0 }, 'walk', {
        q: 0,
        r: 0,
      });
      expect(cost).toBe(3);
    });

    it('should return Infinity for >2 level elevation change with walk', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
      grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.Clear, 3);
      const cost = getHexMovementCost(grid, { q: 1, r: 0 }, 'walk', {
        q: 0,
        r: 0,
      });
      expect(cost).toBe(Infinity);
    });

    it('should not add cost for elevation change going down', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Clear, 2);
      grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
      const cost = getHexMovementCost(grid, { q: 1, r: 0 }, 'walk', {
        q: 0,
        r: 0,
      });
      expect(cost).toBe(1);
    });

    it('should combine terrain and elevation costs', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
      grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 1);
      const cost = getHexMovementCost(grid, { q: 1, r: 0 }, 'walk', {
        q: 0,
        r: 0,
      });
      expect(cost).toBe(3);
    });

    it('should return Infinity for invalid hex', () => {
      const grid = createHexGrid({ radius: 3 });
      const cost = getHexMovementCost(grid, { q: 100, r: 100 }, 'walk');
      expect(cost).toBe(Infinity);
    });
  });

  // =========================================================================
  // Attacker Movement Modifier
  // =========================================================================

  describe('calculateAttackerMovementModifier()', () => {
    it('should return correct modifiers', () => {
      expect(calculateAttackerMovementModifier(MovementType.Stationary)).toBe(
        0,
      );
      expect(calculateAttackerMovementModifier(MovementType.Walk)).toBe(1);
      expect(calculateAttackerMovementModifier(MovementType.Run)).toBe(2);
      expect(calculateAttackerMovementModifier(MovementType.Jump)).toBe(3);
    });
  });

  // =========================================================================
  // Pathfinding
  // =========================================================================

  describe('findPath()', () => {
    it('should find path to adjacent hex', () => {
      const grid = createHexGrid({ radius: 3 });
      const path = findPath(grid, { q: 0, r: 0 }, { q: 1, r: 0 });

      expect(path).not.toBeNull();
      expect(path?.length).toBe(2);
    });

    it('should return single hex for same start and end', () => {
      const grid = createHexGrid({ radius: 3 });
      const path = findPath(grid, { q: 0, r: 0 }, { q: 0, r: 0 });

      expect(path).not.toBeNull();
      expect(path?.length).toBe(1);
    });

    it('should find longer paths', () => {
      const grid = createHexGrid({ radius: 5 });
      const path = findPath(grid, { q: 0, r: 0 }, { q: 3, r: 0 });

      expect(path).not.toBeNull();
      expect(path!.length).toBe(4);
    });

    it('should return null for path outside grid', () => {
      const grid = createHexGrid({ radius: 2 });
      const path = findPath(grid, { q: 0, r: 0 }, { q: 10, r: 0 });

      expect(path).toBeNull();
    });
  });
});
