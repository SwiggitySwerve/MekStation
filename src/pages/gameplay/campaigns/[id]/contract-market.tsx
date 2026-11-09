/**
 * Campaign Contract Market Page
 *
 * Lists the current contract-market offers with accept / decline actions.
 * The page seeds an initial market from the existing AtB contract engine when
 * a campaign has no market state yet.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import React, { useEffect, useState } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import { ContractMarketPanel } from '@/components/campaign/command/ContractMarketPanel';
import { generateAtBContracts } from '@/lib/campaign/contractMarket';
import {
  coopAcceptRefusalMessage,
  sendCoopAcceptContract,
} from '@/lib/campaign/coop/coopMarketCommands';
import { useDayAdvanceInFlight } from '@/lib/campaign/hooks/useDayAdvanceInFlight';
import {
  coopMarketActionRefusal,
  localMarketRefusal,
} from '@/lib/campaign/markets/offerLifecycle';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderCampaignCommandFeedback,
  renderPendingCampaignPage,
  useCampaignLoadStatus,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import {
  acceptContractOffer,
  declineContractOffer,
} from '@/stores/campaign/campaignCommandActions';
import { selectVisibleContractOffers } from '@/stores/campaign/campaignCommandSelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

const CONTRACT_MARKET_LOADING = {
  title: 'Contract Market',
  subtitle: 'Loading contract market...',
} as const;

export default function ContractMarketPage(): React.ReactElement {
  const shell = useCampaignPageShell('Contract Market');
  const { campaign: shellCampaign, store, isClient } = shell;
  const dayAdvanceInFlight = useDayAdvanceInFlight();
  const blockedReason = shellCampaign
    ? coopMarketActionRefusal(shellCampaign, 'accept', dayAdvanceInFlight)
    : undefined;
  // Decline has its own co-op reason: no host-authoritative decline exists.
  const declineBlockedReason = shellCampaign
    ? coopMarketActionRefusal(shellCampaign, 'decline', dayAdvanceInFlight)
    : undefined;
  const loadStatus = useCampaignLoadStatus();
  const [, setActionTick] = useState(0);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !isClient ||
      !shellCampaign ||
      localMarketRefusal(shellCampaign, store.getState().dayAdvanceInFlight)
    )
      return;
    const extended = shellCampaign as ICampaignWithCommand;
    if (extended.contractMarket !== undefined) return;
    const offers = generateAtBContracts(shellCampaign);
    store.getState().updateCampaign({
      contractMarket: { offers, declinedOfferIds: [] },
    } as Partial<ICampaign>);
    setActionTick((tick) => tick + 1);
  }, [isClient, shellCampaign, store, dayAdvanceInFlight]);

  const pendingPage = renderPendingCampaignPage(shell, CONTRACT_MARKET_LOADING);
  if (pendingPage) return pendingPage;

  const campaign = getLoadedCampaign(shell);
  const offers = selectVisibleContractOffers(campaign);
  const frame = {
    title: 'Contract Market',
    subtitle: `${campaign.name} - ${offers.length} contracts on offer`,
    currentPage: 'contract-market',
    coopRouteId: 'contract-market',
  } as const;

  /**
   * A co-op host's Accept goes to the campaign host as `AcceptContract`; the
   * acceptance reaches this page through the ledger, which hides the
   * consumed offer. Nothing is written locally, and the button stays held
   * until the host answers.
   */
  const handleCoopAccept = async (offerId: string): Promise<void> => {
    const offer = offers.find((one) => one.id === offerId);
    if (!offer) return;
    setActionError(null);
    setBusyOfferId(offerId);
    const refusal = await sendCoopAcceptContract(campaign, offer);
    if (refusal === null) {
      await useCampaignPersistenceStore
        .getState()
        .refreshAfterCommittedCommand({
          kind: 'committed',
          state: { campaignId: campaign.id },
        });
    } else {
      setActionError(coopAcceptRefusalMessage(refusal));
    }
    setBusyOfferId(null);
    setActionTick((tick) => tick + 1);
  };

  const handleAccept = (offerId: string): void => {
    if (busyOfferId !== null) return;
    if (campaign.coopSession?.mode === 'host') {
      void handleCoopAccept(offerId);
      return;
    }
    setActionError(null);
    setBusyOfferId(offerId);
    const result = acceptContractOffer(offerId);
    setBusyOfferId(null);
    if (!result.applied) {
      setActionError(result.reason ?? 'The contract is no longer available.');
      return;
    }
    setActionTick((tick) => tick + 1);
  };

  const handleDecline = (offerId: string): void => {
    setActionError(null);
    setBusyOfferId(offerId);
    const result = declineContractOffer(offerId);
    setBusyOfferId(null);
    if (!result.applied) {
      setActionError(result.reason ?? 'The contract is no longer available.');
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
      {blockedReason && <p role="status">{blockedReason}</p>}
      {declineBlockedReason && declineBlockedReason !== blockedReason && (
        <p role="status">{declineBlockedReason}</p>
      )}
      {feedback ?? (
        <ContractMarketPanel
          offers={offers}
          onAccept={handleAccept}
          onDecline={handleDecline}
          busyOfferId={busyOfferId}
          blockedReason={blockedReason}
          declineBlockedReason={declineBlockedReason}
        />
      )}
    </CampaignPageFrameFromShell>
  );
}
