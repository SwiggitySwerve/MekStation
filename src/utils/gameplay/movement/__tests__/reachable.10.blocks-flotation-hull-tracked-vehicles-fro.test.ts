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

it('blocks flotation-hull tracked vehicles from running into water after the first step', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 2, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const tracked = deriveReachableHexes(unit, MovementType.Run, grid, {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    movementMode: 'tracked',
    waterCapability: { flotationHull: true },
  }).find((r) => r.hex.q === 2 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    movementMode: 'tracked',
    reachable: false,
    blockedReason: 'Water blocks ground movement',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Water blocks ground movement',
  });
});

it('lets fully amphibious tracked vehicles run into water with amphibious MP cost', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const tracked = deriveReachableHexes(unit, MovementType.Run, grid, {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    movementMode: 'tracked',
    waterCapability: { fullyAmphibious: true },
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: 2,
    terrainCost: 1,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it('lets VTOL motive ignore abrupt elevation changes for reachability', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 4);
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'vtol',
  };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const highGround = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(highGround).toMatchObject({
    mpCost: 1,
    elevationDelta: 4,
    elevationCost: 0,
    movementMode: 'vtol',
    reachable: true,
  });
});

it('lets WiGE motive ignore ground terrain and abrupt elevation like an airborne mover', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.HeavyWoods, 4);
  const unit = makeUnitAtOrigin();

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'wige',
  });

  const highWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(highWoods).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 4,
    elevationCost: 0,
    movementMode: 'wige',
    reachable: true,
    movementType: MovementType.Walk,
  });
});

it('charges WiGE climb-mode MP when entering a higher represented building top', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Building, level: 3 }]),
    0,
  );
  const unit = makeUnitAtOrigin();
  const capability: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'wige',
  };

  const preview = deriveReachableHexes(
    unit,
    MovementType.Walk,
    grid,
    capability,
  ).find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(preview).toMatchObject({
    mpCost: 3,
    terrainCost: 2,
    elevationDelta: 0,
    elevationCost: 0,
    movementMode: 'wige',
    reachable: true,
    movementType: MovementType.Walk,
  });

  const commit = validateCommittedMovement({
    grid,
    unit,
    to: { q: 1, r: 0 },
    facing: Facing.Southeast,
    movementType: MovementType.Walk,
    capability,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  });
  expect(commit).toMatchObject({
    valid: true,
    mpCost: 3,
    heatGenerated: 0,
  });

  const insufficientCapability: IMovementCapability = {
    ...capability,
    walkMP: 2,
  };
  const overBudgetPreview = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    insufficientCapability,
    { q: 1, r: 0 },
  );
  expect(overBudgetPreview).toMatchObject({
    mpCost: 3,
    terrainCost: 2,
    movementMode: 'wige',
    reachable: false,
    movementInvalidReason: 'InsufficientMP',
  });

  const overBudgetCommit = validateCommittedMovement({
    grid,
    unit,
    to: { q: 1, r: 0 },
    facing: Facing.Southeast,
    movementType: MovementType.Walk,
    capability: insufficientCapability,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  });
  expect(overBudgetCommit).toMatchObject({
    valid: false,
    reason: 'InsufficientMP',
    mpCost: 3,
    heatGenerated: 0,
  });
});
