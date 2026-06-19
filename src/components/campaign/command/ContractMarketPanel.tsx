/**
 * Contract Market Panel
 *
 * The Contract Market surface (CP2b — `add-campaign-command-ui`,
 * design D5). Renders the current contract-market offers — one card per
 * offer showing employer, pay, salvage rights, and duration — with
 * accept / decline actions per offer.
 *
 * The panel owns NO mutation: accept / decline are callbacks the page
 * wires to `campaignCommandActions.acceptContractOffer` /
 * `declineContractOffer`.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module components/campaign/command/ContractMarketPanel
 */

import React from 'react';

import type { IContract } from '@/types/campaign/Mission';

import { CampaignListCard } from '@/components/campaign/CampaignListCard';
import { Badge } from '@/components/ui';

import { CommandEmpty } from './CommandStates';

// =============================================================================
// Duration Helper
// =============================================================================

/**
 * Derive a human-readable contract duration from its start / end dates.
 * Falls back to "Unspecified" when either date is missing.
 *
 * @param contract - the contract offer
 */
function formatDuration(contract: IContract): string {
  if (!contract.startDate || !contract.endDate) return 'Unspecified';
  const start = new Date(contract.startDate).getTime();
  const end = new Date(contract.endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 'Unspecified';
  }
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return `${days} days`;
}

// =============================================================================
// Offer Card
// =============================================================================

interface OfferCardProps {
  /** The contract-market offer for this card. */
  readonly offer: IContract;
  /** Accept callback — invoked with the offer id. */
  readonly onAccept: (offerId: string) => void;
  /** Decline callback — invoked with the offer id. */
  readonly onDecline: (offerId: string) => void;
  /** True while an action for this offer is in flight. */
  readonly isBusy: boolean;
}

/**
 * One contract-market offer card — employer, pay, salvage rights, and
 * duration, with accept / decline buttons.
 */
export function OfferCard({
  offer,
  onAccept,
  onDecline,
  isBusy,
}: OfferCardProps): React.ReactElement {
  return (
    <CampaignListCard
      testId={`offer-card-${offer.id}`}
      align="start"
      left={
        <>
          <h3 className="text-text-theme-primary truncate text-base font-semibold">
            {offer.name}
          </h3>
          <p
            className="text-text-theme-secondary mt-1 text-xs"
            data-testid={`offer-employer-${offer.id}`}
          >
            Employer: {offer.employerId}
          </p>
          <p
            className="text-text-theme-secondary mt-1 text-xs"
            data-testid={`offer-pay-${offer.id}`}
          >
            Base pay: {offer.paymentTerms.basePayment.format()}
          </p>
          <p
            className="text-text-theme-secondary mt-1 text-xs"
            data-testid={`offer-duration-${offer.id}`}
          >
            Duration: {formatDuration(offer)}
          </p>
        </>
      }
      right={
        <div className="flex flex-col items-end gap-3">
          <Badge
            className="bg-sky-500/20 text-sky-400"
            data-testid={`offer-salvage-${offer.id}`}
          >
            Salvage: {offer.salvageRights}
          </Badge>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAccept(offer.id)}
              disabled={isBusy}
              className="bg-accent text-surface-base hover:bg-accent/90 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              data-testid={`offer-accept-${offer.id}`}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onDecline(offer.id)}
              disabled={isBusy}
              className="bg-surface-raised hover:bg-border-theme text-text-theme-primary rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              data-testid={`offer-decline-${offer.id}`}
            >
              Decline
            </button>
          </div>
        </div>
      }
    />
  );
}

// =============================================================================
// Panel
// =============================================================================

export interface ContractMarketPanelProps {
  /** The visible contract-market offers (declined offers already filtered). */
  readonly offers: readonly IContract[];
  /** Accept callback — invoked with the offer id. */
  readonly onAccept: (offerId: string) => void;
  /** Decline callback — invoked with the offer id. */
  readonly onDecline: (offerId: string) => void;
  /** Offer id of an action currently in flight, if any. */
  readonly busyOfferId?: string | null;
}

/**
 * The Contract Market panel — an offer grid over the contract market.
 * Renders an empty state when the market has no offers this cycle
 * (design D7 — empty, not error).
 */
export function ContractMarketPanel({
  offers,
  onAccept,
  onDecline,
  busyOfferId,
}: ContractMarketPanelProps): React.ReactElement {
  if (offers.length === 0) {
    return (
      <CommandEmpty
        title="No contracts on the market"
        message="The contract market has no offers this cycle. Advance to the next month to refresh the market."
      />
    );
  }

  return (
    <div className="space-y-3" data-testid="contract-market-grid">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          onAccept={onAccept}
          onDecline={onDecline}
          isBusy={busyOfferId === offer.id}
        />
      ))}
    </div>
  );
}

export default ContractMarketPanel;
