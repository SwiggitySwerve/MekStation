/**
 * useQuickResolve — React hook wrapping `QuickResolveService.runBatch`.
 *
 * Mirrors the React Query mutation pattern (without bringing in the
 * dependency): exposes `mutate(args)`, `isRunning`, `runsCompleted /
 * totalRuns` progress, the aggregated `result`, an `error`, and a
 * `cancel()` helper. Designed for the Quick Resolve modal on the
 * encounter detail page — the UI calls `mutate({ runs, baseSeed })`,
 * watches progress, then renders the `result` once `isRunning` flips
 * back to false.
 *
 * Cancellation: calling `cancel()` aborts the underlying batch; the
 * hook still resolves with the partial `IBatchResult`.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/simulation-system/spec.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type {
  IQuickResolveBattleConfig,
  IQuickResolveProgress,
} from '@/simulation/QuickResolveService';

import {
  QuickResolveSystemicFailure,
  runBatch,
} from '@/simulation/QuickResolveService';

// =============================================================================
// Public types
// =============================================================================

/** Per-mutation request shape — matches `IQuickResolveRunOptions`. */
export interface IQuickResolveMutationArgs {
  readonly runs?: number;
  readonly baseSeed?: number;
}

export interface IUseQuickResolveState {
  /** True while a batch is in flight (between `mutate` and resolution). */
  readonly isRunning: boolean;
  /** Most recent progress emission; `null` until first run completes. */
  readonly progress: IQuickResolveProgress | null;
  /** `progress.runsCompleted` flat-shortcut for the UI. */
  readonly runsCompleted: number;
  /** `progress.totalRuns` flat-shortcut for the UI. */
  readonly totalRuns: number;
  /** Aggregated batch result, populated once the run resolves. */
  readonly result: IBatchResult | null;
  /** Error message from the last failed batch, or null. */
  readonly error: string | null;
  /** Partial result from a systemic-failure abort, if applicable. */
  readonly partialResult: IBatchResult | null;
}

export interface IUseQuickResolveApi extends IUseQuickResolveState {
  /** Kick off a batch. Settling resolves into `result` + `error` state. */
  readonly mutate: (args?: IQuickResolveMutationArgs) => Promise<void>;
  /** Abort the in-flight batch, if any. */
  readonly cancel: () => void;
  /** Reset the hook back to its idle state. */
  readonly reset: () => void;
}

// =============================================================================
// Hook
// =============================================================================

const INITIAL_STATE: IUseQuickResolveState = {
  isRunning: false,
  progress: null,
  runsCompleted: 0,
  totalRuns: 0,
  result: null,
  error: null,
  partialResult: null,
};

/**
 * React hook for the Quick Resolve Monte Carlo batch runner.
 *
 * @param battle the encounter inputs (player units, opponent units,
 *   game-unit metadata). Stable references recommended — the hook
 *   captures by closure inside `mutate`.
 */
export function useQuickResolve(
  battle: IQuickResolveBattleConfig,
): IUseQuickResolveApi {
  const [state, setState] = useState<IUseQuickResolveState>(INITIAL_STATE);
  // Track the abort controller for the in-flight batch so `cancel()`
  // can fire it without having to thread state through the closure.
  const abortRef = useRef<AbortController | null>(null);
  // Component-unmounted guard so we don't setState after teardown.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any in-flight batch on unmount so the engine loop
      // terminates promptly and we don't leak work.
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (mountedRef.current) setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const mutate = useCallback(
    async (args?: IQuickResolveMutationArgs) => {
      // Replace any in-flight controller — caller is restarting.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        ...INITIAL_STATE,
        isRunning: true,
      });

      try {
        const result = await runBatch(battle, {
          runs: args?.runs,
          baseSeed: args?.baseSeed,
          signal: controller.signal,
          onProgress: (progress) => {
            if (!mountedRef.current) return;
            setState((prev) => ({
              ...prev,
              progress,
              runsCompleted: progress.runsCompleted,
              totalRuns: progress.totalRuns,
            }));
          },
        });

        if (!mountedRef.current) return;
        // Spec § 5.4: log the seed onto the result so the UI / debugger
        // can replay this batch deterministically. The value is part
        // of `IBatchResult.baseSeed` already — surface it via state.
        setState((prev) => ({
          ...prev,
          isRunning: false,
          result,
          totalRuns: result.totalRuns,
          runsCompleted: result.totalRuns,
        }));
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof QuickResolveSystemicFailure) {
          // Surface the partial aggregate even on systemic failure so
          // the UI can show what was collected before the abort.
          setState((prev) => ({
            ...prev,
            isRunning: false,
            error: err.message,
            partialResult: err.partialResult,
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [battle],
  );

  return {
    ...state,
    mutate,
    cancel,
    reset,
  };
}
