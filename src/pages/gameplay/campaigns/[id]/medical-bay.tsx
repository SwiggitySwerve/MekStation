/**
 * Campaign Medical Bay Page
 *
 * The read-only injured-pilot list (CP2a, design D4). Recovery is driven
 * by the day-advancement healing processor, not by this page.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import React from 'react';

import { MedicalBay } from '@/components/campaign/bays/MedicalBay';
import * as CampaignShell from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { selectMedicalBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

const MEDICAL_BAY_LOADING = {
  title: 'Medical Bay',
  subtitle: 'Loading bay...',
  variant: 'bay',
} as const;

export default function MedicalBayPage(): React.ReactElement {
  const shell = CampaignShell.useCampaignPageShell('Medical Bay');
  const loadStatus = CampaignShell.useCampaignLoadStatus();
  const pilots = useCampaignRosterStore((state) => state.pilots);

  const pendingPage = CampaignShell.renderPendingCampaignPage(
    shell,
    MEDICAL_BAY_LOADING,
  );
  if (pendingPage) return pendingPage;

  const campaign = CampaignShell.getLoadedCampaign(shell);
  const medicalBay = selectMedicalBay(campaign, pilots);
  const frame = {
    title: 'Medical Bay',
    subtitle: `${campaign.name} — ${medicalBay.length} pilots in care`,
    currentPage: 'medical-bay',
  } as const;
  const saveError = CampaignShell.renderCampaignBaySaveError(
    campaign.id,
    loadStatus,
  );

  return (
    <CampaignShell.CampaignPageFrameFromShell shell={shell} frame={frame}>
      {saveError ?? <MedicalBay medicalBay={medicalBay} />}
    </CampaignShell.CampaignPageFrameFromShell>
  );
}
