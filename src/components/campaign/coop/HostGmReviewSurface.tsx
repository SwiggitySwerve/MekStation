/**
 * HostGmReviewSurface — the host-facing GM review surface (CO2).
 *
 * In `host-review` GM arbitration mode every guest proposal that passes
 * CO1 mechanical validation is surfaced to the host, who explicitly
 * issues `approve` or `veto` (design D5). This surface lists the
 * pending proposals with the campaign context the host needs to decide:
 *
 *   - the current C-bill balance,
 *   - the relevant faction standing (for an `AcceptContract`),
 *   - the proposal's roster/ledger effect summary.
 *
 * (spec "Host GM Review Surface".)
 *
 * The surface is presentational — the pending queue is owned by the
 * `CampaignGmArbiter`. `approve` / `veto` clicks are forwarded to the
 * caller-supplied `onDecide` callback, which wires them to
 * `CampaignGmArbiter.decide`. The surface introduces no transport
 * (design D7).
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D5, D7)
 */

import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { GmDecision } from '@/types/campaign/CoopCampaign';
import type { ICommandAuthorityProjection } from '@/types/command-screen';

// =============================================================================
// Props
// =============================================================================

export interface HostGmReviewSurfaceProps {
  /** The pending guest proposals (from `CampaignGmArbiter.getPendingProposals`). */
  readonly pending: readonly IPendingProposal[];
  /**
   * Called when the host decides a proposal. The caller wires this to
   * `CampaignGmArbiter.decide(proposalId, decision)`.
   */
  readonly onDecide: (proposalId: string, decision: GmDecision) => void;
  readonly onPreview?: (proposalId: string) => void;
  readonly onManualTakeover?: (proposalId: string) => void;
  readonly onGmCorrection?: (proposalId: string) => void;
  readonly authorityProjection?: ICommandAuthorityProjection;
  /** Optional class override for the surface container. */
  readonly className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Format a C-bill amount with thousands separators for the review UI. */
function formatCbills(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} C-bills`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * The host's GM review surface — a list of pending guest proposals,
 * each with campaign context and an approve / veto control pair.
 *
 * In `auto-approve` mode the pending queue is always empty, so the
 * surface renders an explicit empty state.
 */
export function HostGmReviewSurface({
  pending,
  onDecide,
  onPreview = () => {},
  onManualTakeover = () => {},
  onGmCorrection = () => {},
  authorityProjection,
  className = '',
}: HostGmReviewSurfaceProps): React.ReactElement {
  return (
    <section
      data-testid="host-gm-review-surface"
      className={`rounded-xl border border-slate-700 bg-slate-900/60 p-4 ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        GM Review — Pending Guest Proposals
      </h3>

      {authorityProjection && (
        <div
          data-testid="host-command-authority-projection"
          className="mb-3 flex flex-wrap gap-2 text-xs"
        >
          <span
            data-testid="host-command-authority-summary"
            className="rounded border border-emerald-700/70 bg-emerald-950/50 px-2 py-1 text-emerald-200"
          >
            {authorityProjection.summary}
          </span>
          <span
            data-testid="host-command-authority-path"
            className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-300"
          >
            {authorityProjection.commandPath}
          </span>
          {authorityProjection.canViewPrivateGmMetadata && (
            <span
              data-testid="host-command-authority-private"
              className="rounded border border-violet-700/70 bg-violet-950/40 px-2 py-1 text-violet-200"
            >
              GM-private
            </span>
          )}
        </div>
      )}

      {pending.length === 0 ? (
        <p
          data-testid="host-gm-review-empty"
          className="text-sm text-slate-500"
        >
          No proposals awaiting review.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((entry) => (
            <li
              key={entry.proposal.proposalId}
              data-testid={`pending-proposal-${entry.proposal.proposalId}`}
              className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
            >
              {/* Effect summary — what the proposal does. */}
              <div className="text-sm font-medium text-slate-200">
                {entry.effectSummary}
              </div>

              {/* Campaign context — balance + standing + roster effect. */}
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                <dt>Current balance</dt>
                <dd
                  data-testid={`proposal-balance-${entry.proposal.proposalId}`}
                  className="text-right text-slate-300"
                >
                  {formatCbills(entry.balanceAtSubmit)}
                </dd>
                {entry.relevantStanding !== null && (
                  <>
                    <dt>Faction standing</dt>
                    <dd
                      data-testid={`proposal-standing-${entry.proposal.proposalId}`}
                      className="text-right text-slate-300"
                    >
                      {entry.relevantStanding}
                    </dd>
                  </>
                )}
                <dt>Proposing player</dt>
                <dd className="text-right text-slate-300">
                  {entry.proposal.proposingPlayerId}
                </dd>
              </dl>

              {/* Decision controls. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid={`preview-${entry.proposal.proposalId}`}
                  onClick={() => onPreview(entry.proposal.proposalId)}
                  className="rounded-lg border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30"
                >
                  Preview
                </button>
                <button
                  type="button"
                  data-testid={`approve-${entry.proposal.proposalId}`}
                  onClick={() => onDecide(entry.proposal.proposalId, 'approve')}
                  className="rounded-lg border border-emerald-500/50 bg-emerald-600/20 px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-600/30"
                >
                  Approve
                </button>
                <button
                  type="button"
                  data-testid={`veto-${entry.proposal.proposalId}`}
                  onClick={() => onDecide(entry.proposal.proposalId, 'veto')}
                  className="rounded-lg border border-red-500/50 bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-600/30"
                >
                  Veto
                </button>
                <button
                  type="button"
                  data-testid={`manual-takeover-${entry.proposal.proposalId}`}
                  onClick={() => onManualTakeover(entry.proposal.proposalId)}
                  className="rounded-lg border border-amber-500/50 bg-amber-600/20 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-600/30"
                >
                  Manual
                </button>
                <button
                  type="button"
                  data-testid={`gm-correction-${entry.proposal.proposalId}`}
                  onClick={() => onGmCorrection(entry.proposal.proposalId)}
                  className="rounded-lg border border-violet-500/50 bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-600/30"
                >
                  GM Fix
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default HostGmReviewSurface;
