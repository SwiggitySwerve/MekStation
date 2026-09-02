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

import React, { useEffect, useRef, useState } from 'react';

import type { IGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { GmDecision } from '@/types/campaign/CoopCampaign';
import type { ICommandAuthorityProjection } from '@/types/command-screen';

import { LifecycleStateBanner } from '@/components/common/LifecycleStateBanner';

import { VetoConfirmationDialog } from './VetoConfirmationDialog';

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
  /**
   * The host's lifecycle posture (umbrella 19.1/19.2). Omitted on
   * surfaces with no campaign session behind them, which keeps their
   * pre-19.2 behaviour rather than silently gating controls that were
   * always safe.
   */
  readonly lifecycle?: IGmLifecyclePosture;
  /**
   * Clears the standing refusal so the host can retry. The local block
   * is a hint carried forward from the last refusal, not a live
   * subscription - the server is still the authority and re-refuses if
   * the condition holds.
   */
  readonly onClearLifecycleRefusal?: () => void;
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

/**
 * Whether the server would refuse this exact decision right now.
 *
 * Two refusals with two different reaches, and the gate has to keep them
 * apart or it is lying in one direction or the other:
 *
 *   - `CAMPAIGN_NOT_CONVERGED` is checked AGAINST THE INTENT. The server
 *     refuses `AdvanceDay` - including the host's approval of a guest's
 *     `AdvanceDay` - and takes everything else. So only that one approval
 *     is withheld; disabling the rest would strand the host with a queue
 *     they are entitled to clear.
 *   - a rebuild or a stale branch is decided BEFORE the intent is read:
 *     `executeCampaignCommand` returns `blocked` from its admission arm,
 *     so approving ANY proposal is refused. Gating only progression here
 *     would hand the host a live-looking Approve on a command the server
 *     has already decided against.
 *
 * A veto is never refused either way. It removes a proposal from the
 * arbiter's queue and appends no campaign event, so no admission gate
 * sees it - which is exactly why it must stay live while the projection
 * rebuilds.
 */
function decisionRefused(
  entry: IPendingProposal,
  decision: GmDecision,
  lifecycle: IGmLifecyclePosture | undefined,
): boolean {
  if (lifecycle === undefined) return false;
  if (decision !== 'approve') return false;
  if (!lifecycle.commandsEnabled) return true;
  if (lifecycle.progressionEnabled) return false;
  return entry.proposal.intent.kind === 'AdvanceDay';
}

/**
 * The id of the element stating WHY a control is withheld.
 *
 * A disabled button with no reason is a dead button: the host learns
 * that the thing does not work and nothing about what would make it
 * work. `aria-describedby` is what carries that to a screen reader,
 * which is why the reason is a real rendered element with a real id
 * rather than a `data-` attribute only a test can read.
 */
const GM_BLOCKED_REASON_ID = 'gm-command-blocked-reason';

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
  lifecycle,
  onClearLifecycleRefusal = () => {},
  className = '',
}: HostGmReviewSurfaceProps): React.ReactElement {
  // The proposal a veto has been raised against, or null. Holding the
  // entry rather than the id keeps the dialog's summary in step with the
  // row even if the queue reorders underneath it.
  const [vetoTarget, setVetoTarget] = useState<IPendingProposal | null>(null);
  const surfaceRef = useRef<HTMLElement>(null);
  const recoveryRef = useRef<HTMLButtonElement>(null);
  // Which approve control the host was standing on. Only approve sets it:
  // the rescue below is for the case where a refusal disables the very
  // button under the cursor, and nothing else.
  const focusedApproveRef = useRef<string | null>(null);
  // What the host last DID, for the live region. Deliberately phrased as
  // "sent": this surface hands the decision to a callback and never sees
  // an acknowledgement, so announcing "vetoed" would assert a server
  // outcome it holds no evidence for. The row leaving the queue is that
  // evidence, and it arrives on its own.
  const [decisionAnnouncement, setDecisionAnnouncement] = useState('');

  /** Records the decision, then forwards it. */
  const decide = (entry: IPendingProposal, decision: GmDecision): void => {
    setDecisionAnnouncement(
      `${decision === 'veto' ? 'Veto' : 'Approval'} sent for ${entry.effectSummary}.`,
    );
    onDecide(entry.proposal.proposalId, decision);
  };

  // Any standing refusal, not progression alone: a rebuild disables the
  // approve button the host is standing on just as a convergence refusal
  // does, so the focus rescue below has to run for both.
  const refusalStanding =
    lifecycle !== undefined && lifecycle.recovery !== null;
  useEffect(() => {
    // A disabled element cannot hold focus, so when a refusal lands on
    // the button the host had focused the browser drops focus to <body> -
    // a keyboard user is silently returned to the top of the document
    // with no announcement. Move them to the recovery action, which is
    // the thing they can actually do next.
    //
    // Deliberately NOT a general "focus the newest thing" rule: a host
    // who was working elsewhere keeps their place, because stealing focus
    // on an async frame is its own defect.
    if (!refusalStanding) return;
    if (focusedApproveRef.current === null) return;
    // A rebuild renders no recovery BUTTON, so there is nothing to move
    // to. The surface itself is the fallback - it is programmatically
    // focusable for exactly this - and landing there beats landing on
    // <body> at the top of the document.
    if (recoveryRef.current) {
      recoveryRef.current.focus();
    } else {
      surfaceRef.current?.focus();
    }
    focusedApproveRef.current = null;
  }, [refusalStanding]);

  return (
    <section
      ref={surfaceRef}
      data-testid="host-gm-review-surface"
      // Programmatically focusable so focus has somewhere to land when the
      // control it came from no longer exists. Never in the tab order.
      tabIndex={-1}
      className={`rounded-xl border border-slate-700 bg-slate-900/60 p-4 ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        GM Review — Pending Guest Proposals
      </h3>

      {/*
        What the host just did (umbrella 19.3). Separate from the posture
        strip above: the posture says whether the server will take a
        decision, this says one was sent. Empty - and therefore silent -
        until the host actually decides something, so a cancelled veto
        announces nothing.
      */}
      <p
        data-testid="gm-decision-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {decisionAnnouncement}
      </p>

      {/* The always-on posture strip, so "the server will take my
          decision" is a fact the host can read rather than assume. */}
      {lifecycle && (
        <LifecycleStateBanner
          testId="gm-lifecycle-state"
          state={lifecycle.state}
          message={lifecycle.message}
        />
      )}

      {/*
        WHY a control is withheld, as a real element with a real id, so
        `aria-describedby` on the disabled button has something to point
        at. Rendered only while something is actually refused - an
        always-present reason for a surface that is working would be a
        permanent warning about nothing.
      */}
      {lifecycle?.recovery && (
        <p
          id={GM_BLOCKED_REASON_ID}
          data-testid="gm-command-blocked-reason"
          className="mb-2 text-xs text-amber-300"
        >
          {lifecycle.message}
        </p>
      )}

      {/* The typed recovery the refusal names. It commits nothing - it
          clears the local hint so the SERVER answers again - which is
          what makes it safe to offer to an actor whose last command was
          refused. */}
      {lifecycle?.recovery && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p data-testid="gm-lifecycle-recovery-description">
            {lifecycle.recovery.description}
          </p>
          {/*
            A rebuild has nothing to press. The stream reopens on lease
            expiry, release, or activation, so the recovery is stated and
            the button is deliberately absent rather than rendered as a
            control whose only effect is to re-discover the same refusal.
          */}
          {lifecycle.recovery.actionable ? (
            <button
              ref={recoveryRef}
              type="button"
              data-testid="gm-lifecycle-recovery"
              data-recovery-code={lifecycle.recovery.code}
              onClick={onClearLifecycleRefusal}
              className="mt-2 rounded-lg border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30"
            >
              {lifecycle.recovery.label}
            </button>
          ) : (
            <p
              data-testid="gm-lifecycle-recovery-wait"
              data-recovery-code={lifecycle.recovery.code}
              className="mt-2 text-sm font-medium text-slate-200"
            >
              {lifecycle.recovery.label}
            </p>
          )}
        </div>
      )}

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
          {/* The gate is decided PER PROPOSAL, not per surface: the
              refusal covers progression only, so it is asked against
              this proposal's intent rather than blanket-disabling the
              queue. */}
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
                  disabled={decisionRefused(entry, 'approve', lifecycle)}
                  // The reason rides the control, so a disabled button is
                  // not a mystery the host has to correlate with a banner
                  // somewhere else on the screen. `aria-describedby` is
                  // the half that reaches a screen reader; the `data-`
                  // attribute below is only a locator and would announce
                  // nothing on its own.
                  aria-describedby={
                    decisionRefused(entry, 'approve', lifecycle)
                      ? GM_BLOCKED_REASON_ID
                      : undefined
                  }
                  data-lifecycle-blocked={
                    decisionRefused(entry, 'approve', lifecycle)
                      ? 'true'
                      : undefined
                  }
                  // Remembering which approve control holds focus is what
                  // lets a refusal rescue it instead of stranding it.
                  onFocus={() => {
                    focusedApproveRef.current = entry.proposal.proposalId;
                  }}
                  onClick={() => decide(entry, 'approve')}
                  className={
                    decisionRefused(entry, 'approve', lifecycle)
                      ? 'cursor-not-allowed rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-500'
                      : 'rounded-lg border border-emerald-500/50 bg-emerald-600/20 px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-600/30'
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  data-testid={`veto-${entry.proposal.proposalId}`}
                  // Any other control taking focus clears the rescue
                  // target: the host is no longer standing on the button a
                  // refusal would disable.
                  onFocus={() => {
                    focusedApproveRef.current = null;
                  }}
                  // Destructive and irreversible from the guest's side, so
                  // it opens a question instead of deciding.
                  onClick={() => setVetoTarget(entry)}
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

      {vetoTarget && (
        <VetoConfirmationDialog
          effectSummary={vetoTarget.effectSummary}
          fallbackFocusRef={surfaceRef}
          onCancel={() => setVetoTarget(null)}
          onConfirm={() => {
            decide(vetoTarget, 'veto');
            setVetoTarget(null);
          }}
        />
      )}
    </section>
  );
}

export default HostGmReviewSurface;
