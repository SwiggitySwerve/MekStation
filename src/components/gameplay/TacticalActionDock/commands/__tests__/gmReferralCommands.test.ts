/**
 * GM / referee command family tests.
 *
 * Registry-level mode-gating (GM commands only appear when
 * shellMode === 'gm') is covered in the registry test; this file
 * verifies the command shapes themselves.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildGmReferralCommands } from '../gmReferralCommands';

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

describe('gmReferralCommands', () => {
  const commands = buildGmReferralCommands();

  it('exposes advance-phase / set-damage / grant-resource', () => {
    expect(commands.map((c) => c.id)).toEqual([
      'gm.advance-phase',
      'gm.set-damage',
      'gm.grant-resource',
    ]);
  });

  it('all GM commands are in category gm', () => {
    for (const command of commands) {
      expect(command.category).toBe('gm');
    }
  });

  it('set-damage is disabled when nothing is selected', () => {
    const cmd = commands.find((c) => c.id === 'gm.set-damage')!;
    const result = cmd.availability(makeCtx({ selectedUnitId: null }));
    expect(result.available).toBe(false);
  });

  it('advance-phase is always available (force-advance bypass)', () => {
    const cmd = commands.find((c) => c.id === 'gm.advance-phase')!;
    expect(
      cmd.availability(makeCtx({ activeUnitId: null, canAct: false })),
    ).toEqual({
      available: true,
    });
    expect(cmd.requiresConfirmation).toBe(true);
  });
});
