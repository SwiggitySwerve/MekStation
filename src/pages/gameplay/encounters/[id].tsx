/**
 * Encounter Detail Page
 * View and edit a single encounter configuration.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  PageLayout,
  PageLoading,
  Card,
  Button,
  Badge,
} from '@/components/ui';
import { GenerateScenarioModal } from '@/components/gameplay';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { useToast } from '@/components/shared/Toast';
import {
  EncounterStatus,
  VictoryConditionType,
  SCENARIO_TEMPLATES,
} from '@/types/encounter';
import { getStatusColor, getStatusLabel } from '@/utils/encounterStatus';
import type { IGeneratedScenario } from '@/types/scenario';

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
      showToast({ message: 'Battle launched! Good hunting, MechWarrior.', variant: 'success' });
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
      showToast({ message: 'Encounter deleted successfully', variant: 'success' });
      router.push('/gameplay/encounters');
    } else {
      showToast({ message: 'Failed to delete encounter', variant: 'error' });
    }
  }, [id, deleteEncounter, router, clearError, showToast]);

  // Handle scenario generation
  const handleGenerateScenario = useCallback(async (scenario: IGeneratedScenario) => {
    if (!id || typeof id !== 'string') return;
    clearError();
    
    // TODO: Apply generated scenario to encounter
    // This would update victory conditions, map config, and potentially create OpFor
    console.log('Generated scenario:', scenario);
    
    // For now, just close the modal and show a success message
    setShowGenerateModal(false);
    showToast({ message: 'Scenario generated! Configure forces to begin.', variant: 'info' });
    
    // Re-validate the encounter
    validateEncounter(id);
  }, [id, clearError, validateEncounter, showToast]);

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading encounter..." />;
  }

  if (!encounter) {
    return (
      <PageLayout title="Encounter Not Found" backLink="/gameplay/encounters">
        <Card>
          <p className="text-text-theme-secondary">
            The requested encounter could not be found.
          </p>
          <Link href="/gameplay/encounters" className="text-accent hover:underline mt-4 inline-block">
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
<Badge variant={getStatusColor(encounter.status)} data-testid="encounter-status">
            {getStatusLabel(encounter.status, true)}
          </Badge>
          
          {!isLaunched && !isCompleted && (
            <Button
              variant="primary"
              disabled={!canLaunch}
              onClick={handleLaunch}
              title={canLaunch ? 'Launch this encounter' : 'Fix validation errors first'}
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
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Validation Warnings/Errors */}
      {validation && (!validation.valid || validation.warnings.length > 0) && (
        <Card className="mb-6 border-yellow-600/30 bg-yellow-900/10">
          {validation.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-400 mb-2">Configuration Required</h3>
              <ul className="space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h3>
              <ul className="space-y-1">
                {validation.warnings.map((warn, i) => (
                  <li key={i} className="text-sm text-yellow-300 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    {warn}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forces Section */}
        <Card data-testid="forces-card">
          <h2 className="text-lg font-medium text-text-theme-primary mb-4">Forces</h2>
          
          {/* Player Force */}
          <div className="mb-4" data-testid="player-force-section">
            <h3 className="text-sm font-medium text-text-theme-secondary mb-2">Player Force</h3>
            {encounter.playerForce ? (
              <div className="p-3 rounded-lg bg-surface-raised border border-border-theme-subtle" data-testid="player-force-info">
                <div className="font-medium text-text-theme-primary" data-testid="player-force-name">
                  {encounter.playerForce.forceName || 'Selected'}
                </div>
                <div className="text-sm text-text-theme-muted mt-1" data-testid="player-force-stats">
                  {encounter.playerForce.unitCount} units • {encounter.playerForce.totalBV.toLocaleString()} BV
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border-2 border-dashed border-border-theme-subtle" data-testid="player-force-empty">
                <p className="text-sm text-text-theme-muted">No player force selected</p>
                <Link
                  href={`/gameplay/encounters/${id}/select-force?type=player`}
                  className="text-sm text-accent hover:underline mt-2 inline-block"
                  data-testid="select-player-force-link"
                >
                  Select Player Force
                </Link>
              </div>
            )}
          </div>

          {/* Opponent Force */}
          <div data-testid="opponent-force-section">
            <h3 className="text-sm font-medium text-text-theme-secondary mb-2">Opponent Force</h3>
            {encounter.opponentForce ? (
              <div className="p-3 rounded-lg bg-surface-raised border border-border-theme-subtle" data-testid="opponent-force-info">
                <div className="font-medium text-text-theme-primary" data-testid="opponent-force-name">
                  {encounter.opponentForce.forceName || 'Selected'}
                </div>
                <div className="text-sm text-text-theme-muted mt-1" data-testid="opponent-force-stats">
                  {encounter.opponentForce.unitCount} units • {encounter.opponentForce.totalBV.toLocaleString()} BV
                </div>
              </div>
            ) : encounter.opForConfig ? (
              <div className="p-3 rounded-lg bg-surface-raised border border-border-theme-subtle" data-testid="opfor-config-info">
                <div className="font-medium text-text-theme-primary">Generated OpFor</div>
                <div className="text-sm text-text-theme-muted mt-1">
                  Target BV: {encounter.opForConfig.targetBV?.toLocaleString() || 
                    `${encounter.opForConfig.targetBVPercent}% of player`}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border-2 border-dashed border-border-theme-subtle" data-testid="opponent-force-empty">
                <p className="text-sm text-text-theme-muted">No opponent configured</p>
                <Link
                  href={`/gameplay/encounters/${id}/select-force?type=opponent`}
                  className="text-sm text-accent hover:underline mt-2 inline-block"
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
          <h2 className="text-lg font-medium text-text-theme-primary mb-4">Battle Settings</h2>
          
          {/* Template */}
          {template && (
            <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20" data-testid="encounter-template">
              <div className="text-sm text-accent">Using Template: {template.name}</div>
            </div>
          )}

          {/* Map Config */}
          <div className="mb-4" data-testid="map-config-section">
            <h3 className="text-sm font-medium text-text-theme-secondary mb-2">Map</h3>
            <div className="text-sm text-text-theme-primary" data-testid="map-size">
              {encounter.mapConfig.radius * 2 + 1}x{encounter.mapConfig.radius * 2 + 1} hex grid
            </div>
            <div className="text-sm text-text-theme-muted" data-testid="map-terrain">
              Terrain: {encounter.mapConfig.terrain}
            </div>
            <div className="text-sm text-text-theme-muted" data-testid="deployment-zones">
              Player deploys: {encounter.mapConfig.playerDeploymentZone} |{' '}
              Opponent: {encounter.mapConfig.opponentDeploymentZone}
            </div>
          </div>

          {/* Victory Conditions */}
          <div data-testid="victory-conditions-section">
            <h3 className="text-sm font-medium text-text-theme-secondary mb-2">Victory Conditions</h3>
            {encounter.victoryConditions.length > 0 ? (
              <ul className="space-y-1" data-testid="victory-conditions-list">
                {encounter.victoryConditions.map((vc, i) => (
                  <li key={i} className="text-sm text-text-theme-primary flex items-center gap-2" data-testid={`victory-condition-${i}`}>
                    <span className="text-accent">•</span>
                    {getVictoryConditionLabel(vc.type)}
                    {vc.turnLimit && ` (${vc.turnLimit} turns)`}
                    {vc.threshold && ` (${vc.threshold}%)`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-theme-muted" data-testid="no-victory-conditions">No victory conditions set</p>
            )}
          </div>
        </Card>
      </div>

      {/* Scenario Generator Section */}
      {!isLaunched && !isCompleted && encounter.playerForce && (
        <Card className="mt-6" data-testid="scenario-generator-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-theme-primary">Auto-Generate Scenario</h2>
              <p className="text-sm text-text-theme-muted mt-1">
                Automatically generate enemy forces, battle modifiers, and terrain based on your player force.
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
        <div className="mt-6 pt-6 border-t border-border-theme-subtle flex justify-between">
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="delete-encounter-btn"
          >
            Delete Encounter
          </Button>

          <Link href={`/gameplay/encounters/${id}/edit`}>
            <Button variant="secondary" data-testid="edit-encounter-btn">Edit Settings</Button>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="delete-confirm-dialog">
          <Card className="max-w-md mx-4">
            <h3 className="text-lg font-medium text-text-theme-primary mb-2">Delete Encounter?</h3>
            <p className="text-sm text-text-theme-secondary mb-4">
              This will permanently delete &quot;{encounter.name}&quot;. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} data-testid="cancel-delete-btn">
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
