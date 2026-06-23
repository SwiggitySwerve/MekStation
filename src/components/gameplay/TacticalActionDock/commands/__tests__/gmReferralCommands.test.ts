/**
 * GM / referee command family tests.
 *
 * Registry-level mode-gating (GM commands only appear when
 * shellMode === 'gm') is covered in the registry test; this file
 * verifies the command shapes themselves.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import {
  GM_TACTICAL_COMMAND_IDS,
  GM_TACTICAL_PREVIEW_ACTION_ID,
} from '@/lib/interventions';
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

  it('exposes the Wave 5 GM combat intervention command family', () => {
    expect(commands.map((c) => c.id)).toEqual([...GM_TACTICAL_COMMAND_IDS]);
  });

  it('all GM commands are in category gm', () => {
    for (const command of commands) {
      expect(command.category).toBe('gm');
    }
  });

  it('set-damage is disabled when nothing is selected', () => {
    const cmd = commands.find((c) => c.id === 'gm.set-damage')!;
    const result = cmd.availability(
      makeCtx({ activeUnitId: null, selectedUnitId: null }),
    );
    expect(result.available).toBe(false);
  });

  it('unit-scoped GM corrections can use selected or active unit context', () => {
    for (const id of [
      'gm.set-position-facing',
      'gm.set-damage',
      'gm.set-heat-ammo',
      'gm.set-lifecycle',
      'gm.reload-unit',
    ]) {
      const cmd = commands.find((c) => c.id === id)!;
      expect(cmd.availability(makeCtx({ selectedUnitId: null }))).toEqual({
        available: true,
      });
      expect(
        cmd.availability(makeCtx({ activeUnitId: null, selectedUnitId: null })),
      ).toEqual({
        available: false,
        reason: 'Select a unit first.',
      });
    }
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

  it('commits structured GM intervention preview intents instead of legacy stubs', () => {
    const advance = commands.find((c) => c.id === 'gm.advance-phase')!;
    const damage = commands.find((c) => c.id === 'gm.set-damage')!;
    const reload = commands.find((c) => c.id === 'gm.reload-unit')!;
    const resource = commands.find((c) => c.id === 'gm.grant-resource')!;

    expect(advance.commit(makeCtx())).toEqual({
      actionId: GM_TACTICAL_PREVIEW_ACTION_ID,
      payload: {
        commandId: 'gm.advance-phase',
        activeUnitId: 'unit-a',
        selectedUnitId: 'unit-a',
        targetUnitId: null,
        phase: GamePhase.Movement,
      },
    });
    expect(damage.commit(makeCtx()).actionId).toBe(
      GM_TACTICAL_PREVIEW_ACTION_ID,
    );
    expect(reload.commit(makeCtx()).payload).toEqual({
      commandId: 'gm.reload-unit',
      activeUnitId: 'unit-a',
      selectedUnitId: 'unit-a',
      targetUnitId: null,
      phase: GamePhase.Movement,
    });
    expect(resource.commit(makeCtx()).actionId).toBe(
      GM_TACTICAL_PREVIEW_ACTION_ID,
    );
  });
});
