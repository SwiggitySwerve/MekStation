import * as H from './movementCommands.test-helpers';

const {
  ActuatorType,
  GamePhase,
  GroundMotionType,
  LockState,
  MovementType,
  TerrainType,
  buildMovementCommands,
  makeComponentDamage,
  makeCtx,
  makeMovementProjection,
  terrainStringFromFeatures,
} = H;

type IComponentDamageState = H.IComponentDamageState;
type IMovementRangeHex = H.IMovementRangeHex;
type ITacticalCommandContext = H.ITacticalCommandContext;
describe('movementCommands', () => {
  const commands = buildMovementCommands();

  it('adds represented VTOL and WiGE altitude controls as runtime state actions', () => {
    const vtolCtx = makeCtx({
      activeUnitProne: false,
      activeUnitVehicleMotionType: GroundMotionType.VTOL,
      activeUnitVehicleAltitude: 2,
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'vtol',
      },
    });
    const vtolCommands = buildMovementCommands(vtolCtx);
    const climb = vtolCommands.find((c) => c.id === 'movement.altitudeUp')!;
    const descend = vtolCommands.find((c) => c.id === 'movement.altitudeDown')!;

    expect(vtolCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining(['movement.altitudeUp', 'movement.altitudeDown']),
    );
    expect(climb.availability(vtolCtx)).toEqual({ available: true });
    expect(climb.commit(vtolCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        vehicleAltitude: 3,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });
    expect(descend.availability(vtolCtx)).toEqual({ available: true });
    expect(descend.commit(vtolCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        vehicleAltitude: 1,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });

    expect(
      climb.availability({ ...vtolCtx, activeUnitHasPlannedMovement: true }),
    ).toEqual({
      available: false,
      reason: 'Clear the current movement preview before changing altitude.',
    });
    expect(
      descend.availability({ ...vtolCtx, activeUnitVehicleAltitude: 0 }),
    ).toEqual({
      available: false,
      reason: 'Altitude controls are already at altitude 0.',
    });

    const wigeCtx = makeCtx({
      activeUnitProne: false,
      activeUnitVehicleMotionType: GroundMotionType.WIGE,
      activeUnitVehicleAltitude: 1,
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'wige',
      },
    });
    expect(climb.availability(wigeCtx)).toEqual({
      available: false,
      reason: 'Altitude controls are already at maximum altitude 1.',
    });

    expect(
      descend.availability({
        ...vtolCtx,
        activeUnitVehicleAltitude: 1,
        activeUnitTerrain: 'water',
      }),
    ).toEqual({
      available: false,
      reason:
        'Altitude controls cannot descend below altitude 1 over this terrain.',
    });
    expect(
      descend.availability({
        ...vtolCtx,
        activeUnitVehicleAltitude: 3,
        activeUnitTerrain: terrainStringFromFeatures([
          { type: TerrainType.HeavyWoods, level: 2 },
        ]),
      }),
    ).toEqual({
      available: false,
      reason:
        'Altitude controls cannot descend below altitude 3 over this terrain.',
    });
    expect(
      descend.availability({
        ...vtolCtx,
        activeUnitVehicleAltitude: 2,
        activeUnitTerrain: terrainStringFromFeatures([
          { type: TerrainType.Building, level: 2 },
        ]),
      }),
    ).toEqual({
      available: false,
      reason:
        'Altitude controls cannot descend below altitude 2 over this terrain.',
    });
    expect(
      descend.availability({
        ...vtolCtx,
        activeUnitVehicleAltitude: 2,
        activeUnitTerrain: terrainStringFromFeatures([
          { type: TerrainType.Bridge, level: 2 },
        ]),
      }),
    ).toEqual({
      available: false,
      reason:
        'Altitude controls cannot descend below altitude 2 over this terrain.',
    });
    expect(
      climb.availability({
        ...vtolCtx,
        activeUnitVehicleAltitude: 0,
        activeUnitTerrain: terrainStringFromFeatures([
          { type: TerrainType.Bridge, level: 2 },
        ]),
        movementCapability: {
          ...vtolCtx.movementCapability!,
          unitHeight: 1,
        },
      }),
    ).toEqual({
      available: false,
      reason: 'Bridge clearance blocks climbing from altitude 0.',
    });
    expect(
      climb.availability({
        ...wigeCtx,
        activeUnitVehicleAltitude: 1,
        activeUnitTerrain: terrainStringFromFeatures([
          { type: TerrainType.Building, level: 3 },
        ]),
      }),
    ).toEqual({ available: true });

    const protoGliderCtx = makeCtx({
      activeUnitProne: false,
      activeUnitProtoGlider: true,
      activeUnitProtoAltitude: 11,
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'wige',
      },
    });
    const protoCommands = buildMovementCommands(protoGliderCtx);
    const protoClimb = protoCommands.find(
      (c) => c.id === 'movement.altitudeUp',
    )!;
    const protoDescend = protoCommands.find(
      (c) => c.id === 'movement.altitudeDown',
    )!;
    expect(protoClimb.availability(protoGliderCtx)).toEqual({
      available: true,
    });
    expect(protoClimb.commit(protoGliderCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        protoAltitude: 12,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });
    expect(
      protoClimb.availability({
        ...protoGliderCtx,
        activeUnitProtoAltitude: 12,
      }),
    ).toEqual({
      available: false,
      reason: 'Altitude controls are already at maximum altitude 12.',
    });
    expect(
      protoDescend.availability({
        ...protoGliderCtx,
        activeUnitProtoAltitude: 0,
      }),
    ).toEqual({
      available: false,
      reason: 'Altitude controls are already at altitude 0.',
    });

    const lamAirMekCtx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'airmek',
      activeUnitLamAirMekAltitude: 24,
      movementCapability: {
        walkMP: 6,
        runMP: 9,
        jumpMP: 0,
        movementMode: 'wige',
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const lamAirMekCommands = buildMovementCommands(lamAirMekCtx);
    const lamAirMekClimb = lamAirMekCommands.find(
      (c) => c.id === 'movement.altitudeUp',
    )!;
    const lamAirMekDescend = lamAirMekCommands.find(
      (c) => c.id === 'movement.altitudeDown',
    )!;
    expect(lamAirMekClimb.availability(lamAirMekCtx)).toEqual({
      available: true,
    });
    expect(lamAirMekClimb.commit(lamAirMekCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 25,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });
    expect(
      lamAirMekClimb.availability({
        ...lamAirMekCtx,
        activeUnitLamAirMekAltitude: 25,
      }),
    ).toEqual({
      available: false,
      reason: 'Altitude controls are already at maximum altitude 25.',
    });
    expect(
      lamAirMekDescend.availability({
        ...lamAirMekCtx,
        activeUnitLamAirMekAltitude: 1,
        activeUnitTerrain: 'water',
      }),
    ).toEqual({ available: true });
    expect(
      lamAirMekDescend.commit({
        ...lamAirMekCtx,
        activeUnitLamAirMekAltitude: 1,
      }),
    ).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        lamAirMekLandingControlRequired: false,
        lamAirMekLandingControlReason: 'Check not required for landing',
        lamAirMekLandingControlModifier: 0,
        lamAirMekLandingControlModifierDetails: [],
        lamAirMekLandingControlFallHeight: 1,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });
    expect(
      lamAirMekDescend.availability({
        ...lamAirMekCtx,
        activeUnitLamAirMekAltitude: 0,
      }),
    ).toEqual({
      available: false,
      reason: 'Altitude controls are already at altitude 0.',
    });
  });
});
