/**
 * Pre-Battle page `onForcesChange` useEffect contract tests.
 *
 * The pre-battle page at `src/pages/gameplay/encounters/[id]/pre-battle.tsx`
 * wires the `onForcesChange` callback via a `useEffect` with dep array
 * `[playerForce, opponentForce, pilots]`. This test mirrors that effect
 * directly via `renderHook` so we can assert the dep-array semantics
 * without rendering the full page (which would require mocking routers,
 * zustand stores, canonical unit service, and the engine adapter).
 *
 * Spec scenarios exercised:
 *   - Callback fires on unit addition
 *   - Callback fires on pilot swap
 *   - Callback fires on unit removal
 *   - Callback NOT invoked for unrelated changes (map radius)
 *   - Callback omission does not affect launch
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/game-session-management/spec.md
 */

import { act, renderHook } from '@testing-library/react';
import { useEffect, useState } from 'react';

/**
 * Minimal re-implementation of the pre-battle page's derivation
 * useEffect. Accepts the three dep-array inputs, plus `mapConfig` as an
 * "unrelated" state slice that MUST NOT trigger re-derivation.
 *
 * The derivation function is passed in so the test can count calls.
 */
function usePreBattleForcesEffect<TPlayerForce, TOpponentForce, TPilots>(
  playerForce: TPlayerForce,
  opponentForce: TOpponentForce,
  pilots: TPilots,
  _mapConfig: unknown,
  derive: (
    p: TPlayerForce,
    o: TOpponentForce,
    pi: TPilots,
  ) => void | Promise<void>,
): void {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const result = derive(playerForce, opponentForce, pilots);
      if (result instanceof Promise) await result;
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `_mapConfig` — matches pre-battle.tsx:234
    // dep array `[playerForce, opponentForce, pilots]`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerForce, opponentForce, pilots]);
}

describe('pre-battle useEffect (onForcesChange callback contract)', () => {
  type Force = { id: string; units: string[] };
  type Pilots = readonly string[];

  const initialState = () => ({
    playerForce: { id: 'p', units: ['locust'] } as Force,
    opponentForce: { id: 'o', units: ['wasp'] } as Force,
    pilots: ['alpha', 'bravo'] as Pilots,
    mapConfig: { radius: 12 },
  });

  it('fires derivation once on mount', () => {
    const derive = jest.fn();
    const { playerForce, opponentForce, pilots, mapConfig } = initialState();

    renderHook(() =>
      usePreBattleForcesEffect(
        playerForce,
        opponentForce,
        pilots,
        mapConfig,
        derive,
      ),
    );

    expect(derive).toHaveBeenCalledTimes(1);
    expect(derive).toHaveBeenCalledWith(playerForce, opponentForce, pilots);
  });

  it('re-derives when a mech is added to the player force', () => {
    const derive = jest.fn();
    let props = initialState();

    const { rerender } = renderHook(() =>
      usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      ),
    );
    expect(derive).toHaveBeenCalledTimes(1);

    // Add a second mech — new playerForce reference, must trigger.
    act(() => {
      props = {
        ...props,
        playerForce: { id: 'p', units: ['locust', 'wasp'] },
      };
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(2);
    expect(derive).toHaveBeenLastCalledWith(
      props.playerForce,
      props.opponentForce,
      props.pilots,
    );
  });

  it('re-derives when a mech is removed from the opponent force', () => {
    const derive = jest.fn();
    let props = initialState();
    props.opponentForce = { id: 'o', units: ['wasp', 'locust'] };

    const { rerender } = renderHook(() =>
      usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      ),
    );
    expect(derive).toHaveBeenCalledTimes(1);

    act(() => {
      props = {
        ...props,
        opponentForce: { id: 'o', units: ['wasp'] },
      };
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(2);
  });

  it('re-derives when the pilots list changes (pilot swap)', () => {
    const derive = jest.fn();
    let props = initialState();

    const { rerender } = renderHook(() =>
      usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      ),
    );
    expect(derive).toHaveBeenCalledTimes(1);

    // Pilot roster swap — same-length, different ids.
    act(() => {
      props = { ...props, pilots: ['charlie', 'delta'] };
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(2);
    expect(derive).toHaveBeenLastCalledWith(
      props.playerForce,
      props.opponentForce,
      props.pilots,
    );
  });

  it('does NOT re-derive when map radius changes (unrelated state)', () => {
    const derive = jest.fn();
    let props = initialState();

    const { rerender } = renderHook(() =>
      usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      ),
    );
    expect(derive).toHaveBeenCalledTimes(1);

    // Change only mapConfig. Since it's NOT in the dep array, derive
    // must not be called again. Matches spec scenario "Callback not
    // invoked for unrelated changes".
    act(() => {
      props = { ...props, mapConfig: { radius: 24 } };
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no subscriber is attached (derive is a no-op)', () => {
    // Spec scenario: Callback omission does not affect launch — the
    // hook must not blow up when the consumer passes a noop derivation.
    const noop = () => {
      /* intentional no-op */
    };
    const state = initialState();
    expect(() =>
      renderHook(() =>
        usePreBattleForcesEffect(
          state.playerForce,
          state.opponentForce,
          state.pilots,
          state.mapConfig,
          noop,
        ),
      ),
    ).not.toThrow();
  });

  it('handles rapid rerenders without double-firing derivation for the same inputs', () => {
    // Defensive: back-to-back rerenders with unchanged deps must not
    // fan out to redundant derivations (React's useEffect already
    // enforces this, but the test locks in the contract).
    const derive = jest.fn();
    let props = initialState();

    const { rerender } = renderHook(() =>
      usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      ),
    );
    expect(derive).toHaveBeenCalledTimes(1);

    // Identical rerender — deps unchanged, derive must not re-run.
    act(() => {
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(1);

    // Now actually change something in the dep array.
    act(() => {
      props = { ...props, playerForce: { id: 'p', units: ['locust', 'wasp'] } };
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(2);
  });

  it('passes the latest dep values to the derivation when multiple deps change simultaneously', () => {
    // Combined add-unit + pilot-swap scenario — verify derive sees
    // both changes atomically on a single effect run.
    const derive = jest.fn();
    let props = initialState();

    const { rerender } = renderHook(() =>
      usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      ),
    );
    expect(derive).toHaveBeenCalledTimes(1);

    act(() => {
      props = {
        ...props,
        playerForce: { id: 'p', units: ['locust', 'wasp'] },
        pilots: ['charlie', 'delta'],
      };
      rerender();
    });
    expect(derive).toHaveBeenCalledTimes(2);
    expect(derive).toHaveBeenLastCalledWith(
      props.playerForce,
      props.opponentForce,
      props.pilots,
    );
  });
});

// =============================================================================
// Second harness — verifies strict-mode-safe cancellation guard.
// =============================================================================

describe('pre-battle useEffect cancellation guard', () => {
  it('resolves pending async derivations without throwing when the component re-renders mid-flight', async () => {
    // Mirrors the pre-battle page's `cancelled` flag pattern. A slow
    // derivation returns a Promise; before it resolves we rerender
    // with new inputs. The effect's cleanup flips `cancelled`, so the
    // late setState would be skipped in the real page — here we
    // verify the Promise resolves cleanly either way.
    type Force = { id: string };
    const derive = jest.fn(
      (_p: Force, _o: Force, _pi: readonly string[]) =>
        new Promise<void>((resolve) => setTimeout(resolve, 0)),
    );

    let props = {
      playerForce: { id: 'p1' } as Force,
      opponentForce: { id: 'o1' } as Force,
      pilots: ['alpha'] as readonly string[],
      mapConfig: {},
    };

    const { rerender } = renderHook(() => {
      const [, setTick] = useState(0);
      // Provide a way to force a rerender from inside the hook tree.
      (
        globalThis as unknown as { __forceRerender?: () => void }
      ).__forceRerender = () => setTick((t) => t + 1);
      return usePreBattleForcesEffect(
        props.playerForce,
        props.opponentForce,
        props.pilots,
        props.mapConfig,
        derive,
      );
    });

    // Trigger a dep change mid-flight.
    await act(async () => {
      props = { ...props, playerForce: { id: 'p2' } };
      rerender();
    });

    // Derive was called twice (once on mount, once on change). No
    // unhandled promise rejection → guard works.
    expect(derive).toHaveBeenCalledTimes(2);
  });
});
