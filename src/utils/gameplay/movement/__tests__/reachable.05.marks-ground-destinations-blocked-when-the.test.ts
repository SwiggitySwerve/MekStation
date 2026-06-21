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

it('marks ground destinations blocked when they require an illegal elevation climb', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 3);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const blocked = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(blocked).toMatchObject({
    mpCost: Infinity,
    elevationDelta: 3,
    elevationCost: 3,
    movementMode: 'walk',
    reachable: false,
    movementType: MovementType.Walk,
    blockedReason: 'Elevation change of 3 exceeds ground movement limit',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Elevation change of 3 exceeds ground movement limit',
  });
});

it('uses MegaMek vehicle elevation limits for tracked movement reachability', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 2);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };

  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 5,
    runMP: 8,
    jumpMP: 0,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);
  const walking = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 5,
    runMP: 8,
    jumpMP: 0,
    movementMode: 'walk',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: Infinity,
    elevationDelta: 2,
    elevationCost: 4,
    movementMode: 'tracked',
    reachable: false,
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Elevation change of 2 exceeds Tracked movement limit',
  });
  expect(walking).toMatchObject({
    mpCost: 3,
    elevationDelta: 2,
    elevationCost: 2,
    movementMode: 'walk',
    reachable: true,
  });
});

it('uses MegaMek absolute elevation costs for downhill ground movement', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 2);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };

  const downhill = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'walk',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(downhill).toMatchObject({
    mpCost: 3,
    elevationDelta: -2,
    elevationCost: 2,
    movementMode: 'walk',
    reachable: true,
  });

  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 3);
  const blockedDrop = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 5,
    runMP: 8,
    jumpMP: 0,
    movementMode: 'walk',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(blockedDrop).toMatchObject({
    mpCost: Infinity,
    elevationDelta: -3,
    elevationCost: 3,
    movementMode: 'walk',
    reachable: false,
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Elevation change of 3 exceeds ground movement limit',
  });
});

it('marks destinations over the MP budget with the engine insufficient-MP reason', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 0);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = { walkMP: 1, runMP: 1, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const expensiveWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(expensiveWoods).toMatchObject({
    mpCost: 2,
    terrainCost: 1,
    reachable: false,
    movementType: MovementType.Walk,
    blockedReason: 'Path costs 2 MP, but only 1 MP is available',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Path costs 2 MP, but only 1 MP is available',
  });
});

it('uses vehicle motive mode when pricing terrain for reachability', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 0);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'vtol',
  };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const woods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(woods).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'vtol',
    reachable: true,
    movementType: MovementType.Walk,
  });
});

it('allows walking through depth-1 water while blocking tracked entry', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Water, 0);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };

  const walking = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
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
    mpCost: 2,
    terrainCost: 1,
    heatGenerated: 1,
    movementMode: 'walk',
    reachable: true,
  });
  expect(tracked).toMatchObject({
    movementMode: 'tracked',
    reachable: false,
    blockedReason: 'Water blocks ground movement',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Water blocks ground movement',
  });
  expect(hover).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'hover',
    reachable: true,
  });
});
