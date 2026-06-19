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
  it('applies source-backed Maneuvering Ace biped lateral-shift MP while preserving facing', () => {
    const grid = createHexGrid({ radius: 3 });
    const lateralRight = { q: 1, r: -1 };
    const maneuveringAce = { pilotAbilities: ['maneuvering_ace'] };

    const withoutAbility = validateMovement(
      grid,
      positionAtOrigin(),
      lateralRight,
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );
    const withAbility = validateMovement(
      grid,
      positionAtOrigin(),
      lateralRight,
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
      0,
      undefined,
      maneuveringAce,
    );
    const decomposition = decomposeMovementSteps({
      from: { q: 0, r: 0 },
      to: lateralRight,
      fromFacing: Facing.North,
      toFacing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 2,
      path: [{ q: 0, r: 0 }, lateralRight],
      grid,
    });

    expect(
      maneuveringAceLateralShiftDirection({
        from: { q: 0, r: 0 },
        to: lateralRight,
        facing: Facing.North,
      }),
    ).toBe('right');
    expect(
      calculateManeuveringAceBipedLateralShiftCost({
        grid,
        from: { q: 0, r: 0 },
        to: lateralRight,
        movementType: 'walk',
      }),
    ).toBe(2);
    expect(withoutAbility.valid).toBe(false);
    expect(withoutAbility.error).toContain('costs 3 MP');
    expect(withAbility).toMatchObject({
      valid: true,
      mpCost: 2,
      heatGenerated: 1,
    });
    expect(decomposition).toMatchObject({
      hexesMoved: 1,
      straightHexes: 1,
      turningMpCost: 0,
      netDisplacement: 1,
    });
    expect(decomposition.steps).toEqual([
      expect.objectContaining({
        kind: 'lateral',
        direction: 'right',
        from: { q: 0, r: 0 },
        to: lateralRight,
        mpCost: 2,
      }),
    ]);
    expect(() =>
      assertMovementStepConservation(decomposition, 2),
    ).not.toThrow();
  });

  it('validates QuadMek Maneuvering Ace lateral steps at entry cost while biped shifts keep the surcharge', () => {
    let grid = createHexGrid({ radius: 3 });
    const lateralRight = { q: 1, r: -1 };
    const maneuveringAce = { pilotAbilities: ['maneuvering_ace'] };

    grid = setHex(grid, lateralRight, { terrain: TerrainType.LightWoods });

    expect(
      calculateManeuveringAceBipedLateralShiftCost({
        grid,
        from: { q: 0, r: 0 },
        to: lateralRight,
        movementType: 'walk',
        movementContext: maneuveringAce,
      }),
    ).toBe(3);
    expect(
      calculateManeuveringAceQuadLateralStepCost({
        grid,
        from: { q: 0, r: 0 },
        to: lateralRight,
        movementType: 'walk',
        movementContext: maneuveringAce,
      }),
    ).toBe(2);

    const bipedValidation = validateMovement(
      grid,
      positionAtOrigin(),
      lateralRight,
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
      0,
      undefined,
      maneuveringAce,
    );
    expect(bipedValidation).toMatchObject({
      valid: false,
      mpCost: 3,
    });
    expect(bipedValidation.error).toContain('costs 3 MP');

    const quadValidation = validateMovement(
      grid,
      positionAtOrigin(),
      lateralRight,
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0, mekLegProfile: 'quad' },
      0,
      undefined,
      maneuveringAce,
    );
    const quadDecomposition = decomposeMovementSteps({
      from: { q: 0, r: 0 },
      to: lateralRight,
      fromFacing: Facing.North,
      toFacing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 2,
      path: [{ q: 0, r: 0 }, lateralRight],
      grid,
      movementCapability: {
        walkMP: 2,
        runMP: 3,
        jumpMP: 0,
        mekLegProfile: 'quad',
      },
    });
    expect(quadValidation).toMatchObject({
      valid: true,
      mpCost: 2,
      heatGenerated: 1,
    });
    expect(quadDecomposition.steps).toEqual([
      expect.objectContaining({
        kind: 'lateral',
        direction: 'right',
        from: { q: 0, r: 0 },
        to: lateralRight,
        mpCost: 2,
      }),
    ]);
    expect(() =>
      assertMovementStepConservation(quadDecomposition, 2),
    ).not.toThrow();

    grid = setHex(grid, lateralRight, { terrain: TerrainType.HeavyWoods });
    expect(
      calculateManeuveringAceQuadLateralStepCost({
        grid,
        from: { q: 0, r: 0 },
        to: lateralRight,
        movementType: 'walk',
        movementContext: maneuveringAce,
      }),
    ).toBe(3);

    grid = setHex(grid, lateralRight, { elevation: 3 });
    expect(
      calculateManeuveringAceQuadLateralStepCost({
        grid,
        from: { q: 0, r: 0 },
        to: lateralRight,
        movementType: 'walk',
        movementContext: maneuveringAce,
      }),
    ).toBe(Infinity);

    grid = setHex(grid, lateralRight, {
      terrain: TerrainType.Clear,
      elevation: 0,
      occupantId: 'enemy-1',
    });
    expect(
      calculateManeuveringAceQuadLateralStepCost({
        grid,
        from: { q: 0, r: 0 },
        to: lateralRight,
        movementType: 'walk',
        movementContext: maneuveringAce,
      }),
    ).toBe(1);
    expect(
      validateMovement(
        grid,
        positionAtOrigin(),
        lateralRight,
        Facing.North,
        MovementType.Walk,
        { walkMP: 2, runMP: 3, jumpMP: 0 },
        0,
        undefined,
        maneuveringAce,
      ),
    ).toMatchObject({
      valid: false,
      error: 'Destination hex is occupied',
      mpCost: 0,
    });
  });
});
