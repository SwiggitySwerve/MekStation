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

it.each([
  {
    label: 'VTOL',
    movementMode: 'vtol',
    motionType: GroundMotionType.VTOL,
    reason: AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  },
  {
    label: 'WiGE',
    movementMode: 'wige',
    motionType: GroundMotionType.WIGE,
    reason: AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  },
] as const)(
  'blocks airborne $label ground projection while preserving landed movement',
  ({ movementMode, motionType, reason }) => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.HeavyWoods, 4);
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode,
    };
    const vehicleCombatState = (altitude: number) => ({
      kind: 'vehicle' as const,
      state: createVehicleCombatState({
        unitId: 'u1',
        motionType,
        originalCruiseMP: 3,
        armor: {},
        structure: {},
        altitude,
      }),
    });
    const airborneUnit = {
      ...makeUnitAtOrigin(),
      combatState: vehicleCombatState(2),
    };
    const landedUnit = {
      ...makeUnitAtOrigin(),
      combatState: vehicleCombatState(0),
    };

    const airbornePreview = deriveMovementRangeHexForDestination(
      airborneUnit,
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );
    if (movementMode === 'wige') {
      expect(airbornePreview).toMatchObject({
        mpCost: 1,
        terrainCost: 0,
        elevationDelta: 4,
        elevationCost: 0,
        movementMode,
        reachable: true,
        movementType: MovementType.Walk,
        automaticLandingRequired: true,
        automaticLandingMode: 'wige',
        automaticLandingDistance: 1,
        automaticLandingMinimumDistance: 5,
      });
    } else {
      expect(airbornePreview).toMatchObject({
        mpCost: Infinity,
        heatGenerated: 0,
        movementMode,
        reachable: false,
        movementType: MovementType.Walk,
        blockedReason: reason,
        movementInvalidReason: 'InvalidDestination',
        movementInvalidDetails: reason,
        altitudeControlRequired: true,
        altitudeControlMode: movementMode,
        altitudeControlAltitude: 2,
      });
    }

    const commit = validateCommittedMovement({
      grid,
      unit: airborneUnit,
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      capability,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    if (movementMode === 'wige') {
      expect(commit).toMatchObject({
        valid: true,
        mpCost: 1,
        heatGenerated: 0,
      });
    } else {
      expect(commit).toMatchObject({
        valid: false,
        reason: 'InvalidDestination',
        details: reason,
        mpCost: Infinity,
        heatGenerated: 0,
      });
    }

    const landedPreview = deriveMovementRangeHexForDestination(
      landedUnit,
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );
    expect(landedPreview).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      elevationDelta: 4,
      elevationCost: 0,
      movementMode,
      reachable: true,
      movementType: MovementType.Walk,
    });

    const staleCapability: IMovementCapability = {
      ...capability,
      movementMode: 'walk',
    };
    const stalePreview = deriveMovementRangeHexForDestination(
      airborneUnit,
      MovementType.Walk,
      grid,
      staleCapability,
      { q: 1, r: 0 },
    );
    expect(stalePreview).toMatchObject({
      mpCost: Infinity,
      heatGenerated: 0,
      movementMode: 'walk',
      reachable: false,
      movementType: MovementType.Walk,
      blockedReason: reason,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: reason,
      altitudeControlRequired: true,
      altitudeControlMode: movementMode,
      altitudeControlAltitude: 2,
    });

    const staleCommit = validateCommittedMovement({
      grid,
      unit: airborneUnit,
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      capability: staleCapability,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    expect(staleCommit).toMatchObject({
      valid: false,
      reason: 'InvalidDestination',
      details: reason,
      mpCost: Infinity,
      heatGenerated: 0,
    });
  },
);

it('counts prior WiGE movement before showing automatic landing metadata', () => {
  let grid = createHexGrid({ radius: 5 });
  grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
  grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
  const capability: IMovementCapability = {
    walkMP: 5,
    runMP: 7,
    jumpMP: 0,
    movementMode: 'wige',
  };
  const unit = {
    ...makeUnitAtOrigin(),
    hexesMovedThisTurn: 4,
    combatState: {
      kind: 'vehicle' as const,
      state: createVehicleCombatState({
        unitId: 'u1',
        motionType: GroundMotionType.WIGE,
        originalCruiseMP: 5,
        armor: {},
        structure: {},
        altitude: 2,
      }),
    },
  };

  const preview = deriveMovementRangeHexForDestination(
    unit,
    MovementType.Walk,
    grid,
    capability,
    { q: 1, r: 0 },
  );

  expect(preview).toMatchObject({
    mpCost: 1,
    movementMode: 'wige',
    reachable: true,
    movementType: MovementType.Walk,
  });
  expect(preview?.automaticLandingRequired).toBeUndefined();
  expect(preview?.automaticLandingDistance).toBeUndefined();
});
