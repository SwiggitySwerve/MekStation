/**
 * useGuestProposals — guest-side proposal state hook (CO2).
 *
 * A guest in a shared co-op campaign does NOT mutate campaign state — a
 * guest campaign action is an `IGuestProposal` the GM arbitrates
 * (design D4). This hook owns the guest-side proposal lifecycle:
 *
 *   - `submit(intent)` raises a proposal and marks it PENDING — the
 *     guest UI shows a pending indicator and a duplicate submit of the
 *     same action is disabled while it is unresolved (spec "Guest
 *     Proposal Feedback Surface");
 *   - `resolve(result)` clears the pending indicator and records the
 *     outcome — `committed`, `vetoed`, or `mechanically-rejected` — so
 *     the UI can tell a GM veto apart from an impossible action
 *     (spec scenario "Veto is distinct from a mechanical rejection").
 *
 * The hook is transport-agnostic: it tracks state and exposes a
 * `submit` callback that the caller wires to the real proposal
 * transport (the CO1 campaign-broadcast channel). It introduces no
 * transport of its own (design D7).
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D4, D7)
 */

import { useCallback, useMemo, useState } from 'react';

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type {
  GuestProposalResult,
  IGuestProposal,
  ProposalResolutionStatus,
} from '@/types/campaign/CoopCampaign';

// =============================================================================
// Tracked proposal
// =============================================================================

/**
 * A guest-tracked proposal — the submitted proposal plus its current
 * resolution status. A `pending` proposal drives the pending indicator;
 * a resolved proposal drives the outcome surface.
 */
export interface ITrackedProposal {
  /** The proposal raised by the guest. */
  readonly proposal: IGuestProposal;
  /** The proposal's current resolution status. */
  readonly status: ProposalResolutionStatus;
  /**
   * A short, human-readable outcome label shown to the guest once the
   * proposal resolves. Empty while `pending`.
   */
  readonly outcomeLabel: string;
}

// =============================================================================
// Hook input / output
// =============================================================================

/**
 * The submit transport — the caller wires this to the real CO1 campaign
 * broadcast channel. It MUST return the eventual `GuestProposalResult`.
 */
export type ProposalSubmitTransport = (
  proposal: IGuestProposal,
) => Promise<GuestProposalResult>;

/** The `useGuestProposals` hook surface. */
export interface IGuestProposalsApi {
  /** Every proposal the guest has raised this session, newest last. */
  readonly proposals: readonly ITrackedProposal[];
  /**
   * Raise a campaign action as a proposal. The proposal is marked
   * `pending` immediately; when the transport resolves it the tracked
   * proposal's status is updated. A `kind` whose previous proposal is
   * still `pending` is a duplicate — `submit` is a no-op and returns
   * `null` (spec "a duplicate submission of that action SHALL be
   * disabled").
   */
  submit: (intent: ICampaignIntent) => Promise<GuestProposalResult | null>;
  /**
   * True when a proposal of the given intent kind is currently pending —
   * the caller disables that action's submit control.
   */
  isPending: (kind: ICampaignIntent['kind']) => boolean;
}

// =============================================================================
// Outcome label
// =============================================================================

/**
 * Map a resolved `GuestProposalResult` to a short outcome label and
 * status. The label distinguishes a GM veto from a mechanical rejection
 * so the guest UI presents them differently (spec scenario "Veto is
 * distinct from a mechanical rejection").
 */
function describeResolution(result: GuestProposalResult): {
  readonly status: ProposalResolutionStatus;
  readonly label: string;
} {
  switch (result.status) {
    case 'committed':
      return { status: 'committed', label: 'Approved by the GM' };
    case 'vetoed':
      return { status: 'vetoed', label: 'Vetoed by the GM' };
    case 'mechanically-rejected':
      return {
        status: 'mechanically-rejected',
        label: `Not possible — ${result.reason}`,
      };
    case 'pending':
      return { status: 'pending', label: '' };
    default: {
      const exhaustive: never = result;
      void exhaustive;
      return { status: 'pending', label: '' };
    }
  }
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Guest-side proposal lifecycle hook.
 *
 * @param transport - submits a proposal and resolves with its outcome
 * @param proposingPlayerId - the guest's player id, stamped on proposals
 */
export function useGuestProposals(
  transport: ProposalSubmitTransport,
  proposingPlayerId: string,
): IGuestProposalsApi {
  const [proposals, setProposals] = useState<readonly ITrackedProposal[]>([]);

  const isPending = useCallback(
    (kind: ICampaignIntent['kind']): boolean =>
      proposals.some(
        (tracked) =>
          tracked.status === 'pending' && tracked.proposal.intent.kind === kind,
      ),
    [proposals],
  );

  const submit = useCallback(
    async (intent: ICampaignIntent): Promise<GuestProposalResult | null> => {
      // Duplicate guard — a proposal of this kind is still pending, so a
      // second submit of the same action is disabled (spec).
      const duplicate = proposals.some(
        (tracked) =>
          tracked.status === 'pending' &&
          tracked.proposal.intent.kind === intent.kind,
      );
      if (duplicate) {
        return null;
      }

      const proposal: IGuestProposal = {
        proposalId: `proposal-${intent.intentId}`,
        campaignId: intent.campaignId,
        proposingPlayerId,
        ts: new Date().toISOString(),
        intent,
      };

      // Mark pending — the UI shows the indicator immediately.
      setProposals((prev) => [
        ...prev,
        { proposal, status: 'pending', outcomeLabel: '' },
      ]);

      // Submit through the caller-supplied transport and record the
      // resolution when it lands — the pending indicator clears (spec
      // "Indicator clears on resolution").
      const result = await transport(proposal);
      const { status, label } = describeResolution(result);
      setProposals((prev) =>
        prev.map((tracked) =>
          tracked.proposal.proposalId === proposal.proposalId
            ? { ...tracked, status, outcomeLabel: label }
            : tracked,
        ),
      );
      return result;
    },
    [proposals, proposingPlayerId, transport],
  );

  return useMemo(
    () => ({ proposals, submit, isPending }),
    [proposals, submit, isPending],
  );
}
