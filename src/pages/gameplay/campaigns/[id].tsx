/**
 * Campaign Detail Page
 * View and manage a single campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  PageLayout,
  PageLoading,
  Card,
  Button,
  Badge,
} from '@/components/ui';
import { useCampaignStore } from '@/stores/useCampaignStore';
import {
  CampaignStatus,
  CampaignMissionStatus,
  ICampaignMission,
} from '@/types/campaign';
import { MissionTreeView } from '@/components/campaign/MissionTreeView';
import { RosterStateDisplay } from '@/components/campaign/RosterStateDisplay';

// =============================================================================
// Status Helpers
// =============================================================================

function getStatusColor(status: CampaignStatus): 'info' | 'success' | 'warning' | 'red' {
  switch (status) {
    case CampaignStatus.Setup:
      return 'info';
    case CampaignStatus.Active:
      return 'warning';
    case CampaignStatus.Victory:
      return 'success';
    case CampaignStatus.Defeat:
    case CampaignStatus.Abandoned:
      return 'red';
    default:
      return 'info';
  }
}

function getStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case CampaignStatus.Setup:
      return 'Setup';
    case CampaignStatus.Active:
      return 'Active';
    case CampaignStatus.Victory:
      return 'Victory';
    case CampaignStatus.Defeat:
      return 'Defeat';
    case CampaignStatus.Abandoned:
      return 'Abandoned';
    default:
      return status;
  }
}

// =============================================================================
// Resources Card Component
// =============================================================================

interface ResourcesCardProps {
  cBills: number;
  supplies: number;
  morale: number;
  salvageParts: number;
}

function ResourcesCard({ cBills, supplies, morale, salvageParts }: ResourcesCardProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold text-text-theme-primary mb-4">Resources</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-lg bg-surface-deep">
          <div className="text-2xl font-bold text-accent">{(cBills / 1000000).toFixed(2)}M</div>
          <div className="text-xs text-text-theme-muted uppercase tracking-wide mt-1">C-Bills</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-deep">
          <div className="text-2xl font-bold text-cyan-400">{supplies}</div>
          <div className="text-xs text-text-theme-muted uppercase tracking-wide mt-1">Supplies</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-deep">
          <div className={`text-2xl font-bold ${morale >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {morale}%
          </div>
          <div className="text-xs text-text-theme-muted uppercase tracking-wide mt-1">Morale</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-deep">
          <div className="text-2xl font-bold text-violet-400">{salvageParts}</div>
          <div className="text-xs text-text-theme-muted uppercase tracking-wide mt-1">Salvage</div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Mission History Component
// =============================================================================

interface MissionHistoryProps {
  missions: readonly ICampaignMission[];
}

function MissionHistory({ missions }: MissionHistoryProps): React.ReactElement {
  const completedMissions = missions.filter(
    (m) => m.status === CampaignMissionStatus.Victory || m.status === CampaignMissionStatus.Defeat
  );

  if (completedMissions.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-text-theme-primary mb-4">Mission History</h2>
        <div className="text-center py-8 text-text-theme-muted">
          <p>No completed missions yet</p>
          <p className="text-sm mt-1">Complete your first mission to see history here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-text-theme-primary mb-4">Mission History</h2>
      <div className="space-y-3">
        {completedMissions.map((mission) => (
          <div
            key={mission.id}
            className="p-3 rounded-lg bg-surface-deep flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  mission.status === CampaignMissionStatus.Victory
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {mission.status === CampaignMissionStatus.Victory ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium text-text-theme-primary">{mission.name}</div>
                {mission.completedAt && (
                  <div className="text-xs text-text-theme-muted">
                    {new Date(mission.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            
            {mission.outcome && (
              <div className="text-right text-sm">
                <div className="text-text-theme-secondary">
                  {mission.outcome.enemyUnitsDestroyed} kills
                </div>
                <div className="text-accent text-xs">
                  +{(mission.outcome.cBillsReward / 1000).toFixed(0)}K C-Bills
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CampaignDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  const {
    getCampaign,
    startMission,
    deleteCampaign,
    setCampaignStatus,
    validateCampaign,
    validations,
    error,
    clearError,
  } = useCampaignStore();

  const [isClient, setIsClient] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMission, setSelectedMission] = useState<ICampaignMission | null>(null);

  const campaign = id && typeof id === 'string' ? getCampaign(id) : null;
  const validation = id && typeof id === 'string' ? validations.get(id) : null;

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Validate on load
  useEffect(() => {
    if (isClient && id && typeof id === 'string') {
      validateCampaign(id);
    }
  }, [isClient, id, validateCampaign]);

  // Get next available mission
  const nextMission = campaign?.missions.find(
    (m) => m.status === CampaignMissionStatus.Available
  );

  const currentMission = campaign?.missions.find(
    (m) => m.status === CampaignMissionStatus.InProgress
  );

  // Handle start mission
  const handleStartMission = useCallback(
    (missionId: string) => {
      if (!id || typeof id !== 'string') return;
      clearError();
      const success = startMission(id, missionId);
      if (success) {
        // Navigate to encounter/game (placeholder)
        router.push(`/gameplay/encounters`);
      }
    },
    [id, startMission, router, clearError]
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = deleteCampaign(id);
    if (success) {
      router.push('/gameplay/campaigns');
    }
  }, [id, deleteCampaign, router, clearError]);

  // Handle abandon
  const handleAbandon = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    clearError();
    setCampaignStatus(id, CampaignStatus.Abandoned);
  }, [id, setCampaignStatus, clearError]);

  // Handle mission click
  const handleMissionClick = useCallback((mission: ICampaignMission) => {
    setSelectedMission(mission);
  }, []);

  if (!isClient) {
    return <PageLoading message="Loading campaign..." />;
  }

  if (!campaign) {
    return (
      <PageLayout title="Campaign Not Found" backLink="/gameplay/campaigns">
        <Card>
          <p className="text-text-theme-secondary">
            The requested campaign could not be found.
          </p>
          <Link href="/gameplay/campaigns" className="text-accent hover:underline mt-4 inline-block">
            Return to Campaigns
          </Link>
        </Card>
      </PageLayout>
    );
  }

  const isComplete =
    campaign.status === CampaignStatus.Victory ||
    campaign.status === CampaignStatus.Defeat ||
    campaign.status === CampaignStatus.Abandoned;

  return (
    <PageLayout
      title={campaign.name}
      subtitle={campaign.description}
      backLink="/gameplay/campaigns"
      backLabel="Back to Campaigns"
      maxWidth="wide"
      headerContent={
        <div className="flex items-center gap-3">
          <Badge variant={getStatusColor(campaign.status)} size="lg">
            {getStatusLabel(campaign.status)}
          </Badge>
          
          {!isComplete && nextMission && !currentMission && (
            <Button
              variant="primary"
              onClick={() => handleStartMission(nextMission.id)}
            >
              Start Next Mission
            </Button>
          )}

          {currentMission && (
            <Link href="/gameplay/encounters">
              <Button variant="primary">
                Continue Mission
              </Button>
            </Link>
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

      {/* Validation Warnings */}
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

      {/* Resources */}
      <ResourcesCard
        cBills={campaign.resources.cBills}
        supplies={campaign.resources.supplies}
        morale={campaign.resources.morale}
        salvageParts={campaign.resources.salvageParts}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mission Tree */}
        <Card>
          <h2 className="text-lg font-semibold text-text-theme-primary mb-4">Mission Progression</h2>
          <MissionTreeView
            missions={campaign.missions}
            currentMissionId={campaign.progress.currentMissionId}
            onMissionClick={handleMissionClick}
          />
        </Card>

        {/* Mission Details Panel */}
        <Card>
          <h2 className="text-lg font-semibold text-text-theme-primary mb-4">
            {selectedMission ? selectedMission.name : 'Select a Mission'}
          </h2>
          {selectedMission ? (
            <div className="space-y-4">
              <p className="text-text-theme-secondary">{selectedMission.description}</p>
              
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedMission.status === CampaignMissionStatus.Victory
                      ? 'success'
                      : selectedMission.status === CampaignMissionStatus.Defeat
                      ? 'red'
                      : selectedMission.status === CampaignMissionStatus.Available
                      ? 'warning'
                      : selectedMission.status === CampaignMissionStatus.InProgress
                      ? 'info'
                      : 'muted'
                  }
                >
                  {selectedMission.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {selectedMission.isFinal && (
                  <Badge variant="violet">Final Mission</Badge>
                )}
              </div>

              {selectedMission.optionalObjectives && selectedMission.optionalObjectives.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-theme-primary mb-2">Optional Objectives</h4>
                  <ul className="space-y-1">
                    {selectedMission.optionalObjectives.map((obj, i) => (
                      <li key={i} className="text-sm text-text-theme-secondary flex items-start gap-2">
                        <span className="text-accent">+</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedMission.outcome && (
                <div className="p-3 rounded-lg bg-surface-deep">
                  <h4 className="text-sm font-medium text-text-theme-primary mb-2">Outcome</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-text-theme-muted">Enemy Destroyed:</span>{' '}
                      <span className="text-text-theme-primary">{selectedMission.outcome.enemyUnitsDestroyed}</span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted">Units Lost:</span>{' '}
                      <span className="text-text-theme-primary">{selectedMission.outcome.playerUnitsDestroyed}</span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted">C-Bills Earned:</span>{' '}
                      <span className="text-accent">{(selectedMission.outcome.cBillsReward / 1000).toFixed(0)}K</span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted">Turns:</span>{' '}
                      <span className="text-text-theme-primary">{selectedMission.outcome.turnsPlayed}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedMission.status === CampaignMissionStatus.Available && !currentMission && (
                <Button
                  variant="primary"
                  onClick={() => handleStartMission(selectedMission.id)}
                  className="w-full"
                >
                  Start This Mission
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-text-theme-muted">
              <p>Click on a mission in the tree to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Roster */}
      <div className="mb-6">
        <RosterStateDisplay
          units={campaign.roster.units}
          pilots={campaign.roster.pilots}
        />
      </div>

      {/* Mission History */}
      <MissionHistory missions={campaign.missions} />

      {/* Actions */}
      {!isComplete && (
        <div className="mt-6 pt-6 border-t border-border-theme-subtle flex justify-between">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Campaign
            </Button>
            <Button
              variant="ghost"
              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
              onClick={handleAbandon}
            >
              Abandon Campaign
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md mx-4">
            <h3 className="text-lg font-medium text-text-theme-primary mb-2">Delete Campaign?</h3>
            <p className="text-sm text-text-theme-secondary mb-4">
              This will permanently delete &quot;{campaign.name}&quot; and all its progress. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
