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

it.each(['left_arm', 'front_left_leg'] as const)(
  'requires the normal stand-up PSR when a quad leg is destroyed as %s',
  (destroyedLocation) => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      destroyedLocations: [destroyedLocation],
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
      standUpPsrRequired: true,
      standUpPsrReason: 'Standing up',
      standUpPsrTargetNumber: 5,
      standUpPsrModifier: 0,
      standUpPsrModifierDetails: [],
    });
    expect(projected?.standUpPsrAutomaticSuccessReason).toBeUndefined();
  },
);

it('projects TacOps careful stand as a whole-turn stand with the PSR bonus', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = { ...makeUnitAtOrigin(), prone: true };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
    'careful',
  );

  expect(projected).toMatchObject({
    mpCost: 4,
    heatGenerated: 0,
    reachable: false,
    movementType: MovementType.Walk,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: 'Careful stand consumes the movement for this turn',
    standUpRequired: true,
    standUpMode: 'careful',
    standUpCost: 4,
    standUpPsrRequired: true,
    standUpPsrTargetNumber: 3,
    standUpPsrModifier: -2,
    standUpPsrModifierDetails: ['Careful stand -2'],
  });
});

it('projects prone jump attempts as blocked until the unit stands', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = { ...makeUnitAtOrigin(), prone: true };
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
    movementInvalidDetails: 'Unit is prone and must stand before jumping',
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrTargetNumber: 5,
  });
});

it('blocks prone ground projection when destroyed leg plus both arms makes standing impossible', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    prone: true,
    destroyedLocations: ['left_leg', 'left_arm', 'right_arm'],
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
  );

  expect(projected).toMatchObject({
    mpCost: 2,
    reachable: false,
    movementType: MovementType.Walk,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails:
      'Cannot stand with a destroyed leg and both arms destroyed',
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrImpossibleReason:
      'Cannot stand with a destroyed leg and both arms destroyed',
  });
});

it('blocks prone ground projection when a destroyed gyro makes standing impossible', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    prone: true,
    componentDamage: makeComponentDamage({ gyroHits: 2 }),
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
  );

  expect(projected).toMatchObject({
    mpCost: 2,
    reachable: false,
    movementType: MovementType.Walk,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: 'Cannot stand with a destroyed gyro',
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrTargetNumber: Infinity,
    standUpPsrModifier: 6,
    standUpPsrModifierDetails: ['Gyro damage +6'],
    standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
  });
});

it('blocks standing non-tracked movement when the gyro is destroyed', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    componentDamage: makeComponentDamage({ gyroHits: 2 }),
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

  const walkProjection = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
  );
  const jumpProjection = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Jump,
    grid,
    cap,
    { q: 1, r: 0 },
  );

  expect(walkProjection).toMatchObject({
    mpCost: Infinity,
    reachable: false,
    movementType: MovementType.Walk,
    blockedReason: 'Destroyed gyro only permits tracked or wheeled movement',
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails:
      'Destroyed gyro only permits tracked or wheeled movement',
  });
  expect(jumpProjection).toMatchObject({
    mpCost: Infinity,
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: 'Destroyed gyro only permits tracked or wheeled movement',
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails:
      'Destroyed gyro only permits tracked or wheeled movement',
  });
});
