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
  TerrainType,
  type IComponentDamageState,
  type IMovementRangeHex,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

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

function makeComponentDamage(
  overrides: Partial<IComponentDamageState> = {},
): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
    ...overrides,
  };
}

describe('movementCommands', () => {
  const commands = buildMovementCommands();

  it('exposes walk / run / sprint / evade / jump / stand / posture / MASC / supercharger / stabilize / cancel', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'movement.walk',
      'movement.run',
      'movement.sprint',
      'movement.evade',
      'movement.jump',
      'movement.stand',
      'movement.carefulStand',
      'movement.hullDown',
      'movement.goProne',
      'movement.activate-masc',
      'movement.activate-supercharger',
      'movement.stabilize',
      'movement.cancel',
    ]);
  });

  it('sprint and evade are available with an active unit on the player turn', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    });
    expect(
      commands.find((c) => c.id === 'movement.sprint')!.availability(ctx),
    ).toEqual({ available: true });
    expect(
      commands.find((c) => c.id === 'movement.evade')!.availability(ctx),
    ).toEqual({ available: true });
  });

  it('sprint and evade are disabled when the active unit already locked movement', () => {
    for (const id of ['movement.sprint', 'movement.evade']) {
      const command = commands.find((c) => c.id === id)!;
      const result = command.availability(
        makeCtx({
          activeUnitProne: false,
          activeUnitLockState: LockState.Locked,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
        }),
      );
      expect(result).toEqual({
        available: false,
        reason: 'Unit has already locked movement this phase',
      });
    }
  });

  it('sprint commit produces a lock actionId with mode=sprint', () => {
    const sprint = commands.find((c) => c.id === 'movement.sprint')!;
    expect(sprint.commit(makeCtx())).toEqual({
      actionId: 'lock',
      payload: { mode: 'sprint' },
    });
  });

  it('evade commit produces a lock actionId with mode=evade', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    expect(evade.commit(makeCtx())).toEqual({
      actionId: 'lock',
      payload: { mode: 'evade' },
    });
  });

  it('MASC and Supercharger commands commit their activation action ids', () => {
    const masc = commands.find((c) => c.id === 'movement.activate-masc')!;
    const supercharger = commands.find(
      (c) => c.id === 'movement.activate-supercharger',
    )!;

    expect(masc.availability(makeCtx())).toEqual({ available: true });
    expect(masc.commit(makeCtx())).toEqual({
      actionId: 'activate-masc',
      payload: {},
    });
    expect(supercharger.availability(makeCtx())).toEqual({ available: true });
    expect(supercharger.commit(makeCtx())).toEqual({
      actionId: 'activate-supercharger',
      payload: {},
    });
  });

  it('MASC and Supercharger commands are gated by turn and lock state', () => {
    for (const id of [
      'movement.activate-masc',
      'movement.activate-supercharger',
    ]) {
      const command = commands.find((c) => c.id === id)!;
      expect(command.availability(makeCtx({ activeUnitId: null }))).toEqual({
        available: false,
        reason: 'No unit is active.',
      });
      expect(command.availability(makeCtx({ canAct: false }))).toEqual({
        available: false,
        reason: 'Not your turn.',
      });
      expect(
        command.availability(
          makeCtx({ activeUnitLockState: LockState.Locked }),
        ),
      ).toEqual({
        available: false,
        reason: 'Unit has already locked movement this phase',
      });
    }
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

  // Audit 2026-06-09 C-2: jump MP is heat-immune (MegaMek Mek.getJumpMP has
  // no heat term) — jump previously pinned the wrong pre-fix disabled state.
  it('walk/run are disabled when heat-reduced MP leaves no budget; jump stays available', () => {
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
      available: true,
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
