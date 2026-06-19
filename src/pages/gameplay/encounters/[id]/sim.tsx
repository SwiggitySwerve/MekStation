/**
 * Quick Sim Result Page - deep-linkable result surface for an encounter.
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IQuickResolveBattleConfig } from '@/simulation/QuickResolveService';

import { useToast } from '@/components/shared/Toast';
import { PageLayout } from '@/components/ui';
import { useQuickResolve } from '@/hooks/useQuickResolve';
import { findForceById } from '@/pages-modules/gameplay/encounters/encounterDetailPage.helpers';
import {
  buildQuickSimBreadcrumbs,
  DEFAULT_RUN_COUNT,
  getQuickSimInitialState,
  QuickSimControls,
  QuickSimError,
  QuickSimPreDispatch,
  QuickSimProgress,
  QuickSimResult,
  usePreparedQuickSimBattle,
  useQuickSimCancellationTracking,
} from '@/pages-modules/gameplay/encounters/quickSimPage.helpers';
import { useEncounterSelector } from '@/stores/useEncounterStore';
import { useForceSelector } from '@/stores/useForceStore';
import { usePilotSelector } from '@/stores/usePilotStore';

export default function QuickSimResultPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const encounterId = typeof id === 'string' ? id : '';

  const getEncounter = useEncounterSelector((state) => state.getEncounter);
  const loadEncounters = useEncounterSelector((state) => state.loadEncounters);
  const encountersLoading = useEncounterSelector((state) => state.isLoading);
  const forces = useForceSelector((state) => state.forces);
  const loadForces = useForceSelector((state) => state.loadForces);
  const pilots = usePilotSelector((state) => state.pilots);
  const loadPilots = usePilotSelector((state) => state.loadPilots);

  const [isInitialized, setIsInitialized] = useState(false);
  const [runCount, setRunCount] = useState<number>(DEFAULT_RUN_COUNT);
  const [hasDispatched, setHasDispatched] = useState(false);
  const [wasCancelled, setWasCancelled] = useState(false);

  const encounter = encounterId ? (getEncounter(encounterId) ?? null) : null;
  const playerForce = useMemo(() => {
    return findForceById(forces, encounter?.playerForce?.forceId);
  }, [encounter, forces]);
  const opponentForce = useMemo(() => {
    return findForceById(forces, encounter?.opponentForce?.forceId);
  }, [encounter, forces]);

  const { battle, isPreparing } = usePreparedQuickSimBattle({
    battle: null,
    isInitialized,
    opponentForce,
    pilots,
    playerForce,
    showToast,
  });
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

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };
    void initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  useQuickSimCancellationTracking({
    error,
    hasDispatched,
    isRunning,
    result,
    runsCompleted,
    setWasCancelled,
  });

  const handleStart = useCallback(async () => {
    if (!battle) return;
    setHasDispatched(true);
    setWasCancelled(false);
    await mutate({ runs: runCount });
  }, [battle, mutate, runCount]);

  const handleRerun = useCallback(async () => {
    if (!battle) return;
    setWasCancelled(false);
    reset();
    setHasDispatched(true);
    await mutate({ runs: runCount });
  }, [battle, mutate, reset, runCount]);

  const breadcrumbs = useMemo(
    () => buildQuickSimBreadcrumbs(encounter, encounterId),
    [encounter, encounterId],
  );
  const displayResult = result ?? (wasCancelled ? partialResult : null);
  const showPartialBanner = wasCancelled && !!displayResult;
  const initialState = getQuickSimInitialState({
    encounter,
    encountersLoading,
    isInitialized,
  });
  if (initialState) return initialState;
  const loadedEncounter = encounter!;

  return (
    <>
      <Head>
        <title>{`Quick Sim - ${loadedEncounter.name}`}</title>
      </Head>
      <PageLayout
        title={`Quick Sim: ${loadedEncounter.name}`}
        subtitle="Estimate outcome probabilities before committing to the fight"
        breadcrumbs={breadcrumbs}
        backLink={`/gameplay/encounters/${encounterId}`}
        backLabel="Back to Encounter"
        data-testid="quick-sim-page"
      >
        <QuickSimControls
          battle={battle}
          hasDispatched={hasDispatched}
          isPreparing={isPreparing}
          isRunning={isRunning}
          runCount={runCount}
          onRunCountChange={setRunCount}
          onStart={() => void handleStart()}
        />

        {isRunning && (
          <QuickSimProgress
            runsCompleted={runsCompleted}
            totalRuns={totalRuns}
            onCancel={cancel}
          />
        )}

        {error && !isRunning && <QuickSimError error={error} />}

        {!isRunning && displayResult && (
          <QuickSimResult
            battle={battle}
            displayResult={displayResult}
            showPartialBanner={showPartialBanner}
            onRerun={() => void handleRerun()}
          />
        )}

        {!isRunning && !displayResult && !error && <QuickSimPreDispatch />}
      </PageLayout>
    </>
  );
}
