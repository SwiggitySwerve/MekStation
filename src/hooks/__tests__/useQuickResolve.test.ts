/**
 * Tests for `useQuickResolve` — covers the React hook lifecycle plus
 * the spec contracts forwarded from `QuickResolveService`.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/simulation-system/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { IAdaptedUnit } from '@/engine/types';
import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IQuickResolveRunOptions } from '@/simulation/QuickResolveService';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import * as GameEngineModule from '@/engine/GameEngine';
import { aggregateBatchOutcomes } from '@/simulation/aggregateBatchOutcomes';
import * as QuickResolveModule from '@/simulation/QuickResolveService';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import { useQuickResolve } from '../useQuickResolve';

jest.mock('@/simulation/QuickResolveService', () => {
  const actual = jest.requireActual<typeof QuickResolveModule>(
    '@/simulation/QuickResolveService',
  );
  return { ...actual, runBatch: jest.fn(actual.runBatch) };
});

// =============================================================================
// Test fixtures (mirrored from QuickResolveService.test.ts)
// =============================================================================

function createTestWeapon(id: string) {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createTestUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [createTestWeapon(`${id}-ml-1`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function createGameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

const battleConfig = {
  playerUnits: [createTestUnit('p1', GameSide.Player, { q: 0, r: -3 })],
  opponentUnits: [createTestUnit('o1', GameSide.Opponent, { q: 0, r: 3 })],
  gameUnits: [
    createGameUnit('p1', GameSide.Player),
    createGameUnit('o1', GameSide.Opponent),
  ],
  engineConfig: { mapRadius: 5, turnLimit: 5 },
};

/** Hold the service boundary open so tests choose the completion order. */
function queueBatch() {
  let resolve: (result: IBatchResult) => void = () => {
    throw new Error('Batch promise not initialized');
  };
  let reject: (error: unknown) => void = () => {
    throw new Error('Batch promise not initialized');
  };
  const promise = new Promise<IBatchResult>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  let options: IQuickResolveRunOptions = {};
  jest.mocked(QuickResolveModule.runBatch).mockImplementationOnce((_, next) => {
    options = next ?? {};
    return promise;
  });
  return {
    resolve,
    reject,
    get options() {
      return options;
    },
  };
}

const batchResult = aggregateBatchOutcomes([], 42);

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.restoreAllMocks();
  jest
    .mocked(QuickResolveModule.runBatch)
    .mockReset()
    .mockImplementation(
      jest.requireActual<typeof QuickResolveModule>(
        '@/simulation/QuickResolveService',
      ).runBatch,
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useQuickResolve', () => {
  describe('initial state', () => {
    it('starts idle with no result, no error, and zero progress', () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.wasCancelled).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.partialResult).toBeNull();
      expect(result.current.runsCompleted).toBe(0);
      expect(result.current.totalRuns).toBe(0);
    });
  });

  describe('mutate', () => {
    it('runs a small batch and exposes the aggregated result', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 3, baseSeed: 42 });
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });
      expect(result.current.result).not.toBeNull();
      expect(result.current.wasCancelled).toBe(false);
      expect(result.current.result!.totalRuns).toBe(3);
      expect(result.current.result!.baseSeed).toBe(42);
      expect(result.current.runsCompleted).toBe(3);
      expect(result.current.totalRuns).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('reports progress as runs complete', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 4, baseSeed: 1 });
      });

      // After completion, progress reflects the final state.
      expect(result.current.progress).not.toBeNull();
      expect(result.current.progress!.runsCompleted).toBe(4);
      expect(result.current.progress!.totalRuns).toBe(4);
    });

    it('captures invalid-run-count errors as `error`, not exception', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 0 });
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.error).toBe('Invalid run count');
      expect(result.current.result).toBeNull();
    });

    it('captures systemic failure with partialResult populated', async () => {
      // Force every engine run to throw so the systemic-failure threshold
      // is crossed.
      jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(() => {
          throw new Error('Synthetic failure');
        });

      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 50, baseSeed: 1 });
      });

      expect(result.current.error).toBe('Quick Resolve failed: engine errors');
      expect(result.current.partialResult).not.toBeNull();
      expect(result.current.partialResult!.erroredRuns).toBeGreaterThan(0);
    });
  });

  describe('cancel', () => {
    it('aborts an in-flight batch and exposes partial output without success', async () => {
      const original = GameEngineModule.GameEngine.prototype.runToCompletion;
      let callCount = 0;
      jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(function (
          this: GameEngineModule.GameEngine,
          ...args
        ) {
          callCount++;
          // Real implementation — kept fast.
          return (
            original as unknown as (...a: typeof args) => IGameSession
          ).apply(this, args);
        });

      const { result } = renderHook(() => useQuickResolve(battleConfig));

      // Schedule a cancel after the first progress emission.
      const mutatePromise = act(async () => {
        const p = result.current.mutate({ runs: 100, baseSeed: 1 });
        // Microtask delay so the first run kicks off.
        await Promise.resolve();
        result.current.cancel();
        await p;
      });

      await mutatePromise;

      expect(result.current.isRunning).toBe(false);
      expect(callCount).toBeLessThan(100);
      expect(result.current.wasCancelled).toBe(true);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.partialResult?.totalRuns).toBe(callCount);
      expect(result.current.runsCompleted).toBe(callCount);
      expect(result.current.totalRuns).toBe(100);
    });

    it('ignores progress after cancellation and permits repeated cancel', async () => {
      const batch = queueBatch();
      const { result } = renderHook(() => useQuickResolve(battleConfig));
      let mutation: Promise<void>;
      act(() => {
        mutation = result.current.mutate();
        batch.options.onProgress?.({ runsCompleted: 1, totalRuns: 100 });
        result.current.cancel();
        result.current.cancel();
        batch.options.onProgress?.({ runsCompleted: 2, totalRuns: 100 });
      });
      expect(batch.options.signal?.aborted).toBe(true);
      expect(result.current.runsCompleted).toBe(1);

      await act(async () => {
        batch.resolve(batchResult);
        await mutation;
      });
      expect(result.current.wasCancelled).toBe(true);
      expect(result.current.result).toBeNull();
      expect(result.current.partialResult).toBe(batchResult);
      const cancelledState = result.current;
      act(() => result.current.cancel());
      expect(result.current).toBe(cancelledState);
    });

    it('does not publish success when cancelled before the continuation runs', async () => {
      const batch = queueBatch();
      const { result } = renderHook(() => useQuickResolve(battleConfig));
      await act(async () => {
        const mutation = result.current.mutate();
        batch.resolve(batchResult);
        result.current.cancel();
        await mutation;
      });
      expect(result.current.isRunning).toBe(false);
      expect(result.current.wasCancelled).toBe(true);
      expect(result.current.result).toBeNull();
      expect(result.current.partialResult).toBe(batchResult);
    });

    it.each(['ordinary', 'systemic'])(
      'treats a cancelled %s rejection as cancellation',
      async (kind) => {
        const batch = queueBatch();
        const { result } = renderHook(() => useQuickResolve(battleConfig));
        await act(async () => {
          const mutation = result.current.mutate();
          result.current.cancel();
          batch.reject(
            kind === 'systemic'
              ? new QuickResolveModule.QuickResolveSystemicFailure(
                  [],
                  batchResult,
                )
              : new Error('Late failure'),
          );
          await mutation;
        });
        expect(result.current.isRunning).toBe(false);
        expect(result.current.wasCancelled).toBe(true);
        expect(result.current.result).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.partialResult).toBe(
          kind === 'systemic' ? batchResult : null,
        );
      },
    );

    it('clears cancellation on reset and on the next mutation', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));
      for (const reset of [false, true]) {
        const batch = queueBatch();
        await act(async () => {
          const mutation = result.current.mutate();
          result.current.cancel();
          batch.resolve(batchResult);
          await mutation;
        });
        expect(result.current.wasCancelled).toBe(true);
        if (reset) {
          act(() => result.current.reset());
          expect(result.current.wasCancelled).toBe(false);
          expect(result.current.partialResult).toBeNull();
        }
        const next = queueBatch();
        let mutation: Promise<void>;
        act(() => {
          mutation = result.current.mutate();
        });
        expect(result.current.wasCancelled).toBe(false);
        expect(result.current.partialResult).toBeNull();
        await act(async () => {
          next.resolve(batchResult);
          await mutation;
        });
        expect(result.current.result).toBe(batchResult);
      }
    });
  });

  describe('stale batches', () => {
    it.each(['resolve', 'reject', 'systemic'] as const)(
      'ignores stale progress and %s after reset',
      async (settlement) => {
        const batch = queueBatch();
        const { result } = renderHook(() => useQuickResolve(battleConfig));
        let mutation: Promise<void>;
        act(() => {
          mutation = result.current.mutate();
        });
        act(() => result.current.reset());
        const idleState = result.current;
        await act(async () => {
          batch.options.onProgress?.({ runsCompleted: 7, totalRuns: 100 });
          if (settlement === 'resolve') batch.resolve(batchResult);
          else
            batch.reject(
              settlement === 'systemic'
                ? new QuickResolveModule.QuickResolveSystemicFailure(
                    [],
                    batchResult,
                  )
                : new Error('Stale failure'),
            );
          await mutation;
        });
        expect(batch.options.signal?.aborted).toBe(true);
        expect(result.current).toBe(idleState);
      },
    );

    it.each<
      [
        settlement: 'resolve' | 'reject' | 'systemic',
        finishReplacement: boolean,
      ]
    >([
      ['resolve', false],
      ['resolve', true],
      ['reject', false],
      ['reject', true],
      ['systemic', false],
      ['systemic', true],
    ])(
      'ignores old %s (replacement finished: %s)',
      async (settlement, finishReplacement) => {
        const old = queueBatch();
        const next = queueBatch();
        const nextResult = aggregateBatchOutcomes([], 99);
        const { result } = renderHook(() => useQuickResolve(battleConfig));
        let oldMutation: Promise<void>;
        let nextMutation: Promise<void>;
        act(() => {
          oldMutation = result.current.mutate();
        });
        act(() => {
          nextMutation = result.current.mutate();
        });
        expect(old.options.signal?.aborted).toBe(true);
        if (finishReplacement) {
          await act(async () => {
            next.resolve(nextResult);
            await nextMutation;
          });
        }
        const nextState = result.current;
        await act(async () => {
          old.options.onProgress?.({ runsCompleted: 7, totalRuns: 100 });
          if (settlement === 'resolve') old.resolve(batchResult);
          else
            old.reject(
              settlement === 'systemic'
                ? new QuickResolveModule.QuickResolveSystemicFailure(
                    [],
                    batchResult,
                  )
                : new Error('Stale failure'),
            );
          await oldMutation;
        });
        expect(result.current).toBe(nextState);
        if (!finishReplacement) {
          // Old cleanup must leave the new controller available to cancel.
          act(() => result.current.cancel());
          expect(next.options.signal?.aborted).toBe(true);
          await act(async () => {
            next.resolve(nextResult);
            await nextMutation;
          });
          expect(result.current.wasCancelled).toBe(true);
          expect(result.current.result).toBeNull();
        }
      },
    );

    it('aborts on unmount and ignores subsequent progress and settlement', async () => {
      const batch = queueBatch();
      const { result, unmount } = renderHook(() =>
        useQuickResolve(battleConfig),
      );
      let mutation: Promise<void>;
      act(() => {
        mutation = result.current.mutate();
      });
      const lastState = result.current;
      unmount();
      await act(async () => {
        batch.options.onProgress?.({ runsCompleted: 7, totalRuns: 100 });
        batch.resolve(batchResult);
        await mutation;
      });
      expect(batch.options.signal?.aborted).toBe(true);
      expect(result.current).toBe(lastState);
    });
  });

  describe('reset', () => {
    it('clears state back to the idle defaults', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 2, baseSeed: 5 });
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.runsCompleted).toBe(0);
    });
  });
});
