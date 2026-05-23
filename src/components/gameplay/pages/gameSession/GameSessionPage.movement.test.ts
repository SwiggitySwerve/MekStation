import { describe, expect, it } from '@jest/globals';

import type { IGameSession, IMovementRangeHex } from '@/types/gameplay';

import { MovementType, Facing } from '@/types/gameplay';

import {
  appendHoveredMovementProjection,
  buildMovementPlan,
  getEffectiveMovementMps,
  getPlannedMovementForSelectedUnit,
  mergeRunMovementRangeHexes,
  movementPathFromRangeHex,
} from './GameSessionPage.movementPlanning';

describe('getEffectiveMovementMps', () => {
  it('applies the same heat movement penalty used by movement range projection', () => {
    expect(
      getEffectiveMovementMps({ walkMP: 5, runMP: 8, jumpMP: 3 }, 10),
    ).toEqual({
      walkMP: 3,
      runMP: 6,
      jumpMP: 1,
    });
  });

  it('floors effective movement budgets at zero', () => {
    expect(
      getEffectiveMovementMps({ walkMP: 2, runMP: 3, jumpMP: 1 }, 25),
    ).toEqual({
      walkMP: 0,
      runMP: 0,
      jumpMP: 0,
    });
  });
});

describe('getPlannedMovementForSelectedUnit', () => {
  const plan = {
    unitId: 'unit-a',
    destination: { q: 1, r: 0 },
    facing: Facing.North,
    movementType: MovementType.Run,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  };

  it('keeps the plan when it belongs to the selected unit', () => {
    expect(getPlannedMovementForSelectedUnit(plan, 'unit-a')).toBe(plan);
  });

  it('ignores stale movement plans from a different selected unit', () => {
    expect(getPlannedMovementForSelectedUnit(plan, 'unit-b')).toBeNull();
  });

  it('treats legacy unscoped plans as belonging to the current selection', () => {
    const legacyPlan = { ...plan, unitId: undefined };
    expect(getPlannedMovementForSelectedUnit(legacyPlan, 'unit-a')).toBe(
      legacyPlan,
    );
  });
});

describe('mergeRunMovementRangeHexes', () => {
  const runRangeHex: IMovementRangeHex = {
    hex: { q: 2, r: 0 },
    mpCost: 4,
    terrainCost: 1,
    elevationDelta: 0,
    elevationCost: 0,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    heatGenerated: 2,
    movementMode: 'tracked',
    reachable: true,
    movementType: MovementType.Run,
  };
  const walkRangeHex: IMovementRangeHex = {
    ...runRangeHex,
    mpCost: 2,
    heatGenerated: 1,
    path: [
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    ],
    movementType: MovementType.Walk,
  };

  it('keeps active run projection data when run and walk both reach the same hex', () => {
    const merged = mergeRunMovementRangeHexes([runRangeHex], [walkRangeHex]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      movementType: MovementType.Run,
      mpCost: 4,
      heatGenerated: 2,
      path: runRangeHex.path,
    });
  });

  it('uses reachable walk data only when the matching run projection is blocked', () => {
    const blockedRun: IMovementRangeHex = {
      ...runRangeHex,
      reachable: false,
      blockedReason: 'Elevation change exceeds movement mode limit',
      movementInvalidReason: 'InvalidPath',
    };

    const merged = mergeRunMovementRangeHexes([blockedRun], [walkRangeHex]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      movementType: MovementType.Walk,
      mpCost: 2,
      heatGenerated: 1,
      reachable: true,
    });
  });
});

describe('appendHoveredMovementProjection', () => {
  const reachableRangeHex: IMovementRangeHex = {
    hex: { q: 1, r: 0 },
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
    heatGenerated: 1,
    movementMode: 'walk',
    reachable: true,
    movementType: MovementType.Walk,
  };

  it('adds a hovered blocked projection when the base overlay has no entry for that hex', () => {
    const hoveredBlocked: IMovementRangeHex = {
      ...reachableRangeHex,
      hex: { q: 4, r: 0 },
      mpCost: 4,
      path: undefined,
      reachable: false,
      blockedReason: 'Destination is 4 hexes away, but max range for walk is 2',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 4 hexes away, but max range for walk is 2',
    };

    const merged = appendHoveredMovementProjection(
      [reachableRangeHex],
      hoveredBlocked,
    );

    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({
      hex: { q: 4, r: 0 },
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
    });
  });

  it('does not replace an existing rules projection for the hovered hex', () => {
    const duplicateBlocked: IMovementRangeHex = {
      ...reachableRangeHex,
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
    };

    const merged = appendHoveredMovementProjection(
      [reachableRangeHex],
      duplicateBlocked,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(reachableRangeHex);
  });
});

describe('movement projection path planning', () => {
  const selectedUnitState = {
    id: 'unit-a',
    position: { q: 0, r: 0 },
    facing: Facing.North,
  } as IGameSession['currentState']['units'][string];

  const projectedRangeHex: IMovementRangeHex = {
    hex: { q: 1, r: 0 },
    mpCost: 3,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    path: [
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: 0 },
    ],
    heatGenerated: 2,
    movementMode: 'tracked',
    reachable: true,
    movementType: MovementType.Run,
  };

  it('uses the projected range path for hover and commit previews', () => {
    expect(
      movementPathFromRangeHex(projectedRangeHex, selectedUnitState.position),
    ).toBe(projectedRangeHex.path);

    const plan = buildMovementPlan({
      hex: projectedRangeHex.hex,
      selectedUnitState,
      movementRangeLookup: new Map([['1,0', projectedRangeHex]]),
      movementType: MovementType.Run,
    });

    expect(plan).toMatchObject({
      unitId: 'unit-a',
      destination: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Run,
      path: projectedRangeHex.path,
      mpCost: 3,
      heatGenerated: 2,
      movementMode: 'tracked',
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 1,
    });
  });

  it('commits the projected movement type when run mode exposes a walk fallback', () => {
    const walkFallback: IMovementRangeHex = {
      ...projectedRangeHex,
      mpCost: 4,
      heatGenerated: 1,
      movementMode: 'walk',
      movementType: MovementType.Walk,
    };

    const plan = buildMovementPlan({
      hex: walkFallback.hex,
      selectedUnitState,
      movementRangeLookup: new Map([['1,0', walkFallback]]),
      movementType: MovementType.Run,
    });

    expect(plan).toMatchObject({
      movementType: MovementType.Walk,
      mpCost: 4,
      heatGenerated: 1,
      movementMode: 'walk',
      path: walkFallback.path,
    });
  });

  it('refuses to plan movement for projected blocked destinations', () => {
    const blocked: IMovementRangeHex = {
      ...projectedRangeHex,
      reachable: false,
      blockedReason: 'Destination hex is occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination hex is occupied',
    };

    expect(
      buildMovementPlan({
        hex: blocked.hex,
        selectedUnitState,
        movementRangeLookup: new Map([['1,0', blocked]]),
        movementType: MovementType.Run,
      }),
    ).toBeNull();
  });
});
