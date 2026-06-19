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

it('uses explicit directional cliff metadata for WiGE and vehicle ascent projection', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: -1, r: 0 }, TerrainType.Clear, 1);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      {
        type: TerrainType.Clear,
        level: 0,
        cliffTopExits: [
          Facing.North,
          Facing.Northeast,
          Facing.Southeast,
          Facing.South,
          Facing.Southwest,
          Facing.Northwest,
        ],
      },
    ]),
    1,
  );
  const unit = makeUnitAtOrigin();

  const ordinaryTrackedRise = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
    },
    { q: -1, r: 0 },
  );
  expect(ordinaryTrackedRise).toMatchObject({
    mpCost: 3,
    movementMode: 'tracked',
    elevationDelta: 1,
    elevationCost: 2,
    reachable: true,
  });

  const wigeCapability: IMovementCapability = {
    walkMP: 2,
    runMP: 3,
    jumpMP: 0,
    movementMode: 'wige',
  };
  const wigePreview = deriveReachableHexes(
    unit,
    MovementType.Walk,
    grid,
    wigeCapability,
  ).find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(wigePreview).toMatchObject({
    mpCost: 2,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 0,
    movementMode: 'wige',
    reachable: true,
  });

  const wigeCommit = validateCommittedMovement({
    grid,
    unit,
    to: { q: 1, r: 0 },
    facing: Facing.Southeast,
    movementType: MovementType.Walk,
    capability: wigeCapability,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  });
  expect(wigeCommit).toMatchObject({
    valid: true,
    mpCost: 2,
    heatGenerated: 0,
  });

  const trackedPreview = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
    },
    { q: 1, r: 0 },
  );
  expect(trackedPreview).toMatchObject({
    mpCost: Infinity,
    movementMode: 'tracked',
    reachable: false,
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Tracked movement cannot ascend a sheer cliff',
  });

  const trackedCommit = validateCommittedMovement({
    grid,
    unit,
    to: { q: 1, r: 0 },
    facing: Facing.Southeast,
    movementType: MovementType.Walk,
    capability: {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
    },
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  });
  expect(trackedCommit).toMatchObject({
    valid: false,
    reason: 'TerrainBlocked',
    details: 'Tracked movement cannot ascend a sheer cliff',
    mpCost: Infinity,
    heatGenerated: 0,
  });
});

it('uses parsed MegaMek cliff_top exits for movement projection', () => {
  const grid = gridFromParsedBoard(`size 2 1
hex 0101 0 "" ""
hex 0201 1 "cliff_top:1:32" ""
end`);
  const unit = makeUnitAtOrigin();

  const wigePreview = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
      movementMode: 'wige',
    },
    { q: 1, r: 0 },
  );
  expect(wigePreview).toMatchObject({
    mpCost: 2,
    terrainCost: 1,
    elevationDelta: 1,
    movementMode: 'wige',
    reachable: true,
  });

  const trackedPreview = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
    },
    { q: 1, r: 0 },
  );
  expect(trackedPreview).toMatchObject({
    mpCost: Infinity,
    movementMode: 'tracked',
    reachable: false,
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Tracked movement cannot ascend a sheer cliff',
  });
});
