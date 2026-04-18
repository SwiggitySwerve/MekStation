/**
 * Encounter Detail Page
 * View and edit a single encounter configuration.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { IQuickResolveBattleConfig } from '@/simulation/QuickResolveService';
import type { IGeneratedScenario } from '@/types/scenario';

import { GenerateScenarioModal } from '@/components/gameplay';
import {
  DeleteEncounterConfirmDialog,
  EncounterActionsFooter,
  EncounterScenarioGeneratorSection,
} from '@/components/gameplay/pages/EncounterDetailPage.actions';
import {
  EncounterBattleSettingsCard,
  EncounterDetailLoadingState,
  EncounterDetailNotFoundState,
  EncounterForcesCard,
  EncounterValidationCard,
} from '@/components/gameplay/pages/EncounterDetailPage.sections';
import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { QuickResolveLauncher } from '@/components/gameplay/quickResolve/QuickResolveLauncher';
import { useToast } from '@/components/shared/Toast';
import { Badge, Button, PageLayout } from '@/components/ui';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { EncounterStatus, SCENARIO_TEMPLATES } from '@/types/encounter';
import { getStatusColor, getStatusLabel } from '@/utils/encounterStatus';
import { logger } from '@/utils/logger';

export default function EncounterDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const {
    getEncounter,
    loadEncounters,
    deleteEncounter,
    validateEncounter,
    validations,
    isLoading,
    error,
    clearError,
  } = useEncounterStore();

  const { forces, loadForces } = useForceStore();
  const { pilots, loadPilots } = usePilotStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Quick Resolve UI state — modal open + selected run count + a
  // memoized battle config built on demand from the encounter forces.
  const [showQuickResolveModal, setShowQuickResolveModal] = useState(false);
  const [quickResolveRunCount, setQuickResolveRunCount] = useState(100);
  const [quickResolveBattle, setQuickResolveBattle] =
    useState<IQuickResolveBattleConfig | null>(null);
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);

  const encounter = id && typeof id === 'string' ? getEncounter(id) : null;
  const validation =
    id && typeof id === 'string' ? (validations.get(id) ?? null) : null;

  const template = encounter?.template
    ? (SCENARIO_TEMPLATES.find((item) => item.type === encounter.template) ??
      null)
    : null;

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };

    void initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  useEffect(() => {
    if (isInitialized && id && typeof id === 'string') {
      void validateEncounter(id);
    }
  }, [isInitialized, id, validateEncounter]);

  const handleLaunch = useCallback(() => {
    if (!id || typeof id !== 'string') {
      return;
    }

    void router.push(`/gameplay/encounters/${id}/pre-battle`);
  }, [id, router]);

  const handleDelete = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      return;
    }

    clearError();
    const success = await deleteEncounter(id);

    if (success) {
      showToast({
        message: 'Encounter deleted successfully',
        variant: 'success',
      });
      void router.push('/gameplay/encounters');
      return;
    }

    showToast({ message: 'Failed to delete encounter', variant: 'error' });
  }, [id, deleteEncounter, router, clearError, showToast]);

  const handleGenerateScenario = useCallback(
    async (scenario: IGeneratedScenario) => {
      if (!id || typeof id !== 'string') {
        return;
      }

      clearError();
      logger.debug('Generated scenario:', scenario);

      setShowGenerateModal(false);
      showToast({
        message: 'Scenario generated! Configure forces to begin.',
        variant: 'info',
      });

      void validateEncounter(id);
    },
    [id, clearError, validateEncounter, showToast],
  );

  // ---------------------------------------------------------------------------
  // Quick Resolve handlers (Phase 2 add-quick-resolve-monte-carlo § 6)
  // ---------------------------------------------------------------------------

  // Resolve the encounter's actual force objects from the store. Memoized
  // so the open handler's dep list is stable across renders.
  const playerForce = useMemo(() => {
    if (!encounter?.playerForce) return undefined;
    return forces.find((f) => f.id === encounter.playerForce?.forceId);
  }, [encounter, forces]);
  const opponentForce = useMemo(() => {
    if (!encounter?.opponentForce) return undefined;
    return forces.find((f) => f.id === encounter.opponentForce?.forceId);
  }, [encounter, forces]);

  const openQuickResolveModal = useCallback(async () => {
    if (!playerForce || !opponentForce) {
      showToast({
        message: 'Both forces must be configured to Quick Resolve',
        variant: 'error',
      });
      return;
    }
    setIsPreparingBattle(true);
    try {
      const prepared = await buildPreparedBattleData({
        playerForce,
        opponentForce,
        pilots,
      });
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
      setQuickResolveBattle({
        playerUnits: prepared.playerAdapted,
        opponentUnits: prepared.opponentAdapted,
        gameUnits: prepared.gameUnits,
      });
      setShowQuickResolveModal(true);
    } catch (err) {
      logger.error('Quick Resolve setup failed:', err);
      showToast({
        message:
          err instanceof Error
            ? err.message
            : 'Failed to prepare Quick Resolve',
        variant: 'error',
      });
    } finally {
      setIsPreparingBattle(false);
    }
  }, [playerForce, opponentForce, pilots, showToast]);

  const closeQuickResolveModal = useCallback(() => {
    setShowQuickResolveModal(false);
    // Keep `quickResolveBattle` so the modal can re-open without
    // reloading; reset on encounter change naturally happens via
    // unmount of the page.
  }, []);

  if (!isInitialized || isLoading) {
    return <EncounterDetailLoadingState />;
  }

  if (!encounter) {
    return <EncounterDetailNotFoundState />;
  }

  const encounterId = id as string;
  const canLaunch = validation?.valid === true;
  const isLaunched = encounter.status === EncounterStatus.Launched;
  const isCompleted = encounter.status === EncounterStatus.Completed;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Encounters', href: '/gameplay/encounters' },
    { label: encounter.name },
  ];

  return (
    <PageLayout
      title={encounter.name}
      subtitle={encounter.description}
      breadcrumbs={breadcrumbs}
      backLink="/gameplay/encounters"
      backLabel="Back to Encounters"
      data-testid="encounter-detail-page"
      headerContent={
        <div className="flex items-center gap-3">
          <Badge
            variant={getStatusColor(encounter.status)}
            data-testid="encounter-status"
          >
            {getStatusLabel(encounter.status, true)}
          </Badge>

          {!isLaunched && !isCompleted && (
            <>
              <Button
                variant="secondary"
                disabled={!canLaunch || isPreparingBattle}
                onClick={() => void openQuickResolveModal()}
                title={
                  canLaunch
                    ? 'Run a Monte Carlo batch to estimate win probability'
                    : 'Fix validation errors first'
                }
                data-testid="quick-resolve-btn"
              >
                {isPreparingBattle ? 'Preparing...' : 'Quick Resolve'}
              </Button>
              <Button
                variant="primary"
                disabled={!canLaunch}
                onClick={handleLaunch}
                title={
                  canLaunch
                    ? 'Launch this encounter'
                    : 'Fix validation errors first'
                }
                data-testid="launch-encounter-btn"
              >
                Launch Battle
              </Button>
            </>
          )}
        </div>
      }
    >
      {error && (
        <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <EncounterValidationCard validation={validation} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EncounterForcesCard encounter={encounter} encounterId={encounterId} />
        <EncounterBattleSettingsCard
          encounter={encounter}
          template={template}
        />
      </div>

      {!isLaunched && !isCompleted && encounter.playerForce && (
        <EncounterScenarioGeneratorSection
          onOpenGenerateModal={() => setShowGenerateModal(true)}
        />
      )}

      {!isLaunched && !isCompleted && (
        <EncounterActionsFooter
          encounterId={encounterId}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteEncounterConfirmDialog
          encounterName={encounter.name}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}

      <GenerateScenarioModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        playerBV={encounter.playerForce?.totalBV || 0}
        playerUnitCount={encounter.playerForce?.unitCount || 0}
        onGenerate={handleGenerateScenario}
      />

      {showQuickResolveModal && quickResolveBattle && (
        <QuickResolveLauncher
          battle={quickResolveBattle}
          encounterId={encounterId}
          runCount={quickResolveRunCount}
          onRunCountChange={setQuickResolveRunCount}
          onClose={closeQuickResolveModal}
          onComplete={(result) => {
            logger.info('Quick Resolve batch complete', {
              encounterId,
              totalRuns: result.totalRuns,
              baseSeed: result.baseSeed,
              winProbability: result.winProbability,
            });
            // Sub-Branch B owns the result-display surface at
            // `/gameplay/encounters/[id]/sim`. For now we close the
            // modal and emit a toast — once B lands the surface we'll
            // route there with the result in route state / query.
            showToast({
              message: `Batch complete — Player wins ${(result.winProbability.player * 100).toFixed(1)}%`,
              variant: 'success',
            });
            closeQuickResolveModal();
          }}
        />
      )}
    </PageLayout>
  );
}
