import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IGuestProposal } from '@/types/campaign/CoopCampaign';

// =============================================================================
// Context derivation — campaign context for the host review surface
// =============================================================================

/**
 * The faction standing relevant to a proposal — the employer faction's
 * standing for an `AcceptContract`, `null` for every other intent kind
 * (no faction is involved).
 */
export function relevantStandingFor(
  proposal: IGuestProposal,
  state: ICampaignAuthoritativeState,
): number | null {
  if (proposal.intent.kind === 'AcceptContract') {
    const factionId = proposal.intent.payload.contract.employerFactionId;
    return state.factionStanding[factionId] ?? 0;
  }
  return null;
}

/**
 * A human-readable one-line summary of a proposal's ledger/roster
 * effect, shown on the host GM review surface so the host can decide
 * without inspecting the raw intent payload.
 */
export function describeProposalEffect(proposal: IGuestProposal): string {
  const intent = proposal.intent;
  switch (intent.kind) {
    case 'HirePilot':
      return `Hire pilot ${intent.payload.pilot.name} for ${formatCbills(
        intent.payload.cost,
      )}`;
    case 'HireOffer':
      // The offer, not a price: the authority prices it at commit.
      return `Hire market offer ${intent.payload.offerId}`;
    case 'AcceptContract':
      return `Accept contract ${intent.payload.contract.name}`;
    case 'SpendFunds':
      return `Spend ${formatCbills(intent.payload.amount)} — ${
        intent.payload.reason
      }`;
    case 'AllocateSalvage':
      return `Allocate ${formatCbills(intent.payload.value)} of salvage`;
    case 'AdvanceDay':
      return `Advance the campaign day by ${intent.payload.days ?? 1}`;
    case 'RemoveParticipant':
      // Host-only - never a guest proposal - but the switch is
      // exhaustive so the label exists the day the union is consulted.
      return `Remove participant ${intent.payload.participantId}`;
    default: {
      // Exhaustiveness guard — a new intent kind trips this at compile
      // time so the review surface never shows an unlabelled proposal.
      const exhaustive: never = intent;
      void exhaustive;
      return 'Unknown campaign action';
    }
  }
}

/** Format a C-bill amount with thousands separators for the review UI. */
function formatCbills(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} C-bills`;
}
