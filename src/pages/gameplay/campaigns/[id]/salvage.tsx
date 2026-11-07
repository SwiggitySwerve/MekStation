/**
 * Campaign Salvage Page
 *
 * The Salvage Acceptance panel - per-item accept / decline actions and a
 * running mercenary-share value total (CP2a, design D5). Accept/decline
 * flips the item `status` on the campaign's `salvageAllocations` via the
 * persistence store.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import React, { useState } from 'react';

import { SalvageAcceptancePanel } from '@/components/campaign/bays/SalvageAcceptancePanel';
import * as CampaignShell from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import {
  setSalvageItemStatus,
  type SalvageDecision,
} from '@/stores/campaign/campaignBayActions';
import { selectSalvageBay } from '@/stores/campaign/campaignBaySelectors';

const SALVAGE_LOADING = {
  title: 'Salvage',
  subtitle: 'Loading bay...',
  variant: 'bay',
} as const;

export default function SalvagePage(): React.ReactElement {
  const shell = CampaignShell.useCampaignPageShell('Salvage');
  const loadStatus = CampaignShell.useCampaignLoadStatus();
  const [, setDecisionTick] = useState(0);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  const pendingPage = CampaignShell.renderPendingCampaignPage(
    shell,
    SALVAGE_LOADING,
  );
  if (pendingPage) return pendingPage;

  const campaign = CampaignShell.getLoadedCampaign(shell);
  const salvageBay = selectSalvageBay(campaign);
  const frame = {
    title: 'Salvage',
    subtitle: `${campaign.name} - ${salvageBay.length} salvage candidates`,
    currentPage: 'salvage',
  } as const;
  const saveError = CampaignShell.renderCampaignBaySaveError(
    campaign.id,
    loadStatus,
  );

  const handleDecide = (partId: string, decision: SalvageDecision): void => {
    setDeciding(true);
    setDecisionError(null);
    void Promise.resolve(setSalvageItemStatus(partId, decision))
      .then((result) => {
        if (!result.applied)
          setDecisionError(
            result.reason ?? 'The salvage decision could not be saved.',
          );
        setDecisionTick((tick) => tick + 1);
      })
      .catch((error: unknown) => {
        setDecisionError(
          error instanceof Error
            ? error.message
            : 'The salvage decision failed.',
        );
      })
      .finally(() => setDeciding(false));
  };

  return (
    <CampaignShell.CampaignPageFrameFromShell shell={shell} frame={frame}>
      {decisionError && <p role="alert">{decisionError}</p>}
      {deciding && <p role="status">Saving salvage decision...</p>}
      {saveError ?? (
        <fieldset
          disabled={deciding}
          aria-label="Salvage decisions"
          className="min-w-0 border-0 p-0"
        >
          <SalvageAcceptancePanel
            salvageBay={salvageBay}
            onDecide={handleDecide}
          />
        </fieldset>
      )}
    </CampaignShell.CampaignPageFrameFromShell>
  );
}
