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

describe('movement heat and validator agreement (audit B-3/B-4)', () => {
  it('includes the Partial Wing bonus in projection and commit jump heat', () => {
    const grid = createHexGrid({ radius: 7 });
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 6,
      partialWingJumpBonus: 2,
    };

    // 6 jump hexes − wing bonus 2 → 4 heat (MegaMek Mek#getJumpHeat).
    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      capability,
      { q: 0, r: -6 },
    );
    expect(projection).toMatchObject({
      reachable: true,
      heatGenerated: 4,
    });

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 0, r: -6 },
      facing: Facing.North,
      movementType: MovementType.Jump,
      capability,
    });
    expect(commit).toMatchObject({
      valid: true,
      heatGenerated: 4,
    });
  });

  it('keeps validateMovement in agreement with the projection for motive-mode capabilities', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, TerrainType.Water);
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = {
      walkMP: 1,
      runMP: 2,
      jumpMP: 0,
      movementMode: 'hover',
    };

    // Hover pays no water-depth surcharge: the projection reaches the
    // depth-1 water hex for 1 MP with no movement heat.
    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 0, r: -1 },
    );
    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 1,
      heatGenerated: 0,
    });

    // validateMovement must path with the same motive mode and land on the
    // same MP cost + heat instead of charging Mek ground costs.
    const validation = validateMovement(
      grid,
      {
        unitId: unit.id,
        coord: unit.position,
        facing: unit.facing,
        prone: false,
      },
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      capability,
    );
    expect(validation.valid).toBe(true);
    expect(validation.mpCost).toBe(projection?.mpCost);
    expect(validation.heatGenerated).toBe(projection?.heatGenerated);
  });

  it('projects represented low-light Nightwalker movement relief and run prohibition', () => {
    const grid = createHexGrid({ radius: 3 });
    const target = { q: 0, r: -1 };
    const night = createEnvironmentalConditions({ light: 'night' });
    const unit = makeUnitAtOrigin();
    const nightwalker = { ...unit, abilities: ['tm_nightwalker'] };
    const capability: IMovementCapability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    const blockedWalk = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );
    const allowedNightwalkerWalk = deriveMovementRangeHexForDestination(
      nightwalker,
      MovementType.Walk,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );
    const blockedNightwalkerRun = deriveMovementRangeHexForDestination(
      nightwalker,
      MovementType.Run,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );

    expect(blockedWalk).toMatchObject({
      reachable: false,
      mpCost: 3,
      movementInvalidReason: 'InsufficientMP',
    });
    expect(allowedNightwalkerWalk).toMatchObject({
      reachable: true,
      mpCost: 1,
      movementType: MovementType.Walk,
    });
    expect(blockedNightwalkerRun).toMatchObject({
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: expect.stringContaining(
        'Nightwalker prohibits running',
      ),
    });

    const commit = validateCommittedMovement({
      grid,
      unit: nightwalker,
      to: target,
      facing: Facing.North,
      movementType: MovementType.Run,
      capability,
      environmentalConditions: night,
    });
    expect(commit).toMatchObject({
      valid: false,
      reason: 'TerrainBlocked',
      details: expect.stringContaining('Nightwalker prohibits running'),
    });
  });

  it.each<{ readonly light: LightCondition; readonly blockedCost: number }>([
    { light: 'full_moon', blockedCost: 2 },
    { light: 'glare', blockedCost: 2 },
    { light: 'moonless', blockedCost: 3 },
    { light: 'solar_flare', blockedCost: 3 },
    { light: 'pitch_black', blockedCost: 4 },
  ])(
    'projects MegaMek $light Nightwalker movement relief and run prohibition',
    ({ light, blockedCost }) => {
      const grid = createHexGrid({ radius: 3 });
      const target = { q: 0, r: -1 };
      const conditions = createEnvironmentalConditions({ light });
      const unit = makeUnitAtOrigin();
      const nightwalker = { ...unit, abilities: ['tm_nightwalker'] };
      const capability: IMovementCapability = {
        walkMP: 1,
        runMP: 2,
        jumpMP: 0,
      };

      const blockedWalk = deriveMovementRangeHexForDestination(
        unit,
        MovementType.Walk,
        grid,
        capability,
        target,
        'normal',
        { environmentalConditions: conditions },
      );
      const allowedNightwalkerWalk = deriveMovementRangeHexForDestination(
        nightwalker,
        MovementType.Walk,
        grid,
        capability,
        target,
        'normal',
        { environmentalConditions: conditions },
      );
      const blockedNightwalkerRun = deriveMovementRangeHexForDestination(
        nightwalker,
        MovementType.Run,
        grid,
        capability,
        target,
        'normal',
        { environmentalConditions: conditions },
      );

      expect(blockedWalk).toMatchObject({
        reachable: false,
        mpCost: blockedCost,
        movementInvalidReason: 'InsufficientMP',
      });
      expect(allowedNightwalkerWalk).toMatchObject({
        reachable: true,
        mpCost: 1,
        movementType: MovementType.Walk,
      });
      expect(blockedNightwalkerRun).toMatchObject({
        reachable: false,
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: expect.stringContaining(
          'Nightwalker prohibits running',
        ),
      });
    },
  );
});
