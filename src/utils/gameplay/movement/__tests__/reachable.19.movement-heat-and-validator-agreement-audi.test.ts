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
  it('keeps airborne LAM AirMek Nightwalker out of low-light ground projection', () => {
    const grid = createHexGrid({ radius: 3 });
    const target = { q: 0, r: -1 };
    const night = createEnvironmentalConditions({ light: 'night' });
    const airborneNightwalker = {
      ...makeUnitAtOrigin(),
      abilities: ['tm_nightwalker'],
      conversionMode: 'airmek' as const,
      combatState: {
        kind: 'aero' as const,
        state: createAerospaceCombatState({
          maxSI: 3,
          armorByArc: { nose: 1, leftWing: 1, rightWing: 1, aft: 1 },
          heatSinks: 10,
          fuelPoints: 20,
          safeThrust: 5,
          maxThrust: 8,
          altitude: 1,
          currentVelocity: 2,
          nextVelocity: 2,
          airborneState: 'airborne',
        }),
      },
    };
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 2,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    const projection = deriveMovementRangeHexForDestination(
      airborneNightwalker,
      MovementType.Walk,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );

    expect(projection).toMatchObject({
      reachable: false,
      blockedReason: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
      movementInvalidDetails:
        AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    });

    const commit = validateCommittedMovement({
      grid,
      unit: airborneNightwalker,
      to: target,
      facing: Facing.North,
      movementType: MovementType.Walk,
      capability,
      environmentalConditions: night,
    });
    expect(commit).toMatchObject({
      valid: false,
      reason: 'InvalidDestination',
      details: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    });
  });

  it('surfaces validateMovement disagreement instead of silently committing the permissive side', () => {
    const grid = createHexGrid({ radius: 3 });
    const unit = makeUnitAtOrigin(); // facing North
    const capability: IMovementCapability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    // The projection (canonical) reaches the adjacent hex for 1 MP; it does
    // not model facing. validateMovement additionally charges 3 turning MP
    // for the 180° facing change and rejects. The commit must stay
    // projection-authoritative but cannot stay silent about the split.
    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 0, r: -1 },
    );
    expect(projection).toMatchObject({ reachable: true, mpCost: 1 });

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 0, r: -1 },
      facing: Facing.South,
      movementType: MovementType.Walk,
      capability,
    });
    if (!commit.valid) {
      throw new Error('expected projection-backed commit to stay valid');
    }
    expect(commit.mpCost).toBe(1);
    expect(commit.validatorDisagreement).toBeDefined();
    expect(commit.validatorDisagreement).toContain('max range');
  });

  it('reports no validator disagreement when both validators accept', () => {
    const grid = createHexGrid({ radius: 3 });
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 0, r: -1 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      capability,
    });
    if (!commit.valid) {
      throw new Error('expected commit to be valid');
    }
    expect(commit.validatorDisagreement).toBeUndefined();
  });
});
