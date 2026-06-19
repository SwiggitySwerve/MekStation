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

  it('gates LAM conversion controls by gyro and actuator damage', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'airmek',
      movementCapability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 5,
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const mek = buildMovementCommands(ctx).find(
      (c) => c.id === 'movement.convert.mek',
    )!;
    const fighter = buildMovementCommands(ctx).find(
      (c) => c.id === 'movement.convert.fighter',
    )!;

    expect(
      mek.availability({
        ...ctx,
        activeUnitComponentDamage: makeComponentDamage({ gyroHits: 1 }),
      }),
    ).toEqual({
      available: false,
      reason: 'LAM cannot convert with gyro damage.',
    });
    expect(
      mek.availability({
        ...ctx,
        activeUnitGyroType: 'Heavy Duty',
        activeUnitComponentDamage: makeComponentDamage({ gyroHits: 1 }),
      }),
    ).toEqual({ available: true });
    expect(
      mek.availability({
        ...ctx,
        activeUnitComponentDamage: makeComponentDamage({
          actuatorsByLocation: {
            right_arm: { [ActuatorType.SHOULDER]: true },
          },
        }),
      }),
    ).toEqual({
      available: false,
      reason:
        'LAM cannot convert to or from Mek mode with shoulder or arm actuator damage.',
    });
    expect(
      fighter.availability({
        ...ctx,
        activeUnitComponentDamage: makeComponentDamage({
          actuatorsByLocation: {
            left_leg: { [ActuatorType.HIP]: true },
          },
        }),
      }),
    ).toEqual({
      available: false,
      reason:
        'LAM cannot convert to or from Fighter mode with hip or leg actuator damage.',
    });
  });

  it('gates QuadVee conversion controls by represented conversion cost', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitConversionMode: 'mek',
      movementCapability: {
        walkMP: 2,
        runMP: 3,
        jumpMP: 0,
        unitHeightProfile: { kind: 'quadvee', standingHeight: 1 },
      },
      activeUnitComponentDamage: makeComponentDamage({
        actuatorsByLocation: {
          right_arm: { [ActuatorType.SHOULDER]: true },
          left_leg: { [ActuatorType.FOOT]: true },
        },
      }),
    });
    const vehicle = buildMovementCommands(ctx).find(
      (c) => c.id === 'movement.convert.vehicle',
    )!;

    expect(vehicle.availability(ctx)).toEqual({
      available: false,
      reason: 'QuadVee conversion needs 4 MP, but only 3 run MP is available.',
    });

    const oneHitCtx = {
      ...ctx,
      activeUnitComponentDamage: makeComponentDamage({
        actuatorsByLocation: {
          right_arm: { [ActuatorType.SHOULDER]: true },
        },
      }),
    };
    expect(vehicle.availability(oneHitCtx)).toEqual({ available: true });
    expect(vehicle.commit(oneHitCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'conversion_action',
        conversionMode: 'vehicle',
        conversionStepCount: 1,
        conversionMpCost: 3,
        unitHeight: null,
      },
    });
  });
});
