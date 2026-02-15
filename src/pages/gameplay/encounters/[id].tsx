/**
 * Encounter Detail Page
 * View and edit a single encounter configuration.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

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
import { useToast } from '@/components/shared/Toast';
import { Badge, Button, PageLayout } from '@/components/ui';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
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

  const { loadForces } = useForceStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const encounter = id && typeof id === 'string' ? getEncounter(id) : null;
  const validation =
    id && typeof id === 'string' ? (validations.get(id) ?? null) : null;

  const template = encounter?.template
    ? (SCENARIO_TEMPLATES.find((item) => item.type === encounter.template) ??
      null)
    : null;

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces()]);
      setIsInitialized(true);
    };

    void initialize();
  }, [loadEncounters, loadForces]);

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
    </PageLayout>
  );
}
