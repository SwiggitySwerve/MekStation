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

it('derives TacOps Evade reach from the run MP envelope', () => {
  const grid = createHexGrid({ radius: 8 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);
  const evade = deriveReachableHexes(unit, MovementType.Evade, grid, cap);

  expect(evade.length).toBe(run.length);
  expect(
    evade.every((entry) => entry.movementType === MovementType.Evade),
  ).toBe(true);
  expect(evade.map((entry) => entry.mpCost)).toEqual(
    run.map((entry) => entry.mpCost),
  );
});

it('derives TacOps Sprint reach from the sprint MP envelope using run terrain costs', () => {
  const grid = createHexGrid({ radius: 10 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);
  const sprint = deriveReachableHexes(unit, MovementType.Sprint, grid, cap);

  expect(sprint.length).toBeGreaterThan(run.length);
  expect(
    sprint.every((entry) => entry.movementType === MovementType.Sprint),
  ).toBe(true);
  const reachableSprint = sprint.filter((entry) => entry.reachable);
  expect(reachableSprint.every((entry) => entry.mpCost <= 10)).toBe(true);
  expect(reachableSprint.some((entry) => entry.mpCost > 8)).toBe(true);
  expect(
    sprint.some((entry) => !entry.reachable && (entry.turningCost ?? 0) > 0),
  ).toBe(true);
});

it('uses heat-penalized MP for movement overlays', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = { ...makeUnitAtOrigin(), heat: 10 };
  const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  expect(result.some((entry) => entry.hex.q === 3 && entry.hex.r === 0)).toBe(
    true,
  );
  expect(result.some((entry) => entry.hex.q === 4 && entry.hex.r === 0)).toBe(
    false,
  );
});

it('marks occupied landing and destination hexes blocked', () => {
  let grid = createHexGrid({ radius: 4 });
  grid = setOccupant(grid, { q: 1, r: 0 }, 'enemy-1');
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap).find(
    (r) => r.hex.q === 1 && r.hex.r === 0,
  );
  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap).find(
    (r) => r.hex.q === 1 && r.hex.r === 0,
  );

  expect(walk).toMatchObject({
    reachable: false,
    heatGenerated: 0,
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
  });
  expect(jump).toMatchObject({
    reachable: false,
    heatGenerated: 0,
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
  });
});

it('marks follow-up movement from another unit occupied start hex blocked', () => {
  let grid = createHexGrid({ radius: 4 });
  grid = setOccupant(grid, { q: 0, r: 0 }, 'enemy-1');
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap).find(
    (r) => r.hex.q === 1 && r.hex.r === 0,
  );

  expect(walk).toMatchObject({
    reachable: false,
    heatGenerated: 0,
    blockedReason:
      'Unit cannot make follow-up movement from a start hex occupied by another unit',
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails:
      'Unit cannot make follow-up movement from a start hex occupied by another unit',
  });
});

it('marks shutdown units immobile in movement projection', () => {
  const grid = createHexGrid({ radius: 4 });
  const unit = { ...makeUnitAtOrigin(), shutdown: true };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap).find(
    (r) => r.hex.q === 1 && r.hex.r === 0,
  );
  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap).find(
    (r) => r.hex.q === 1 && r.hex.r === 0,
  );

  expect(walk).toMatchObject({
    reachable: false,
    mpCost: 0,
    heatGenerated: 0,
    blockedReason: 'Unit is shut down and cannot move',
    movementInvalidReason: 'UnitImmobile',
    movementInvalidDetails: 'Unit is shut down and cannot move',
  });
  expect(jump).toMatchObject({
    reachable: false,
    mpCost: 0,
    heatGenerated: 0,
    movementInvalidReason: 'UnitImmobile',
    movementInvalidDetails: 'Unit is shut down and cannot move',
  });
});

it('jump reach is a flat hex-distance gate on clear paths', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);

  // All returned hexes are within jump distance 3 and are marked Jump.
  for (const entry of jump) {
    expect(entry.movementType).toBe(MovementType.Jump);
    expect(entry.mpCost).toBeLessThanOrEqual(3);
    expect(entry.terrainCost).toBe(0);
    expect(entry.elevationCost).toBe(0);
    expect(entry.heatGenerated).toBeGreaterThanOrEqual(3);
  }

  // Origin hex is excluded.
  const origin = jump.find((r) => r.hex.q === 0 && r.hex.r === 0);
  expect(origin).toBeUndefined();

  // A hex at distance 3 (e.g., q=3, r=0) is reachable.
  const far = jump.find((r) => r.hex.q === 3 && r.hex.r === 0);
  expect(far).toBeDefined();
  expect(far?.mpCost).toBe(3);
  expect(far?.heatGenerated).toBe(3);
});

it('caps jump landing rise by jump MP while allowing equal rises and drops', () => {
  let grid = createHexGrid({ radius: 5 });
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 3);
  grid = setHex(grid, { q: 0, r: 2 }, TerrainType.Clear, 2);
  grid = setHex(grid, { q: -2, r: 0 }, TerrainType.Clear, -5);
  const unit = makeUnitAtOrigin();
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 2 };

  const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);
  const tooHigh = jump.find((r) => r.hex.q === 1 && r.hex.r === 0);
  const equalRise = jump.find((r) => r.hex.q === 0 && r.hex.r === 2);
  const drop = jump.find((r) => r.hex.q === -2 && r.hex.r === 0);

  expect(tooHigh).toMatchObject({
    mpCost: 1,
    elevationDelta: 3,
    elevationCost: 0,
    terrainCost: 0,
    heatGenerated: 0,
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: 'Jump elevation rise of 3 exceeds jump MP 2',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Jump elevation rise of 3 exceeds jump MP 2',
  });
  expect(equalRise).toMatchObject({
    mpCost: 2,
    elevationDelta: 2,
    elevationCost: 0,
    terrainCost: 0,
    heatGenerated: 3,
    reachable: true,
    movementType: MovementType.Jump,
  });
  expect(drop).toMatchObject({
    mpCost: 2,
    elevationDelta: -5,
    elevationCost: 0,
    terrainCost: 0,
    heatGenerated: 3,
    reachable: true,
    movementType: MovementType.Jump,
  });
});
