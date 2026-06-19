import { useEffect, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IQuickResolveBattleConfig } from '@/simulation/QuickResolveService';
import type { IEncounter } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { QUICK_RESOLVE_RUN_COUNT_OPTIONS } from '@/components/gameplay/quickResolve/QuickResolveLauncher';
import { QuickSimResultPanel } from '@/components/gameplay/QuickSimResultPanel';
import { useToast } from '@/components/shared/Toast';
import { Button, PageLayout } from '@/components/ui';
import { logger } from '@/utils/logger';

export const DEFAULT_RUN_COUNT = 100;

type Breadcrumb = { readonly label: string; readonly href?: string };
type PreparedQuickSimBattle = {
  readonly battle: IQuickResolveBattleConfig | null;
  readonly isPreparing: boolean;
};

export function buildQuickSimBreadcrumbs(
  encounter: IEncounter | null,
  encounterId: string,
): Breadcrumb[] {
  return [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Encounters', href: '/gameplay/encounters' },
    {
      label: encounter?.name ?? 'Encounter',
      href: encounterId
        ? `/gameplay/encounters/${encounterId}`
        : '/gameplay/encounters',
    },
    { label: 'Quick Sim' },
  ];
}

export function QuickSimLoadingState(): React.ReactElement {
  return (
    <PageLayout title="Quick Sim" backLink="/gameplay/encounters">
      <div
        className="rounded-lg border border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-400"
        data-testid="quick-sim-page-loading"
      >
        Loading encounter...
      </div>
    </PageLayout>
  );
}

export function QuickSimNotFoundState(): React.ReactElement {
  return (
    <PageLayout title="Quick Sim" backLink="/gameplay/encounters">
      <div
        className="rounded-lg border border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-400"
        data-testid="quick-sim-page-not-found"
      >
        Encounter not found.
      </div>
    </PageLayout>
  );
}

export function getQuickSimInitialState({
  encounter,
  encountersLoading,
  isInitialized,
}: {
  readonly encounter: IEncounter | null;
  readonly encountersLoading: boolean;
  readonly isInitialized: boolean;
}): React.ReactElement | null {
  if (!isInitialized || encountersLoading) {
    return <QuickSimLoadingState />;
  }

  if (!encounter) {
    return <QuickSimNotFoundState />;
  }

  return null;
}

export function QuickSimControls({
  battle,
  hasDispatched,
  isPreparing,
  isRunning,
  runCount,
  onRunCountChange,
  onStart,
}: {
  readonly battle: IQuickResolveBattleConfig | null;
  readonly hasDispatched: boolean;
  readonly isPreparing: boolean;
  readonly isRunning: boolean;
  readonly runCount: number;
  readonly onRunCountChange: (runCount: number) => void;
  readonly onStart: () => void;
}): React.ReactElement {
  return (
    <section
      className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4"
      aria-labelledby="qsim-controls-heading"
    >
      <fieldset
        className="flex flex-col gap-2"
        disabled={isRunning || isPreparing || !battle}
      >
        <legend
          id="qsim-controls-heading"
          className="text-sm font-semibold text-slate-300"
        >
          Batch size
        </legend>
        <div className="flex gap-2" data-testid="quick-sim-run-size-picker">
          {QUICK_RESOLVE_RUN_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onRunCountChange(count)}
              className={
                runCount === count
                  ? 'rounded-md border border-blue-500 bg-blue-600/30 px-4 py-2 text-sm font-medium text-white'
                  : 'rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700'
              }
              data-testid={`quick-sim-runs-${count}`}
            >
              {count}
            </button>
          ))}
        </div>
      </fieldset>

      <Button
        variant="primary"
        disabled={isRunning || isPreparing || !battle}
        onClick={onStart}
        data-testid="quick-sim-start-btn"
      >
        {getStartButtonLabel({
          hasDispatched,
          isPreparing,
          isRunning,
          runCount,
        })}
      </Button>
    </section>
  );
}

function getStartButtonLabel({
  hasDispatched,
  isPreparing,
  isRunning,
  runCount,
}: {
  readonly hasDispatched: boolean;
  readonly isPreparing: boolean;
  readonly isRunning: boolean;
  readonly runCount: number;
}): string {
  if (isPreparing) return 'Preparing...';
  if (isRunning) return 'Running...';
  return hasDispatched ? 'Run Again' : `Start ${runCount} simulations`;
}

export function QuickSimProgress({
  runsCompleted,
  totalRuns,
  onCancel,
}: {
  readonly runsCompleted: number;
  readonly totalRuns: number;
  readonly onCancel: () => void;
}): React.ReactElement {
  const progressPct =
    totalRuns > 0 ? Math.round((runsCompleted / totalRuns) * 100) : 0;

  return (
    <section
      className="mb-6 flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900/40 p-4"
      data-testid="quick-sim-progress-surface"
    >
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>
          {runsCompleted} / {totalRuns} runs
        </span>
        <span>{progressPct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={runsCompleted}
        aria-valuemin={0}
        aria-valuemax={totalRuns}
        aria-label="Quick Sim batch progress"
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        data-testid="quick-sim-progress-bar"
      >
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={onCancel}
          data-testid="quick-sim-cancel-btn"
        >
          Cancel
        </Button>
      </div>
    </section>
  );
}

export function QuickSimError({
  error,
}: {
  readonly error: string;
}): React.ReactElement {
  return (
    <div
      className="mb-6 rounded-md border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-400"
      data-testid="quick-sim-error"
      role="alert"
    >
      {error}
    </div>
  );
}

export function QuickSimResult({
  battle,
  displayResult,
  showPartialBanner,
  onRerun,
}: {
  readonly battle: IQuickResolveBattleConfig | null;
  readonly displayResult: IBatchResult;
  readonly showPartialBanner: boolean;
  readonly onRerun: () => void;
}): React.ReactElement {
  return (
    <QuickSimResultPanel
      result={displayResult}
      unitMeta={battle?.gameUnits}
      partial={showPartialBanner}
      onRerun={onRerun}
    />
  );
}

export function QuickSimPreDispatch(): React.ReactElement {
  return (
    <div
      className="rounded-lg border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center text-sm text-slate-400"
      data-testid="quick-sim-pre-dispatch"
    >
      Choose a batch size and press Start to estimate outcome probabilities.
    </div>
  );
}

export function usePreparedQuickSimBattle({
  battle,
  isInitialized,
  opponentForce,
  pilots,
  playerForce,
  showToast,
}: {
  readonly battle: IQuickResolveBattleConfig | null;
  readonly isInitialized: boolean;
  readonly opponentForce: IForce | undefined;
  readonly pilots: readonly IPilot[];
  readonly playerForce: IForce | undefined;
  readonly showToast: ReturnType<typeof useToast>['showToast'];
}): PreparedQuickSimBattle {
  const [preparedBattle, setPreparedBattle] =
    useState<IQuickResolveBattleConfig | null>(battle);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    if (!isInitialized || preparedBattle || !playerForce || !opponentForce) {
      return;
    }

    let cancelled = false;
    setIsPreparing(true);
    void (async () => {
      try {
        const prepared = await buildPreparedBattleData({
          playerForce,
          opponentForce,
          pilots,
        });
        if (cancelled) return;
        if (
          prepared.playerAdapted.length === 0 ||
          prepared.opponentAdapted.length === 0
        ) {
          showToast({
            message: 'Failed to load unit data for one or both forces',
            variant: 'error',
          });
          return;
        }
        setPreparedBattle({
          playerUnits: prepared.playerAdapted,
          opponentUnits: prepared.opponentAdapted,
          gameUnits: prepared.gameUnits,
        });
      } catch (err) {
        if (cancelled) return;
        logger.error('Quick Sim setup failed:', err);
        showToast({
          message:
            err instanceof Error ? err.message : 'Failed to prepare Quick Sim',
          variant: 'error',
        });
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isInitialized,
    opponentForce,
    pilots,
    playerForce,
    preparedBattle,
    showToast,
  ]);

  return { battle: preparedBattle, isPreparing };
}

export function useQuickSimCancellationTracking({
  error,
  hasDispatched,
  isRunning,
  result,
  runsCompleted,
  setWasCancelled,
}: {
  readonly error: string | null;
  readonly hasDispatched: boolean;
  readonly isRunning: boolean;
  readonly result: IBatchResult | null;
  readonly runsCompleted: number;
  readonly setWasCancelled: (wasCancelled: boolean) => void;
}): void {
  useEffect(() => {
    if (!isRunning && hasDispatched && !result && runsCompleted > 0 && !error) {
      setWasCancelled(true);
    }
  }, [isRunning, hasDispatched, result, runsCompleted, error, setWasCancelled]);
}
