import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
  type IUnitGameState,
  type IUnitPosition,
} from '@/types/gameplay';
import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  canStand,
  calculateAttackerMovementModifier,
  calculateMovementHeat,
  calculateTMM,
  deriveReachableHexes,
  findPath,
  getHexMovementCost,
  getStandingCost,
  getValidDestinations,
  validateMovement,
} from '@/utils/gameplay/movement';
import {
  assertMovementStepConservation,
  decomposeMovementSteps,
} from '@/utils/gameplay/movement/eventPath';

function setHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
  overrides: {
    readonly terrain?: TerrainType;
    readonly elevation?: number;
    readonly occupantId?: string | null;
  },
): IHexGrid {
  const key = coordToKey(coord);
  const existingHex = grid.hexes.get(key);
  if (!existingHex) {
    throw new Error(`Hex at ${key} does not exist in grid`);
  }

  const hexes = new Map(grid.hexes);
  hexes.set(key, {
    ...existingHex,
    terrain: overrides.terrain ?? existingHex.terrain,
    elevation: overrides.elevation ?? existingHex.elevation,
    occupantId:
      overrides.occupantId === undefined
        ? existingHex.occupantId
        : overrides.occupantId,
  });
  return { ...grid, hexes };
}

function positionAtOrigin(): IUnitPosition {
  return {
    unitId: 'atlas',
    coord: { q: 0, r: 0 },
    facing: Facing.North,
    prone: false,
  };
}

function unitAtOrigin(): IUnitGameState {
  return {
    id: 'atlas',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

const standardMove: IMovementCapability = {
  walkMP: 5,
  runMP: 8,
  jumpMP: 4,
};

describe('BattleMech movement, terrain, and modifier behavior', () => {
  it('keeps stand-up helpers tied to prone state and walking MP', () => {
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
    expect(getStandingCost({ walkMP: 5, runMP: 8, jumpMP: 0 })).toBe(5);
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

      if (terrain === TerrainType.Water) {
        expect(result.valid).toBe(false);
        expect(result.error).toContain('impassable terrain');
        continue;
      }

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
    expect(stillTooSteep.error).toContain('impassable terrain');
  });

  it('rejects ground movement through impassable terrain and elevation while preserving jump landings', () => {
    let waterGrid = createHexGrid({ radius: 3 });
    waterGrid = setHex(
      waterGrid,
      { q: 0, r: -1 },
      { terrain: TerrainType.Water },
    );

    for (const movementType of [MovementType.Walk, MovementType.Run]) {
      const result = validateMovement(
        waterGrid,
        positionAtOrigin(),
        { q: 0, r: -1 },
        Facing.North,
        movementType,
        standardMove,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('impassable terrain');
      expect(result.heatGenerated).toBe(0);
    }

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
    expect(climb.error).toContain('impassable terrain');

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
    grid = setHex(grid, { q: 1, r: 0 }, { terrain: TerrainType.Water });
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

  it('validates against a legal path instead of failing on an impassable straight-line hex', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, { terrain: TerrainType.Water });

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

  it('reports reachable movement costs with terrain and pathfinding disallows impassable endpoints', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 1, r: 0 }, { terrain: TerrainType.LightWoods });
    grid = setHex(grid, { q: 0, r: 1 }, { terrain: TerrainType.Water });

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
    ).toBeUndefined();

    grid = setHex(
      grid,
      { q: 1, r: 0 },
      { terrain: TerrainType.Clear, elevation: 3 },
    );
    expect(findPath(grid, { q: 0, r: 0 }, { q: 1, r: 0 }, 10)).toBeNull();
  });
});
