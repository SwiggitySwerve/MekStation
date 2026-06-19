import { describe, expect, it } from '@jest/globals';

import type {
  IMovementCapability,
  LightCondition,
} from './reachable.test-helpers';

import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  Facing,
  GroundMotionType,
  GyroType,
  MovementType,
  TerrainType,
  createAerospaceCombatState,
  createEnvironmentalConditions,
  createHexGrid,
  createVehicleCombatState,
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
  gridFromParsedBoard,
  makeComponentDamage,
  makeUnitAtOrigin,
  setHex,
  setOccupant,
  terrainStringFromFeatures,
  validateCommittedMovement,
  validateMovement,
} from './reachable.test-helpers';

it('does not show automatic landing metadata for represented hover-style WiGE movement', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
  const unit = {
    ...makeUnitAtOrigin(),
    conversionMode: 'airmek' as const,
    lamAirMekAltitude: 2,
  };

  const preview = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'hover',
    },
    { q: 1, r: 0 },
  );

  expect(preview).toMatchObject({
    mpCost: 1,
    movementMode: 'hover',
    reachable: true,
    movementType: MovementType.Walk,
  });
  expect(preview?.automaticLandingRequired).toBeUndefined();
  expect(preview?.automaticLandingDistance).toBeUndefined();
});

it('reserves represented WiGE altitude-control MP before landed ground movement', () => {
  const grid = createHexGrid({ radius: 3 });
  const unit = {
    ...makeUnitAtOrigin(),
    pendingAltitudeControlStepCount: 1,
    pendingAltitudeControlMpCost: 1,
    combatState: {
      kind: 'vehicle' as const,
      state: createVehicleCombatState({
        unitId: 'u1',
        motionType: GroundMotionType.WIGE,
        originalCruiseMP: 2,
        armor: {},
        structure: {},
        altitude: 0,
      }),
    },
  };
  const capability: IMovementCapability = {
    walkMP: 2,
    runMP: 3,
    jumpMP: 0,
    movementMode: 'wige',
  };

  const reachable = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );
  expect(reachable).toMatchObject({
    reachable: true,
    mpCost: 2,
    movementMode: 'wige',
    altitudeControlStepCount: 1,
    altitudeControlMpCost: 1,
  });

  const tooFar = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    capability,
    { q: 2, r: 0 },
  );
  expect(tooFar).toMatchObject({
    reachable: false,
    mpCost: 3,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails:
      'Destination is 2 hexes away, but max range for walk after altitude control is 1',
    altitudeControlStepCount: 1,
    altitudeControlMpCost: 1,
  });

  const committed = validateCommittedMovement({
    grid,
    unit,
    to: { q: 2, r: 0 },
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
  });
  expect(committed).toMatchObject({
    valid: false,
    reason: 'InsufficientMP',
    details:
      'Destination is 2 hexes away, but max range for walk after altitude control is 1',
    mpCost: 3,
  });
});

it('requires naval motive movement to stay on water terrain', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Water, 0);
  grid = setHex(grid, { q: 0, r: 1 }, TerrainType.Clear, 0);
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'naval',
  };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);
  const water = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  const land = result.find((r) => r.hex.q === 0 && r.hex.r === 1);

  expect(water).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    elevationCost: 0,
    movementMode: 'naval',
    reachable: true,
  });
  expect(land).toMatchObject({
    movementMode: 'naval',
    reachable: false,
    blockedReason: 'Naval movement requires water terrain',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Naval movement requires water terrain',
  });
});

it.each<['hydrofoil' | 'submarine', string]>([
  ['hydrofoil', 'Hydrofoil movement requires water terrain'],
  ['submarine', 'Submarine movement requires water terrain'],
])(
  'marks %s land destinations blocked with a motive-specific reason',
  (movementMode, blockedReason) => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    const unit = makeUnitAtOrigin();

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode,
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(result).toMatchObject({
      movementMode,
      reachable: false,
      blockedReason,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: blockedReason,
    });
  },
);

it.each<['rail' | 'maglev', string]>([
  ['rail', 'Rail movement requires rail terrain'],
  ['maglev', 'Maglev movement requires rail terrain'],
])(
  'marks %s destinations blocked until the map has rail terrain',
  (movementMode, blockedReason) => {
    const grid = createHexGrid({ radius: 3 });
    const unit = makeUnitAtOrigin();

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode,
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(result).toMatchObject({
      movementMode,
      reachable: false,
      blockedReason,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: blockedReason,
    });
  },
);

it('expands the reachable envelope when switching Walk → Run', () => {
  const grid = createHexGrid({ radius: 8 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap);
  const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);

  // Run covers strictly more ground than Walk on an open grid.
  expect(run.length).toBeGreaterThan(walk.length);
});
