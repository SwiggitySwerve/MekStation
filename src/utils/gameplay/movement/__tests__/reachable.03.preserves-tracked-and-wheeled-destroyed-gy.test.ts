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

it('preserves tracked and wheeled destroyed-gyro movement exceptions', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    componentDamage: makeComponentDamage({ gyroHits: 2 }),
  };

  const trackedProjection = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    { walkMP: 4, runMP: 6, jumpMP: 0, movementMode: 'tracked' },
    { q: 1, r: 0 },
  );
  const wheeledProjection = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    { walkMP: 4, runMP: 6, jumpMP: 0, movementMode: 'wheeled' },
    { q: 1, r: 0 },
  );

  expect(trackedProjection).toMatchObject({
    mpCost: 1,
    reachable: true,
    movementMode: 'tracked',
  });
  expect(wheeledProjection).toMatchObject({
    mpCost: 1,
    reachable: true,
    movementMode: 'wheeled',
  });
});

it('keeps Playtest3 three-hit heavy-duty gyro ground movement unblocked', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    gyroType: GyroType.HEAVY_DUTY,
    componentDamage: makeComponentDamage({ gyroHits: 3 }),
  };

  const projection = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    { walkMP: 4, runMP: 6, jumpMP: 0 },
    { q: 1, r: 0 },
    'normal',
    { optionalRules: ['playtest_3'] },
  );

  expect(projection).toMatchObject({
    mpCost: 1,
    reachable: true,
    movementType: MovementType.Walk,
  });
});

it('keeps a two-hit heavy-duty gyro stand-up rollable instead of destroyed', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    gyroType: GyroType.HEAVY_DUTY,
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
    mpCost: 3,
    reachable: true,
    movementType: MovementType.Walk,
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrTargetNumber: 8,
    standUpPsrModifier: 3,
    standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
  });
  expect(projected?.standUpPsrImpossibleReason).toBeUndefined();
});

it('blocks prone ground projection when a heavy-duty gyro reaches three hits', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    gyroType: GyroType.HEAVY_DUTY,
    componentDamage: makeComponentDamage({ gyroHits: 3 }),
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
    standUpPsrModifier: 3,
    standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
    standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
  });
});

it('keeps a three-hit heavy-duty gyro rollable under Playtest3 rules', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    gyroType: GyroType.HEAVY_DUTY,
    componentDamage: makeComponentDamage({ gyroHits: 3 }),
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
    'normal',
    { optionalRules: ['playtest_3'] },
  );

  expect(projected).toMatchObject({
    mpCost: 3,
    reachable: true,
    movementType: MovementType.Walk,
    standUpRequired: true,
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrTargetNumber: 8,
    standUpPsrModifier: 3,
    standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
  });
  expect(projected?.standUpPsrImpossibleReason).toBeUndefined();
});

it('blocks Playtest3 heavy-duty gyro stand-up at four hits', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    gyroType: GyroType.HEAVY_DUTY,
    componentDamage: makeComponentDamage({ gyroHits: 4 }),
  };
  const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

  const projected = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    cap,
    { q: 1, r: 0 },
    'normal',
    { optionalRules: ['playtest_3'] },
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
    standUpPsrModifier: 3,
    standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
    standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
  });
});

it('projects stand-up PSR modifier details from represented pilot and gyro state', () => {
  const grid = createHexGrid({ radius: 5 });
  const unit = {
    ...makeUnitAtOrigin(),
    facing: Facing.Southeast,
    prone: true,
    piloting: 4,
    pilotWounds: 1,
    componentDamage: makeComponentDamage({ gyroHits: 1 }),
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
    reachable: true,
    standUpPsrTargetNumber: 8,
    standUpPsrModifier: 4,
    standUpPsrModifierDetails: ['Gyro damage +3', 'Pilot wounds +1'],
  });
});
