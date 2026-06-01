import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON,
  resolveRuntimeMovementCapability,
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
  runtimeUnitHeightForMovement,
} from '@/utils/gameplay/movement/runtimeCapability';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

function unitState(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    id: 'unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

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

  it('projects QuadVee vehicle mode as tracked motive, height zero, and no jumping from runtime state', () => {
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'quadvee', standingHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'tracked' }),
        capability,
      ),
    ).toMatchObject({ jumpMP: 0, movementMode: 'tracked', unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'wheeled' }),
        capability,
      ),
    ).toMatchObject({ jumpMP: 0, movementMode: 'wheeled', unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 0 }),
        capability,
      ),
    ).toBe(capability);
  });

  it('lets runtime infantry mount and dismount state override imported height', () => {
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 3,
      jumpMP: 0,
      unitHeight: 1,
      unitHeightProfile: { kind: 'infantry_mount', mountedHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: false }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: false, unitHeight: 1 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 0 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: true, infantryMountHeight: 2 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 2 });
    expect(
      resolveRuntimeMovementCapability(
        unitState({ infantryMounted: true, unitHeight: 2 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 2 });
  });

  it('uses explicit runtime unit height before conversion or mount profiles', () => {
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      unitHeight: 0,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    expect(
      resolveRuntimeMovementCapability(
        unitState({ conversionMode: 'fighter', unitHeight: 2 }),
        capability,
      ),
    ).toMatchObject({ unitHeight: 2 });
  });
});
