import React, { useState } from 'react';

import { GmCampaignInterventionControlPlane } from '@/components/campaign/gm';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';

const GM_LEDGER_LOADING = {
  title: 'GM Ledger',
  subtitle: 'Loading GM ledger...',
} as const;

export default function GmLedgerPage(): React.ReactElement {
  const shell = useCampaignPageShell('GM Ledger');
  const [, setActionTick] = useState(0);
  const pendingPage = renderPendingCampaignPage(shell, GM_LEDGER_LOADING);
  if (pendingPage) return pendingPage;

  const campaign = getLoadedCampaign(shell);
  const frame = {
    title: 'GM Ledger',
    subtitle: `${campaign.name} - intervention control plane`,
    currentPage: 'gm-ledger',
  } as const;

  return (
    <CampaignPageFrameFromShell shell={shell} frame={frame}>
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={(updates) => {
          shell.store.getState().updateCampaign(updates);
          setActionTick((tick) => tick + 1);
        }}
      />
    </CampaignPageFrameFromShell>
  );
}
