import * as H from './movementCommands.test-helpers';

const { GamePhase, LockState, buildMovementCommands, makeCtx } = H;

describe('movementCommands', () => {
  const commands = buildMovementCommands();

  // tactical-movement-intent-composer (Single Movement Authority): the dock no
  // longer exposes Walk / Run / Sprint / Jump movement-verb commands — the
  // Movement Intent Composer owns movement composition + mode selection. Evade
  // REMAINS as a Posture Action (no destination) with its `E` hotkey.
  it('exposes evade / stand / posture / MASC / supercharger / stabilize / cancel (no walk/run/sprint/jump verbs)', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'movement.evade',
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

  it('no longer exposes walk / run / sprint / jump movement-verb commands', () => {
    const ids = commands.map((c) => c.id);
    for (const removed of [
      'movement.walk',
      'movement.run',
      'movement.sprint',
      'movement.jump',
    ]) {
      expect(ids).not.toContain(removed);
    }
  });

  it('evade is available with an active unit on the player turn', () => {
    const ctx = makeCtx({
      activeUnitProne: false,
      movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    });
    expect(
      commands.find((c) => c.id === 'movement.evade')!.availability(ctx),
    ).toEqual({ available: true });
  });

  it('evade keeps its E hotkey and movement category (Posture Palette source)', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    expect(evade.hotkey).toBe('E');
    expect(evade.category).toBe('movement');
  });

  it('evade is disabled when the active unit already locked movement', () => {
    const command = commands.find((c) => c.id === 'movement.evade')!;
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
  });

  it('evade commit produces a lock actionId with mode=evade', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    expect(evade.commit(makeCtx())).toEqual({
      actionId: 'lock',
      payload: { mode: 'evade' },
    });
  });

  it('evade is disabled-with-reason when the unit has no evade capability', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    expect(
      evade.availability(
        makeCtx({
          activeUnitProne: false,
          movementCapability: { walkMP: 0, runMP: 0, jumpMP: 0 },
        }),
      ),
    ).toEqual({ available: false, reason: 'No evade capability.' });
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

  it('evade is disabled-with-reason when no unit is active', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    const result = evade.availability(makeCtx({ activeUnitId: null }));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/no unit/i);
    }
  });

  it('evade is disabled-with-reason when it is not the player turn', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    const result = evade.availability(makeCtx({ canAct: false }));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/not your turn/i);
    }
  });

  it('evade remains legacy-available when no movement capability is supplied', () => {
    expect(
      commands
        .find((c) => c.id === 'movement.evade')!
        .availability(makeCtx({ movementCapability: null })),
    ).toEqual({ available: true });
  });

  it('cancel still indicates the disabled-reason when there is no unit', () => {
    const cancel = commands.find((c) => c.id === 'movement.cancel')!;
    const result = cancel.availability(makeCtx({ activeUnitId: null }));
    expect(result.available).toBe(false);
  });
});
