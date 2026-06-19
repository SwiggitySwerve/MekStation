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

  it('adds source-backed AirMek landing control context for damaged landings', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'airmek',
      activeUnitLamAirMekAltitude: 1,
      activeUnitComponentDamage: makeComponentDamage({
        gyroHits: 1,
        actuatorsByLocation: {
          left_leg: { [ActuatorType.FOOT]: true },
        },
      }),
      activeUnitDestroyedLocations: ['right_leg'],
      movementCapability: {
        walkMP: 6,
        runMP: 9,
        jumpMP: 0,
        movementMode: 'wige',
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const descend = buildMovementCommands(ctx).find(
      (c) => c.id === 'movement.altitudeDown',
    )!;

    expect(descend.availability(ctx)).toEqual({ available: true });
    expect(descend.commit(ctx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 6,
        lamAirMekLandingControlModifierDetails: [
          'Gyro damage requires landing control roll',
          'Left Leg Foot Actuator destroyed +1',
          'Right Leg destroyed +5',
        ],
        lamAirMekLandingControlFallHeight: 1,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });
  });

  it('keeps heavy-duty gyro first-hit and hip-only landing checks source-gated', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'airmek',
      activeUnitLamAirMekAltitude: 1,
      activeUnitGyroType: 'Heavy Duty',
      activeUnitComponentDamage: makeComponentDamage({
        gyroHits: 1,
        actuatorsByLocation: {
          left_leg: { [ActuatorType.HIP]: true },
        },
      }),
      movementCapability: {
        walkMP: 6,
        runMP: 9,
        jumpMP: 0,
        movementMode: 'wige',
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const descend = buildMovementCommands(ctx).find(
      (c) => c.id === 'movement.altitudeDown',
    )!;

    expect(descend.commit(ctx)).toEqual({
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
      descend.commit({
        ...ctx,
        optionalRules: ['tacops_leg_damage'],
      }),
    ).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        lamAirMekAltitude: 0,
        lamAirMekLandingControlRequired: true,
        lamAirMekLandingControlReason: 'landing with gyro or leg damage',
        lamAirMekLandingControlModifier: 2,
        lamAirMekLandingControlModifierDetails: [
          'Left Leg Hip Actuator destroyed +2',
        ],
        lamAirMekLandingControlFallHeight: 1,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    });
  });

  it('adds LAM conversion controls that clear stale explicit height', () => {
    const lamCtx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'mek',
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 5,
        unitHeight: 1,
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const lamCommands = buildMovementCommands(lamCtx);
    const mek = lamCommands.find((c) => c.id === 'movement.convert.mek')!;
    const airmek = lamCommands.find((c) => c.id === 'movement.convert.airmek')!;
    const fighter = lamCommands.find(
      (c) => c.id === 'movement.convert.fighter',
    )!;

    expect(lamCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining([
        'movement.convert.mek',
        'movement.convert.airmek',
        'movement.convert.fighter',
      ]),
    );
    expect(mek.availability(lamCtx)).toEqual({
      available: false,
      reason: 'Unit is already in Mek Mode.',
    });
    expect(airmek.availability(lamCtx)).toEqual({ available: true });
    expect(fighter.availability(lamCtx)).toEqual({
      available: false,
      reason: 'Standard LAMs must convert through AirMek mode first.',
    });

    const airmekCtx: ITacticalCommandContext = {
      ...lamCtx,
      activeUnitConversionMode: 'airmek',
      activeUnitLamAirMekAltitude: 2,
    };
    expect(mek.availability(airmekCtx)).toEqual({ available: true });
    expect(mek.commit(airmekCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'conversion_action',
        conversionMode: 'mek',
        conversionStepCount: 2,
        conversionMpCost: 0,
        lamAirMekAltitude: 0,
        unitHeight: null,
      },
    });
    expect(fighter.availability(airmekCtx)).toEqual({ available: true });
    expect(fighter.commit(airmekCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'conversion_action',
        conversionMode: 'fighter',
        conversionStepCount: 1,
        conversionMpCost: 0,
        unitHeight: null,
      },
    });
  });

  it('adds QuadVee conversion controls and treats tracked vehicle mode as current', () => {
    const quadVeeCtx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'tracked',
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 3,
        movementMode: 'tracked',
        unitHeight: 1,
        unitHeightProfile: { kind: 'quadvee', standingHeight: 1 },
      },
    });
    const quadVeeCommands = buildMovementCommands(quadVeeCtx);
    const mek = quadVeeCommands.find((c) => c.id === 'movement.convert.mek')!;
    const vehicle = quadVeeCommands.find(
      (c) => c.id === 'movement.convert.vehicle',
    )!;

    expect(quadVeeCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining([
        'movement.convert.mek',
        'movement.convert.vehicle',
      ]),
    );
    expect(mek.availability(quadVeeCtx)).toEqual({ available: true });
    expect(vehicle.availability(quadVeeCtx)).toEqual({
      available: false,
      reason: 'Unit is already in Vehicle Mode.',
    });
    expect(mek.commit(quadVeeCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'conversion_action',
        conversionMode: 'mek',
        conversionStepCount: 1,
        conversionMpCost: 2,
        unitHeight: null,
      },
    });
  });

  it('gates conversion controls as source-backed first movement steps', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'mek',
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 5,
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const airmek = buildMovementCommands(ctx).find(
      (c) => c.id === 'movement.convert.airmek',
    )!;

    expect(
      airmek.availability({ ...ctx, activeUnitHasPlannedMovement: true }),
    ).toEqual({
      available: false,
      reason: 'Clear the current movement preview before converting.',
    });
    expect(airmek.availability({ ...ctx, activeUnitProne: true })).toEqual({
      available: false,
      reason: 'Unit must stand before converting.',
    });
    expect(
      airmek.availability({
        ...ctx,
        activeUnitTerrain: 'water',
        activeUnitElevation: -1,
      }),
    ).toEqual({
      available: false,
      reason: 'Unit cannot convert while underwater.',
    });
  });
});
