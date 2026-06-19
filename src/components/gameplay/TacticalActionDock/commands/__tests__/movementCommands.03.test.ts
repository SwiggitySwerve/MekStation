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

  it('hull down explains existing hull-down, non-Mek, and MP blockers', () => {
    const hullDown = commands.find((c) => c.id === 'movement.hullDown')!;

    expect(
      hullDown.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitHullDown: true,
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Unit is already hull-down.',
    });
    expect(
      hullDown.availability(
        makeCtx({
          activeUnitProne: false,
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
      reason: 'Hull-down entry is only available for Mek-style movement.',
    });
    expect(
      hullDown.availability(
        makeCtx({
          activeUnitProne: false,
          movementCapability: { walkMP: 1, runMP: 2, jumpMP: 0 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Needs 2 MP to enter hull-down.',
    });
  });

  it('go prone commits a 0 MP hull-down posture action for Mek-style units', () => {
    const goProne = commands.find((c) => c.id === 'movement.goProne')!;
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitHullDown: true,
      movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    });

    expect(goProne.availability(ctx)).toEqual({ available: true });
    expect(goProne.commit(ctx)).toEqual({
      actionId: 'go-prone',
      payload: {},
    });
  });

  it('go prone explains non-hull-down and non-Mek-style blockers', () => {
    const goProne = commands.find((c) => c.id === 'movement.goProne')!;

    expect(
      goProne.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitHullDown: false,
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Unit must be hull-down.',
    });
    expect(
      goProne.availability(
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
        'Hull-down go-prone action is only available for Mek-style movement.',
    });
  });

  it('adds infantry mount-state controls only for infantry mount profiles', () => {
    const infantryCtx = makeCtx({
      activeUnitProne: false,
      movementCapability: {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        unitHeight: 1,
        unitHeightProfile: { kind: 'infantry_mount', mountedHeight: 1 },
      },
    });
    const infantryCommands = buildMovementCommands(infantryCtx);
    const mount = infantryCommands.find(
      (c) => c.id === 'movement.infantryMount',
    )!;
    const dismount = infantryCommands.find(
      (c) => c.id === 'movement.infantryDismount',
    )!;

    expect(infantryCommands.map((command) => command.id)).toEqual(
      expect.arrayContaining([
        'movement.infantryMount',
        'movement.infantryDismount',
      ]),
    );
    expect(mount.availability(makeCtx())).toEqual({
      available: false,
      reason: 'Unit has no infantry mount profile.',
    });
    expect(
      mount.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitInfantryMounted: false,
          movementCapability: infantryCtx.movementCapability,
        }),
      ),
    ).toEqual({ available: true });
    expect(dismount.availability(infantryCtx)).toEqual({ available: true });
    expect(dismount.commit(infantryCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'infantry_mount_action',
        infantryMounted: false,
      },
    });
  });
});
