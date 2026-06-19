import { describe, expect, it } from '@jest/globals';

import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON,
  GroundMotionType,
  MovementType,
  ProtoChassis,
  createAerospaceCombatState,
  createProtoMechCombatState,
  createVehicleCombatState,
  resolveRuntimeMovementCapability,
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
  runtimeUnitHeightForMovement,
  type IMovementCapability,
  unitState,
} from './runtimeCapability.test-helpers';

describe('runtime movement capability', () => {
  it('projects LAM AirMek conversion as WiGE motive, AirMek MP, and height zero from runtime state', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 2,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'airmek' }),
        capability,
      ),
    ).toMatchObject({
      walkMP: 6,
      runMP: 9,
      movementMode: 'wige',
      movementHeatProfile: 'airmek',
      unitHeight: 0,
    });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 1 }),
        capability,
      ),
    ).toMatchObject({
      walkMP: 6,
      runMP: 9,
      movementMode: 'wige',
      movementHeatProfile: 'airmek',
      unitHeight: 0,
    });
    expect(
      runtimeUnitHeightForMovement(
        unitState({ conversionMode: 'mek' }),
        capability,
      ),
    ).toBe(1);
  });

  it('projects grounded LAM Fighter conversion as wheeled aerospace taxi movement from runtime state', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 5,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    const resolved = resolveRuntimeMovementCapability(
      unitState({ conversionMode: 'fighter' }),
      capability,
    );

    expect(resolved).toMatchObject({
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
      conversionThrustMP: 5,
      movementMode: 'wheeled',
      unitHeight: 0,
    });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'fighter' }),
        resolved,
      ),
    ).toEqual(resolved);
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 2 }),
        capability,
      ),
    ).toMatchObject({
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
      movementMode: 'wheeled',
      unitHeight: 0,
    });
  });

  it('keeps airborne LAM Fighter conversion on aerospace thrust and blocks ground projection fallback', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 5,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };
    const airborneFighter = unitState({
      conversionMode: 'fighter',
      combatState: {
        kind: 'aero',
        state: createAerospaceCombatState({
          maxSI: 3,
          armorByArc: { nose: 1, leftWing: 1, rightWing: 1, aft: 1 },
          heatSinks: 10,
          fuelPoints: 20,
          safeThrust: 5,
          maxThrust: 8,
          altitude: 1,
          currentVelocity: 5,
          nextVelocity: 5,
          airborneState: 'airborne',
        }),
      },
    });

    const resolved = resolveRuntimeMovementCapability(
      airborneFighter,
      capability,
    );

    expect(resolved).toMatchObject({
      walkMP: 5,
      runMP: 8,
      jumpMP: 0,
      conversionThrustMP: 5,
      unitHeight: 0,
    });
    expect(
      runtimeMovementProjectionBlockedReason(
        airborneFighter,
        capability,
        'walk',
      ),
    ).toBe(AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON);
    expect(
      runtimeMovementProjectionBlockedReason(
        unitState({ conversionMode: 'fighter' }),
        capability,
        'wheeled',
      ),
    ).toBeUndefined();
  });

  it('keeps airborne LAM AirMek conversion on WiGE capability but blocks ground projection fallback', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 2,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };
    const airborneAirMek = unitState({
      conversionMode: 'airmek',
      combatState: {
        kind: 'aero',
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
    });

    expect(
      resolveRuntimeMovementCapability(airborneAirMek, capability),
    ).toMatchObject({
      walkMP: 6,
      runMP: 9,
      movementMode: 'wige',
      movementHeatProfile: 'airmek',
      unitHeight: 0,
    });
    expect(
      runtimeMovementProjectionBlockedReason(
        airborneAirMek,
        capability,
        'wige',
      ),
    ).toBe(AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON);
    expect(
      runtimeMovementProjectionBlockedReason(
        unitState({ conversionMode: 'airmek' }),
        capability,
        'wige',
      ),
    ).toBeUndefined();

    const elevatedAirMek = unitState({
      conversionMode: 'airmek',
      lamAirMekAltitude: 2,
    });

    expect(
      runtimeMovementProjectionBlockedReason(
        elevatedAirMek,
        capability,
        'wige',
      ),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(elevatedAirMek)).toMatchObject(
      {
        altitudeControlRequired: true,
        altitudeControlMode: 'wige',
        altitudeControlAltitude: 2,
        blockedReason: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
      },
    );
    expect(
      runtimeMovementAltitudeControlContext(
        unitState({ conversionMode: 'airmek', lamAirMekAltitude: 0 }),
      ),
    ).toBeUndefined();
    expect(
      runtimeMovementAltitudeControlContext(
        unitState({ conversionMode: 'mek', lamAirMekAltitude: 2 }),
      ),
    ).toBeUndefined();
  });
});
