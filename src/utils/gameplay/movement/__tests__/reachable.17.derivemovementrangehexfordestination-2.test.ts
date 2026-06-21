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
  it('uses infantry terrain profile for woods and elevation costs', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 0);
    grid = setHex(grid, { q: 0, r: 1 }, TerrainType.Clear, 1);
    const southeastFacingUnit = {
      ...makeUnitAtOrigin(),
      facing: Facing.Southeast,
    };
    const southFacingUnit = {
      ...makeUnitAtOrigin(),
      facing: Facing.South,
    };
    const cap: IMovementCapability = {
      walkMP: 1,
      runMP: 1,
      jumpMP: 0,
      movementMode: 'walk',
      movementTerrainProfile: 'infantry',
    };

    const woodsProjection = deriveMovementRangeHexForDestination(
      southeastFacingUnit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );
    const elevationProjection = deriveMovementRangeHexForDestination(
      southFacingUnit,
      MovementType.Walk,
      grid,
      cap,
      { q: 0, r: 1 },
    );

    expect(woodsProjection).toMatchObject({
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      movementMode: 'walk',
    });
    expect(elevationProjection).toMatchObject({
      reachable: false,
      mpCost: 3,
      terrainCost: 0,
      elevationDelta: 1,
      elevationCost: 2,
      movementInvalidReason: 'InsufficientMP',
    });
  });
});
