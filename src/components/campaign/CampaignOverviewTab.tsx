import { useState, useCallback } from 'react';

import { MissionTreeView } from '@/components/campaign/MissionTreeView';
import { RosterStateDisplay } from '@/components/campaign/RosterStateDisplay';
import { Card } from '@/components/ui';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { ICampaign, ICampaignMission } from '@/types/campaign';

import {
  CampaignDangerActions,
  CampaignErrorBanner,
  CampaignValidationCard,
  DeleteCampaignDialog,
  MissionDetailsPanel,
} from './CampaignOverviewTab.sections';
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

  // Per `canonicalize-unit-combat-state` PR-C: `ICampaignRoster.units`
  // (the legacy roster-unit array) was deleted. The roster projection
  // is now sourced from `useCampaignRosterStore`, which already holds
  // the canonical `IRosterUnitProjection[]` and stays in sync with
  // `useCampaignStore.campaign.unitCombatStates` via the post-battle
  // processor + `applyDamageCarryForward` write-through.
  const rosterProjections = useCampaignRosterStore((s) => s.units);
  const rosterPilots = useCampaignRosterStore((s) => s.pilots);

  return (
    <>
      <CampaignErrorBanner error={error} />
      <CampaignValidationCard validation={validation} />

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

        <MissionDetailsPanel
          selectedMission={selectedMission}
          currentMission={currentMission}
          onStartMission={onStartMission}
        />
      </div>

      <div className="mb-6">
        <RosterStateDisplay units={rosterProjections} pilots={rosterPilots} />
      </div>

      <MissionHistory missions={campaign.missions} />

      <CampaignDangerActions
        isComplete={isComplete}
        onDeleteClick={() => setShowDeleteConfirm(true)}
        onAbandon={onAbandon}
      />
      <DeleteCampaignDialog
        open={showDeleteConfirm}
        campaignName={campaign.name}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
