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

import {
  GamePhase,
  LockState,
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

describe('movementCommands', () => {
  const commands = buildMovementCommands();

  it('exposes walk / run / jump / stand / careful stand / stabilize / cancel', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'movement.walk',
      'movement.run',
      'movement.jump',
      'movement.stand',
      'movement.carefulStand',
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
      reason: 'Unit is not prone.',
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
});
