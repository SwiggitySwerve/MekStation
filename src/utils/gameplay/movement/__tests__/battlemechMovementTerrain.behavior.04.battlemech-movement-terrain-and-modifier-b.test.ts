import { describe, expect, it } from '@jest/globals';

import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  UnitMovementType,
} from './battlemechMovementTerrain.test-helpers';

import {
  Facing,
  MovementType,
  TERRAIN_PROPERTIES,
  TerrainType,
  assertMovementStepConservation,
  calculateAttackerMovementModifier,
  calculateManeuveringAceBipedLateralShiftCost,
  calculateManeuveringAceQuadLateralStepCost,
  calculateMovementHeat,
  calculateTMM,
  canStand,
  coordToKey,
  createHexGrid,
  decomposeMovementSteps,
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
  findPath,
  getHexMovementCost,
  getStandingCost,
  getValidDestinations,
  maneuveringAceLateralShiftDirection,
  positionAtOrigin,
  setHex,
  standardMove,
  terrainStringFromFeatures,
  unitAtOrigin,
  validateMovement,
} from './battlemechMovementTerrain.test-helpers';

describe('BattleMech movement, terrain, and modifier behavior', () => {
  it('rejects impassable elevation while preserving jump landings', () => {
    let waterGrid = createHexGrid({ radius: 3 });
    waterGrid = setHex(
      waterGrid,
      { q: 0, r: -1 },
      { terrain: TerrainType.Water },
    );

    const jumpIntoWater = validateMovement(
      waterGrid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Jump,
      standardMove,
    );
    expect(jumpIntoWater.valid).toBe(true);
    expect(jumpIntoWater.mpCost).toBe(1);
    expect(jumpIntoWater.heatGenerated).toBe(3);

    let cliffGrid = createHexGrid({ radius: 3 });
    cliffGrid = setHex(cliffGrid, { q: 0, r: -1 }, { elevation: 3 });
    const climb = validateMovement(
      cliffGrid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      standardMove,
    );
    expect(climb.valid).toBe(false);
    expect(climb.error).toContain(
      'Elevation change of 3 exceeds ground movement limit',
    );

    const jumpOntoCliff = validateMovement(
      cliffGrid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Jump,
      standardMove,
    );
    expect(jumpOntoCliff.valid).toBe(true);
  });

  it('applies heat-reduced MP to terrain cost, not just destination distance', () => {
    const hotCap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.LightWoods });

    const stillPossible = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      hotCap,
      15,
    );
    expect(stillPossible.valid).toBe(true);
    expect(stillPossible.mpCost).toBe(2);

    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.HeavyWoods });
    const tooCostly = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      hotCap,
      15,
    );
    expect(tooCostly.valid).toBe(false);
    expect(tooCostly.error).toContain('max range for walk is 2');
  });

  it('keeps valid destination previews from advertising impassable or over-budget terrain', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.LightWoods });
    grid = setHex(grid, { q: 1, r: 0 }, { elevation: 3 });
    grid = setHex(grid, { q: -1, r: 1 }, { terrain: TerrainType.HeavyWoods });

    const destinations = getValidDestinations(
      grid,
      positionAtOrigin(),
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );

    expect(destinations).toContainEqual({ q: 0, r: -1 });
    expect(destinations).not.toContainEqual({ q: 1, r: 0 });
    expect(destinations).not.toContainEqual({ q: -1, r: 1 });
  });

  it('rejects occupied destination hexes before path or heat side effects', () => {
    const grid = setHex(
      createHexGrid({ radius: 3 }),
      { q: 1, r: 0 },
      {
        occupantId: 'enemy-1',
      },
    );

    const result = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 1, r: 0 },
      Facing.North,
      MovementType.Walk,
      standardMove,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('occupied');
    expect(result.mpCost).toBe(0);
    expect(result.heatGenerated).toBe(0);
  });

  it('rejects follow-up movement from a start hex occupied by another unit', () => {
    const grid = setHex(
      createHexGrid({ radius: 3 }),
      { q: 0, r: 0 },
      {
        occupantId: 'enemy-1',
      },
    );
    const target = { q: 1, r: 0 };

    const result = validateMovement(
      grid,
      positionAtOrigin(),
      target,
      Facing.North,
      MovementType.Walk,
      standardMove,
    );
    const projection = deriveMovementRangeHexForDestination(
      unitAtOrigin(),
      MovementType.Walk,
      grid,
      standardMove,
      target,
    );
    const sameHex = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: 0 },
      Facing.North,
      MovementType.Stationary,
      standardMove,
    );

    expect(result).toEqual({
      valid: false,
      error:
        'Unit cannot make follow-up movement from a start hex occupied by another unit',
      mpCost: 0,
      heatGenerated: 0,
    });
    expect(projection).toMatchObject({
      reachable: false,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Unit cannot make follow-up movement from a start hex occupied by another unit',
      blockedReason:
        'Unit cannot make follow-up movement from a start hex occupied by another unit',
      path: [{ q: 0, r: 0 }],
    });
    expect(sameHex.valid).toBe(true);
  });

  it('validates against a legal path instead of failing on an impassable straight-line hex', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { elevation: 3 });

    const result = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -2 },
      Facing.North,
      MovementType.Walk,
      { walkMP: 8, runMP: 12, jumpMP: 0 },
    );

    expect(result.valid).toBe(true);
    expect(result.mpCost).toBeGreaterThan(2);
  });

  it('reports terrain costs and blocked endpoint previews', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 1, r: 0 }, { terrain: TerrainType.LightWoods });
    grid = setHex(grid, { q: 0, r: 1 }, { elevation: 3 });

    const reachable = deriveReachableHexes(
      unitAtOrigin(),
      MovementType.Walk,
      grid,
      {
        walkMP: 2,
        runMP: 3,
        jumpMP: 0,
      },
    );
    expect(
      reachable.find((entry) => entry.hex.q === 1 && entry.hex.r === 0),
    ).toMatchObject({ mpCost: 2, reachable: true });
    expect(
      reachable.find((entry) => entry.hex.q === 0 && entry.hex.r === 1),
    ).toMatchObject({
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
    });

    grid = setHex(
      grid,
      { q: 1, r: 0 },
      { terrain: TerrainType.Clear, elevation: 3 },
    );
    expect(findPath(grid, { q: 0, r: 0 }, { q: 1, r: 0 }, 10)).toBeNull();
  });
});
