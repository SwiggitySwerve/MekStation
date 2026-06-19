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
});
