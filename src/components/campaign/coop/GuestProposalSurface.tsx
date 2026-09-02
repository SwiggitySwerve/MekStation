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

import type { ICampaignLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { ICommandAuthorityProjection } from '@/types/command-screen';

import type { IGuestProposalsApi } from './useGuestProposals';

import { CampaignSyncStateBanner } from './CampaignSyncStateBanner';

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
  /**
   * Synchronization posture of the guest's replica (task 5.6). Controls
   * are offered ONLY when it says commands are enabled: proposing from a
   * view that is mid-backfill, reconnecting, or refused means proposing
   * blind against state that has already moved. Omitted on surfaces with
   * no replica behind them, which keeps the pre-5.6 behaviour for them
   * rather than silently disabling controls that were always safe.
   */
  readonly syncPosture?: ICampaignLifecyclePosture;
  /**
   * Clears the standing refusal so the guest can retry. Same contract as
   * the host's: the local block is a hint carried forward from the last
   * refusal, not a live subscription - the server is still the authority
   * and re-refuses if the condition holds.
   */
  readonly onClearLifecycleRefusal?: () => void;
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

/**
 * The id of the element stating WHY a control is withheld.
 *
 * A disabled button with no reason is a dead button: the guest learns
 * that the thing does not work and nothing about what would make it
 * work. `aria-describedby` is what carries that to a screen reader,
 * which is why the reason is a real rendered element with a real id
 * rather than the `data-sync-blocked` attribute, which announces nothing.
 */
const GUEST_BLOCKED_REASON_ID = 'guest-command-blocked-reason';

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
  syncPosture,
  onClearLifecycleRefusal = () => {},
  className = '',
}: GuestProposalSurfaceProps): React.ReactElement {
  // The newest RESOLVED proposal, which is what the announcement speaks.
  // Newest rather than first: `useGuestProposals` appends, so the last
  // resolved entry is the decision that just arrived - announcing the
  // first would replay an answer the player heard several decisions ago.
  const newestDecision = [...api.proposals]
    .reverse()
    .find((entry) => entry.status !== 'pending');

  return (
    <section
      data-testid="guest-proposal-surface"
      className={`rounded-xl border border-slate-700 bg-slate-900/60 p-4 ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        Campaign Actions (Guest)
      </h3>

      {/* Always rendered when a replica is behind this surface, including
          while everything is fine: a banner that only appears on trouble
          teaches a player that its absence means nothing. */}
      {syncPosture && <CampaignSyncStateBanner posture={syncPosture} />}

      {/*
        WHY the controls are withheld, as a real element with a real id
        so `aria-describedby` on each disabled control has something to
        point at.
        Rendered whenever the controls are withheld - not only on a
        refusal - because the anti-dead-button rule has nothing to do with
        WHICH gate closed. A control disabled by a mid-backfill replica
        needs its reason exactly as much as one disabled by a rebuild, and
        pointing `aria-describedby` at an element that renders for only
        one of the two cases would be a dangling reference for the other.
      */}
      {syncPosture && !syncPosture.commandsEnabled && (
        <p
          id={GUEST_BLOCKED_REASON_ID}
          data-testid="guest-command-blocked-reason"
          className="mb-2 text-xs text-amber-300"
        >
          {syncPosture.message}
        </p>
      )}

      {/* The recovery the refusal names, in the same vocabulary the host
          reads. Nothing here commits anything - it clears a local hint so
          the server answers again - which is what makes it safe to offer
          to an actor whose last command was refused. */}
      {syncPosture?.recovery && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p data-testid="guest-lifecycle-recovery-description">
            {syncPosture.recovery.description}
          </p>
          {/* A rebuild has nothing to press - see the GM surface's note.
              The recovery is stated either way; only the affordance
              differs, because only sometimes is the guest the one who
              can act. */}
          {syncPosture.recovery.actionable ? (
            <button
              type="button"
              data-testid="guest-lifecycle-recovery"
              data-recovery-code={syncPosture.recovery.code}
              onClick={onClearLifecycleRefusal}
              className="mt-2 rounded-lg border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30"
            >
              {syncPosture.recovery.label}
            </button>
          ) : (
            <p
              data-testid="guest-lifecycle-recovery-wait"
              data-recovery-code={syncPosture.recovery.code}
              className="mt-2 text-sm font-medium text-slate-200"
            >
              {syncPosture.recovery.label}
            </p>
          )}
        </div>
      )}

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
          // Two different reasons to be unavailable, deliberately not
          // merged: `pending` means "this one is already in flight",
          // while the posture gate means "none of these can be trusted
          // right now". A player reading the surface can tell them apart.
          //
          // The posture gate covers BOTH a replica that is not converged
          // and a server refusal - `toCampaignLifecyclePosture` folds a
          // standing refusal into `commandsEnabled` - so this one read
          // withholds the control for a rebuild and a stale branch as
          // well as for a backfill. The `data-sync-blocked` locator keeps
          // its shipped name for the readers already walking it.
          const blockedByPosture =
            syncPosture !== undefined && !syncPosture.commandsEnabled;
          const unavailable = pending || blockedByPosture;
          return (
            <button
              key={action.kind}
              type="button"
              data-testid={`guest-action-${action.kind}`}
              disabled={unavailable}
              // The half that reaches a screen reader. `data-sync-blocked`
              // below is only a locator and announces nothing.
              aria-describedby={
                blockedByPosture ? GUEST_BLOCKED_REASON_ID : undefined
              }
              data-sync-blocked={blockedByPosture ? 'true' : undefined}
              onClick={() => {
                void api.submit(action.buildIntent());
              }}
              className={
                unavailable
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

      {/*
        The decision announcement (umbrella 19.3). Separate from the feed
        below rather than a live region wrapped around it: the feed holds
        pending rows too, so a region around the whole list would re-read
        the entire queue on every change, which is how live regions turn
        into noise people learn to ignore. This carries the newest RESOLVED
        outcome and nothing else, and is empty - therefore silent - until
        the GM has actually decided something.
      */}
      <p
        data-testid="guest-decision-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {newestDecision === undefined
          ? ''
          : `${newestDecision.proposal.intent.kind}: ${newestDecision.outcomeLabel}`}
      </p>

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
