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

it('projects tracked road-bonus destinations one MP beyond base walking MP', () => {
  let grid = createHexGrid({ radius: 4 });
  for (const q of [1, 2, 3]) {
    grid = setHex(
      grid,
      { q, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Road, level: 1 }]),
      0,
    );
  }
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };

  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 2,
    runMP: 3,
    jumpMP: 0,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 3 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: 3,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it('gates represented infantry pavement bonus behind the TacOps option', () => {
  let grid = createHexGrid({ radius: 4 });
  for (const q of [1, 2, 3]) {
    grid = setHex(
      grid,
      { q, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Road, level: 1 }]),
      0,
    );
  }
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const mechanizedInfantry: IMovementCapability = {
    walkMP: 2,
    runMP: 2,
    jumpMP: 0,
    movementMode: 'tracked',
    movementHeatProfile: 'none',
    pavementRoadBonusProfile: 'tacops_infantry',
  };

  const disabled = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    mechanizedInfantry,
    { q: 3, r: 0 },
  );
  const enabled = deriveReachableHexes(
    unit,
    MovementType.Walk,
    grid,
    mechanizedInfantry,
    'normal',
    { optionalRules: ['tacops_inf_pave_bonus'] },
  ).find((r) => r.hex.q === 3 && r.hex.r === 0);

  expect(disabled).toMatchObject({
    reachable: false,
    movementMode: 'tracked',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails:
      'Destination is 3 hexes away, but max range for walk is 2',
  });
  expect(enabled).toMatchObject({
    mpCost: 3,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it('requires dirt and gravel road bonus paths to match MegaMek motive eligibility', () => {
  let dirtGrid = createHexGrid({ radius: 4 });
  let gravelGrid = createHexGrid({ radius: 4 });
  for (const q of [1, 2, 3]) {
    dirtGrid = setHex(
      dirtGrid,
      { q, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Road, level: 3 }]),
      0,
    );
    gravelGrid = setHex(
      gravelGrid,
      { q, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Road, level: 4 }]),
      0,
    );
  }
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };
  const baseCapability = { walkMP: 2, runMP: 3, jumpMP: 0 } as const;

  const hoverDirt = deriveReachableHexes(unit, MovementType.Walk, dirtGrid, {
    ...baseCapability,
    movementMode: 'hover',
  }).find((r) => r.hex.q === 3 && r.hex.r === 0);
  const trackedDirt = deriveReachableHexes(unit, MovementType.Walk, dirtGrid, {
    ...baseCapability,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 3 && r.hex.r === 0);
  const trackedGravel = deriveReachableHexes(
    unit,
    MovementType.Walk,
    gravelGrid,
    {
      ...baseCapability,
      movementMode: 'tracked',
    },
  ).find((r) => r.hex.q === 3 && r.hex.r === 0);
  const wheeledGravel = deriveReachableHexes(
    unit,
    MovementType.Walk,
    gravelGrid,
    {
      ...baseCapability,
      movementMode: 'wheeled',
    },
  ).find((r) => r.hex.q === 3 && r.hex.r === 0);

  expect(hoverDirt).toMatchObject({ reachable: true, mpCost: 3 });
  expect(trackedDirt).toMatchObject({
    reachable: false,
    mpCost: 3,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Path costs 3 MP, but only 2 MP is available',
  });
  expect(trackedGravel).toMatchObject({ reachable: true, mpCost: 3 });
  expect(wheeledGravel).toMatchObject({
    reachable: false,
    mpCost: 3,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Path costs 3 MP, but only 2 MP is available',
  });
});

it('blocks naval movement under low bridges while letting submarines pass with depth clearance', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Bridge, level: 0 },
    ]),
    0,
  );
  const unit = { ...makeUnitAtOrigin(), facing: Facing.Southeast };

  const naval = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'naval',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);
  const submarine = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'submarine',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(naval).toMatchObject({
    reachable: false,
    movementMode: 'naval',
    blockedReason: 'Naval movement lacks bridge clearance',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Naval movement lacks bridge clearance',
  });
  expect(submarine).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'submarine',
    reachable: true,
  });
});
