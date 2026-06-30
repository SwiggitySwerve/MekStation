/**
 * GuestProposalSurface — the guest-facing campaign-action surface (CO2).
 *
 * A guest in a shared co-op campaign does NOT mutate campaign state — a
 * guest campaign action is an `IGuestProposal` the GM arbitrates
 * (design D4). This surface presents the guest's campaign controls
 * (hire pilot / accept contract / spend) as PROPOSAL controls:
 *
 *   - submitting a control raises a proposal and shows a PENDING
 *     indicator on that action; a duplicate submit of the same action
 *     is disabled while it is unresolved (spec "Guest Proposal Feedback
 *     Surface");
 *   - on resolution the surface shows whether the proposal committed a
 *     campaign event, was vetoed by the GM, or failed mechanical
 *     validation — a GM veto reads visually distinct from an impossible
 *     action (spec scenario "Veto is distinct from a mechanical
 *     rejection").
 *
 * The surface is presentational — the proposal lifecycle is owned by
 * the `useGuestProposals` hook the caller supplies. It introduces no
 * transport (design D7).
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D4, D7)
 */

import React from 'react';

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { ICommandAuthorityProjection } from '@/types/command-screen';

import type { IGuestProposalsApi } from './useGuestProposals';

// =============================================================================
// Props
// =============================================================================

/** One campaign action the guest can propose. */
export interface IGuestActionDescriptor {
  /** The intent kind this action raises. */
  readonly kind: ICampaignIntent['kind'];
  /** Button label, e.g. "Hire Pilot". */
  readonly label: string;
  /** Builds the concrete intent when the action is clicked. */
  readonly buildIntent: () => ICampaignIntent;
}

export interface GuestProposalSurfaceProps {
  /** The guest-proposal lifecycle API (from `useGuestProposals`). */
  readonly api: IGuestProposalsApi;
  /** The campaign actions the guest may propose. */
  readonly actions: readonly IGuestActionDescriptor[];
  readonly authorityProjection?: ICommandAuthorityProjection;
  /** Optional class override for the surface container. */
  readonly className?: string;
}

// =============================================================================
// Outcome styling
// =============================================================================

/**
 * Tailwind classes per resolution status. A vetoed proposal is amber (a
 * GM decision); a mechanically-rejected proposal is red (an impossible
 * action) — the two are deliberately visually distinct (spec).
 */
const STATUS_STYLES: Record<string, string> = {
  pending: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  committed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  vetoed: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'mechanically-rejected': 'border-red-500/40 bg-red-500/10 text-red-300',
};

// =============================================================================
// Component
// =============================================================================

/**
 * The guest's campaign-action surface — proposal controls plus a live
 * proposal feed.
 */
export function GuestProposalSurface({
  api,
  actions,
  authorityProjection,
  className = '',
}: GuestProposalSurfaceProps): React.ReactElement {
  return (
    <section
      data-testid="guest-proposal-surface"
      className={`rounded-xl border border-slate-700 bg-slate-900/60 p-4 ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        Campaign Actions (Guest)
      </h3>

      {authorityProjection && (
        <div
          data-testid="guest-command-authority-projection"
          className="mb-3 flex flex-wrap gap-2 text-xs"
        >
          <span
            data-testid="guest-command-authority-summary"
            className="rounded border border-sky-700/70 bg-sky-950/50 px-2 py-1 text-sky-200"
          >
            {authorityProjection.summary}
          </span>
          <span
            data-testid="guest-command-authority-path"
            className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-300"
          >
            {authorityProjection.commandPath}
          </span>
          {authorityProjection.publicResultOnly && (
            <span
              data-testid="guest-command-authority-public-only"
              className="rounded border border-emerald-700/70 bg-emerald-950/40 px-2 py-1 text-emerald-200"
            >
              Public results
            </span>
          )}
        </div>
      )}

      {/* Action controls — each raises a proposal, not a direct commit. */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const pending = api.isPending(action.kind);
          return (
            <button
              key={action.kind}
              type="button"
              data-testid={`guest-action-${action.kind}`}
              disabled={pending}
              onClick={() => {
                void api.submit(action.buildIntent());
              }}
              className={
                pending
                  ? 'cursor-not-allowed rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-500'
                  : 'rounded-lg border border-sky-500/50 bg-sky-600/20 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-600/30'
              }
            >
              {action.label}
              {pending && (
                <span
                  data-testid={`guest-action-${action.kind}-pending`}
                  className="ml-2 text-xs text-sky-400"
                >
                  Pending GM…
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Proposal feed — pending indicators and resolved outcomes. */}
      {api.proposals.length > 0 && (
        <ul data-testid="guest-proposal-feed" className="mt-4 space-y-2">
          {api.proposals.map((tracked) => (
            <li
              key={tracked.proposal.proposalId}
              data-testid={`guest-proposal-${tracked.status}`}
              className={`rounded-lg border px-3 py-2 text-xs ${
                STATUS_STYLES[tracked.status] ?? STATUS_STYLES.pending
              }`}
            >
              <span className="font-medium">
                {tracked.proposal.intent.kind}
              </span>
              {tracked.status === 'pending' ? (
                <span className="ml-2">Awaiting GM decision…</span>
              ) : (
                <span className="ml-2">{tracked.outcomeLabel}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default GuestProposalSurface;
