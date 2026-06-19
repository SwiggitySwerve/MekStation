import type { ComponentProps, ReactElement } from 'react';

import { Card, Button, Badge } from '@/components/ui';
import { CampaignMissionStatus, ICampaignMission } from '@/types/campaign';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

interface MissionDetailsPanelProps {
  selectedMission: ICampaignMission | null;
  currentMission: ICampaignMission | undefined;
  onStartMission: (missionId: string) => void;
}

interface MissionStatusBadgeProps {
  status: CampaignMissionStatus;
}

interface OptionalObjectivesProps {
  objectives: readonly string[] | undefined;
}

interface MissionOutcomeSummaryProps {
  mission: ICampaignMission;
}

interface MissionStartActionProps {
  selectedMission: ICampaignMission;
  currentMission: ICampaignMission | undefined;
  onStartMission: (missionId: string) => void;
}

interface CampaignDangerActionsProps {
  isComplete: boolean;
  onDeleteClick: () => void;
  onAbandon: () => void;
}

interface DeleteCampaignDialogProps {
  open: boolean;
  campaignName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const MISSION_STATUS_VARIANTS: Record<CampaignMissionStatus, BadgeVariant> = {
  [CampaignMissionStatus.Victory]: 'success',
  [CampaignMissionStatus.Defeat]: 'red',
  [CampaignMissionStatus.Available]: 'warning',
  [CampaignMissionStatus.InProgress]: 'info',
  [CampaignMissionStatus.Locked]: 'muted',
  [CampaignMissionStatus.Skipped]: 'muted',
};

function formatMissionStatus(status: CampaignMissionStatus): string {
  return status.replace('_', ' ').toUpperCase();
}

function MissionStatusBadge({ status }: MissionStatusBadgeProps): ReactElement {
  return (
    <Badge variant={MISSION_STATUS_VARIANTS[status]}>
      {formatMissionStatus(status)}
    </Badge>
  );
}

function OptionalObjectives({
  objectives,
}: OptionalObjectivesProps): ReactElement | null {
  if (!objectives || objectives.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-text-theme-primary mb-2 text-sm font-medium">
        Optional Objectives
      </h4>
      <ul className="space-y-1">
        {objectives.map((objective, index) => (
          <li
            key={index}
            className="text-text-theme-secondary flex items-start gap-2 text-sm"
          >
            <span className="text-accent">+</span>
            {objective}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MissionOutcomeSummary({
  mission,
}: MissionOutcomeSummaryProps): ReactElement | null {
  if (!mission.outcome) {
    return null;
  }

  return (
    <div className="bg-surface-deep rounded-lg p-3">
      <h4 className="text-text-theme-primary mb-2 text-sm font-medium">
        Outcome
      </h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-text-theme-muted">Enemy Destroyed:</span>{' '}
          <span className="text-text-theme-primary">
            {mission.outcome.enemyUnitsDestroyed}
          </span>
        </div>
        <div>
          <span className="text-text-theme-muted">Units Lost:</span>{' '}
          <span className="text-text-theme-primary">
            {mission.outcome.playerUnitsDestroyed}
          </span>
        </div>
        <div>
          <span className="text-text-theme-muted">C-Bills Earned:</span>{' '}
          <span className="text-accent">
            {(mission.outcome.cBillsReward / 1000).toFixed(0)}K
          </span>
        </div>
        <div>
          <span className="text-text-theme-muted">Turns:</span>{' '}
          <span className="text-text-theme-primary">
            {mission.outcome.turnsPlayed}
          </span>
        </div>
      </div>
    </div>
  );
}

function MissionStartAction({
  selectedMission,
  currentMission,
  onStartMission,
}: MissionStartActionProps): ReactElement | null {
  if (
    selectedMission.status !== CampaignMissionStatus.Available ||
    currentMission
  ) {
    return null;
  }

  return (
    <Button
      variant="primary"
      onClick={() => onStartMission(selectedMission.id)}
      className="w-full"
    >
      Start This Mission
    </Button>
  );
}

export function MissionDetailsPanel({
  selectedMission,
  currentMission,
  onStartMission,
}: MissionDetailsPanelProps): ReactElement {
  if (!selectedMission) {
    return (
      <Card data-testid="mission-details-panel">
        <h2
          className="text-text-theme-primary mb-4 text-lg font-semibold"
          data-testid="mission-details-name"
        >
          Select a Mission
        </h2>
        <div className="text-text-theme-muted py-8 text-center">
          <p>Click on a mission in the tree to view details</p>
        </div>
      </Card>
    );
  }

  return (
    <Card data-testid="mission-details-panel">
      <h2
        className="text-text-theme-primary mb-4 text-lg font-semibold"
        data-testid="mission-details-name"
      >
        {selectedMission.name}
      </h2>
      <div className="space-y-4">
        <p className="text-text-theme-secondary">
          {selectedMission.description}
        </p>

        <div className="flex items-center gap-2">
          <MissionStatusBadge status={selectedMission.status} />
          {selectedMission.isFinal && (
            <Badge variant="violet">Final Mission</Badge>
          )}
        </div>

        <OptionalObjectives objectives={selectedMission.optionalObjectives} />
        <MissionOutcomeSummary mission={selectedMission} />
        <MissionStartAction
          selectedMission={selectedMission}
          currentMission={currentMission}
          onStartMission={onStartMission}
        />
      </div>
    </Card>
  );
}

export function CampaignDangerActions({
  isComplete,
  onDeleteClick,
  onAbandon,
}: CampaignDangerActionsProps): ReactElement | null {
  if (isComplete) {
    return null;
  }

  return (
    <div className="border-border-theme-subtle mt-6 flex justify-between border-t pt-6">
      <div className="flex gap-3">
        <Button
          variant="ghost"
          className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
          onClick={onDeleteClick}
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
  );
}

export function DeleteCampaignDialog({
  open,
  campaignName,
  onCancel,
  onConfirm,
}: DeleteCampaignDialogProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="delete-confirm-dialog"
    >
      <Card className="mx-4 max-w-md">
        <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
          Delete Campaign?
        </h3>
        <p className="text-text-theme-secondary mb-4 text-sm">
          This will permanently delete &quot;{campaignName}&quot; and all its
          progress. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            data-testid="cancel-delete-btn"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            data-testid="confirm-delete-btn"
          >
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
