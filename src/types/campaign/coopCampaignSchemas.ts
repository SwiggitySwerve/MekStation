/**
 * Co-op Campaign Play — runtime proposal/decision validation (CO2).
 *
 * Zod schemas that reject a malformed `IGuestProposal` or `GmDecision`
 * at the server boundary BEFORE it reaches the `CampaignMatchHost`
 * arbitration step (tasks 1.3). The campaign-tier analogue of CO1's
 * `campaignSyncSchemas.parseCampaignIntent` — the host trusts a parsed
 * proposal's *shape* and only re-checks the wrapped intent against
 * authoritative state.
 *
 * A proposal's wrapped `intent` is validated with CO1's own
 * `CampaignIntentSchema`, so a structurally-invalid intent fails the
 * proposal parse — there is one boundary, not two.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/tasks.md (task 1.3)
 */

import { z } from 'zod';

import type { GmDecision, IGuestProposal } from './CoopCampaign';

import { CampaignIntentSchema } from './campaignSyncSchemas';

// =============================================================================
// Guest proposal schema
// =============================================================================

/**
 * The schema for an `IGuestProposal`. The wrapped `intent` reuses CO1's
 * `CampaignIntentSchema` discriminated union, so a malformed intent
 * fails the whole proposal parse — the proposal boundary is the single
 * boundary for both shapes.
 */
export const GuestProposalSchema = z.object({
  proposalId: z.string().min(1),
  campaignId: z.string().min(1),
  proposingPlayerId: z.string().min(1),
  ts: z.string().min(1),
  intent: CampaignIntentSchema,
});

/**
 * The schema for a `GmDecision`. A decision is just one of two literal
 * strings; the schema keeps the boundary check uniform with the
 * proposal parse.
 */
export const GmDecisionSchema = z.union([
  z.literal('approve'),
  z.literal('veto'),
]);

// =============================================================================
// Boundary helpers
// =============================================================================

/**
 * Parse an untrusted candidate into a typed `IGuestProposal`, or `null`
 * when it is malformed. The `CampaignMatchHost` GM surface calls this as
 * its malformed-check step — a `null` result is a malformed proposal the
 * host rejects without touching authoritative state.
 */
export function parseGuestProposal(candidate: unknown): IGuestProposal | null {
  const result = GuestProposalSchema.safeParse(candidate);
  return result.success ? (result.data as IGuestProposal) : null;
}

/**
 * Parse an untrusted candidate into a typed `GmDecision`, or `null` when
 * it is malformed. The host calls this when a `host-review` decision
 * arrives off the wire.
 */
export function parseGmDecision(candidate: unknown): GmDecision | null {
  const result = GmDecisionSchema.safeParse(candidate);
  return result.success ? (result.data as GmDecision) : null;
}
