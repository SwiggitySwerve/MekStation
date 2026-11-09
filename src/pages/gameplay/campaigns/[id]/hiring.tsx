/**
 * Campaign Personnel & Hiring Page
 *
 * The Personnel & Hiring command surface (CP2b — `add-campaign-command-ui`,
 * design D2). Lists the current personnel-market candidate pool with a
 * per-candidate hire action routing through the existing
 * `personnel-management` hiring logic via `campaignCommandActions`.
 *
 * Creation initializes the pool before the first save. The day pipeline
 * adds new recruits, and local old saves without a pool use the same
 * domain initializer on first open.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import React, { useEffect, useState } from 'react';

import { HiringPanel } from '@/components/campaign/command/HiringPanel';
import {
  coopHireRefusalMessage,
  sendCoopHireOffer,
} from '@/lib/campaign/coop/coopMarketCommands';
import { useDayAdvanceInFlight } from '@/lib/campaign/hooks/useDayAdvanceInFlight';
import {
  coopMarketActionRefusal,
  localMarketRefusal,
} from '@/lib/campaign/markets/offerLifecycle';
import { initializePersonnelMarket } from '@/lib/campaign/markets/personnelMarket';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderCampaignCommandFeedback,
  renderPendingCampaignPage,
  useCampaignLoadStatus,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { hireCandidate } from '@/stores/campaign/campaignCommandActions';
import { selectPersonnelMarket } from '@/stores/campaign/campaignCommandSelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

const HIRING_LOADING = {
  title: 'Personnel & Hiring',
  subtitle: 'Loading hiring market...',
} as const;

export default function HiringPage(): React.ReactElement {
  const shell = useCampaignPageShell('Personnel & Hiring');
  const { campaign: shellCampaign, store, isClient } = shell;
  const dayAdvanceInFlight = useDayAdvanceInFlight();
  // A co-op host hires through the campaign host; a guest cannot hire.
  const blockedReason = shellCampaign
    ? coopMarketActionRefusal(shellCampaign, 'hire', dayAdvanceInFlight)
    : undefined;
  const loadStatus = useCampaignLoadStatus();
  // Re-render tick — bumped after a hire so the page re-reads the market.
  const [, setActionTick] = useState(0);
  // Offer id of a hire in flight, and any action error.
  const [hiringOfferId, setHiringOfferId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Local old saves may predate creation-time initialization. Co-op
  // continues reading its saved source market rather than this fallback.
  useEffect(() => {
    if (
      !isClient ||
      !shellCampaign ||
      localMarketRefusal(shellCampaign, store.getState().dayAdvanceInFlight)
    )
      return;
    const initialized = initializePersonnelMarket(shellCampaign);
    if (initialized === shellCampaign) return;
    store.getState().updateCampaign(initialized);
    setActionTick((tick) => tick + 1);
  }, [isClient, shellCampaign, store, dayAdvanceInFlight]);

  const pendingPage = renderPendingCampaignPage(shell, HIRING_LOADING);
  if (pendingPage) return pendingPage;

  const campaign = getLoadedCampaign(shell);
  const candidates = selectPersonnelMarket(campaign);
  const frame = {
    title: 'Personnel & Hiring',
    subtitle: `${campaign.name} — ${candidates.length} candidates on the market`,
    currentPage: 'hiring',
    coopRouteId: 'hiring',
  } as const;

  /**
   * A co-op host's Hire goes to the campaign host as `HireOffer`; the hire
   * reaches this page through the ledger, which hides the consumed offer.
   * Nothing is written locally, and the button stays held until the host
   * answers.
   */
  const handleCoopHire = async (offerId: string): Promise<void> => {
    setActionError(null);
    setHiringOfferId(offerId);
    const refusal = await sendCoopHireOffer(campaign, offerId);
    if (refusal === null) {
      await useCampaignPersistenceStore
        .getState()
        .refreshAfterCommittedCommand({
          kind: 'committed',
          state: { campaignId: campaign.id },
        });
    } else {
      setActionError(coopHireRefusalMessage(refusal));
    }
    setHiringOfferId(null);
    setActionTick((tick) => tick + 1);
  };

  /** Hire a candidate through the existing personnel-management logic. */
  const handleHire = (offerId: string): void => {
    if (hiringOfferId !== null) return;
    if (campaign.coopSession?.mode === 'host') {
      void handleCoopHire(offerId);
      return;
    }
    setActionError(null);
    setHiringOfferId(offerId);
    const result = hireCandidate(offerId);
    setHiringOfferId(null);
    if (!result.applied) {
      setActionError(result.reason ?? 'The candidate is no longer available.');
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
      {feedback ?? (
        <HiringPanel
          candidates={candidates}
          onHire={handleHire}
          hiringOfferId={hiringOfferId}
          blockedReason={blockedReason}
        />
      )}
    </CampaignPageFrameFromShell>
  );
}
