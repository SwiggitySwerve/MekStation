/**
 * Utility command family tests.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildUtilityCommands } from '../utilityCommands';

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

describe('utilityCommands', () => {
  const commands = buildUtilityCommands();

  it('exposes eject / withdraw / concede / request-spot', () => {
    expect(commands.map((c) => c.id)).toEqual([
      'utility.eject',
      'utility.withdraw',
      'utility.concede',
      'utility.request-spot',
    ]);
  });

  it('concede is available in any phase regardless of canAct', () => {
    const concede = commands.find((c) => c.id === 'utility.concede')!;
    expect(
      concede.availability(makeCtx({ canAct: false, activeUnitId: null })),
    ).toEqual({
      available: true,
    });
  });

  it('eject is disabled when not the player turn', () => {
    const eject = commands.find((c) => c.id === 'utility.eject')!;
    const result = eject.availability(makeCtx({ canAct: false }));
    expect(result.available).toBe(false);
  });

  it('request-spot is disabled when no target', () => {
    const spot = commands.find((c) => c.id === 'utility.request-spot')!;
    const result = spot.availability(
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: null }),
    );
    expect(result.available).toBe(false);
  });

  it('request-spot commits the active unit and selected target payload', () => {
    const spot = commands.find((c) => c.id === 'utility.request-spot')!;

    expect(
      spot.commit(
        makeCtx({
          phase: GamePhase.WeaponAttack,
          activeUnitId: 'spotter-1',
          targetUnitId: 'target-1',
        }),
      ),
    ).toEqual({
      actionId: 'request-spot',
      payload: {
        unitId: 'spotter-1',
        targetUnitId: 'target-1',
      },
    });
  });

  it('concede requires confirmation', () => {
    const concede = commands.find((c) => c.id === 'utility.concede')!;
    expect(concede.requiresConfirmation).toBe(true);
  });
});
