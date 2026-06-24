import React, { useState } from 'react';

import { AcquisitionsPanel } from '@/components/campaign/command/AcquisitionsPanel';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderCampaignCommandFeedback,
  renderPendingCampaignPage,
  useCampaignLoadStatus,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import {
  addAcquisitionRequest,
  removeAcquisitionRequest,
  type IAddAcquisitionRequestParams,
} from '@/stores/campaign/campaignCommandActions';

const ACQUISITIONS_LOADING = {
  title: 'Acquisitions',
  subtitle: 'Loading acquisitions...',
} as const;

export default function AcquisitionsPage(): React.ReactElement {
  const shell = useCampaignPageShell('Acquisitions');
  const loadStatus = useCampaignLoadStatus();
  const [, setActionTick] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingPage = renderPendingCampaignPage(shell, ACQUISITIONS_LOADING);
  if (pendingPage) return pendingPage;

  const campaign = getLoadedCampaign(shell);
  const shoppingList = campaign.shoppingList ?? { items: [] };
  const partsInventory = campaign.partsInventory ?? [];
  const frame = {
    title: 'Acquisitions',
    subtitle: `${campaign.name} - ${shoppingList.items.length} requests`,
    currentPage: 'acquisitions',
  } as const;

  const handleAddRequest = (params: IAddAcquisitionRequestParams): void => {
    setActionError(null);
    const result = addAcquisitionRequest(params);
    if (!result.applied) {
      setActionError(result.reason ?? 'The acquisition request was rejected.');
      return;
    }
    setActionTick((tick) => tick + 1);
  };

  const handleRemoveRequest = (requestId: string): void => {
    setActionError(null);
    const result = removeAcquisitionRequest(requestId);
    if (!result.applied) {
      setActionError(
        result.reason ?? 'The acquisition request was not removed.',
      );
      return;
    }
    setActionTick((tick) => tick + 1);
  };

  const handleAdvanceDay = (): void => {
    setActionError(null);
    const report = shell.store.getState().advanceDay();
    if (!report) {
      setActionError('The acquisition processor could not advance the day.');
      return;
    }
    setActionTick((tick) => tick + 1);
  };

  const feedback = renderCampaignCommandFeedback({
    actionError,
    campaignId: campaign.id,
    loadStatus,
    onClearActionError: () => setActionError(null),
  });

  return (
    <CampaignPageFrameFromShell shell={shell} frame={frame}>
      {feedback ?? (
        <AcquisitionsPanel
          shoppingList={shoppingList}
          partsInventory={partsInventory}
          currentDate={campaign.currentDate}
          onAddRequest={handleAddRequest}
          onRemoveRequest={handleRemoveRequest}
          onAdvanceDay={handleAdvanceDay}
          actionError={actionError}
        />
      )}
    </CampaignPageFrameFromShell>
  );
}
