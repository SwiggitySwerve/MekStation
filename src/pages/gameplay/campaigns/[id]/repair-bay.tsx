/**
 * Campaign Repair Bay Page
 *
 * The repair-ticket queue grouped by unit, with a per-ticket
 * priority-reorder action (CP2a, design D3). Reorder writes a `priority`
 * ordinal onto the campaign's `repairQueue` via the persistence store.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import React, { useState } from 'react';

import { RepairBay } from '@/components/campaign/bays/RepairBay';
import * as CampaignShell from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { reorderRepairTicketPriority } from '@/stores/campaign/campaignBayActions';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';

const REPAIR_BAY_LOADING = {
  title: 'Repair Bay',
  subtitle: 'Loading bay...',
  variant: 'bay',
} as const;

export default function RepairBayPage(): React.ReactElement {
  const shell = CampaignShell.useCampaignPageShell('Repair Bay');
  const { query } = shell;
  const { unit } = query;
  const loadStatus = CampaignShell.useCampaignLoadStatus();
  // Local re-render tick — bumped after a reorder so the page re-reads the
  // freshly re-projected inventory off the campaign store.
  const [, setReorderTick] = useState(0);

  const pendingPage = CampaignShell.renderPendingCampaignPage(
    shell,
    REPAIR_BAY_LOADING,
  );
  if (pendingPage) return pendingPage;

  const campaign = CampaignShell.getLoadedCampaign(shell);
  const repairBay = selectRepairBay(campaign);
  const focusUnitId = typeof unit === 'string' ? unit : undefined;
  const frame = {
    title: 'Repair Bay',
    subtitle: `${campaign.name} — ${repairBay.length} repair tickets`,
    currentPage: 'repair-bay',
  } as const;
  const saveError = CampaignShell.renderCampaignBaySaveError(
    campaign.id,
    loadStatus,
  );

  /** Persist a priority reorder and re-render against the new projection. */
  const handleReorder = (orderedTicketIds: readonly string[]): void => {
    reorderRepairTicketPriority(orderedTicketIds);
    setReorderTick((tick) => tick + 1);
  };

  return (
    <CampaignShell.CampaignPageFrameFromShell shell={shell} frame={frame}>
      {saveError ?? (
        <RepairBay
          repairBay={repairBay}
          onReorder={handleReorder}
          focusUnitId={focusUnitId}
        />
      )}
    </CampaignShell.CampaignPageFrameFromShell>
  );
}
