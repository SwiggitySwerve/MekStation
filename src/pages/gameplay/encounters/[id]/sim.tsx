/**
 * Quick Sim Result Page — deep-linkable result surface for an encounter.
 *
 * Loaded at `/gameplay/encounters/[id]/sim`. Mounts `useQuickResolve()`
 * with the encounter's prepared battle config and exposes:
 *   - a run-size selector (25 / 100 / 500)
 *   - a Start button that dispatches the batch
 *   - a progress surface (bar + Cancel) while the batch is in flight
 *   - the full `QuickSimResultPanel` once the batch settles
 *   - a "Rerun" button on the panel that dispatches with a fresh seed
 *
 * Cancellation hands a partial `IBatchResult` (when present in the
 * hook's `partialResult` slot) to the panel with the partial banner.
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IQuickResolveBattleConfig } from '@/simulation/QuickResolveService';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { QUICK_RESOLVE_RUN_COUNT_OPTIONS } from '@/components/gameplay/quickResolve/QuickResolveLauncher';
import { QuickSimResultPanel } from '@/components/gameplay/QuickSimResultPanel';
import { useToast } from '@/components/shared/Toast';
import { Button, PageLayout } from '@/components/ui';
import { useQuickResolve } from '@/hooks/useQuickResolve';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { logger } from '@/utils/logger';

const DEFAULT_RUN_COUNT = 100;

/**
 * Dedicated page for the Quick Sim result surface. Keeps the heavy
 * batch dispatch local to the page so navigating away aborts cleanly
 * via `useQuickResolve`'s unmount cleanup.
 */
export default function QuickSimResultPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const encounterId = typeof id === 'string' ? id : '';

  // Encounter / force / pilot data (mirrors encounter detail page).
  const {
    getEncounter,
    loadEncounters,
    isLoading: encountersLoading,
  } = useEncounterStore();
  const { forces, loadForces } = useForceStore();
  const { pilots, loadPilots } = usePilotStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [runCount, setRunCount] = useState<number>(DEFAULT_RUN_COUNT);
  const [battle, setBattle] = useState<IQuickResolveBattleConfig | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [hasDispatched, setHasDispatched] = useState(false);
  const [wasCancelled, setWasCancelled] = useState(false);

  // Defer hook initialization until we have a battle config — useQuickResolve
  // expects a `battle` ref it can capture in its `mutate` closure. Use an
  // empty stub when battle is null so the hook signature stays stable.
  const stubBattle = useMemo<IQuickResolveBattleConfig>(
    () => ({ playerUnits: [], opponentUnits: [], gameUnits: [] }),
    [],
  );
  const {
    mutate,
    cancel,
    reset,
    isRunning,
    runsCompleted,
    totalRuns,
    result,
    error,
    partialResult,
  } = useQuickResolve(battle ?? stubBattle);

  // Initial data load.
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };
    void initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  const encounter = encounterId ? getEncounter(encounterId) : null;

  const playerForce = useMemo(() => {
    if (!encounter?.playerForce) return undefined;
    return forces.find((f) => f.id === encounter.playerForce?.forceId);
  }, [encounter, forces]);
  const opponentForce = useMemo(() => {
    if (!encounter?.opponentForce) return undefined;
    return forces.find((f) => f.id === encounter.opponentForce?.forceId);
  }, [encounter, forces]);

  // Prepare the battle config once forces resolve.
  useEffect(() => {
    if (!isInitialized || battle || !playerForce || !opponentForce) return;
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
        setBattle({
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
  }, [isInitialized, battle, playerForce, opponentForce, pilots, showToast]);

  // Track cancellation: if the hook flips back to !isRunning while we still
  // have no settled `result` but `runsCompleted > 0`, the user cancelled.
  useEffect(() => {
    if (!isRunning && hasDispatched && !result && runsCompleted > 0 && !error) {
      setWasCancelled(true);
    }
  }, [isRunning, hasDispatched, result, runsCompleted, error]);

  const handleStart = useCallback(async () => {
    if (!battle) return;
    setHasDispatched(true);
    setWasCancelled(false);
    await mutate({ runs: runCount });
  }, [battle, mutate, runCount]);

  const handleRerun = useCallback(async () => {
    if (!battle) return;
    // Fresh baseSeed each rerun so the run actually re-rolls — let the
    // service generate one (omit baseSeed in args).
    setWasCancelled(false);
    reset();
    setHasDispatched(true);
    await mutate({ runs: runCount });
  }, [battle, mutate, reset, runCount]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const breadcrumbs = useMemo(
    () => [
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
    ],
    [encounter, encounterId],
  );

  // ---- Loading / not-found states ------------------------------------------
  if (!isInitialized || encountersLoading) {
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

  if (!encounter) {
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

  const progressPct =
    totalRuns > 0 ? Math.round((runsCompleted / totalRuns) * 100) : 0;
  const displayResult = result ?? (wasCancelled ? partialResult : null);
  const showPartialBanner = wasCancelled && !!displayResult;

  return (
    <>
      <Head>
        <title>{`Quick Sim — ${encounter.name}`}</title>
      </Head>
      <PageLayout
        title={`Quick Sim: ${encounter.name}`}
        subtitle="Estimate outcome probabilities before committing to the fight"
        breadcrumbs={breadcrumbs}
        backLink={`/gameplay/encounters/${encounterId}`}
        backLabel="Back to Encounter"
        data-testid="quick-sim-page"
      >
        {/* Run-size + start controls */}
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
                  onClick={() => setRunCount(count)}
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
            onClick={() => void handleStart()}
            data-testid="quick-sim-start-btn"
          >
            {isPreparing
              ? 'Preparing...'
              : isRunning
                ? 'Running...'
                : hasDispatched
                  ? 'Run Again'
                  : `Start ${runCount} simulations`}
          </Button>
        </section>

        {/* Progress surface */}
        {isRunning && (
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
                onClick={handleCancel}
                data-testid="quick-sim-cancel-btn"
              >
                Cancel
              </Button>
            </div>
          </section>
        )}

        {/* Error banner */}
        {error && !isRunning && (
          <div
            className="mb-6 rounded-md border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-400"
            data-testid="quick-sim-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Result panel (settled or partial) */}
        {!isRunning && displayResult && (
          <QuickSimResultPanel
            result={displayResult}
            unitMeta={battle?.gameUnits}
            partial={showPartialBanner}
            onRerun={() => void handleRerun()}
          />
        )}

        {/* Pre-dispatch empty / instructional state */}
        {!isRunning && !displayResult && !error && (
          <div
            className="rounded-lg border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center text-sm text-slate-400"
            data-testid="quick-sim-pre-dispatch"
          >
            Choose a batch size and press Start to estimate outcome
            probabilities.
          </div>
        )}
      </PageLayout>
    </>
  );
}
