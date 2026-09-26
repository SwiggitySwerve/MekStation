import React, { useState } from 'react';

import {
  GmCampaignInterventionControlPlane,
  GmCampaignPlayerLedgerView,
} from '@/components/campaign/gm';
import { toast } from '@/components/shared/Toast';
import { resolveCampaignAuthorityFromSession } from '@/lib/campaign/campaignAuthority';
import {
  gmFundsInterventionIntent,
  sendCoopGmIntervention,
} from '@/lib/campaign/coop/coopGmIntervention';
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

/**
 * The campaign GM ledger route: the intervention control plane for a viewer
 * with GM controls, the player-visible ledger otherwise. An approved funds
 * correction on a co-op campaign is sent to the live host as
 * ApplyGmIntervention; once the host commits it the saved record is re-read
 * (the host wrote it), and a refusal is toasted with nothing written. Every
 * other approval is written to the campaign store (marked dirty on a solo
 * campaign).
 */
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
            const intent = campaign.coopSession
              ? gmFundsInterventionIntent(
                  campaign,
                  updates.gmInterventionEvents,
                )
              : null;
            if (intent) {
              // The host's balance comes from the command, never from a
              // local write of `updates`.
              const refusal = await sendCoopGmIntervention(campaign, intent);
              if (refusal === null) {
                await useCampaignPersistenceStore
                  .getState()
                  .refreshAfterCommittedCommand({
                    kind: 'committed',
                    state: { campaignId: campaign.id },
                  });
              } else {
                toast({
                  message: `GM correction was not applied by the co-op host: ${refusal}.`,
                  variant: 'error',
                  duration: 7000,
                });
              }
            } else {
              await Promise.resolve(
                shell.store.getState().updateCampaign(updates),
              );
              if (!campaign.coopSession) {
                useCampaignPersistenceStore.getState().markDirty();
              }
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
