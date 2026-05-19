/**
 * Co-op Campaign Play — co-op-play and GM-authority types (CO2).
 *
 * `add-shared-campaign-state` (CO1) shipped the campaign-sync transport:
 * the `ICampaignEvent` log, the `CampaignMatchHost` validate-commit-
 * broadcast loop, and a read-only guest mirror. CO1 deliberately stopped
 * at the transport.
 *
 * CO2 builds the *game* on top of that transport:
 *   - co-op mission launch (both players' forces in one encounter),
 *   - the host-as-Game-Master authority model — a guest campaign action
 *     is a `IGuestProposal` the GM arbitrates to a `GmDecision`.
 *
 * This module defines the four additive type contracts from design D9:
 *   - `CoopParticipationChoice` — per-mission `deploy` vs `command-hq`.
 *   - `GmArbitrationMode` — `auto-approve` vs `host-review`.
 *   - `IGuestProposal` — a guest campaign action awaiting GM arbitration,
 *     wrapping a CO1 `ICampaignIntent`.
 *   - `GmDecision` — the GM's `approve` / `veto` resolution.
 *
 * Plus the typed `veto` rejection (`PROPOSAL_VETOED`) — distinct from
 * CO1's mechanical `INVALID_CAMPAIGN_INTENT` so the guest UI can tell
 * "the GM chose no" apart from "this was impossible" (design D6).
 *
 * Every shape is JSON-safe so a proposal / decision survives the
 * WebSocket transport and the persisted log round-trip.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D2, D4, D5, D6, D9)
 */

import type { ICampaignIntent } from './CampaignSync';

// =============================================================================
// Per-mission participation choice
// =============================================================================

/**
 * A per-mission, per-player participation choice (design D2).
 *
 *   - `deploy`     — the player's force enters the encounter and the
 *     player commands it on the tactical map through `ServerMatchHost`.
 *   - `command-hq` — the player does not take the map. Their force sits
 *     the mission out (or is fielded per the configured default) and the
 *     player retains access to the campaign-management surfaces while
 *     the battle runs.
 *
 * At least one player MUST choose `deploy` — a launch with both players
 * in HQ has no one to fight it and is blocked at launch (design D2).
 */
export type CoopParticipationChoice = 'deploy' | 'command-hq';

/** True iff `value` is one of the two `CoopParticipationChoice` strings. */
export function isCoopParticipationChoice(
  value: unknown,
): value is CoopParticipationChoice {
  return value === 'deploy' || value === 'command-hq';
}

// =============================================================================
// GM arbitration mode
// =============================================================================

/**
 * How the GM arbitrates guest proposals for this campaign (design D5).
 *
 *   - `auto-approve` — a guest proposal that passes CO1's mechanical
 *     validation is committed immediately, with no host interaction. The
 *     low-friction default for trusting co-op partners.
 *   - `host-review` — every guest proposal that passes CO1's mechanical
 *     validation is surfaced to the host, who explicitly issues
 *     `approve` or `veto`.
 *
 * In both modes CO1's mechanical validation is the floor — the GM can
 * never approve a proposal that violates the ledger invariant.
 */
export type GmArbitrationMode = 'auto-approve' | 'host-review';

/** True iff `value` is one of the two `GmArbitrationMode` strings. */
export function isGmArbitrationMode(
  value: unknown,
): value is GmArbitrationMode {
  return value === 'auto-approve' || value === 'host-review';
}

// =============================================================================
// Guest proposal
// =============================================================================

/**
 * A guest campaign action awaiting GM arbitration (design D4).
 *
 * Under CO1 a guest campaign action is an `ICampaignIntent` the host
 * validates. CO2 refines that at the gameplay layer: a guest action is a
 * *proposal* — a request the GM arbitrates. The proposal carries the
 * underlying CO1 `intent` plus proposal metadata so the host's review
 * surface and the guest's pending indicator can correlate it.
 *
 * Only an `approve` `GmDecision` proceeds to CO1's commit-and-broadcast.
 */
export interface IGuestProposal {
  /** Client-generated id, for correlation across proposal/decision. */
  readonly proposalId: string;
  /** Campaign id this proposal targets. */
  readonly campaignId: string;
  /** The guest player id that raised the proposal. */
  readonly proposingPlayerId: string;
  /** Guest wall-clock ISO 8601 timestamp the proposal was raised. */
  readonly ts: string;
  /** The CO1 campaign intent the GM arbitrates. */
  readonly intent: ICampaignIntent;
}

// =============================================================================
// GM decision
// =============================================================================

/**
 * The GM's resolution of a guest proposal (design D4):
 *
 *   - `approve` — the proposal's CO1 intent proceeds to commit-and-
 *     broadcast through the `CampaignMatchHost`.
 *   - `veto`    — the proposal is resolved without committing anything;
 *     the guest receives a typed `PROPOSAL_VETOED` rejection.
 */
export type GmDecision = 'approve' | 'veto';

/** True iff `value` is one of the two `GmDecision` strings. */
export function isGmDecision(value: unknown): value is GmDecision {
  return value === 'approve' || value === 'veto';
}

// =============================================================================
// Veto rejection
// =============================================================================

/**
 * The error code returned when the GM resolves a guest proposal with a
 * `veto` (design D6). It is deliberately DISTINCT from CO1's mechanical
 * `INVALID_CAMPAIGN_INTENT` so the guest UI can present "the GM chose
 * no" differently from "this action was impossible".
 */
export const PROPOSAL_VETOED = 'PROPOSAL_VETOED' as const;

/**
 * A typed rejection envelope for a vetoed guest proposal — the co-op
 * analogue of CO1's `ICampaignIntentError`. Carries the originating
 * `proposalId` so the guest UI can clear the right pending indicator.
 *
 * A veto commits no campaign event and leaves the connection open — the
 * guest may submit a different proposal (design D6).
 */
export interface IProposalVetoError {
  readonly ok: false;
  readonly code: typeof PROPOSAL_VETOED;
  /** The proposal the GM vetoed. */
  readonly proposalId: string;
}

// =============================================================================
// Proposal resolution
// =============================================================================

/**
 * The four ways a guest proposal resolves, surfaced back to the guest so
 * its pending indicator clears with the right outcome (spec
 * "Guest Proposal Feedback Surface"):
 *
 *   - `committed`            — the GM approved; the CO1 intent committed.
 *   - `vetoed`               — the GM vetoed; nothing committed.
 *   - `mechanically-rejected`— CO1 validation failed before any review;
 *     nothing committed.
 *   - `pending`              — `host-review` mode, awaiting the host.
 */
export type ProposalResolutionStatus =
  | 'committed'
  | 'vetoed'
  | 'mechanically-rejected'
  | 'pending';

/**
 * The result of submitting a guest proposal to the `CampaignMatchHost`.
 * A discriminated union over `status`.
 *
 *   - `committed` carries the broadcast CO1 events.
 *   - `vetoed` carries the typed `PROPOSAL_VETOED` error.
 *   - `mechanically-rejected` carries the CO1 `INVALID_CAMPAIGN_INTENT`
 *     reason.
 *   - `pending` carries nothing — the host has yet to decide.
 */
export type GuestProposalResult =
  | {
      readonly status: 'committed';
      readonly proposalId: string;
      readonly events: readonly import('./CampaignSync').ICampaignEvent[];
    }
  | {
      readonly status: 'vetoed';
      readonly proposalId: string;
      readonly error: IProposalVetoError;
    }
  | {
      readonly status: 'mechanically-rejected';
      readonly proposalId: string;
      readonly code: typeof import('./CampaignSync').INVALID_CAMPAIGN_INTENT;
      readonly reason: import('./CampaignSync').CampaignIntentRejectionReason;
    }
  | {
      readonly status: 'pending';
      readonly proposalId: string;
    };

/**
 * Build the typed veto error for a vetoed proposal.
 */
export function toProposalVetoError(proposalId: string): IProposalVetoError {
  return { ok: false, code: PROPOSAL_VETOED, proposalId };
}
