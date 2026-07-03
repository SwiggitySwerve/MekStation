/**
 * AttackIntentComposer integration test (change `attack-phase-intent-composer`,
 * phase 2, tasks 2.1–2.4). Drives the compose flow through the REAL gameplay
 * store (attackIntent slice + phase-1 derive layer), proving the spec
 * scenarios:
 *
 *  - Composing assigns without declaring (zero-commit guarantee);
 *  - block-at-source rendering with rules-backed reasons (palette);
 *  - twist re-gates palette rows live and un-twist restores (D7);
 *  - always-visible threshold chips whose STATE changes (D10);
 *  - Fire disabled-with-hint until a legal assignment exists; explicit
 *    Hold Fire control present (resolver).
 *
 * The engine commit path is covered by `InteractiveSession.volley.scenario`
 * (single lock, primary-first groups) — here `commitComposedVolley` no-ops
 * without an interactive session, which is exactly the zero-commit check.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IHex } from '@/types/gameplay/HexGridInterfaces';

import { useGameplayStore } from '@/stores/useGameplayStore';
import { deriveTargetArcUnderIntent } from '@/stores/useGameplayStore.attackIntent.derive';
import {
  Facing,
  FiringArc,
  GameSide,
  type IGameSession,
  type IHexGrid,
  type IUnitGameState,
  type IWeaponStatus,
} from '@/types/gameplay';

import type { IAttackComposerContext } from '../composer.types';

import { AttackIntentComposer } from '../AttackIntentComposer';

// =============================================================================
// Fixtures
// =============================================================================

function makeGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -10; q <= 10; q++) {
    for (let r = -10; r <= 10; r++) {
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius: 10 }, hexes };
}

function weapon(
  id: string,
  overrides: Partial<IWeaponStatus> = {},
): IWeaponStatus {
  return {
    id,
    name: id,
    location: 'RA',
    mountingArc: FiringArc.Front,
    destroyed: false,
    firedThisTurn: false,
    heat: 4,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  } as IWeaponStatus;
}

const ATTACKER_STATE = {
  position: { q: 0, r: 0 },
  facing: Facing.North,
  heat: 0,
  pilotWounds: 0,
  prone: false,
} as unknown as IUnitGameState;

function enemyState(q: number, r: number): IUnitGameState {
  return {
    position: { q, r },
    facing: Facing.South,
    heat: 0,
    prone: false,
    hexesMovedThisTurn: 0,
  } as unknown as IUnitGameState;
}

/** t1 two hexes toward base facing North (front arc); t2 one hex further. */
function makeSession(): IGameSession {
  return {
    units: [
      { id: 'a1', name: 'Attacker', side: GameSide.Player },
      { id: 't1', name: 'Enemy One', side: GameSide.Opponent },
      { id: 't2', name: 'Enemy Two', side: GameSide.Opponent },
    ],
    currentState: {
      units: {
        a1: ATTACKER_STATE,
        t1: enemyState(0, -2),
        t2: enemyState(0, -3),
      },
    },
  } as unknown as IGameSession;
}

function context(
  overrides: Partial<IAttackComposerContext> = {},
): IAttackComposerContext {
  return {
    active: true,
    attackerId: 'a1',
    unit: ATTACKER_STATE,
    weapons: [weapon('laser-1'), weapon('laser-2')],
    session: makeSession(),
    grid: makeGrid(),
    gunnery: 4,
    heatDissipation: 10,
    movementHeat: 0,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('AttackIntentComposer', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useGameplayStore.getState().clearAttackIntent();
  });

  it('renders nothing when inactive', () => {
    const { container } = render(
      <AttackIntentComposer context={context({ active: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('COMPOSING ASSIGNS WITHOUT DECLARING: toggles build intent, nothing commits', () => {
    render(<AttackIntentComposer context={context()} />);

    // Without a focused target, toggles are blocked with the pick-a-target
    // hint (D6 target-first — the palette says why).
    expect(screen.getByTestId('weapon-toggle-laser-1')).toBeDisabled();

    // Focus enemy t1 (the map click path calls this same store action).
    fireEvent.click(screen.getByTestId('weapon-toggle-laser-1')); // no-op while blocked
    act(() => useGameplayStore.getState().focusAttackTarget('t1'));

    fireEvent.click(screen.getByTestId('weapon-toggle-laser-1'));
    fireEvent.click(screen.getByTestId('weapon-toggle-laser-2'));

    // Intent items visible: both weapons assigned against Enemy One.
    expect(useGameplayStore.getState().attackIntent.assignments).toHaveLength(
      2,
    );
    expect(screen.getByTestId('volley-group-t1')).toHaveTextContent(
      '2 weapons → Enemy One',
    );
    expect(screen.getByTestId('volley-group-t1')).toHaveAttribute(
      'data-volley-primary',
      'true',
    );
    // Zero-commit guarantee: no declaration surface was touched.
    expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([]);
    expect(useGameplayStore.getState().session).toBeNull();
  });

  it('SECOND TARGET SHOWS SECONDARY PENALTY: assignment to a second target renders +1 inline', () => {
    render(<AttackIntentComposer context={context()} />);

    act(() => useGameplayStore.getState().focusAttackTarget('t1'));
    fireEvent.click(screen.getByTestId('weapon-toggle-laser-1'));
    act(() => useGameplayStore.getState().focusAttackTarget('t2'));
    fireEvent.click(screen.getByTestId('weapon-toggle-laser-2'));

    // t2 is in the (twist-free) front arc → +1 secondary penalty inline.
    expect(
      screen.getByTestId('weapon-secondary-penalty-laser-2'),
    ).toHaveTextContent('secondary +1');
    expect(screen.getByTestId('volley-group-t2')).not.toHaveAttribute(
      'data-volley-primary',
    );
  });

  it('BLOCK AT SOURCE: destroyed and out-of-range weapons render disabled with reasons', () => {
    render(
      <AttackIntentComposer
        context={context({
          weapons: [
            weapon('operable'),
            weapon('broken', { destroyed: true }),
            weapon('short-reach', { ranges: { short: 1, medium: 1, long: 1 } }),
          ],
        })}
      />,
    );
    act(() => useGameplayStore.getState().focusAttackTarget('t1'));

    expect(screen.getByTestId('weapon-toggle-operable')).toBeEnabled();
    expect(screen.getByTestId('weapon-toggle-broken')).toBeDisabled();
    expect(
      screen.getByTestId('weapon-blocked-reason-broken'),
    ).toHaveTextContent(/destroyed/i);
    expect(screen.getByTestId('weapon-toggle-short-reach')).toBeDisabled();
    expect(
      screen.getByTestId('weapon-blocked-reason-short-reach'),
    ).toHaveTextContent('out of range');
  });

  it('TWIST UNLOCKS ARC LIVE: twist re-gates a blocked row, un-twist restores (D7)', () => {
    // Find an enemy hex outside the front arc at base facing but inside it
    // under one of the two twist options — the arc module owns the exact
    // geometry; the composer must consume it live.
    const attacker = { position: { q: 0, r: 0 }, facing: Facing.North };
    let candidate: { q: number; r: number } | null = null;
    let twistKey: 'left' | 'right' = 'right';
    // Canonical twist mapping (`getTwistedFacing`): left = +1 hexside
    // (North → Northeast), right = -1 (North → Northwest).
    for (const twist of [
      { key: 'left' as const, facing: Facing.Northeast },
      { key: 'right' as const, facing: Facing.Northwest },
    ]) {
      for (let q = -3; q <= 3 && !candidate; q++) {
        for (let r = -3; r <= 3 && !candidate; r++) {
          if (q === 0 && r === 0) continue;
          const hex = { q, r };
          if (
            deriveTargetArcUnderIntent(attacker, null, hex) !==
              FiringArc.Front &&
            deriveTargetArcUnderIntent(attacker, twist.facing, hex) ===
              FiringArc.Front
          ) {
            candidate = hex;
            twistKey = twist.key;
          }
        }
      }
      if (candidate) break;
    }
    expect(candidate).not.toBeNull();

    const session = makeSession();
    (session.currentState.units as Record<string, IUnitGameState>).t1 =
      enemyState(candidate!.q, candidate!.r);
    render(<AttackIntentComposer context={context({ session })} />);
    act(() => useGameplayStore.getState().focusAttackTarget('t1'));

    expect(screen.getByTestId('weapon-toggle-laser-1')).toBeDisabled();
    expect(
      screen.getByTestId('weapon-blocked-reason-laser-1'),
    ).toHaveTextContent(/arc/i);

    fireEvent.click(screen.getByTestId(`twist-option-${twistKey}`));
    expect(screen.getByTestId('weapon-toggle-laser-1')).toBeEnabled();

    fireEvent.click(screen.getByTestId('twist-option-none'));
    expect(screen.getByTestId('weapon-toggle-laser-1')).toBeDisabled();
  });

  it('ALWAYS-VISIBLE CHIPS (D10): chips render safe and flip to risk as composed heat crosses', () => {
    render(
      <AttackIntentComposer
        context={context({
          weapons: [weapon('hot-gun', { heat: 25 })],
          heatDissipation: 0,
        })}
      />,
    );

    // Chips are present BEFORE any assignment, in the safe state.
    expect(screen.getByTestId('ledger-chip-shutdown')).toHaveAttribute(
      'data-chip-state',
      'safe',
    );
    expect(screen.getByTestId('ledger-chip-ammo')).toHaveAttribute(
      'data-chip-state',
      'safe',
    );

    act(() => useGameplayStore.getState().focusAttackTarget('t1'));
    fireEvent.click(screen.getByTestId('weapon-toggle-hot-gun'));

    // 25 projected heat: shutdown check (TN) + ammo explosion risk — and the
    // volley stays composable and fireable (heat never blocks).
    expect(screen.getByTestId('ledger-chip-shutdown')).toHaveAttribute(
      'data-chip-state',
      'risk',
    );
    expect(screen.getByTestId('ledger-chip-ammo')).toHaveAttribute(
      'data-chip-state',
      'risk',
    );
    expect(screen.getByTestId('volley-fire-button')).toBeEnabled();
  });

  it('EXPLICIT FIRE + HOLD FIRE: Fire disabled with hint until a legal assignment exists', () => {
    render(<AttackIntentComposer context={context()} />);

    expect(screen.getByTestId('volley-fire-button')).toBeDisabled();
    expect(screen.getByTestId('volley-fire-hint')).toHaveTextContent(
      /assign at least one weapon/i,
    );
    expect(screen.getByTestId('volley-hold-fire-button')).toBeEnabled();

    act(() => useGameplayStore.getState().focusAttackTarget('t1'));
    fireEvent.click(screen.getByTestId('weapon-toggle-laser-1'));

    expect(screen.getByTestId('volley-fire-button')).toBeEnabled();
    expect(screen.queryByTestId('volley-fire-hint')).not.toBeInTheDocument();
  });
});
