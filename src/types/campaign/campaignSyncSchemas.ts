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

// Re-exported so a future campaign-event validator can reuse the leaf.
export { cbillSchema };
