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

it('uses runtime unit height override for bridge-clearance movement projection', () => {
  let grid = createHexGrid({ radius: 2 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 1 },
      { type: TerrainType.Bridge, level: 1 },
    ]),
    0,
  );
  const capability: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'naval',
  };

  const lowProfile = deriveMovementRangeHexForDestination(
    makeUnitAtOrigin(),
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );
  const tallRuntimeState = deriveMovementRangeHexForDestination(
    { ...makeUnitAtOrigin(), unitHeight: 1 },
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );

  expect(lowProfile).toMatchObject({
    reachable: true,
    movementMode: 'naval',
  });
  expect(tallRuntimeState).toMatchObject({
    reachable: false,
    movementMode: 'naval',
    blockedReason: 'Naval movement lacks bridge clearance',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Naval movement lacks bridge clearance',
  });
});

it('lets infantry dismount state override stale mounted height for bridge-clearance projection', () => {
  let grid = createHexGrid({ radius: 2 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 1 },
      { type: TerrainType.Bridge, level: 1 },
    ]),
    0,
  );
  const capability: IMovementCapability = {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'naval',
    unitHeight: 1,
    unitHeightProfile: { kind: 'infantry_mount', mountedHeight: 1 },
  };

  const mountedState = deriveMovementRangeHexForDestination(
    { ...makeUnitAtOrigin(), infantryMounted: true },
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );
  const dismountedState = deriveMovementRangeHexForDestination(
    { ...makeUnitAtOrigin(), infantryMounted: false, unitHeight: 1 },
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );

  expect(mountedState).toMatchObject({
    reachable: false,
    movementMode: 'naval',
    blockedReason: 'Naval movement lacks bridge clearance',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Naval movement lacks bridge clearance',
  });
  expect(dismountedState).toMatchObject({
    reachable: true,
    mpCost: 1,
    terrainCost: 0,
    movementMode: 'naval',
  });
});

it('lets flotation-hull tracked vehicles enter water with water MP costs', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    movementMode: 'tracked',
    waterCapability: { flotationHull: true },
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: 4,
    terrainCost: 3,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it('applies Frogman deep-water movement cost reduction when represented', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const standard = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'walk',
    },
    { q: 1, r: 0 },
  );
  const frogman = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'walk',
      waterCapability: { frogmanSpecialist: true },
    },
    { q: 1, r: 0 },
  );

  expect(standard).toMatchObject({
    reachable: false,
    mpCost: 4,
    terrainCost: 3,
    movementInvalidReason: 'InsufficientMP',
  });
  expect(frogman).toMatchObject({
    reachable: true,
    mpCost: 3,
    terrainCost: 2,
    elevationCost: 0,
    movementMode: 'walk',
    movementType: MovementType.Walk,
  });
});

it('lets flotation-hull tracked vehicles run one first step into water', () => {
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
    waterCapability: { flotationHull: true },
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: 4,
    terrainCost: 3,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});
