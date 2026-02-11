import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * Encounter Detail Page
 * View and edit a single encounter configuration.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */
import { useEffect, useState, useCallback } from 'react';

import type { IGeneratedScenario } from '@/types/scenario';

import {
  SkeletonText,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { GenerateScenarioModal } from '@/components/gameplay';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, Card, Button, Badge } from '@/components/ui';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import {
  EncounterStatus,
  VictoryConditionType,
  SCENARIO_TEMPLATES,
} from '@/types/encounter';
import { getStatusColor, getStatusLabel } from '@/utils/encounterStatus';
import { logger } from '@/utils/logger';

function getVictoryConditionLabel(type: VictoryConditionType): string {
  switch (type) {
    case VictoryConditionType.DestroyAll:
      return 'Destroy All Enemies';
    case VictoryConditionType.Cripple:
      return 'Cripple Enemy Force';
    case VictoryConditionType.Retreat:
      return 'Force Enemy Retreat';
    case VictoryConditionType.TurnLimit:
      return 'Turn Limit';
    case VictoryConditionType.Custom:
      return 'Custom Objective';
    default:
      return type;
  }
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function EncounterDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const {
    getEncounter,
    loadEncounters,
    launchEncounter,
    deleteEncounter,
    validateEncounter,
    validations,
    isLoading,
    error,
    clearError,
  } = useEncounterStore();

  const { forces: _forces, loadForces } = useForceStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const encounter = id && typeof id === 'string' ? getEncounter(id) : null;
  const validation = id && typeof id === 'string' ? validations.get(id) : null;

  const template = encounter?.template
    ? SCENARIO_TEMPLATES.find((t) => t.type === encounter.template)
    : null;

  // Load data on mount
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces()]);
      setIsInitialized(true);
    };
    initialize();
  }, [loadEncounters, loadForces]);

  // Validate on load
  useEffect(() => {
    if (isInitialized && id && typeof id === 'string') {
      validateEncounter(id);
    }
  }, [isInitialized, id, validateEncounter]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = await launchEncounter(id);
    if (success) {
      showToast({
        message: 'Battle launched! Good hunting, MechWarrior.',
        variant: 'success',
      });
      // Navigate to game session (placeholder for now)
      router.push('/gameplay/encounters');
    } else {
      showToast({ message: 'Failed to launch encounter', variant: 'error' });
    }
  }, [id, launchEncounter, router, clearError, showToast]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = await deleteEncounter(id);
    if (success) {
      showToast({
        message: 'Encounter deleted successfully',
        variant: 'success',
      });
      router.push('/gameplay/encounters');
    } else {
      showToast({ message: 'Failed to delete encounter', variant: 'error' });
    }
  }, [id, deleteEncounter, router, clearError, showToast]);

  // Handle scenario generation
  const handleGenerateScenario = useCallback(
    async (scenario: IGeneratedScenario) => {
      if (!id || typeof id !== 'string') return;
      clearError();

      // TODO: Apply generated scenario to encounter
      // This would update victory conditions, map config, and potentially create OpFor
      logger.debug('Generated scenario:', scenario);

      // For now, just close the modal and show a success message
      setShowGenerateModal(false);
      showToast({
        message: 'Scenario generated! Configure forces to begin.',
        variant: 'info',
      });

      // Re-validate the encounter
      validateEncounter(id);
    },
    [id, clearError, validateEncounter, showToast],
  );

  if (!isInitialized || isLoading) {
    return (
      <PageLayout
        title="Loading..."
        backLink="/gameplay/encounters"
        backLabel="Back to Encounters"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonFormSection title="Forces">
            <div className="mb-4">
              <SkeletonText width="w-24" className="mb-2" />
              <div className="bg-surface-raised/50 space-y-2 rounded-lg p-3">
                <SkeletonText width="w-32" />
                <SkeletonText width="w-48" />
              </div>
            </div>
            <div>
              <SkeletonText width="w-28" className="mb-2" />
              <div className="bg-surface-raised/50 space-y-2 rounded-lg p-3">
                <SkeletonText width="w-32" />
                <SkeletonText width="w-48" />
              </div>
            </div>
          </SkeletonFormSection>

          <SkeletonFormSection title="Battle Settings">
            <div className="space-y-4">
              <div>
                <SkeletonText width="w-16" className="mb-2" />
                <SkeletonText width="w-40" />
              </div>
              <div>
                <SkeletonText width="w-24" className="mb-2" />
                <SkeletonText width="w-32" />
                <SkeletonText width="w-48" />
              </div>
            </div>
          </SkeletonFormSection>
        </div>
      </PageLayout>
    );
  }

  if (!encounter) {
    return (
      <PageLayout title="Encounter Not Found" backLink="/gameplay/encounters">
        <Card>
          <p className="text-text-theme-secondary">
            The requested encounter could not be found.
          </p>
          <Link
            href="/gameplay/encounters"
            className="text-accent mt-4 inline-block hover:underline"
          >
            Return to Encounters
          </Link>
        </Card>
      </PageLayout>
    );
  }

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
      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Validation Warnings/Errors */}
      {validation && (!validation.valid || validation.warnings.length > 0) && (
        <Card className="mb-6 border-yellow-600/30 bg-yellow-900/10">
          {validation.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-red-400">
                Configuration Required
              </h3>
              <ul className="space-y-1">
                {validation.errors.map((err, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-300"
                  >
                    <span className="mt-0.5 text-red-400">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-yellow-400">
                Warnings
              </h3>
              <ul className="space-y-1">
                {validation.warnings.map((warn, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-yellow-300"
                  >
                    <span className="mt-0.5 text-yellow-400">•</span>
                    {warn}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Forces Section */}
        <Card data-testid="forces-card">
          <h2 className="text-text-theme-primary mb-4 text-lg font-medium">
            Forces
          </h2>

          {/* Player Force */}
          <div className="mb-4" data-testid="player-force-section">
            <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
              Player Force
            </h3>
            {encounter.playerForce ? (
              <div
                className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
                data-testid="player-force-info"
              >
                <div
                  className="text-text-theme-primary font-medium"
                  data-testid="player-force-name"
                >
                  {encounter.playerForce.forceName || 'Selected'}
                </div>
                <div
                  className="text-text-theme-muted mt-1 text-sm"
                  data-testid="player-force-stats"
                >
                  {encounter.playerForce.unitCount} units •{' '}
                  {encounter.playerForce.totalBV.toLocaleString()} BV
                </div>
              </div>
            ) : (
              <div
                className="border-border-theme-subtle rounded-lg border-2 border-dashed p-3"
                data-testid="player-force-empty"
              >
                <p className="text-text-theme-muted text-sm">
                  No player force selected
                </p>
                <Link
                  href={`/gameplay/encounters/${id}/select-force?type=player`}
                  className="text-accent mt-2 inline-block text-sm hover:underline"
                  data-testid="select-player-force-link"
                >
                  Select Player Force
                </Link>
              </div>
            )}
          </div>

          {/* Opponent Force */}
          <div data-testid="opponent-force-section">
            <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
              Opponent Force
            </h3>
            {encounter.opponentForce ? (
              <div
                className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
                data-testid="opponent-force-info"
              >
                <div
                  className="text-text-theme-primary font-medium"
                  data-testid="opponent-force-name"
                >
                  {encounter.opponentForce.forceName || 'Selected'}
                </div>
                <div
                  className="text-text-theme-muted mt-1 text-sm"
                  data-testid="opponent-force-stats"
                >
                  {encounter.opponentForce.unitCount} units •{' '}
                  {encounter.opponentForce.totalBV.toLocaleString()} BV
                </div>
              </div>
            ) : encounter.opForConfig ? (
              <div
                className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
                data-testid="opfor-config-info"
              >
                <div className="text-text-theme-primary font-medium">
                  Generated OpFor
                </div>
                <div className="text-text-theme-muted mt-1 text-sm">
                  Target BV:{' '}
                  {encounter.opForConfig.targetBV?.toLocaleString() ||
                    `${encounter.opForConfig.targetBVPercent}% of player`}
                </div>
              </div>
            ) : (
              <div
                className="border-border-theme-subtle rounded-lg border-2 border-dashed p-3"
                data-testid="opponent-force-empty"
              >
                <p className="text-text-theme-muted text-sm">
                  No opponent configured
                </p>
                <Link
                  href={`/gameplay/encounters/${id}/select-force?type=opponent`}
                  className="text-accent mt-2 inline-block text-sm hover:underline"
                  data-testid="select-opponent-force-link"
                >
                  Select Opponent Force
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Map & Victory Conditions */}
        <Card data-testid="battle-settings-card">
          <h2 className="text-text-theme-primary mb-4 text-lg font-medium">
            Battle Settings
          </h2>

          {/* Template */}
          {template && (
            <div
              className="bg-accent/10 border-accent/20 mb-4 rounded-lg border p-3"
              data-testid="encounter-template"
            >
              <div className="text-accent text-sm">
                Using Template: {template.name}
              </div>
            </div>
          )}

          {/* Map Config */}
          <div className="mb-4" data-testid="map-config-section">
            <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
              Map
            </h3>
            <div
              className="text-text-theme-primary text-sm"
              data-testid="map-size"
            >
              {encounter.mapConfig.radius * 2 + 1}x
              {encounter.mapConfig.radius * 2 + 1} hex grid
            </div>
            <div
              className="text-text-theme-muted text-sm"
              data-testid="map-terrain"
            >
              Terrain: {encounter.mapConfig.terrain}
            </div>
            <div
              className="text-text-theme-muted text-sm"
              data-testid="deployment-zones"
            >
              Player deploys: {encounter.mapConfig.playerDeploymentZone} |{' '}
              Opponent: {encounter.mapConfig.opponentDeploymentZone}
            </div>
          </div>

          {/* Victory Conditions */}
          <div data-testid="victory-conditions-section">
            <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
              Victory Conditions
            </h3>
            {encounter.victoryConditions.length > 0 ? (
              <ul className="space-y-1" data-testid="victory-conditions-list">
                {encounter.victoryConditions.map((vc, i) => (
                  <li
                    key={i}
                    className="text-text-theme-primary flex items-center gap-2 text-sm"
                    data-testid={`victory-condition-${i}`}
                  >
                    <span className="text-accent">•</span>
                    {getVictoryConditionLabel(vc.type)}
                    {vc.turnLimit && ` (${vc.turnLimit} turns)`}
                    {vc.threshold && ` (${vc.threshold}%)`}
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="text-text-theme-muted text-sm"
                data-testid="no-victory-conditions"
              >
                No victory conditions set
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Scenario Generator Section */}
      {!isLaunched && !isCompleted && encounter.playerForce && (
        <Card className="mt-6" data-testid="scenario-generator-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-text-theme-primary text-lg font-medium">
                Auto-Generate Scenario
              </h2>
              <p className="text-text-theme-muted mt-1 text-sm">
                Automatically generate enemy forces, battle modifiers, and
                terrain based on your player force.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowGenerateModal(true)}
              data-testid="open-generate-modal-btn"
            >
              Generate Scenario
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      {!isLaunched && !isCompleted && (
        <div className="border-border-theme-subtle mt-6 flex justify-between border-t pt-6">
          <Button
            variant="ghost"
            className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="delete-encounter-btn"
          >
            Delete Encounter
          </Button>

          <Link href={`/gameplay/encounters/${id}/edit`}>
            <Button variant="secondary" data-testid="edit-encounter-btn">
              Edit Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="delete-confirm-dialog"
        >
          <Card className="mx-4 max-w-md">
            <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
              Delete Encounter?
            </h3>
            <p className="text-text-theme-secondary mb-4 text-sm">
              This will permanently delete &quot;{encounter.name}&quot;. This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                data-testid="cancel-delete-btn"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                data-testid="confirm-delete-btn"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Generate Scenario Modal */}
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
