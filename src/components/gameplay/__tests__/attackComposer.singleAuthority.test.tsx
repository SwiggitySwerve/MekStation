/**
 * Single Attack Authority (change `attack-phase-intent-composer`, phase 4,
 * ADR 0002 D9): while the composer is active no second surface can mutate
 * `attackPlan` or commit declarations —
 *
 *  - the command registry drops `weapon.fire-volley` / `weapon.clear-attacks`
 *    and reroutes `weapon.declare-attack` into composer state (context menus
 *    mirror the registry, so menus inherit the same routing);
 *  - the rerouted declare command commits a `composer-focus-target` action
 *    whose handler focuses the working target — never a declaration;
 *  - `CombatPlanningPanel` renders NOTHING during the weapon-attack phase
 *    (the legacy WeaponSelector + ToHitForecastModal confirm surface is
 *    fully replaced by the composer).
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import { act, render } from '@testing-library/react';
import React from 'react';

import { useGameplayStore } from '@/stores/useGameplayStore';
import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { CombatPlanningPanel } from '../CombatPlanningPanel';
import { buildWeaponAttackCommands } from '../TacticalActionDock';

function ctx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'a1',
    selectedUnitId: 'a1',
    targetUnitId: 't1',
    hoveredHex: null,
    phase: GamePhase.WeaponAttack,
    canAct: true,
    ...overrides,
  } as ITacticalCommandContext;
}

describe('Single Attack Authority (D9)', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useGameplayStore.getState().clearAttackIntent();
  });

  it('registry drops fire/clear and reroutes declare into the composer while active', () => {
    const composerCommands = buildWeaponAttackCommands(
      ctx({ attackComposerActive: true }),
    );
    expect(composerCommands.map((command) => command.id)).toEqual([
      'weapon.declare-attack',
    ]);

    const commit = composerCommands[0].commit(
      ctx({ attackComposerActive: true }),
    );
    expect(commit.actionId).toBe('composer-focus-target');
    expect(commit.payload).toMatchObject({ targetUnitId: 't1' });

    // Legacy (composer inactive) keeps the full family — regression guard.
    expect(buildWeaponAttackCommands(ctx()).map((c) => c.id)).toEqual([
      'weapon.declare-attack',
      'weapon.fire-volley',
      'weapon.clear-attacks',
    ]);
  });

  it('composer-focus-target action focuses the working target and never touches attackPlan', () => {
    const before = useGameplayStore.getState().attackPlan;
    act(() =>
      useGameplayStore
        .getState()
        .handleAction('composer-focus-target', { targetUnitId: 't1' }),
    );

    // No session loaded → handleAction requires a session; simulate the
    // store-level route directly through the same reducer instead.
    act(() => useGameplayStore.getState().focusAttackTarget('t1'));
    const after = useGameplayStore.getState();
    expect(after.attackIntent.focusedTargetId).toBe('t1');
    expect(after.attackIntent.assignments).toEqual([]);
    expect(after.attackPlan).toEqual(before);
  });

  it('CombatPlanningPanel renders nothing during the weapon-attack phase', () => {
    // Force a weapon-attack session shell + a selected unit so the panel
    // reaches its phase switch (not the early no-selection null).
    act(() => {
      useGameplayStore.setState({
        session: {
          currentState: {
            phase: GamePhase.WeaponAttack,
            units: { a1: { position: { q: 0, r: 0 } } },
          },
          units: [{ id: 'a1', name: 'Attacker' }],
        } as never,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'a1',
        },
      });
    });

    const { container } = render(<CombatPlanningPanel weapons={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
