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

it('projects represented TacOps destroyed-arm stand-up penalties', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    destroyedLocations: ['right_arm'],
  };
  const cap: IMovementCapability = {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    standUpCapability: { tacOpsAttemptingStand: true },
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
    standUpPsrTargetNumber: 7,
    standUpPsrModifier: 2,
    standUpPsrModifierDetails: ['Right arm destroyed +2'],
  });
});

it('projects represented Playtest2 trying-to-stand bonus', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
    'normal',
    { optionalRules: ['playtest_2'] },
  );

  expect(projected).toMatchObject({
    reachable: true,
    standUpPsrTargetNumber: 4,
    standUpPsrModifier: -1,
    standUpPsrModifierDetails: ['Trying to stand -1'],
  });
});

it('projects represented TacOps arm-actuator stand-up penalties per arm', () => {
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
    standUpCapability: {
      tacOpsAttemptingStand: true,
      armActuators: { right: 'hand', left: 'shoulder' },
    },
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
    standUpPsrTargetNumber: 7,
    standUpPsrModifier: 2,
    standUpPsrModifierDetails: [
      'Right arm hand actuator missing/destroyed +1',
      'Left arm shoulder actuator missing/destroyed +1',
    ],
  });
});

it('uses destroyed arm before represented TacOps arm-actuator checks', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    destroyedLocations: ['right_arm'],
  };
  const cap: IMovementCapability = {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    standUpCapability: {
      tacOpsAttemptingStand: true,
      armActuators: { right: 'hand' },
    },
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
    standUpPsrTargetNumber: 7,
    standUpPsrModifier: 2,
    standUpPsrModifierDetails: ['Right arm destroyed +2'],
  });
});

it('projects represented no-arms stand-up quirk before TacOps arm checks', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    destroyedLocations: ['right_arm', 'left_arm'],
  };
  const cap: IMovementCapability = {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    standUpCapability: {
      noMinimalArmsQuirk: true,
      tacOpsAttemptingStand: true,
    },
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
    standUpPsrTargetNumber: 7,
    standUpPsrModifier: 2,
    standUpPsrModifierDetails: ['No/minimal arms +2'],
  });
});

it('reports terrain and elevation costs for reachable ground movement', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 1);
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = { walkMP: 3, runMP: 5, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const elevatedWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  expect(elevatedWoods).toMatchObject({
    mpCost: 3,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    heatGenerated: 1,
    reachable: true,
    movementType: MovementType.Walk,
  });
  expect(elevatedWoods?.path).toEqual([
    { q: 0, r: 0 },
    { q: 1, r: 0 },
  ]);
});

it('prices encoded multi-feature terrain consistently with grid terrain projection', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Rough, level: 1 },
      { type: TerrainType.HeavyWoods, level: 1 },
    ]),
    0,
  );
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

  const encodedHeavyWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
  // Audit 2026-06-09 C-4: MegaMek Hex.movementCost sums every terrain
  // feature in the hex, so rough + heavy woods now charges 1 + 1 + 2 = 4
  // (the old primary-feature lookup charged only the woods).
  expect(encodedHeavyWoods).toMatchObject({
    mpCost: 4,
    terrainCost: 3,
    elevationDelta: 0,
    elevationCost: 0,
    reachable: true,
    movementType: MovementType.Walk,
  });
});
