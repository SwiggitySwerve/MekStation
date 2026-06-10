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
  type IMovementCapability,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { DEFAULT_ENVIRONMENTAL_CONDITIONS } from '@/utils/gameplay/environmentalModifiers';
import { createHexGrid, placeUnit } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  applyActiveMPBoosters,
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

  describe('applyActiveMPBoosters()', () => {
    it('doubles run MP when either MASC or Supercharger is active', () => {
      const cap = createMovementCapability(4, 0);

      expect(applyActiveMPBoosters(cap, true, false)).toMatchObject({
        walkMP: 4,
        runMP: 8,
        jumpMP: 0,
      });
      expect(applyActiveMPBoosters(cap, false, true)).toMatchObject({
        walkMP: 4,
        runMP: 8,
        jumpMP: 0,
      });
    });

    it('uses ceil(walk MP * 2.5) when MASC and Supercharger are both active', () => {
      expect(
        applyActiveMPBoosters(createMovementCapability(5, 0), true, true),
      ).toMatchObject({
        walkMP: 5,
        runMP: 13,
        jumpMP: 0,
      });
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

    // Audit 2026-06-09 C-1: heat reduces WALK MP only; run MP is re-derived
    // from the heat-adjusted walk (MegaMek BipedMek.getWalkMP `mp -= heat/5`,
    // Entity.getRunMP `ceil(walk * 1.5)`) — never subtracted from raw run MP.
    // Audit 2026-06-09 C-2: jump MP is heat-immune (Mek.getJumpMP has no heat
    // term). The old expectations (run 8-3=5, jump 4-3=1) pinned the wrong
    // pre-fix subtraction behavior.
    it('applies heat penalty to walk and re-derives run; jump is heat-immune', () => {
      const cap = { walkMP: 5, runMP: 8, jumpMP: 4 };

      // Heat 15 → penalty 3: walk 5→2, run = ceil(2 * 1.5) = 3 (NOT 8-3=5)
      expect(getMaxMP(cap, MovementType.Walk, 3)).toBe(2);
      expect(getMaxMP(cap, MovementType.Run, 3)).toBe(3);
      expect(getMaxMP(cap, MovementType.Jump, 3)).toBe(4);

      // No penalty when heat < 5
      expect(getMaxMP(cap, MovementType.Walk, 0)).toBe(5);
      expect(getMaxMP(cap, MovementType.Run, 0)).toBe(8);
    });

    // Audit 2026-06-09 C-1 worked example: walk 5 / run 8 / heat 10 →
    // penalty 2 → walk 3, run = ceil(3 * 1.5) = 5 (NOT 8 - 2 = 6).
    it('locks the C-1 worked example: walk 5/run 8/heat 10 → run 5', () => {
      const cap = { walkMP: 5, runMP: 8, jumpMP: 0 };

      expect(getMaxMP(cap, MovementType.Walk, 2)).toBe(3);
      expect(getMaxMP(cap, MovementType.Run, 2)).toBe(5);
      expect(getMaxMP(cap, MovementType.Evade, 2)).toBe(5);
    });

    // Audit 2026-06-09 C-1: sprint also derives from heat-adjusted walk
    // (MegaMek Mek.getSprintMP = getWalkMP(setting) * 2 without boosters).
    it('derives sprint MP from heat-adjusted walk', () => {
      const cap = { walkMP: 5, runMP: 8, jumpMP: 0 };

      // penalty 2 → walk 3 → sprint 3 * 2 = 6 (NOT 10 - 2 = 8)
      expect(getMaxMP(cap, MovementType.Sprint, 2)).toBe(6);
    });

    // Audit 2026-06-09 C-1: MASC/Supercharger-boosted capabilities keep their
    // booster formula family under heat — MegaMek computes boosted run MP from
    // the heat-adjusted walk (Mek.getRunMP → MPBoosters.calculateRunMP(walk)).
    it('preserves MP-booster derivation under heat', () => {
      // Single active booster: run = walk * 2
      const boosted = { walkMP: 5, runMP: 10, jumpMP: 0 };
      // penalty 2 → walk 3 → run 3 * 2 = 6 (NOT 10 - 2 = 8)
      expect(getMaxMP(boosted, MovementType.Run, 2)).toBe(6);
    });

    it('clamps effective walk/run MP at 0 (never negative); jump unaffected', () => {
      const cap = { walkMP: 3, runMP: 5, jumpMP: 2 };

      // Huge penalty → walk/run 0, not negative.
      expect(getMaxMP(cap, MovementType.Walk, 10)).toBe(0);
      expect(getMaxMP(cap, MovementType.Run, 10)).toBe(0);
      // Audit 2026-06-09 C-2: jump MP is heat-immune (was pinned to 0 pre-fix).
      expect(getMaxMP(cap, MovementType.Jump, 10)).toBe(2);
    });

    it('legacy callers (no heatPenalty arg) are unaffected', () => {
      const cap = createMovementCapability(6, 4);
      // Default heatPenalty = 0 → raw MP values
      expect(getMaxMP(cap, MovementType.Walk)).toBe(6);
      expect(getMaxMP(cap, MovementType.Run)).toBe(9);
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

    it('should subtract Partial Wing bonus from jump heat before the floor', () => {
      expect(
        calculateMovementHeat(MovementType.Jump, 5, {
          partialWingJumpBonus: 2,
        }),
      ).toBe(3);
      expect(
        calculateMovementHeat(MovementType.Jump, 8, {
          partialWingJumpBonus: 2,
        }),
      ).toBe(6);
    });

    // Audit 2026-06-09 B-3: the old union 3rd parameter forced callers to
    // choose between the motive-mode gate and the Partial Wing bonus. Both
    // must apply from a single call so projection and engine agree.
    it('applies the motive-mode gate and the Partial Wing bonus together', () => {
      expect(
        calculateMovementHeat(MovementType.Jump, 8, {
          movementMode: 'tracked',
          partialWingJumpBonus: 2,
        }),
      ).toBe(0);
      expect(
        calculateMovementHeat(MovementType.Jump, 8, {
          movementHeatProfile: 'mek',
          partialWingJumpBonus: 2,
        }),
      ).toBe(6);
      expect(
        calculateMovementHeat(MovementType.Walk, 4, { movementMode: 'hover' }),
      ).toBe(0);
      expect(
        calculateMovementHeat(MovementType.Walk, 4, {
          movementHeatProfile: 'none',
        }),
      ).toBe(0);
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
        { q: 0, r: -2 },
        Facing.North,
        MovementType.Walk,
        capability,
      );

      expect(result.valid).toBe(true);
      expect(result.mpCost).toBe(2);
    });

    it('should reject voluntary movement for stuck units', () => {
      const result = validateMovement(
        grid,
        { ...position, isStuck: true },
        { q: 0, r: -1 },
        Facing.North,
        MovementType.Walk,
        capability,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('stuck');
      expect(result.mpCost).toBe(0);
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

    // Task 7.3 (wire-heat-generation-and-effects):
    // validateMovement with currentHeat=15 (penalty 3) + walkMP=5
    // caps effective walkMP at 2 — distance 3 must fail.
    it('rejects walk distance > effective MP when heat penalty applies', () => {
      const hotGrid = createHexGrid({ radius: 5 });
      const cap = { walkMP: 5, runMP: 8, jumpMP: 0 };
      const pos: IUnitPosition = {
        unitId: 'hot',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      // Distance 3 should fail at heat 15 (effective walk=2)
      const fail = validateMovement(
        hotGrid,
        pos,
        { q: 3, r: 0 },
        Facing.North,
        MovementType.Walk,
        cap,
        15, // currentHeat
      );
      expect(fail.valid).toBe(false);
      expect(fail.error).toContain('max range');
      // Error should mention the reduced max, not the raw max
      expect(fail.error).toContain('2');

      // Straight-ahead distance 2 should still succeed.
      const ok = validateMovement(
        hotGrid,
        pos,
        { q: 0, r: -2 },
        Facing.North,
        MovementType.Walk,
        cap,
        15,
      );
      expect(ok.valid).toBe(true);
    });

    it('accepts walk distance when heat penalty is zero', () => {
      const cleanGrid = createHexGrid({ radius: 5 });
      const cap = { walkMP: 5, runMP: 8, jumpMP: 0 };
      const pos: IUnitPosition = {
        unitId: 'cold',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      const ok = validateMovement(
        cleanGrid,
        pos,
        { q: 0, r: -4 },
        Facing.North,
        MovementType.Walk,
        cap,
        0,
      );
      expect(ok.valid).toBe(true);
    });

    // Audit 2026-06-09 C-2: jump MP is heat-immune (MegaMek Mek.getJumpMP has
    // no heat term) — a heat-15 unit with jump 4 still validates a 3-hex jump.
    it('validates jump distance against heat-immune jump MP', () => {
      const hotGrid = createHexGrid({ radius: 5 });
      const cap = { walkMP: 5, runMP: 8, jumpMP: 4 };
      const pos: IUnitPosition = {
        unitId: 'hot-jumper',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      const ok = validateMovement(
        hotGrid,
        pos,
        { q: 3, r: 0 },
        Facing.North,
        MovementType.Jump,
        cap,
        15, // currentHeat → penalty 3, must NOT reduce jump MP
      );
      expect(ok.valid).toBe(true);
    });

    // Audit 2026-06-09 C-2: the environmental jump branch must not subtract
    // the heat penalty either — gravity and wind are the only jump modifiers.
    it('keeps jump MP heat-immune on the environmental-conditions branch', () => {
      const hotGrid = createHexGrid({ radius: 5 });
      const cap = { walkMP: 5, runMP: 8, jumpMP: 4 };
      const pos: IUnitPosition = {
        unitId: 'hot-jumper-env',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      const ok = validateMovement(
        hotGrid,
        pos,
        { q: 3, r: 0 },
        Facing.North,
        MovementType.Jump,
        cap,
        15, // currentHeat → penalty 3, must NOT reduce jump MP
        DEFAULT_ENVIRONMENTAL_CONDITIONS, // gravity 1.0, wind none
      );
      expect(ok.valid).toBe(true);
    });

    // Audit 2026-06-09 B-3: validateMovement used to forward only the
    // Partial Wing bonus to calculateMovementHeat, dropping the motive-mode
    // gate — hover/tracked units were charged Mek walk heat. MegaMek's base
    // Entity movement heat is 0; only Meks override it.
    it('generates no Mek movement heat for non-Mek motive modes', () => {
      const hoverCap: IMovementCapability = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'hover',
      };
      const result = validateMovement(
        grid,
        position,
        { q: 0, r: -2 },
        Facing.North,
        MovementType.Walk,
        hoverCap,
      );

      expect(result.valid).toBe(true);
      expect(result.heatGenerated).toBe(0);
    });

    // Regression pin: the Partial Wing jump-heat reduction must survive the
    // options-object refactor (jump 5 − bonus 2 → max(3, 3) = 3 heat).
    it('keeps the Partial Wing jump-heat reduction for Mek jumps', () => {
      const wingCap: IMovementCapability = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 6,
        partialWingJumpBonus: 2,
      };
      const result = validateMovement(
        grid,
        position,
        { q: 0, r: -5 },
        Facing.North,
        MovementType.Jump,
        wingCap,
      );

      expect(result.valid).toBe(true);
      expect(result.heatGenerated).toBe(3);
    });

    // Audit 2026-06-09 B-4: validateMovement used to path with the plain
    // walk/run mapping while the reachability projection honored
    // capability.movementMode — hover units crossing depth-1 water were
    // charged the Mek water surcharge and falsely rejected destinations the
    // canonical projection accepts.
    it('paths with capability.movementMode so motive costs match the projection', () => {
      let waterGrid = createHexGrid({ radius: 3 });
      waterGrid = setHexTerrain(waterGrid, { q: 0, r: -1 }, TerrainType.Water);
      const hoverCap: IMovementCapability = {
        walkMP: 1,
        runMP: 2,
        jumpMP: 0,
        movementMode: 'hover',
      };
      const pos: IUnitPosition = {
        unitId: 'hover',
        coord: { q: 0, r: 0 },
        facing: Facing.North,
        prone: false,
      };

      const result = validateMovement(
        waterGrid,
        pos,
        { q: 0, r: -1 },
        Facing.North,
        MovementType.Walk,
        hoverCap,
      );

      // Hover pays no water-depth surcharge: 1 MP, matching the projection.
      expect(result.valid).toBe(true);
      expect(result.mpCost).toBe(1);
      expect(result.heatGenerated).toBe(0);
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
      // Should include straight-ahead hexes at movement point costs 0, 1, and 2.
      expect(destinations.some((d) => d.q === 0 && d.r === 0)).toBe(true); // Stay
      expect(destinations.some((d) => d.q === 0 && d.r === -1)).toBe(true); // Cost 1
      expect(destinations.some((d) => d.q === 0 && d.r === -2)).toBe(true); // Cost 2
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

    it('should add 1 MP for water with walk', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Water);
      const cost = getHexMovementCost(grid, { q: 0, r: 0 }, 'walk');
      expect(cost).toBe(2);
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

    it('should add MP for elevation change going down', () => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHexTerrain(grid, { q: 0, r: 0 }, TerrainType.Clear, 2);
      grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
      const cost = getHexMovementCost(grid, { q: 1, r: 0 }, 'walk', {
        q: 0,
        r: 0,
      });
      expect(cost).toBe(3);
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
