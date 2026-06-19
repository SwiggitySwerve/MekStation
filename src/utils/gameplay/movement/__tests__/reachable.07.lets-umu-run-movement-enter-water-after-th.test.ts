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

it('lets UMU run movement enter water after the first step', () => {
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

  const umu = deriveReachableHexes(unit, MovementType.Run, grid, {
    walkMP: 2,
    runMP: 2,
    jumpMP: 0,
    movementMode: 'umu',
    movementHeatProfile: 'none',
    movementTerrainProfile: 'infantry',
  }).find((r) => r.hex.q === 2 && r.hex.r === 0);

  expect(umu).toMatchObject({
    reachable: true,
    mpCost: 2,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'umu',
    movementType: MovementType.Run,
  });
});

it('keeps Mek swim movement in water and ignores represented elevation rises', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(
    grid,
    { q: 0, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    0,
  );
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    3,
  );
  grid = setHex(grid, { q: 0, r: 1 }, TerrainType.Clear, 0);
  const unit = makeUnitAtOrigin();
  const capability = {
    walkMP: 1,
    runMP: 1,
    jumpMP: 0,
    movementMode: 'biped_swim',
  } as const;

  const elevatedWater = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );
  const dryLand = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    capability,
    { q: 0, r: 1 },
  );

  expect(elevatedWater).toMatchObject({
    reachable: true,
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 3,
    elevationCost: 0,
    heatGenerated: 1,
    movementMode: 'biped_swim',
    movementType: MovementType.Walk,
  });
  expect(dryLand).toMatchObject({
    reachable: false,
    blockedReason: 'Biped swim movement requires water terrain',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Biped swim movement requires water terrain',
  });
});

it('lets tracked movement cross ice-covered water as surface terrain', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Ice, level: 1 },
    ]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  // Audit 2026-06-09 C-3: ice charges +1 to tracked (only hover/WiGE are
  // exempt per MegaMek Terrain.movementCost) — the surface crossing stays
  // legal but is no longer free.
  expect(tracked).toMatchObject({
    mpCost: 2,
    terrainCost: 1,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it('lets tracked movement cross bridge-covered water as surface terrain', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Bridge, level: 1 },
    ]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it('lets tracked movement cross paved-road water as surface terrain', () => {
  let grid = createHexGrid({ radius: 3 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(
    grid,
    { q: 1, r: 0 },
    terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Road, level: 1 },
    ]),
    0,
  );
  const unit = makeUnitAtOrigin();

  const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    movementMode: 'tracked',
  }).find((r) => r.hex.q === 1 && r.hex.r === 0);

  expect(tracked).toMatchObject({
    mpCost: 1,
    terrainCost: 0,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
  });
});

it.each([3, 4] as const)(
  'blocks tracked movement from treating road level %i water as paved surface',
  (roadLevel) => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Road, level: roadLevel },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: Infinity,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: false,
      blockedReason: 'Water blocks ground movement',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Water blocks ground movement',
    });
  },
);
