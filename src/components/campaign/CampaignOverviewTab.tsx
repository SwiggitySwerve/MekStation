import { useState, useCallback } from 'react';

import { MissionTreeView } from '@/components/campaign/MissionTreeView';
import { RosterStateDisplay } from '@/components/campaign/RosterStateDisplay';
import { Card, Button, Badge } from '@/components/ui';
import {
  CampaignMissionStatus,
  ICampaign,
  ICampaignMission,
} from '@/types/campaign';

import { ResourcesCard, MissionHistory } from './CampaignStatusHelpers';

export interface CampaignOverviewTabProps {
  campaign: ICampaign;
  error: string | null;
  validation: { valid: boolean; errors: string[]; warnings: string[] } | null;
  isComplete: boolean;
  currentMission: ICampaignMission | undefined;
  onStartMission: (missionId: string) => void;
  onDelete: () => void;
  onAbandon: () => void;
}

export function CampaignOverviewTab({
  campaign,
  error,
  validation,
  isComplete,
  currentMission,
  onStartMission,
  onDelete,
  onAbandon,
}: CampaignOverviewTabProps): React.ReactElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMission, setSelectedMission] =
    useState<ICampaignMission | null>(null);

  const handleMissionClick = useCallback((mission: ICampaignMission) => {
    setSelectedMission(mission);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  return (
    <>
      {error && (
        <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

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

      <ResourcesCard
        cBills={campaign.resources.cBills}
        supplies={campaign.resources.supplies}
        morale={campaign.resources.morale}
        salvageParts={campaign.resources.salvageParts}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
            Mission Progression
          </h2>
          <MissionTreeView
            missions={campaign.missions}
            currentMissionId={campaign.progress.currentMissionId}
            onMissionClick={handleMissionClick}
          />
        </Card>

        <Card data-testid="mission-details-panel">
          <h2
            className="text-text-theme-primary mb-4 text-lg font-semibold"
            data-testid="mission-details-name"
          >
            {selectedMission ? selectedMission.name : 'Select a Mission'}
          </h2>
          {selectedMission ? (
            <div className="space-y-4">
              <p className="text-text-theme-secondary">
                {selectedMission.description}
              </p>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedMission.status === CampaignMissionStatus.Victory
                      ? 'success'
                      : selectedMission.status === CampaignMissionStatus.Defeat
                        ? 'red'
                        : selectedMission.status ===
                            CampaignMissionStatus.Available
                          ? 'warning'
                          : selectedMission.status ===
                              CampaignMissionStatus.InProgress
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

              {selectedMission.optionalObjectives &&
                selectedMission.optionalObjectives.length > 0 && (
                  <div>
                    <h4 className="text-text-theme-primary mb-2 text-sm font-medium">
                      Optional Objectives
                    </h4>
                    <ul className="space-y-1">
                      {selectedMission.optionalObjectives.map((obj, i) => (
                        <li
                          key={i}
                          className="text-text-theme-secondary flex items-start gap-2 text-sm"
                        >
                          <span className="text-accent">+</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {selectedMission.outcome && (
                <div className="bg-surface-deep rounded-lg p-3">
                  <h4 className="text-text-theme-primary mb-2 text-sm font-medium">
                    Outcome
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-text-theme-muted">
                        Enemy Destroyed:
                      </span>{' '}
                      <span className="text-text-theme-primary">
                        {selectedMission.outcome.enemyUnitsDestroyed}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted">Units Lost:</span>{' '}
                      <span className="text-text-theme-primary">
                        {selectedMission.outcome.playerUnitsDestroyed}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted">
                        C-Bills Earned:
                      </span>{' '}
                      <span className="text-accent">
                        {(selectedMission.outcome.cBillsReward / 1000).toFixed(
                          0,
                        )}
                        K
                      </span>
                    </div>
                    <div>
                      <span className="text-text-theme-muted">Turns:</span>{' '}
                      <span className="text-text-theme-primary">
                        {selectedMission.outcome.turnsPlayed}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedMission.status === CampaignMissionStatus.Available &&
                !currentMission && (
                  <Button
                    variant="primary"
                    onClick={() => onStartMission(selectedMission.id)}
                    className="w-full"
                  >
                    Start This Mission
                  </Button>
                )}
            </div>
          ) : (
            <div className="text-text-theme-muted py-8 text-center">
              <p>Click on a mission in the tree to view details</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <RosterStateDisplay
          units={campaign.roster.units}
          pilots={campaign.roster.pilots}
        />
      </div>

      <MissionHistory missions={campaign.missions} />

      {!isComplete && (
        <div className="border-border-theme-subtle mt-6 flex justify-between border-t pt-6">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="delete-campaign-btn"
            >
              Delete Campaign
            </Button>
            <Button
              variant="ghost"
              className="text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300"
              onClick={onAbandon}
            >
              Abandon Campaign
            </Button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="delete-confirm-dialog"
        >
          <Card className="mx-4 max-w-md">
            <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
              Delete Campaign?
            </h3>
            <p className="text-text-theme-secondary mb-4 text-sm">
              This will permanently delete &quot;{campaign.name}&quot; and all
              its progress. This action cannot be undone.
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
                onClick={handleConfirmDelete}
                data-testid="confirm-delete-btn"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
