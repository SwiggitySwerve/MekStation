/**
 * Campaign Prestige & Morale Page
 *
 * The read-only Prestige & Morale command surface (CP3 -
 * `add-campaign-refit-and-prestige`, design D10). Shows the company's
 * current morale state, recent morale transitions, and per-unit prestige
 * scores. Morale and prestige change through day processors and the
 * post-battle prestige step - the page exposes no mutation controls.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import React from 'react';

import { PrestigeMoralePanel } from '@/components/campaign/command/PrestigeMoralePanel';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderCampaignCommandFeedback,
  renderPendingCampaignPage,
  useCampaignLoadStatus,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { MORALE_DEFAULT } from '@/types/campaign/Prestige';

const PRESTIGE_MORALE_LOADING = {
  title: 'Prestige & Morale',
  subtitle: 'Loading company standing...',
} as const;

export default function PrestigeMoralePage(): React.ReactElement {
  const shell = useCampaignPageShell('Prestige & Morale');
  const loadStatus = useCampaignLoadStatus();

  const pendingPage = renderPendingCampaignPage(shell, PRESTIGE_MORALE_LOADING);
  if (pendingPage) return pendingPage;

  const campaign = getLoadedCampaign(shell);
  const frame = {
    title: 'Prestige & Morale',
    subtitle: campaign.name,
    currentPage: 'prestige-morale',
  } as const;
  const feedback = renderCampaignCommandFeedback({
    campaignId: campaign.id,
    loadStatus,
    message: 'The campaign data failed to load.',
  });

  return (
    <CampaignPageFrameFromShell shell={shell} frame={frame}>
      {feedback ?? (
        <PrestigeMoralePanel
          moraleState={campaign.moraleState ?? MORALE_DEFAULT}
          moraleTransitions={campaign.moraleTransitions ?? []}
          unitPrestige={campaign.unitPrestige ?? []}
        />
      )}
    </CampaignPageFrameFromShell>
  );
}
