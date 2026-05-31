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

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

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
    ...overrides,
  };
}

describe('movementCommands', () => {
  const commands = buildMovementCommands();

  it('exposes walk / run / evade / jump / stand / go-prone / boosters / stabilize / cancel', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'movement.walk',
      'movement.run',
      'movement.evade',
      'movement.jump',
      'movement.stand',
      'movement.go-prone',
      'movement.activate-masc',
      'movement.activate-supercharger',
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

  it('evade commit produces a lock actionId with mode=evade', () => {
    const evade = commands.find((c) => c.id === 'movement.evade')!;
    expect(evade.commit(makeCtx())).toEqual({
      actionId: 'lock',
      payload: { mode: 'evade' },
    });
  });

  it('stand commit produces a stand actionId', () => {
    const stand = commands.find((c) => c.id === 'movement.stand')!;
    expect(stand.commit(makeCtx()).actionId).toBe('stand');
  });

  it('go-prone commit produces a go-prone actionId', () => {
    const goProne = commands.find((c) => c.id === 'movement.go-prone')!;
    expect(goProne.commit(makeCtx()).actionId).toBe('go-prone');
  });

  it('booster activation commands produce movement enhancement action ids', () => {
    const masc = commands.find((c) => c.id === 'movement.activate-masc')!;
    const supercharger = commands.find(
      (c) => c.id === 'movement.activate-supercharger',
    )!;
    expect(masc.commit(makeCtx()).actionId).toBe('activate-masc');
    expect(supercharger.commit(makeCtx()).actionId).toBe(
      'activate-supercharger',
    );
  });
});
