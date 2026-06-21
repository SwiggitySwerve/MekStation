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

it('returns empty array for Stationary movement type', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Stationary, grid, cap);

  expect(result).toEqual([]);
});

it('returns empty array when the MP budget is zero', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 0, runMP: 0, jumpMP: 0 };

  expect(deriveReachableHexes(unit, MovementType.Walk, grid, cap)).toEqual([]);
  expect(deriveReachableHexes(unit, MovementType.Jump, grid, cap)).toEqual([]);
});

it('derives walk reach for a 5-walk-MP unit on clear terrain', () => {
  const grid = createHexGrid({ radius: 6 });
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  // Every returned hex is marked reachable + walk-typed with cost ≤ 5.
  expect(result.length).toBeGreaterThan(0);
  const reachableEntries = result.filter((entry) => entry.reachable);
  expect(reachableEntries.length).toBeGreaterThan(0);
  for (const entry of reachableEntries) {
    expect(entry.reachable).toBe(true);
    expect(entry.movementType).toBe(MovementType.Walk);
    expect(entry.mpCost).toBeGreaterThan(0);
    expect(entry.mpCost).toBeLessThanOrEqual(5);
  }
  // A well-known direct neighbour (q=1, r=0) is 1 MP away on clear
  // terrain and must be in the set with cost 1.
  const neighbor = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(neighbor).toBeDefined();
  expect(neighbor?.mpCost).toBe(1);
});

it('subtracts normal stand-up MP before projecting prone ground reach', () => {
  const grid = createHexGrid({ radius: 6 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const maxStandingWalk = result.find(
    (entry) => entry.hex.q === 2 && entry.hex.r === 0,
  );
  expect(maxStandingWalk).toMatchObject({
    mpCost: 4,
    heatGenerated: 1,
    reachable: true,
    movementType: MovementType.Walk,
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrReason: 'Standing up',
    standUpPsrTargetNumber: 5,
    standUpPsrModifier: 0,
  });

  const tooFar = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 3, r: 0 },
  );
  expect(tooFar).toMatchObject({
    mpCost: 5,
    reachable: false,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails:
      'Destination is 3 hexes away, but max range for walk after standing is 2',
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
  });
});

it('subtracts MegaMek GET_UP MP before projecting hull-down ground reach', () => {
  const grid = createHexGrid({ radius: 6 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    hullDown: true,
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const maxHullDownWalk = result.find(
    (entry) => entry.hex.q === 2 && entry.hex.r === 0,
  );
  expect(maxHullDownWalk).toMatchObject({
    mpCost: 4,
    heatGenerated: 1,
    reachable: true,
    movementType: MovementType.Walk,
    hullDownExitRequired: true,
    hullDownExitCost: 2,
  });
  expect(maxHullDownWalk?.standUpRequired).toBeUndefined();

  const tooFar = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 3, r: 0 },
  );
  expect(tooFar).toMatchObject({
    mpCost: 5,
    reachable: false,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails:
      'Destination is 3 hexes away, but max range for walk after exit hull-down is 2',
    hullDownExitRequired: true,
    hullDownExitCost: 2,
  });

  const occupiedOriginGrid = setOccupant(grid, { q: 0, r: 0 }, 'u1');
  const sameHexExit = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    occupiedOriginGrid,
    cap,
    { q: 0, r: 0 },
  );
  expect(sameHexExit).toMatchObject({
    mpCost: 2,
    reachable: true,
    movementType: MovementType.Walk,
    hullDownExitRequired: true,
    hullDownExitCost: 2,
  });
});

it('does not apply Mek GET_UP hull-down exit costs to vehicle motive modes', () => {
  const grid = createHexGrid({ radius: 6 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    hullDown: true,
  };
  const cap: IMovementCapability = {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    movementMode: 'tracked',
    movementHeatProfile: 'none',
  };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const maxTrackedWalk = result.find(
    (entry) => entry.hex.q === 4 && entry.hex.r === 0,
  );
  expect(maxTrackedWalk).toMatchObject({
    mpCost: 4,
    heatGenerated: 0,
    reachable: true,
    movementType: MovementType.Walk,
  });
  expect(maxTrackedWalk?.hullDownExitRequired).toBeUndefined();
  expect(maxTrackedWalk?.hullDownExitCost).toBeUndefined();
});

it('projects hull-down jump attempts as blocked until the unit exits hull-down', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = { ...makeUnitAtOrigin(), hullDown: true };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Jump,
    grid,
    cap,
    { q: 1, r: 0 },
  );

  expect(projected).toMatchObject({
    mpCost: 2,
    heatGenerated: 0,
    reachable: false,
    movementType: MovementType.Jump,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: 'Unit is hull-down and must stand before jumping',
  });
  expect(projected?.hullDownExitRequired).toBeUndefined();
  expect(projected?.standUpRequired).toBeUndefined();
});

it('projects intact quad Mek stand-up as MP cost without a PSR', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
  };
  const cap: IMovementCapability = {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    standUpCapability: { standUpLegProfile: 'quad' },
  };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
  );

  expect(projected).toMatchObject({
    reachable: true,
    mpCost: 3,
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: false,
    standUpPsrReason:
      'Quad Mek has all four legs and does not need a stand-up PSR',
    standUpPsrModifier: 0,
    standUpPsrModifierDetails: [],
    standUpPsrAutomaticSuccessReason:
      'Quad Mek has all four legs and does not need a stand-up PSR',
  });
  expect(projected?.standUpPsrTargetNumber).toBeUndefined();
});
