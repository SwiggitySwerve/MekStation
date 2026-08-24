/**
 * Grant-authenticated campaign sync frames (design D5, task 3.3).
 *
 * These sit beside the room-code CampaignJoin frames. The replica
 * presents a grant token and a delivery cursor; the source streams
 * per-grant items and never puts journal positions on the wire.
 *
 * Wire law: delivery frames carry deliverySequence plus the projected
 * event (no source sequence) and the epoch baseline. They MUST NOT
 * carry journal position, revision, commitPosition, or eventDigest.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5)
 */

import { z } from 'zod';

import {
  CampaignEventScopeSchema,
  CampaignEventTypeSchema,
} from '@/types/campaign/campaignSyncSchemas';

const matchIdSchema = z.string().min(1);
const tsSchema = z.string().min(1);

/**
 * Replica resume cursor. afterSequence is exclusive: the source
 * delivers items with deliverySequence greater than this value.
 */
export const CampaignGrantDeliveryCursorSchema = z
  .object({
    deliveryEpochId: z.string().min(1),
    afterSequence: z.number().int().nonnegative(),
  })
  .strict();
export type ICampaignGrantDeliveryCursor = z.infer<
  typeof CampaignGrantDeliveryCursorSchema
>;

/**
 * Epoch baseline returned on a successful page or a stale-epoch
 * rebaseline. effectiveGeneration is the privacy-owned generation
 * already stored with the epoch; it is not a journal revision.
 */
export const CampaignGrantEpochBaselineSchema = z
  .object({
    deliveryEpochId: z.string().min(1),
    effectiveGeneration: z.number().int(),
  })
  .strict();
export type ICampaignGrantEpochBaseline = z.infer<
  typeof CampaignGrantEpochBaselineSchema
>;

/**
 * Campaign event as delivered to one grant. Source stream sequence is
 * omitted so a consumer cannot count withheld global positions.
 * `.strict()` rejects journal fields smuggled onto the event.
 */
export const CampaignGrantProjectedEventSchema = z
  .object({
    type: CampaignEventTypeSchema,
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
  })
  .strict();
export type ICampaignGrantProjectedEventWire = z.infer<
  typeof CampaignGrantProjectedEventSchema
>;

/**
 * One delivered row. Ordering authority is deliverySequence inside
 * the grant's epoch, never a journal field.
 */
export const CampaignGrantDeliveryItemSchema = z
  .object({
    deliverySequence: z.number().int().positive(),
    event: CampaignGrantProjectedEventSchema,
  })
  .strict();
export type ICampaignGrantDeliveryItemWire = z.infer<
  typeof CampaignGrantDeliveryItemSchema
>;

/**
 * Replica join on the existing campaign WebSocket path. `token` is
 * unknown at parse time so verifyCampaignGrantToken owns `malformed`
 * rather than the envelope parser collapsing it into BAD_ENVELOPE.
 */
export const CampaignGrantJoinSchema = z.object({
  kind: z.literal('CampaignGrantJoin'),
  matchId: matchIdSchema,
  ts: tsSchema,
  playerId: z.string().min(1),
  campaignId: z.string().min(1),
  grantId: z.string().min(1),
  token: z.unknown(),
  cursor: z.union([CampaignGrantDeliveryCursorSchema, z.null()]),
});
export type ICampaignGrantJoin = z.infer<typeof CampaignGrantJoinSchema>;

/**
 * A participant reporting the highest per-grant delivery sequence it has
 * APPLIED. Sequences only mean anything inside a delivery epoch, so the
 * epoch travels with the number - a bare sequence would be a number from
 * one numbering read against another after any revocation or scope
 * change. Strict: an acknowledgement is the one client frame that moves
 * durable server state, so an unexpected field is a rejected envelope
 * rather than something quietly ignored.
 */
export const CampaignGrantAckSchema = z
  .object({
    kind: z.literal('CampaignGrantAck'),
    matchId: matchIdSchema,
    ts: tsSchema,
    playerId: z.string().min(1),
    campaignId: z.string().min(1),
    grantId: z.string().min(1),
    deliveryEpochId: z.string().min(1),
    ackedSequence: z.number().int().nonnegative(),
  })
  .strict();
export type ICampaignGrantAck = z.infer<typeof CampaignGrantAckSchema>;

/**
 * Backfill or live delivery. items may be empty on the join handshake
 * so the replica learns the current baseline; live out-of-scope wakes
 * MUST NOT use this frame.
 */
export const CampaignGrantDeliverySchema = z
  .object({
    kind: z.literal('CampaignGrantDelivery'),
    matchId: matchIdSchema,
    ts: tsSchema,
    campaignId: z.string().min(1),
    grantId: z.string().min(1),
    deliveryEpochId: z.string().min(1),
    baseline: CampaignGrantEpochBaselineSchema,
    items: z.array(CampaignGrantDeliveryItemSchema),
  })
  .strict();
export type ICampaignGrantDelivery = z.infer<
  typeof CampaignGrantDeliverySchema
>;

/**
 * Stale or foreign cursor. Carries a fresh baseline and no events so
 * the replica can re-request without inferring withheld activity.
 */
export const CampaignGrantRebaselineSchema = z
  .object({
    kind: z.literal('CampaignGrantRebaseline'),
    matchId: matchIdSchema,
    ts: tsSchema,
    campaignId: z.string().min(1),
    grantId: z.string().min(1),
    baseline: CampaignGrantEpochBaselineSchema,
  })
  .strict();
export type ICampaignGrantRebaseline = z.infer<
  typeof CampaignGrantRebaselineSchema
>;

/**
 * Late-join scoped snapshot. asOfDeliverySequence is the per-grant
 * high water the state encodes; the replica resumes the tail at the
 * next contiguous deliverySequence. The nested event is a projected
 * CampaignSnapshotPublished (no source sequence, no revision).
 */
export const CampaignGrantSnapshotSchema = z
  .object({
    kind: z.literal('CampaignGrantSnapshot'),
    matchId: matchIdSchema,
    ts: tsSchema,
    campaignId: z.string().min(1),
    grantId: z.string().min(1),
    deliveryEpochId: z.string().min(1),
    baseline: CampaignGrantEpochBaselineSchema,
    asOfDeliverySequence: z.number().int().nonnegative(),
    event: CampaignGrantProjectedEventSchema,
  })
  .strict();
export type ICampaignGrantSnapshot = z.infer<
  typeof CampaignGrantSnapshotSchema
>;
