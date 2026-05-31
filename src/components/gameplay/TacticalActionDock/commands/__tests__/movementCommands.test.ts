/**
 * Movement command family — availability + disabled-reason + commit
 * dispatch tests.
 *
 * Verifies the spec's `Active unit command set follows phase` and
 * `Disabled command explains invalidity` requirements for the
 * movement family.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  GamePhase,
  LockState,
  MovementType,
  type IMovementRangeHex,
  type ITacticalCommandContext,
} from '@/types/gameplay';

import { buildMovementCommands } from '../movementCommands';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    activeUnitProne: true,
    activeUnitHeat: 0,
    movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    ...overrides,
  };
}

function makeMovementProjection(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 1, r: 0 },
    mpCost: 9,
    reachable: false,
    movementType: MovementType.Walk,
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
    ...overrides,
  };
}

describe('movementCommands', () => {
  const commands = buildMovementCommands();

  it('exposes walk / run / jump / stand / posture / stabilize / cancel', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'movement.walk',
      'movement.run',
      'movement.jump',
      'movement.stand',
      'movement.carefulStand',
      'movement.hullDown',
      'movement.goProne',
      'movement.stabilize',
      'movement.cancel',
    ]);
  });

  it('every command targets Movement phase', () => {
    for (const command of commands) {
      expect(command.phaseConstraints).toContain(GamePhase.Movement);
    }
  });

  it('walk is available with an active unit on the player turn', () => {
    const walk = commands.find((c) => c.id === 'movement.walk')!;
    expect(walk.availability(makeCtx())).toEqual({ available: true });
  });

  it('walk is disabled-with-reason when no unit is active', () => {
    const walk = commands.find((c) => c.id === 'movement.walk')!;
    const result = walk.availability(makeCtx({ activeUnitId: null }));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/no unit/i);
    }
  });

  it('walk is disabled-with-reason when it is not the player turn', () => {
    const walk = commands.find((c) => c.id === 'movement.walk')!;
    const result = walk.availability(makeCtx({ canAct: false }));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/not your turn/i);
    }
  });

  it('walk/run/jump are disabled when the active unit already locked movement', () => {
    for (const id of ['movement.walk', 'movement.run', 'movement.jump']) {
      const command = commands.find((c) => c.id === id)!;
      const result = command.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitLockState: LockState.Locked,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
        }),
      );
      expect(result).toEqual({
        available: false,
        reason: 'Unit has already locked movement this phase',
      });
    }
  });

  it('walk/run/jump are disabled when heat-reduced MP leaves no budget', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      activeUnitHeat: 30,
      movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
    });

    expect(
      commands.find((c) => c.id === 'movement.walk')!.availability(ctx),
    ).toEqual({
      available: false,
      reason: 'Heat penalty leaves no walk MP.',
    });
    expect(
      commands.find((c) => c.id === 'movement.run')!.availability(ctx),
    ).toEqual({
      available: false,
      reason: 'Heat penalty leaves no run MP.',
    });
    expect(
      commands.find((c) => c.id === 'movement.jump')!.availability(ctx),
    ).toEqual({
      available: false,
      reason: 'Heat penalty leaves no jump MP.',
    });
  });

  it('walk/run remain legacy-available when no movement capability is supplied', () => {
    expect(
      commands
        .find((c) => c.id === 'movement.walk')!
        .availability(makeCtx({ movementCapability: null })),
    ).toEqual({ available: true });
    expect(
      commands
        .find((c) => c.id === 'movement.run')!
        .availability(makeCtx({ movementCapability: null })),
    ).toEqual({ available: true });
  });

  it('walk is disabled when the target movement projection is blocked', () => {
    const walk = commands.find((c) => c.id === 'movement.walk')!;

    expect(
      walk.availability(
        makeCtx({
          activeUnitProne: false,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
          targetMovementProjection: makeMovementProjection(),
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Destination hex is occupied',
    });
  });

  it('same-hex movement options gate only the matching movement mode', () => {
    const walk = commands.find((c) => c.id === 'movement.walk')!;
    const run = commands.find((c) => c.id === 'movement.run')!;
    const ctx = makeCtx({
      activeUnitProne: false,
      movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
      targetMovementProjection: makeMovementProjection({
        reachable: true,
        movementType: MovementType.Walk,
        mpCost: 2,
        movementModeOptions: [
          {
            movementType: MovementType.Walk,
            reachable: true,
            mpCost: 2,
          },
          {
            movementType: MovementType.Run,
            reachable: false,
            mpCost: 7,
            blockedReason:
              'Destination is 7 MP away, but max range for run is 6',
            movementInvalidReason: 'InsufficientMP',
            movementInvalidDetails:
              'Destination is 7 MP away, but max range for run is 6',
          },
        ],
      }),
    });

    expect(walk.availability(ctx)).toEqual({ available: true });
    expect(run.availability(ctx)).toEqual({
      available: false,
      reason: 'Destination is 7 MP away, but max range for run is 6',
    });
  });

  it('cancel still indicates the disabled-reason when there is no unit', () => {
    const cancel = commands.find((c) => c.id === 'movement.cancel')!;
    const result = cancel.availability(makeCtx({ activeUnitId: null }));
    expect(result.available).toBe(false);
  });

  it('walk commit produces a lock actionId with mode=walk', () => {
    const walk = commands.find((c) => c.id === 'movement.walk')!;
    expect(walk.commit(makeCtx())).toEqual({
      actionId: 'lock',
      payload: { mode: 'walk' },
    });
  });

  it('jump commit produces a lock actionId with mode=jump', () => {
    const jump = commands.find((c) => c.id === 'movement.jump')!;
    expect(jump.commit(makeCtx())).toEqual({
      actionId: 'lock',
      payload: { mode: 'jump' },
    });
  });

  it('jump is disabled with a player-facing reason when the unit has no jump MP', () => {
    const jump = commands.find((c) => c.id === 'movement.jump')!;
    expect(
      jump.availability(
        makeCtx({
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'No jump capability.',
    });
  });

  it('jump stays available when the active unit has jump MP', () => {
    const jump = commands.find((c) => c.id === 'movement.jump')!;
    expect(
      jump.availability(
        makeCtx({
          activeUnitProne: false,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
        }),
      ),
    ).toEqual({ available: true });
  });

  it('jump explains that a jump-capable prone unit must stand first', () => {
    const jump = commands.find((c) => c.id === 'movement.jump')!;

    expect(
      jump.availability(
        makeCtx({
          activeUnitProne: true,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Unit is prone and must stand before jumping.',
    });
  });

  it('jump explains that a hull-down unit must stand before jumping', () => {
    const jump = commands.find((c) => c.id === 'movement.jump')!;

    expect(
      jump.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitHullDown: true,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
        }),
      ),
    ).toEqual({
      available: false,
      reason: 'Unit is hull-down and must stand before jumping.',
    });
  });

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
    expect(fighter.availability(lamCtx)).toEqual({ available: true });
    expect(fighter.commit(lamCtx)).toEqual({
      actionId: 'runtime-movement-state',
      payload: {
        source: 'conversion_action',
        conversionMode: 'fighter',
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
  });
});
