/**
 * QuickResolveLauncher — modal child component for the encounter
 * detail page's "Quick Resolve" button.
 *
 * Owns the run-size picker, the dispatch / cancel / reset interactions,
 * and renders progress + a tiny inline result summary. Sub-Branch B
 * supplies a richer result-display surface; this component forwards
 * the aggregated `IBatchResult` up via `onComplete` so the parent can
 * route the user to that surface.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/simulation-system/spec.md § 6
 */

import { useCallback, useEffect, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IQuickResolveBattleConfig } from '@/simulation/QuickResolveService';

import { Button } from '@/components/ui';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
import { useQuickResolve } from '@/hooks/useQuickResolve';

export interface IQuickResolveLauncherProps {
  readonly battle: IQuickResolveBattleConfig;
  readonly encounterId: string;
  readonly runCount: number;
  readonly onRunCountChange: (next: number) => void;
  readonly onClose: () => void;
  readonly onComplete: (result: IBatchResult) => void;
}

/** Spec § 6.2: 25 / 100 (default) / 500 batch-size choices. */
export const QUICK_RESOLVE_RUN_COUNT_OPTIONS = [25, 100, 500] as const;

/**
 * Run-size picker modal that dispatches `useQuickResolve` and shows
 * progress. Mounted only when the user has chosen to Quick Resolve so
 * the hook never holds onto a stale battle config across encounters.
 */
export function QuickResolveLauncher({
  battle,
  encounterId,
  runCount,
  onRunCountChange,
  onClose,
  onComplete,
}: IQuickResolveLauncherProps): React.ReactElement {
  // Single hook instance: dispatching, progress, AND result observation
  // share the same state slice. Forwarding the result on completion
  // happens in the effect below.
  const {
    mutate,
    cancel,
    reset,
    isRunning,
    runsCompleted,
    totalRuns,
    result,
    error,
  } = useQuickResolve(battle);
  const [hasDispatched, setHasDispatched] = useState(false);

  const handleRun = useCallback(async () => {
    setHasDispatched(true);
    await mutate({ runs: runCount });
  }, [mutate, runCount]);

  // Forward the aggregated result up exactly once when the batch
  // settles successfully. Sub-Branch B will replace `onComplete` with
  // a navigation/render hook to the result-display surface.
  useEffect(() => {
    if (!isRunning && hasDispatched && result) {
      onComplete(result);
    }
  }, [isRunning, hasDispatched, result, onComplete]);

  const progressPct =
    totalRuns > 0 ? Math.round((runsCompleted / totalRuns) * 100) : 0;

  return (
    <DialogTemplate
      isOpen
      onClose={onClose}
      title="Quick Resolve"
      subtitle={`Estimate outcome probabilities for encounter ${encounterId.slice(0, 8)}`}
      preventClose={isRunning}
      footer={
        <div className="flex items-center justify-end gap-3">
          {isRunning ? (
            <Button
              variant="secondary"
              onClick={() => cancel()}
              data-testid="quick-resolve-cancel-btn"
            >
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                disabled={isRunning}
                onClick={() => void handleRun()}
                data-testid="quick-resolve-run-btn"
              >
                {hasDispatched ? 'Run Again' : `Run ${runCount} simulations`}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-slate-300">
            Batch size
          </legend>
          <div className="flex gap-2">
            {QUICK_RESOLVE_RUN_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onRunCountChange(count)}
                disabled={isRunning}
                className={
                  runCount === count
                    ? 'rounded-md border border-blue-500 bg-blue-600/30 px-4 py-2 text-sm font-medium text-white'
                    : 'rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700'
                }
                data-testid={`quick-resolve-runs-${count}`}
              >
                {count}
              </button>
            ))}
          </div>
        </fieldset>

        {isRunning && (
          <div
            className="flex flex-col gap-2"
            data-testid="quick-resolve-progress"
          >
            <div className="flex justify-between text-sm text-slate-400">
              <span>
                {runsCompleted} / {totalRuns} runs
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!isRunning && result && (
          <div
            className="rounded-md border border-emerald-600/30 bg-emerald-900/20 p-3 text-sm text-emerald-200"
            data-testid="quick-resolve-summary"
          >
            <div className="font-semibold">
              Most likely outcome: {result.mostLikelyOutcome}
            </div>
            <div className="mt-1 text-xs text-emerald-300">
              Player {Math.round(result.winProbability.player * 100)}% /
              Opponent {Math.round(result.winProbability.opponent * 100)}% /
              Draw {Math.round(result.winProbability.draw * 100)}%
            </div>
          </div>
        )}
      </div>
    </DialogTemplate>
  );
}
