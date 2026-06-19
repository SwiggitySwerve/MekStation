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

it('blocks jump paths that cannot clear intervening represented terrain height', () => {
  let grid = createHexGrid({ radius: 5 });
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Building, level: 4 }]),
    0,
  );
  grid = setHex(grid, { q: 3, r: 0 }, TerrainType.Clear, 0);
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);
  const blockedLanding = jump.find((r) => r.hex.q === 3 && r.hex.r === 0);

  expect(blockedLanding).toMatchObject({
    mpCost: 3,
    elevationDelta: 0,
    elevationCost: 0,
    terrainCost: 0,
    heatGenerated: 0,
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: 'Jump path height +4 at (1,0) exceeds jump clearance +3',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Jump path height +4 at (1,0) exceeds jump clearance +3',
  });
});

it('jump returns empty when unit has zero jumpMP', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);

  expect(jump).toEqual([]);
});

it('marks off-map jump landings with the engine out-of-bounds reason', () => {
  const grid = createHexGrid({ radius: 1 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 2 };

  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);
  const offMap = jump.find((r) => r.hex.q === 2 && r.hex.r === 0);

  expect(offMap).toMatchObject({
    reachable: false,
    heatGenerated: 0,
    movementType: MovementType.Jump,
    blockedReason: 'Destination is outside map bounds',
    movementInvalidReason: 'DestinationOutOfBounds',
    movementInvalidDetails: 'Destination is outside map bounds',
  });
});

it('returned hexes are sorted by ascending mpCost', () => {
  const grid = createHexGrid({ radius: 6 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  for (let i = 1; i < result.length; i++) {
    expect(result[i].mpCost).toBeGreaterThanOrEqual(result[i - 1].mpCost);
  }
});
