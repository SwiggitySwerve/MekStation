import React, { useState } from 'react';

import {
  GmCampaignInterventionControlPlane,
  GmCampaignPlayerLedgerView,
} from '@/components/campaign/gm';
import { resolveCampaignAuthorityFromSession } from '@/lib/campaign/campaignAuthority';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

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
  const authority = resolveCampaignAuthorityFromSession(campaign.coopSession);
  const frame = {
    title: 'GM Ledger',
    subtitle: authority.canUseGmControls
      ? `${campaign.name} - intervention control plane`
      : `${campaign.name} - player-visible ledger`,
    currentPage: 'gm-ledger',
  } as const;

  return (
    <CampaignPageFrameFromShell shell={shell} frame={frame}>
      {authority.canUseGmControls ? (
        <GmCampaignInterventionControlPlane
          campaign={campaign}
          onApplyCampaignUpdate={async (updates) => {
            await Promise.resolve(
              shell.store.getState().updateCampaign(updates),
            );
            if (!campaign.coopSession) {
              useCampaignPersistenceStore.getState().markDirty();
            }
            setActionTick((tick) => tick + 1);
          }}
        />
      ) : (
        <GmCampaignPlayerLedgerView campaign={campaign} />
      )}
    </CampaignPageFrameFromShell>
  );
}
