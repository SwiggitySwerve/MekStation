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
  it('keeps stand-up helpers tied to prone state and stand-up mode', () => {
    expect(canStand({ ...positionAtOrigin(), prone: true }, standardMove)).toBe(
      true,
    );
    expect(canStand(positionAtOrigin(), standardMove)).toBe(false);
    expect(
      canStand(
        { ...positionAtOrigin(), prone: true },
        { ...standardMove, walkMP: 0 },
      ),
    ).toBe(false);
    expect(getStandingCost({ walkMP: 5, runMP: 8, jumpMP: 0 })).toBe(2);
    expect(getStandingCost({ walkMP: 5, runMP: 8, jumpMP: 0 }, 'careful')).toBe(
      5,
    );
  });

  it('keeps movement heat, target movement, and attacker modifiers aligned by movement class', () => {
    const cases = [
      {
        movementType: MovementType.Stationary,
        hexes: 0,
        heat: 0,
        tmm: 0,
        attacker: 0,
      },
      {
        movementType: MovementType.Walk,
        hexes: 3,
        heat: 1,
        tmm: 1,
        attacker: 1,
      },
      {
        movementType: MovementType.Run,
        hexes: 6,
        heat: 2,
        tmm: 2,
        attacker: 2,
      },
      {
        movementType: MovementType.Sprint,
        hexes: 6,
        heat: 3,
        tmm: 2,
        attacker: 2,
      },
      {
        movementType: MovementType.Evade,
        hexes: 6,
        heat: 4,
        tmm: 2,
        attacker: 2,
      },
      {
        movementType: MovementType.Jump,
        hexes: 2,
        heat: 3,
        tmm: 2,
        attacker: 3,
      },
      {
        movementType: MovementType.Jump,
        hexes: 6,
        heat: 6,
        tmm: 3,
        attacker: 3,
      },
    ];

    for (const testCase of cases) {
      expect(calculateMovementHeat(testCase.movementType, testCase.hexes)).toBe(
        testCase.heat,
      );
      expect(calculateTMM(testCase.movementType, testCase.hexes)).toBe(
        testCase.tmm,
      );
      expect(calculateAttackerMovementModifier(testCase.movementType)).toBe(
        testCase.attacker,
      );
    }
  });

  it('charges terrain entry MP during movement validation instead of only checking hex distance', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.LightWoods });

    const lightWoods = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );

    expect(lightWoods.valid).toBe(true);
    expect(lightWoods.mpCost).toBe(2);
    expect(lightWoods.heatGenerated).toBe(1);

    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.HeavyWoods });
    const heavyWoods = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );

    expect(heavyWoods.valid).toBe(false);
    expect(heavyWoods.error).toContain('costs 3 MP');
    expect(heavyWoods.heatGenerated).toBe(0);
  });

  it('charges same-hex facing changes as turning MP', () => {
    const grid = createHexGrid({ radius: 3 });
    const result = validateMovement(
      grid,
      positionAtOrigin(),
      { q: 0, r: 0 },
      Facing.Northeast,
      MovementType.Walk,
      { walkMP: 1, runMP: 2, jumpMP: 0 },
    );
    const decomposition = decomposeMovementSteps({
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      fromFacing: Facing.North,
      toFacing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
    });

    expect(result).toMatchObject({
      valid: true,
      mpCost: 1,
      heatGenerated: 1,
    });
    expect(decomposition).toMatchObject({
      hexesMoved: 0,
      straightHexes: 0,
      turningMpCost: 1,
      netDisplacement: 0,
    });
    expect(decomposition.steps).toEqual([
      expect.objectContaining({
        kind: 'turn',
        fromFacing: Facing.North,
        toFacing: Facing.Northeast,
        mpCost: 1,
      }),
    ]);
    expect(() =>
      assertMovementStepConservation(decomposition, 1),
    ).not.toThrow();
  });

  it('charges terminal facing changes after ground movement', () => {
    const grid = createHexGrid({ radius: 3 });
    const result = validateMovement(
      grid,
      {
        ...positionAtOrigin(),
        facing: Facing.Southeast,
      },
      { q: 1, r: 0 },
      Facing.South,
      MovementType.Walk,
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    );
    const overBudget = validateMovement(
      grid,
      {
        ...positionAtOrigin(),
        facing: Facing.Southeast,
      },
      { q: 1, r: 0 },
      Facing.South,
      MovementType.Walk,
      { walkMP: 1, runMP: 2, jumpMP: 0 },
    );
    const decomposition = decomposeMovementSteps({
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      fromFacing: Facing.Southeast,
      toFacing: Facing.South,
      movementType: MovementType.Walk,
      mpUsed: 2,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      grid,
    });

    expect(result).toMatchObject({
      valid: true,
      mpCost: 2,
      heatGenerated: 1,
    });
    expect(overBudget.valid).toBe(false);
    expect(overBudget.error).toContain('costs 2 MP');
    expect(decomposition).toMatchObject({
      hexesMoved: 1,
      straightHexes: 1,
      turningMpCost: 1,
      netDisplacement: 1,
    });
    expect(decomposition.steps).toEqual([
      expect.objectContaining({
        kind: 'forward',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
      }),
      expect.objectContaining({
        kind: 'turn',
        fromFacing: Facing.Southeast,
        toFacing: Facing.South,
      }),
    ]);
    expect(() =>
      assertMovementStepConservation(decomposition, 2),
    ).not.toThrow();
  });
});
