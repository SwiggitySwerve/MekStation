/**
 * Tests for TacticalCommandShell elected-spotter state (PR-K8 §1+§1.5).
 *
 * Verifies the event-driven projection of IndirectFireSpotterSelected /
 * IndirectFireSpotterLost into `state.electedSpotters`:
 *   - Selected event → spotter pair appended
 *   - Lost event → matching pair removed
 *   - Turn rollover → list cleared
 *   - Idempotent: same Selected event twice doesn't double-add
 */

import { act, renderHook } from '@testing-library/react';

import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';

import { TacticalCommandShell, useTacticalShell } from '../index';

// =============================================================================
// Fixtures
// =============================================================================

function buildEvent(
  type: GameEventType,
  sequence: number,
  payload: Record<string, unknown>,
  turn = 1,
): IGameEvent {
  return {
    id: `evt-${sequence}`,
    sequence,
    timestamp: new Date('2026-05-21T00:00:00Z').toISOString(),
    type,
    turn,
    phase: GamePhase.WeaponAttack,
    actorUnitId: payload.attackerId as string | undefined,
    payload,
  } as unknown as IGameEvent;
}

function buildSession(events: readonly IGameEvent[], turn = 1): IGameSession {
  return {
    id: 'test-session',
    events: [...events],
    currentState: {
      turn,
      phase: GamePhase.WeaponAttack,
      units: {},
    },
    units: [],
  } as unknown as IGameSession;
}

// =============================================================================
// Tests
// =============================================================================

describe('TacticalCommandShell — electedSpotters (PR-K8)', () => {
  afterEach(() => {
    act(() => useGameplayStore.setState({ session: null }));
  });

  it('seeds an empty electedSpotters list by default', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="p1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );
    const { result } = renderHook(() => useTacticalShell(), { wrapper });
    expect(result.current.state.electedSpotters).toEqual([]);
  });

  it('projects IndirectFireSpotterSelected into electedSpotters', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="p1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );
    const { result, rerender } = renderHook(() => useTacticalShell(), {
      wrapper,
    });

    act(() => {
      useGameplayStore.setState({
        session: buildSession([
          buildEvent(GameEventType.IndirectFireSpotterSelected, 0, {
            attackerId: 'a1',
            spotterId: 's1',
            weaponId: 'lrm-15-1',
            basis: 'los',
            toHitPenalty: 1,
            targetHex: { q: 5, r: 0 },
          }),
        ]),
      });
    });
    rerender();

    expect(result.current.state.electedSpotters).toEqual([
      { spotterId: 's1', attackerId: 'a1' },
    ]);
  });

  it('removes pair on IndirectFireSpotterLost', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="p1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );
    const { result, rerender } = renderHook(() => useTacticalShell(), {
      wrapper,
    });

    act(() => {
      useGameplayStore.setState({
        session: buildSession([
          buildEvent(GameEventType.IndirectFireSpotterSelected, 0, {
            attackerId: 'a1',
            spotterId: 's1',
            weaponId: 'lrm-15-1',
            basis: 'los',
            toHitPenalty: 1,
            targetHex: { q: 5, r: 0 },
          }),
        ]),
      });
    });
    rerender();
    expect(result.current.state.electedSpotters.length).toBe(1);

    act(() => {
      useGameplayStore.setState({
        session: buildSession([
          buildEvent(GameEventType.IndirectFireSpotterSelected, 0, {
            attackerId: 'a1',
            spotterId: 's1',
            weaponId: 'lrm-15-1',
            basis: 'los',
            toHitPenalty: 1,
            targetHex: { q: 5, r: 0 },
          }),
          buildEvent(GameEventType.IndirectFireSpotterLost, 1, {
            attackerId: 'a1',
            spotterId: 's1',
            weaponId: 'lrm-15-1',
            basis: 'los',
            toHitPenalty: 0,
            targetHex: { q: 5, r: 0 },
            reason: 'Spotter destroyed before resolution',
          }),
        ]),
      });
    });
    rerender();

    expect(result.current.state.electedSpotters).toEqual([]);
  });

  it('clears electedSpotters on turn rollover', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="p1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );
    const { result, rerender } = renderHook(() => useTacticalShell(), {
      wrapper,
    });

    act(() => {
      useGameplayStore.setState({
        session: buildSession(
          [
            buildEvent(
              GameEventType.IndirectFireSpotterSelected,
              0,
              {
                attackerId: 'a1',
                spotterId: 's1',
                weaponId: 'lrm-15-1',
                basis: 'los',
                toHitPenalty: 1,
                targetHex: { q: 5, r: 0 },
              },
              1,
            ),
          ],
          1,
        ),
      });
    });
    rerender();
    expect(result.current.state.electedSpotters.length).toBe(1);

    // Advance turn — list clears
    act(() => {
      useGameplayStore.setState({
        session: buildSession(
          [
            buildEvent(
              GameEventType.IndirectFireSpotterSelected,
              0,
              {
                attackerId: 'a1',
                spotterId: 's1',
                weaponId: 'lrm-15-1',
                basis: 'los',
                toHitPenalty: 1,
                targetHex: { q: 5, r: 0 },
              },
              1,
            ),
          ],
          2, // turn advanced
        ),
      });
    });
    rerender();

    expect(result.current.state.electedSpotters).toEqual([]);
  });

  it('is idempotent — same Selected event twice does not double-add', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="p1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );
    const { result, rerender } = renderHook(() => useTacticalShell(), {
      wrapper,
    });

    const event = buildEvent(GameEventType.IndirectFireSpotterSelected, 0, {
      attackerId: 'a1',
      spotterId: 's1',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 1,
      targetHex: { q: 5, r: 0 },
    });

    act(() => {
      useGameplayStore.setState({ session: buildSession([event]) });
    });
    rerender();
    expect(result.current.state.electedSpotters.length).toBe(1);

    // Re-trigger with the same event (e.g., shell re-mounts) — list stays length 1
    act(() => {
      useGameplayStore.setState({ session: buildSession([event]) });
    });
    rerender();
    expect(result.current.state.electedSpotters.length).toBe(1);
  });
});

describe('TacticalCommandShell current event history (U15)', () => {
  const pair = { attackerId: 'a1', spotterId: 's1' };
  const selected = buildEvent(
    GameEventType.IndirectFireSpotterSelected,
    0,
    pair,
  );
  const lost = buildEvent(GameEventType.IndirectFireSpotterLost, 1, pair);

  function mountShell(events: readonly IGameEvent[]) {
    useGameplayStore.setState({ session: buildSession(events) });
    return renderHook(() => useTacticalShell(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <TacticalCommandShell viewerPlayerId="p1">
          {children}
        </TacticalCommandShell>
      ),
    });
  }

  afterEach(() => {
    act(() => useGameplayStore.setState({ session: null }));
  });

  it('removes an undone selection and processes the replacement event', () => {
    const { result } = mountShell([selected]);
    expect(result.current.state.electedSpotters).toEqual([pair]);

    act(() => useGameplayStore.setState({ session: buildSession([]) }));
    expect(result.current.state.electedSpotters).toEqual([]);

    const replacement = { attackerId: 'a2', spotterId: 's2' };
    act(() =>
      useGameplayStore.setState({
        session: buildSession([
          buildEvent(GameEventType.IndirectFireSpotterSelected, 0, replacement),
        ]),
      }),
    );
    expect(result.current.state.electedSpotters).toEqual([replacement]);
  });

  it('restores a selected pair when its Lost event is undone', () => {
    const { result } = mountShell([selected, lost]);
    expect(result.current.state.electedSpotters).toEqual([]);
    act(() => useGameplayStore.setState({ session: buildSession([selected]) }));
    expect(result.current.state.electedSpotters).toEqual([pair]);
  });

  it('replaces spotters when a different session has the same event count', () => {
    const { result } = mountShell([selected]);
    const replacement = { attackerId: 'a2', spotterId: 's2' };
    act(() =>
      useGameplayStore.setState({
        session: {
          ...buildSession([
            buildEvent(
              GameEventType.IndirectFireSpotterSelected,
              0,
              replacement,
            ),
          ]),
          id: 'replacement-session',
        },
      }),
    );
    expect(result.current.state.electedSpotters).toEqual([replacement]);
  });

  it('drops the old turn when rollover and a selection arrive together', () => {
    const { result } = mountShell([selected]);
    const newPair = { attackerId: 'a2', spotterId: 's2' };
    act(() =>
      useGameplayStore.setState({
        session: buildSession(
          [
            selected,
            buildEvent(
              GameEventType.IndirectFireSpotterSelected,
              1,
              newPair,
              2,
            ),
          ],
          2,
        ),
      }),
    );
    expect(result.current.state.electedSpotters).toEqual([newPair]);
  });

  it('clears spotters when the session is removed', () => {
    const { result } = mountShell([selected]);
    act(() => useGameplayStore.setState({ session: null }));
    expect(result.current.state.electedSpotters).toEqual([]);
  });

  it('preserves pair ordering, deduplication, and independent attackers', () => {
    const otherPair = { attackerId: 'a2', spotterId: 's1' };
    const { result } = mountShell([
      selected,
      selected,
      buildEvent(GameEventType.IndirectFireSpotterSelected, 1, otherPair),
      lost,
    ]);
    expect(result.current.state.electedSpotters).toEqual([otherPair]);
  });
});
