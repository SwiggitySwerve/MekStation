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

  // tactical-movement-intent-composer: Jump is no longer a dock command — the
  // Movement Intent Composer's Budget Resolver owns Jump as an affordable
  // budget option; jump-legality lives in the movement-system budget path.

  it('stand commit produces a stand actionId', () => {
    const stand = commands.find((c) => c.id === 'movement.stand')!;
    expect(stand.commit(makeCtx()).actionId).toBe('stand');
  });

  it('careful stand commits its own actionId and needs spare walk MP', () => {
    const carefulStand = commands.find(
      (c) => c.id === 'movement.carefulStand',
    )!;

    expect(carefulStand.commit(makeCtx())).toEqual({
      actionId: 'stand-careful',
      payload: { mode: 'careful' },
    });
    expect(carefulStand.availability(makeCtx())).toEqual({
      available: true,
    });
    expect(
      carefulStand.availability(
        makeCtx({
          movementCapability: { walkMP: 2, runMP: 3, jumpMP: 0 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Careful Stand needs more than 2 walk MP.',
    });
  });

  it('stand is available only for prone units with movement capability', () => {
    const stand = commands.find((c) => c.id === 'movement.stand')!;

    expect(stand.availability(makeCtx())).toEqual({ available: true });
    expect(stand.availability(makeCtx({ activeUnitProne: false }))).toEqual({
      available: false,
      reason: 'Unit is not prone or hull-down.',
    });
    expect(
      stand.availability(
        makeCtx({ activeUnitProne: false, activeUnitHullDown: true }),
      ),
    ).toEqual({
      available: true,
    });
    expect(
      stand.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitHullDown: true,
          movementCapability: {
            walkMP: 4,
            runMP: 6,
            jumpMP: 0,
            movementMode: 'tracked',
            movementHeatProfile: 'none',
          },
        }),
      ),
    ).toEqual({
      available: false,
      reason:
        'Hull-down stand action is only available for Mek-style movement.',
    });
    expect(stand.availability(makeCtx({ movementCapability: null }))).toEqual({
      available: false,
      reason: 'No movement capability.',
    });
  });

  it('stand availability uses heat-reduced MP so the dock matches engine validation', () => {
    const stand = commands.find((c) => c.id === 'movement.stand')!;

    expect(
      stand.availability(
        makeCtx({
          activeUnitHeat: 10,
          movementCapability: { walkMP: 2, runMP: 3, jumpMP: 0 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Needs 2 MP to stand after heat penalty.',
    });
  });

  it('stand availability surfaces source-backed impossible stand reasons', () => {
    const stand = commands.find((c) => c.id === 'movement.stand')!;
    const reason = 'Cannot stand with a destroyed leg and both arms destroyed';

    expect(
      stand.availability(
        makeCtx({
          activeUnitStandUpImpossibleReason: reason,
        }),
      ),
    ).toEqual({
      available: false,
      reason,
    });
  });

  it('careful stand is not offered as a hull-down exit action', () => {
    const carefulStand = commands.find(
      (c) => c.id === 'movement.carefulStand',
    )!;

    expect(
      carefulStand.availability(
        makeCtx({ activeUnitProne: false, activeUnitHullDown: true }),
      ),
    ).toEqual({
      available: false,
      reason: 'Careful Stand is only available when prone.',
    });
  });

  it('hull down commits a 2 MP posture action for standing Mek-style units', () => {
    const hullDown = commands.find((c) => c.id === 'movement.hullDown')!;
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitHullDown: false,
      movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    });

    expect(hullDown.availability(ctx)).toEqual({ available: true });
    expect(hullDown.commit(ctx)).toEqual({
      actionId: 'hull-down',
      payload: {},
    });
  });

  it('hull down commits a 1 MP posture action for prone Mek-style units', () => {
    const hullDown = commands.find((c) => c.id === 'movement.hullDown')!;
    const ctx = makeCtx({
      activeUnitProne: true,
      activeUnitHullDown: false,
      movementCapability: { walkMP: 1, runMP: 2, jumpMP: 0 },
    });

    expect(hullDown.availability(ctx)).toEqual({ available: true });
    expect(hullDown.commit(ctx)).toEqual({
      actionId: 'hull-down',
      payload: {},
    });
  });

  it('hull down explains prone actuator cost and destroyed support blockers', () => {
    const hullDown = commands.find((c) => c.id === 'movement.hullDown')!;

    expect(
      hullDown.availability(
        makeCtx({
          activeUnitProne: true,
          activeUnitComponentDamage: {
            engineHits: 0,
            gyroHits: 0,
            sensorHits: 0,
            lifeSupport: 0,
            cockpitHit: false,
            actuators: {},
            actuatorsByLocation: {
              right_leg: { [ActuatorType.UPPER_LEG]: true },
              left_leg: { [ActuatorType.HIP]: true },
            },
            weaponsDestroyed: [],
            heatSinksDestroyed: 0,
            jumpJetsDestroyed: 0,
          },
          movementCapability: { walkMP: 2, runMP: 3, jumpMP: 0 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Needs 3 MP to enter hull-down.',
    });
    expect(
      hullDown.availability(
        makeCtx({
          activeUnitProne: true,
          activeUnitDestroyedLocations: ['left_leg'],
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Cannot enter hull-down with a destroyed leg/support location.',
    });
  });
});
