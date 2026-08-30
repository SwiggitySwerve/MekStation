/**
 * Shared Campaign State — runtime intent validation (CO1).
 *
 * Zod schemas that reject a malformed `ICampaignIntent` at the
 * server boundary BEFORE it reaches the `CampaignMatchHost` validation
 * step. This is the campaign-tier analogue of the combat
 * `IntentSchema` in `src/types/multiplayer/Protocol.ts` — the host
 * trusts a parsed intent's shape and only re-checks it against
 * authoritative state (balance, standing, salvage pool).
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/tasks.md (task 1.3)
 */

import { z } from 'zod';

import type { ICampaignIntent } from './CampaignSync';

import {
  isCampaignEventScope,
  isCampaignEventType,
  type CampaignEventScope,
  type CampaignEventType,
} from './CampaignSync';

// =============================================================================
// Leaf schemas
// =============================================================================

const cbillSchema = z.number().finite();
const nonNegativeCbillSchema = z.number().finite().nonnegative();

export const rosterUnitSchema = z.object({
  unitId: z.string().min(1),
  designation: z.string().min(1),
  status: z.enum(['operational', 'damaged', 'destroyed']),
});

const rosterPilotSchema = z.object({
  pilotId: z.string().min(1),
  name: z.string().min(1),
});

const acceptedContractSchema = z.object({
  contractId: z.string().min(1),
  name: z.string().min(1),
  employerFactionId: z.string().min(1),
});

// =============================================================================
// Per-kind intent schemas
// =============================================================================

const hirePilotIntentSchema = z.object({
  kind: z.literal('HirePilot'),
  campaignId: z.string().min(1),
  intentId: z.string().min(1),
  payload: z.object({
    pilot: rosterPilotSchema,
    cost: nonNegativeCbillSchema,
  }),
});

const acceptContractIntentSchema = z.object({
  kind: z.literal('AcceptContract'),
  campaignId: z.string().min(1),
  intentId: z.string().min(1),
  payload: z.object({
    contract: acceptedContractSchema,
  }),
});

const spendFundsIntentSchema = z.object({
  kind: z.literal('SpendFunds'),
  campaignId: z.string().min(1),
  intentId: z.string().min(1),
  payload: z.object({
    amount: z.number().finite().positive(),
    reason: z.string().min(1),
  }),
});

const allocateSalvageIntentSchema = z.object({
  kind: z.literal('AllocateSalvage'),
  campaignId: z.string().min(1),
  intentId: z.string().min(1),
  payload: z.object({
    value: nonNegativeCbillSchema,
    recoveredUnit: rosterUnitSchema.optional(),
  }),
});

const advanceDayIntentSchema = z.object({
  kind: z.literal('AdvanceDay'),
  campaignId: z.string().min(1),
  intentId: z.string().min(1),
  payload: z.object({
    days: z.number().int().positive().optional(),
  }),
});

const removeParticipantIntentSchema = z.object({
  kind: z.literal('RemoveParticipant'),
  campaignId: z.string().min(1),
  intentId: z.string().min(1),
  payload: z.object({
    participantId: z.string().min(1),
    reason: z.string().min(1).optional(),
  }),
});

/**
 * The discriminated-union schema for any `ICampaignIntent`. A
 * `parse` failure means the intent is structurally malformed and the
 * host rejects it with `reason: 'malformed-intent'` without ever
 * touching authoritative state.
 */
export const CampaignIntentSchema = z.discriminatedUnion('kind', [
  hirePilotIntentSchema,
  acceptContractIntentSchema,
  spendFundsIntentSchema,
  allocateSalvageIntentSchema,
  removeParticipantIntentSchema,
  advanceDayIntentSchema,
]);

// =============================================================================
// Boundary helper
// =============================================================================

/**
 * Parse an untrusted candidate into a typed `ICampaignIntent`, or
 * `null` when it is malformed. The `CampaignMatchHost` calls this as
 * its malformed-check step (design D4 step 2) — a `null` result is a
 * `reason: 'malformed-intent'` rejection; a non-null result is a
 * structurally valid intent the host then validates against state.
 *
 * The `cbillSchema` export is unused outside this module but kept so a
 * future event-payload validator can share the same C-bill leaf.
 */
export function parseCampaignIntent(
  candidate: unknown,
): ICampaignIntent | null {
  const result = CampaignIntentSchema.safeParse(candidate);
  return result.success ? (result.data as ICampaignIntent) : null;
}

/**
 * Runtime schema for the closed scope vocabulary. Uses the type guard
 * so empty `team:` / `player:` ids and unknown prefixes fail here too.
 */
export const CampaignEventScopeSchema = z.custom<CampaignEventScope>(
  (value): value is CampaignEventScope => isCampaignEventScope(value),
  { message: 'invalid campaign event scope' },
);

/**
 * Runtime schema for the eight campaign event type discriminants.
 */
export const CampaignEventTypeSchema = z.custom<CampaignEventType>(
  (value): value is CampaignEventType =>
    typeof value === 'string' && isCampaignEventType(value),
  { message: 'invalid campaign event type' },
);

/**
 * Envelope schema for a campaign event on the wire. Validates the
 * digest-protected fields including required `scope`; payload shape is
 * left to the per-type baseline pack because this schema is the
 * transport envelope, not the replay payload pack.
 *
 * Sequence may be -1: that is the non-journal snapshot baseline frame.
 */
export const CampaignEventEnvelopeSchema = z.object({
  type: CampaignEventTypeSchema,
  sequence: z.number().int().gte(-1),
  campaignId: z.string().min(1),
  ts: z.string().min(1),
  authorPlayerId: z.string().min(1),
  scope: CampaignEventScopeSchema,
  payload: z
    .unknown()
    .refine(
      (value) =>
        typeof value === 'object' && value !== null && !Array.isArray(value),
      { message: 'campaign event payload must be an object' },
    ),
});

// Re-exported so a future campaign-event validator can reuse the leaf.
export { cbillSchema };
