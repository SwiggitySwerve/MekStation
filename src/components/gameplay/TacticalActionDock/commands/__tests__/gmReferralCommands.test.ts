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
  getGmTacticalCorrectionBlockReason,
  GM_TACTICAL_COMMAND_IDS,
  GM_TACTICAL_CORRECTIONS_UNAVAILABLE_REASON,
  GM_TACTICAL_PREVIEW_ACTION_ID,
} from '@/lib/interventions';
import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildGmReferralCommands } from '../gmReferralCommands';

jest.mock('@/lib/interventions', () => {
  const actual = jest.requireActual<typeof import('@/lib/interventions')>(
    '@/lib/interventions',
  );
  return {
    ...actual,
    getGmTacticalCorrectionBlockReason: jest.fn(
      actual.getGmTacticalCorrectionBlockReason,
    ),
  };
});

const UNIT_SCOPED_COMMAND_IDS = [
  'gm.set-position-facing',
  'gm.set-damage',
  'gm.set-heat-ammo',
  'gm.set-lifecycle',
  'gm.reload-unit',
] as const;

const AVAILABLE_UNIT_CONTEXTS = [
  { activeUnitId: null, selectedUnitId: 'unit-selected' },
  { activeUnitId: 'unit-active', selectedUnitId: null },
  { activeUnitId: 'unit-active', selectedUnitId: 'unit-selected' },
] as const;

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
    // PR #3306: isolate the unchanged base rule through the support-policy seam.
    // The real interim override is asserted separately below.
    const supportReason = jest.mocked(getGmTacticalCorrectionBlockReason);
    supportReason.mockReturnValue(undefined);
    try {
      const unwrappedCommands = buildGmReferralCommands();
      for (const id of UNIT_SCOPED_COMMAND_IDS) {
        const cmd = unwrappedCommands.find((command) => command.id === id)!;
        for (const context of AVAILABLE_UNIT_CONTEXTS) {
          expect(cmd.availability(makeCtx(context))).toEqual({
            available: true,
          });
        }
        expect(
          cmd.availability(
            makeCtx({ activeUnitId: null, selectedUnitId: null }),
          ),
        ).toEqual({
          available: false,
          reason: 'Select a unit first.',
        });
      }
    } finally {
      supportReason.mockImplementation(
        jest.requireActual<typeof import('@/lib/interventions')>(
          '@/lib/interventions',
        ).getGmTacticalCorrectionBlockReason,
      );
    }
  });

  // @spec openspec/changes/disable-gm-non-event-corrections/specs/gm-tactical-command-surface/spec.md
  it('interim correction blocking overrides available unit context and preserves missing-unit refusals', () => {
    const wrappedCommands = buildGmReferralCommands();
    for (const id of UNIT_SCOPED_COMMAND_IDS) {
      const cmd = wrappedCommands.find((command) => command.id === id)!;
      for (const context of AVAILABLE_UNIT_CONTEXTS) {
        expect(cmd.availability(makeCtx(context))).toEqual(
          id === 'gm.reload-unit'
            ? { available: true }
            : {
                available: false,
                reason: GM_TACTICAL_CORRECTIONS_UNAVAILABLE_REASON,
              },
        );
      }
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
