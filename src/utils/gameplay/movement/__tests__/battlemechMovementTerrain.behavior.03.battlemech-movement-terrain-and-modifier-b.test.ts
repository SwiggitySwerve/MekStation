import { describe, expect, it } from '@jest/globals';

import type {
  IHexCoordinate,
  IHexGrid,
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
  it('charges path-alignment turns before entering a bent ground path segment', () => {
    const grid = createHexGrid({ radius: 3 });
    const result = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 1, r: -2 },
      Facing.Northeast,
      MovementType.Walk,
      { walkMP: 3, runMP: 5, jumpMP: 0 },
    );
    const overBudget = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 1, r: -2 },
      Facing.Northeast,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );
    const decomposition = decomposeMovementSteps({
      from: { q: 0, r: 0 },
      to: { q: 1, r: -2 },
      fromFacing: Facing.North,
      toFacing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 3,
      path: [
        { q: 0, r: 0 },
        { q: 0, r: -1 },
        { q: 1, r: -2 },
      ],
      grid,
    });

    expect(result).toMatchObject({
      valid: true,
      mpCost: 3,
      heatGenerated: 1,
    });
    expect(overBudget.valid).toBe(false);
    expect(overBudget.error).toContain('costs 3 MP');
    expect(decomposition).toMatchObject({
      hexesMoved: 2,
      straightHexes: 2,
      turningMpCost: 1,
      netDisplacement: 2,
    });
    expect(() =>
      assertMovementStepConservation(decomposition, 3),
    ).not.toThrow();
  });

  it('applies the terrain movement-cost table to every supported ground terrain tag', () => {
    for (const terrain of Object.values(TerrainType)) {
      const grid = setHex(
        createHexGrid({ radius: 3 }),
        { q: 0, r: -1 },
        {
          terrain,
        },
      );
      const result = validateMovement(
        grid,
        positionAtOrigin(),
        { q: 0, r: -1 },
        Facing.North,
        MovementType.Walk,
        { walkMP: 20, runMP: 30, jumpMP: 0 },
      );

      expect(result.valid).toBe(true);
      expect(result.mpCost).toBe(
        1 + TERRAIN_PROPERTIES[terrain].movementCostModifier.walk,
      );
    }
  });

  it('applies Terrain Master: Mountaineer rough and rubble MP relief to ground movement only', () => {
    const mountaineer = { pilotAbilities: ['tm_mountaineer'] };
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.Rough });
    grid = setHex(grid, { q: 1, r: 0 }, { terrain: TerrainType.Rubble });

    expect(getHexMovementCost(grid, { q: 0, r: -1 }, 'walk')).toBe(2);
    expect(
      getHexMovementCost(
        grid,
        { q: 0, r: -1 },
        'walk',
        { q: 0, r: 0 },
        mountaineer,
      ),
    ).toBe(1);
    expect(
      getHexMovementCost(
        grid,
        { q: 1, r: 0 },
        'run',
        { q: 0, r: 0 },
        mountaineer,
      ),
    ).toBe(1);
    expect(
      getHexMovementCost(
        grid,
        { q: 1, r: 0 },
        'jump',
        { q: 0, r: 0 },
        mountaineer,
      ),
    ).toBe(1);
  });

  it('threads Terrain Master: Mountaineer MP relief through validation, pathfinding, and reachable previews', () => {
    const mountaineer = { pilotAbilities: ['tm_mountaineer'] };
    const mountaineerUnit = {
      ...unitAtOrigin(),
      abilities: ['tm_mountaineer'],
    };
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 1, r: 0 }, { terrain: TerrainType.Rubble });

    const blockedWithoutAbility = validateMovement(
      grid,
      { ...positionAtOrigin(), facing: Facing.Southeast },
      { q: 1, r: 0 },
      Facing.Southeast,
      MovementType.Walk,
      { walkMP: 1, runMP: 1, jumpMP: 0 },
    );
    const allowedWithAbility = validateMovement(
      grid,
      { ...positionAtOrigin(), facing: Facing.Southeast },
      { q: 1, r: 0 },
      Facing.Southeast,
      MovementType.Walk,
      { walkMP: 1, runMP: 1, jumpMP: 0 },
      0,
      undefined,
      mountaineer,
    );

    expect(blockedWithoutAbility.valid).toBe(false);
    expect(blockedWithoutAbility.error).toContain('costs 2 MP');
    expect(allowedWithAbility).toMatchObject({
      valid: true,
      mpCost: 1,
    });
    expect(findPath(grid, { q: 0, r: 0 }, { q: 1, r: 0 }, 1)).toBeNull();
    expect(
      findPath(grid, { q: 0, r: 0 }, { q: 1, r: 0 }, 1, 'walk', mountaineer),
    ).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);

    const reachable = deriveReachableHexes(
      mountaineerUnit,
      MovementType.Walk,
      grid,
      { walkMP: 1, runMP: 1, jumpMP: 0 },
    );
    expect(
      reachable.find((entry) => entry.hex.q === 1 && entry.hex.r === 0),
    ).toMatchObject({ mpCost: 1, reachable: true });
  });

  it('applies Terrain Master: Mountaineer upward elevation MP relief without relaxing the climb cap', () => {
    const mountaineer = { pilotAbilities: ['tm_mountaineer'] };
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { elevation: 2 });

    const withoutAbility = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );
    const withAbility = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
      0,
      undefined,
      mountaineer,
    );

    expect(withoutAbility.valid).toBe(false);
    expect(withoutAbility.error).toContain('costs 3 MP');
    expect(withAbility).toMatchObject({ valid: true, mpCost: 2 });

    grid = setHex(grid, { q: 0, r: -1 }, { elevation: 3 });
    const stillTooSteep = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      standardMove,
      0,
      undefined,
      mountaineer,
    );
    expect(stillTooSteep.valid).toBe(false);
    expect(stillTooSteep.error).toContain(
      'Elevation change of 3 exceeds ground movement limit',
    );
  });
});
