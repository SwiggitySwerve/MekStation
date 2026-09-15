/**
 * Wire-to-`IPendingProposal` parsing for the GM review queue.
 *
 * The campaign socket delivers a guest proposal as an already-built
 * pending entry OR as the bare `IGuestProposal` the guest sent; either
 * way the GM surface needs the same entry shape, with the balance and
 * standing the decision is being made against read off the campaign
 * record at the moment the proposal landed.
 *
 * Lives beside the connected surface rather than inside it: it is pure
 * wire parsing with no React in it.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IGuestProposal } from '@/types/campaign/CoopCampaign';

export function pendingProposalFromWire(
  value: unknown,
  campaign: ICampaign,
): IPendingProposal | null {
  if (isPendingProposal(value)) {
    return value;
  }
  if (!isGuestProposal(value)) {
    return null;
  }
  return {
    proposal: value,
    balanceAtSubmit: readCampaignBalance(campaign),
    relevantStanding: readRelevantStanding(value, campaign),
    effectSummary: describeProposalEffect(value),
  };
}

function isPendingProposal(value: unknown): value is IPendingProposal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<IPendingProposal>;
  return (
    isGuestProposal(candidate.proposal) &&
    typeof candidate.balanceAtSubmit === 'number' &&
    'relevantStanding' in candidate &&
    typeof candidate.effectSummary === 'string'
  );
}

function isGuestProposal(value: unknown): value is IGuestProposal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<IGuestProposal>;
  return (
    typeof candidate.proposalId === 'string' &&
    typeof candidate.campaignId === 'string' &&
    typeof candidate.proposingPlayerId === 'string' &&
    typeof candidate.ts === 'string' &&
    typeof candidate.intent === 'object' &&
    candidate.intent !== null
  );
}

function readCampaignBalance(campaign: ICampaign): number {
  const balance = campaign.finances.balance as unknown;
  if (
    typeof balance === 'object' &&
    balance !== null &&
    'amount' in balance &&
    typeof (balance as { amount: unknown }).amount === 'number'
  ) {
    return (balance as { amount: number }).amount;
  }
  return 0;
}

function readRelevantStanding(
  proposal: IGuestProposal,
  campaign: ICampaign,
): number | null {
  if (proposal.intent.kind !== 'AcceptContract') return null;
  const employer = proposal.intent.payload.contract.employerFactionId;
  return campaign.factionStandings[employer]?.regard ?? 0;
}

function describeProposalEffect(proposal: IGuestProposal): string {
  const intent = proposal.intent;
  switch (intent.kind) {
    case 'SpendFunds':
      return `Spend ${intent.payload.amount.toLocaleString()} C-bills - ${intent.payload.reason}`;
    case 'HirePilot':
      return `Hire pilot ${intent.payload.pilot.name}`;
    case 'AcceptContract':
      return `Accept contract ${intent.payload.contract.name}`;
    case 'AllocateSalvage':
      return `Allocate ${intent.payload.value.toLocaleString()} C-bills of salvage`;
    case 'AdvanceDay':
      return `Advance ${intent.payload.days ?? 1} day`;
    case 'RemoveParticipant':
      // Host-only; a guest proposal never carries it, but the union is
      // exhaustive and the label must exist for the compiler's sake.
      return `Remove participant ${intent.payload.participantId}`;
    default: {
      const exhaustive: never = intent;
      void exhaustive;
      return 'Guest proposal';
    }
  }
}
