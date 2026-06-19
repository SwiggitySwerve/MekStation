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

describe('deriveMovementRangeHexForDestination', () => {
  it('projects an on-map destination beyond MP with an engine-aligned insufficient-MP reason', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 4, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 4, r: 0 },
      mpCost: 4,
      reachable: false,
      movementType: MovementType.Walk,
      movementMode: 'walk',
      blockedReason: 'Destination is 4 hexes away, but max range for walk is 2',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 4 hexes away, but max range for walk is 2',
    });
  });

  it('projects a passable path that exceeds MP with terrain and elevation costs', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 2, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 3, r: 0 }, TerrainType.Clear, 2);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 3, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 3, r: 0 },
      mpCost: 5,
      terrainCost: 0,
      elevationDelta: 2,
      elevationCost: 2,
      reachable: false,
      movementType: MovementType.Walk,
      movementMode: 'walk',
      blockedReason: 'Path costs 5 MP, but only 4 MP is available',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: 'Path costs 5 MP, but only 4 MP is available',
    });
  });

  // Audit 2026-06-09 C-2: jump MP is heat-immune (MegaMek Mek.getJumpMP has
  // no heat term) — this test previously pinned the wrong pre-fix behavior
  // where heat 25 (penalty 5) zeroed a jump-2 capability.
  it('projects a reachable jump destination because jump MP is heat-immune', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), heat: 25 };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 2 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 1, r: 0 },
      mpCost: 1,
      heatGenerated: 3,
      reachable: true,
      movementType: MovementType.Jump,
      movementMode: 'jump',
    });
  });

  it('projects no-jump-jets hover destinations with the commit validator reason', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 1, r: 0 },
      mpCost: 0,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Jump,
      movementMode: 'jump',
      blockedReason: 'Unit cannot jump (no jump jets)',
      movementInvalidReason: 'JumpUnavailable',
      movementInvalidDetails: 'Unit cannot jump (no jump jets)',
    });
  });

  it('projects non-Mek walk-like units without Mek movement heat', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 3,
      jumpMP: 3,
      movementMode: 'walk',
      movementHeatProfile: 'none',
    };

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
      movementType: MovementType.Walk,
      movementMode: 'walk',
      reachable: true,
      heatGenerated: 0,
    });
    expect(jumpProjection).toMatchObject({
      movementType: MovementType.Jump,
      movementMode: 'jump',
      reachable: true,
      heatGenerated: 0,
    });
  });

  it('projects AirMek walk and run heat from used movement points', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 6,
      runMP: 9,
      jumpMP: 2,
      movementMode: 'wige',
      movementHeatProfile: 'airmek',
    };

    const walkProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 6, r: 0 },
    );
    const runProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Run,
      grid,
      cap,
      { q: 6, r: 0 },
    );

    expect(walkProjection).toMatchObject({
      movementType: MovementType.Walk,
      movementMode: 'wige',
      reachable: true,
      mpCost: 6,
      heatGenerated: 2,
    });
    expect(runProjection).toMatchObject({
      movementType: MovementType.Run,
      movementMode: 'wige',
      reachable: true,
      mpCost: 6,
      heatGenerated: 2,
    });
  });
});
