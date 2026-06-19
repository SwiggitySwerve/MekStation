/**
 * CampaignGmArbiter — the host-as-GM arbitration layer (CO2).
 *
 * `CampaignMatchHost` (CO1) runs the campaign-tier
 * `intent → validate → commit → broadcast` loop. CO2 builds the
 * gameplay *authority model* on top of it: the host is the campaign
 * Game Master, and a guest campaign action is an `IGuestProposal` the
 * GM arbitrates — it does NOT commit until the GM resolves it with an
 * `approve` `GmDecision` (design D3, D4).
 *
 * This arbiter wraps a `CampaignMatchHost` and provides:
 *
 *   - `submitProposal(rawProposal)` — the GUEST-facing path. The arbiter
 *     parses the proposal, runs CO1's mechanical validation FIRST
 *     (design D5 — the floor in both modes), then:
 *       - `auto-approve` mode: commits immediately via the host;
 *       - `host-review` mode: queues the proposal as `pending` and
 *         returns without committing.
 *     A proposal that fails CO1 validation is `mechanically-rejected`
 *     before it ever reaches the host's review queue.
 *
 *   - `decide(proposalId, decision)` — the HOST-facing path for
 *     `host-review` mode. An `approve` commits the queued proposal's
 *     CO1 intent; a `veto` resolves it with a typed `PROPOSAL_VETOED`
 *     and commits nothing (design D6).
 *
 *   - `getPendingProposals()` — the host GM review surface's data
 *     source: the queue of proposals awaiting a decision.
 *
 * The arbiter introduces NO new transport — proposals and decisions ride
 * the CO1 campaign event-broadcast channel; an approved proposal's
 * commit goes through the host's single `applyHostIntent` path so the
 * campaign event log stays totally ordered (design D7, D8).
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D3, D4, D5, D6, D7)
 */

import type {
  CampaignIntentResult,
  ICampaignAuthoritativeState,
} from '@/types/campaign/CampaignSync';
import type {
  GmArbitrationMode,
  GmDecision,
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';

import { INVALID_CAMPAIGN_INTENT } from '@/types/campaign/CampaignSync';
import { toProposalVetoError } from '@/types/campaign/CoopCampaign';
import { parseGuestProposal } from '@/types/campaign/coopCampaignSchemas';

import type { CampaignMatchHost } from './CampaignMatchHost';

import { validateCampaignIntent } from './CampaignMatchHostIntent';

// =============================================================================
// Pending proposal — the host review queue entry
// =============================================================================

/**
 * A guest proposal that passed CO1 mechanical validation in
 * `host-review` mode and is waiting for the host's `approve` / `veto`.
 *
 * It carries the campaign context the host GM review surface needs to
 * decide — current balance, the relevant faction standing, and a
 * human-readable roster effect (spec "Host GM Review Surface").
 */
export interface IPendingProposal {
  /** The guest proposal awaiting a decision. */
  readonly proposal: IGuestProposal;
  /** The C-bill balance at the time the proposal entered the queue. */
  readonly balanceAtSubmit: number;
  /**
   * The relevant faction standing for the proposal, when the proposal's
   * intent targets a faction (an `AcceptContract`); `null` otherwise.
   */
  readonly relevantStanding: number | null;
  /** A human-readable summary of the proposal's roster/ledger effect. */
  readonly effectSummary: string;
}

// =============================================================================
// Arbiter notification
// =============================================================================

/**
 * A listener notified when the pending-proposal queue changes — added,
 * removed (approved / vetoed). The host GM review surface subscribes to
 * re-render its list. The arbiter introduces no transport; this is a
 * local in-process observer, the analogue of `CampaignMatchHost`'s
 * subscriber set.
 */
export type PendingProposalListener = (
  pending: readonly IPendingProposal[],
) => void;

// =============================================================================
// Arbiter
// =============================================================================

/**
 * Per `polish-wave-6.2-gaps` (gap #3): the default host-review timeout. A
 * proposal that sits in `pending` longer than this without a host
 * decision auto-resolves as `vetoed` with `reason: 'host-review-timeout'`
 * so the guest's `<GuestProposalSurface>` pending overlay clears.
 *
 * Five minutes is long enough for a host to read the proposal and decide,
 * short enough that a guest doesn't sit blocked indefinitely if the host
 * went AFK / disconnected.
 */
export const DEFAULT_PROPOSAL_TIMEOUT_MS = 5 * 60_000;

/**
 * Options for `CampaignGmArbiter`. Per `polish-wave-6.2-gaps` (gap #3),
 * `proposalTimeoutMs` configures how long a `host-review` proposal may
 * sit `pending` before the arbiter auto-vetoes it. Pass `0` to disable
 * the timeout (legacy behavior).
 */
export interface ICampaignGmArbiterOptions {
  readonly proposalTimeoutMs?: number;
}

export class CampaignGmArbiter {
  private readonly host: CampaignMatchHost;
  /** The GM arbitration mode for this campaign (design D5). */
  private mode: GmArbitrationMode;
  /** Proposals awaiting a host decision (`host-review` mode only). */
  private readonly pending = new Map<string, IPendingProposal>();
  private readonly listeners = new Set<PendingProposalListener>();
  /**
   * Per polish-wave-6.2-gaps (gap #3): the maximum time a proposal may
   * sit in `pending` before the arbiter auto-vetoes it. 0 disables.
   */
  private readonly proposalTimeoutMs: number;
  /**
   * Per polish-wave-6.2-gaps (gap #3): active auto-veto timers keyed by
   * proposalId, so `decide()` can cancel the timer when the host resolves
   * the proposal before timeout fires.
   */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    host: CampaignMatchHost,
    mode: GmArbitrationMode,
    options: ICampaignGmArbiterOptions = {},
  ) {
    this.host = host;
    this.mode = mode;
    this.proposalTimeoutMs =
      options.proposalTimeoutMs ?? DEFAULT_PROPOSAL_TIMEOUT_MS;
  }

  // ---------------------------------------------------------------------------
  // Mode
  // ---------------------------------------------------------------------------

  /** The campaign's current GM arbitration mode. */
  getMode = (): GmArbitrationMode => {
    return this.mode;
  };

  /**
   * Change the GM arbitration mode. Switching to `auto-approve` does NOT
   * retroactively commit already-queued `host-review` proposals — they
   * stay pending until the host decides, so a mode flip never bypasses a
   * decision the host was about to make.
   */
  setMode = (mode: GmArbitrationMode): void => {
    this.mode = mode;
  };

  // ---------------------------------------------------------------------------
  // Pending-proposal queue (host GM review surface data source)
  // ---------------------------------------------------------------------------

  /**
   * The proposals awaiting a host decision, in submission order. Empty
   * in `auto-approve` mode (a passing proposal commits immediately and
   * never queues). This is the host GM review surface's data source.
   */
  getPendingProposals = (): readonly IPendingProposal[] => {
    return Array.from(this.pending.values());
  };

  /**
   * Register a listener for pending-queue changes. Returns an
   * unsubscribe function. The host GM review surface wires one.
   */
  subscribePending = (listener: PendingProposalListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // ---------------------------------------------------------------------------
  // Guest-facing path — submit a proposal
  // ---------------------------------------------------------------------------

  /**
   * Submit a guest proposal for GM arbitration — the guest-facing path.
   *
   * `rawProposal` is typed `unknown` because it arrives off the wire: the
   * malformed-check is a real zod parse. The sequence (design D5):
   *
   *   1. parse — a malformed proposal is `mechanically-rejected` with
   *      `reason: 'malformed-intent'`;
   *   2. CO1 mechanical validation runs FIRST against the host's CURRENT
   *      authoritative state — a failing proposal is
   *      `mechanically-rejected` before any host review;
   *   3. mode branch:
   *        - `auto-approve` — commit immediately through the host, return
   *          `committed`;
   *        - `host-review` — queue as `pending`, return `pending`.
   *
   * A vetoed / pending proposal commits nothing. Only an approved
   * proposal proceeds to CO1's commit-and-broadcast.
   */
  submitProposal = async (
    rawProposal: unknown,
  ): Promise<GuestProposalResult> => {
    // Step 1 — parse the proposal envelope (and its wrapped intent).
    const proposal = parseGuestProposal(rawProposal);
    if (proposal === null) {
      // A malformed proposal carries no proposalId to correlate; use the
      // wire candidate's id when present so the guest UI can still clear
      // the right pending indicator.
      const proposalId = readProposalId(rawProposal);
      return {
        status: 'mechanically-rejected',
        proposalId,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'malformed-intent',
      };
    }

    // Step 2 — CO1 mechanical validation FIRST (design D5 — the floor in
    // BOTH modes). The check runs against the host's CURRENT
    // authoritative state, never any figure the guest included.
    const state = this.host.getState();
    const mechanical = this.runMechanicalCheck(proposal, state);
    if (!mechanical.ok) {
      return {
        status: 'mechanically-rejected',
        proposalId: proposal.proposalId,
        code: mechanical.code,
        reason: mechanical.reason,
      };
    }

    // Step 3 — mode branch.
    if (this.mode === 'auto-approve') {
      return this.commitProposal(proposal);
    }

    // `host-review` — queue the proposal with the campaign context the
    // host needs to decide; do NOT commit.
    this.enqueue(proposal, state);
    return { status: 'pending', proposalId: proposal.proposalId };
  };

  // ---------------------------------------------------------------------------
  // Host-facing path — decide a queued proposal
  // ---------------------------------------------------------------------------

  /**
   * Resolve a queued `host-review` proposal — the host-facing path.
   *
   *   - `approve` — re-validates the proposal against the host's CURRENT
   *     state (it may have drifted since the proposal queued — another
   *     spend may have landed) and commits the CO1 intent. A proposal
   *     that no longer passes validation resolves `mechanically-rejected`
   *     rather than committing a ledger-breaking event.
   *   - `veto` — resolves the proposal with a typed `PROPOSAL_VETOED`
   *     and commits nothing (design D6).
   *
   * Returns `null` when no proposal with that id is queued (a stale or
   * duplicate decision).
   */
  decide = async (
    proposalId: string,
    decision: GmDecision,
  ): Promise<GuestProposalResult | null> => {
    const entry = this.pending.get(proposalId);
    if (entry === undefined) {
      return null;
    }
    // The proposal leaves the queue regardless of the decision.
    this.pending.delete(proposalId);
    // Per polish-wave-6.2-gaps (gap #3): cancel the auto-veto timer so a
    // resolved proposal never receives a stale timeout-veto.
    this.cancelTimeoutFor(proposalId);
    this.notifyPending();

    if (decision === 'veto') {
      return {
        status: 'vetoed',
        proposalId,
        error: toProposalVetoError(proposalId),
      };
    }

    // `approve` — commit through the host. The host re-runs CO1
    // validation against its CURRENT state, so an approval that would
    // break the ledger invariant (the balance moved while the proposal
    // sat in the queue) still resolves as a mechanical rejection.
    return this.commitProposal(entry.proposal);
  };

  /**
   * Per `polish-wave-6.2-gaps` (gap #3): auto-veto a proposal that has
   * sat in `pending` longer than `proposalTimeoutMs`. Unlike `decide()`,
   * the rejection envelope carries `reason: 'host-review-timeout'` so the
   * guest UI can label the badge "host didn't respond" rather than
   * "host said no". The proposal is removed from the queue, timer cleared,
   * and listeners notified.
   *
   * Returns `null` when no proposal with that id is queued (already
   * resolved by the host, mode flipped, or the timer fired twice).
   */
  autoVetoForTimeout = (proposalId: string): GuestProposalResult | null => {
    const entry = this.pending.get(proposalId);
    if (entry === undefined) {
      return null;
    }
    this.pending.delete(proposalId);
    this.cancelTimeoutFor(proposalId);
    this.notifyPending();
    return {
      status: 'vetoed',
      proposalId,
      error: {
        ok: false,
        code: toProposalVetoError(proposalId).code,
        proposalId,
        reason: 'host-review-timeout',
      },
    };
  };

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Run CO1's mechanical validation for a proposal's wrapped intent
   * without committing anything. Pure — it reuses the same
   * `validateCampaignIntent` function the host commit path uses, so the
   * `host-review` pre-check and the eventual commit can never disagree
   * on what "mechanically valid" means.
   */
  private runMechanicalCheck(
    proposal: IGuestProposal,
    state: ICampaignAuthoritativeState,
  ): Extract<CampaignIntentResult, { ok: false }> | { ok: true } {
    const validation = validateCampaignIntent(
      proposal.intent,
      state,
      proposal.proposingPlayerId,
      proposal.ts,
    );
    return validation.ok ? { ok: true } : validation;
  }

  /**
   * Commit an approved proposal's CO1 intent through the host. The host
   * re-runs CO1 validation against its CURRENT state, so a stale
   * approval resolves as `mechanically-rejected` rather than committing
   * a ledger-breaking event.
   *
   * The commit goes through `applyHostIntent` — the GM is the single
   * campaign-write authority (design D3), so an approved guest intent is
   * committed under the host's authority.
   */
  private async commitProposal(
    proposal: IGuestProposal,
  ): Promise<GuestProposalResult> {
    const result = await this.host.applyHostIntent(proposal.intent);
    if (result.ok) {
      return {
        status: 'committed',
        proposalId: proposal.proposalId,
        events: result.events,
      };
    }
    return {
      status: 'mechanically-rejected',
      proposalId: proposal.proposalId,
      code: result.code,
      reason: result.reason,
    };
  }

  /**
   * Cancel an outstanding auto-veto timer for `proposalId` if one was
   * armed at `enqueue` time. No-op if no timer is registered. Called by
   * both `decide()` and `autoVetoForTimeout()` so a proposal can be
   * resolved cleanly regardless of which path wins the race.
   */
  private cancelTimeoutFor(proposalId: string): void {
    const timer = this.timers.get(proposalId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(proposalId);
    }
  }

  /**
   * Add a proposal to the host review queue with the campaign context
   * the host needs to decide (spec "Host GM Review Surface").
   */
  private enqueue(
    proposal: IGuestProposal,
    state: ICampaignAuthoritativeState,
  ): void {
    this.pending.set(proposal.proposalId, {
      proposal,
      balanceAtSubmit: state.balance,
      relevantStanding: relevantStandingFor(proposal, state),
      effectSummary: describeProposalEffect(proposal),
    });

    // Per polish-wave-6.2-gaps (gap #3): arm the auto-veto timer. The
    // arbiter fires its own callback rather than going through `decide()`
    // so the resulting rejection carries `reason: 'host-review-timeout'`
    // (distinguishable in the guest UI). 0 means "no timeout" — preserves
    // legacy behavior for callers that opt out.
    if (this.proposalTimeoutMs > 0) {
      const timer = setTimeout(() => {
        this.autoVetoForTimeout(proposal.proposalId);
      }, this.proposalTimeoutMs);
      // Node-only: don't keep the event loop alive for an idle timer.
      // (Browser builds get a no-op; jsdom respects setTimeout's return.)
      if (typeof (timer as { unref?: () => void }).unref === 'function') {
        (timer as { unref: () => void }).unref();
      }
      this.timers.set(proposal.proposalId, timer);
    }

    this.notifyPending();
  }

  /** Notify every pending-queue listener with the current snapshot. */
  private notifyPending(): void {
    const snapshot = this.getPendingProposals();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }
}

// =============================================================================
// Context derivation — campaign context for the host review surface
// =============================================================================

/**
 * The faction standing relevant to a proposal — the employer faction's
 * standing for an `AcceptContract`, `null` for every other intent kind
 * (no faction is involved).
 */
function relevantStandingFor(
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

/**
 * Best-effort read of a `proposalId` off a malformed wire candidate, so a
 * `mechanically-rejected` result for an unparseable proposal can still
 * carry a correlation id for the guest's pending indicator.
 */
function readProposalId(candidate: unknown): string {
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'proposalId' in candidate &&
    typeof (candidate as { proposalId: unknown }).proposalId === 'string'
  ) {
    return (candidate as { proposalId: string }).proposalId;
  }
  return 'malformed-proposal';
}
