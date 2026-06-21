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

it('prices encoded deep water even when another feature is primary', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Smoke, level: 1 },
    ]),
    0,
  );
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };

  const walking = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    movementMode: 'walk',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);
  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);
  const hover = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'hover',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(walking).toMatchObject({
    mpCost: 4,
    terrainCost: 3,
    movementMode: 'walk',
    reachable: true,
  });
  expect(tracked).toMatchObject({
    movementMode: 'tracked',
    reachable: false,
    blockedReason: 'Water blocks ground movement',
    movementInvalidReason: 'TerrainBlocked',
  });
  expect(hover).toMatchObject({
    mpCost: 1,
    movementMode: 'hover',
    reachable: true,
  });
});

it('uses the Playtest2 deep-water movement surcharge when enabled', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'walk',
  };

  const defaultWater = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
  );
  const playtest2Water = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
    'normal',
    { optionalRules: ['playtest_2'] },
  );

  expect(defaultWater).toMatchObject({
    reachable: false,
    mpCost: 4,
    terrainCost: 3,
    movementInvalidReason: 'InsufficientMP',
  });
  expect(playtest2Water).toMatchObject({
    reachable: true,
    mpCost: 3,
    terrainCost: 2,
    movementMode: 'walk',
  });
});

it('lets Playtest2 Mek-style running enter water after the first step', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 2, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
  };

  const standardRun = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Run,
    grid,
    cap,
    { q: 2, r: 0 },
  );
  const playtest2Run = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Run,
    grid,
    cap,
    { q: 2, r: 0 },
    'normal',
    { optionalRules: ['playtest_2'] },
  );

  expect(standardRun).toMatchObject({
    reachable: false,
    movementMode: 'run',
    blockedReason: 'Water blocks ground movement',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Water blocks ground movement',
  });
  expect(playtest2Run).toMatchObject({
    reachable: true,
    movementMode: 'run',
    mpCost: 4,
    terrainCost: 2,
    heatGenerated: 2,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
  });
});

it('lets UMU movement cross deep water without water-depth MP surcharges', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const baseCapability = { walkMP: 1, runMP: 1, jumpMP: 0 } as const;

  const walking = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      ...baseCapability,
      movementMode: 'walk',
    },
    { q: 1, r: 0 },
  );
  const umu = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      ...baseCapability,
      movementMode: 'umu',
      movementHeatProfile: 'none',
      movementTerrainProfile: 'infantry',
    },
    { q: 1, r: 0 },
  );

  expect(walking).toMatchObject({
    reachable: false,
    mpCost: 4,
    terrainCost: 3,
    movementMode: 'walk',
    movementInvalidReason: 'InsufficientMP',
  });
  expect(umu).toMatchObject({
    reachable: true,
    mpCost: 1,
    terrainCost: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'umu',
    movementType: MovementType.Walk,
  });
});
