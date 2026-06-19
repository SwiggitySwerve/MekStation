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
  it('blocks represented airborne VTOL and WiGE vehicles from ground movement projection fallback', () => {
    const cases = [
      {
        movementMode: 'vtol',
        motionType: GroundMotionType.VTOL,
        reason: AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
      },
      {
        movementMode: 'wige',
        motionType: GroundMotionType.WIGE,
        reason: AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
      },
    ] as const;

    for (const { movementMode, motionType, reason } of cases) {
      const capability: IMovementCapability = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode,
      };
      const airborneVehicle = unitState({
        combatState: {
          kind: 'vehicle',
          state: createVehicleCombatState({
            unitId: 'unit',
            motionType,
            originalCruiseMP: 4,
            armor: {},
            structure: {},
            altitude: 2,
          }),
        },
      });
      const landedVehicle = unitState({
        combatState: {
          kind: 'vehicle',
          state: createVehicleCombatState({
            unitId: 'unit',
            motionType,
            originalCruiseMP: 4,
            armor: {},
            structure: {},
            altitude: 0,
          }),
        },
      });

      expect(
        runtimeMovementProjectionBlockedReason(
          airborneVehicle,
          capability,
          movementMode,
        ),
      ).toBe(movementMode === 'wige' ? undefined : reason);
      expect(
        runtimeMovementAltitudeControlContext(airborneVehicle),
      ).toMatchObject({
        altitudeControlRequired: true,
        altitudeControlMode: movementMode,
        altitudeControlAltitude: 2,
        blockedReason: reason,
      });
      expect(
        runtimeMovementProjectionBlockedReason(
          landedVehicle,
          capability,
          movementMode,
        ),
      ).toBeUndefined();
      expect(
        runtimeMovementAltitudeControlContext(landedVehicle),
      ).toBeUndefined();
    }
  });

  it('surfaces airborne ProtoMek Gliders as WiGE altitude-control owners', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'wige',
    };
    const airborneGlider = unitState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'unit',
          chassisType: ProtoChassis.GLIDER,
          hasMainGun: false,
          armorByLocation: {},
          structureByLocation: {},
          altitude: 2,
        }),
      },
    });
    const groundedGlider = unitState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'unit',
          chassisType: ProtoChassis.GLIDER,
          hasMainGun: false,
          armorByLocation: {},
          structureByLocation: {},
          altitude: 0,
        }),
      },
    });
    const airborneBiped = unitState({
      combatState: {
        kind: 'proto',
        state: createProtoMechCombatState({
          unitId: 'unit',
          chassisType: ProtoChassis.BIPED,
          hasMainGun: false,
          armorByLocation: {},
          structureByLocation: {},
          altitude: 2,
        }),
      },
    });

    expect(
      runtimeMovementProjectionBlockedReason(
        airborneGlider,
        capability,
        'wige',
      ),
    ).toBeUndefined();
    expect(runtimeMovementAltitudeControlContext(airborneGlider)).toMatchObject(
      {
        altitudeControlRequired: true,
        altitudeControlMode: 'wige',
        altitudeControlAltitude: 2,
      },
    );
    expect(
      runtimeMovementAltitudeControlContext(groundedGlider),
    ).toBeUndefined();
    expect(
      runtimeMovementAltitudeControlContext(airborneBiped),
    ).toBeUndefined();
  });

  it('uses represented airborne vehicle motion type when movement capability motive is stale', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'walk',
    };
    const airborneWige = unitState({
      combatState: {
        kind: 'vehicle',
        state: createVehicleCombatState({
          unitId: 'unit',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 4,
          armor: {},
          structure: {},
          altitude: 2,
        }),
      },
    });
    const landedWige = unitState({
      combatState: {
        kind: 'vehicle',
        state: createVehicleCombatState({
          unitId: 'unit',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 4,
          armor: {},
          structure: {},
          altitude: 0,
        }),
      },
    });

    expect(
      runtimeMovementProjectionBlockedReason(airborneWige, capability, 'walk'),
    ).toBe(AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON);
    expect(
      runtimeMovementProjectionBlockedReason(landedWige, capability, 'walk'),
    ).toBeUndefined();
  });

  it('blocks destroyed-gyro non-tracked movement while preserving tracked and wheeled exceptions', () => {
    const destroyedGyro = unitState({
      componentDamage: {
        engineHits: 0,
        gyroHits: 2,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    });
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
      movementMode: 'walk',
    };

    expect(
      runtimeMovementProjectionBlockedReason(destroyedGyro, capability, 'walk'),
    ).toBe(DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON);
    expect(
      runtimeMovementProjectionBlockedReason(destroyedGyro, capability, 'jump'),
    ).toBe(DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON);
    expect(
      runtimeMovementProjectionBlockedReason(
        destroyedGyro,
        { ...capability, movementMode: 'tracked' },
        'tracked',
      ),
    ).toBeUndefined();
    expect(
      runtimeMovementProjectionBlockedReason(
        destroyedGyro,
        { ...capability, movementMode: 'wheeled' },
        'wheeled',
      ),
    ).toBeUndefined();
  });
});
