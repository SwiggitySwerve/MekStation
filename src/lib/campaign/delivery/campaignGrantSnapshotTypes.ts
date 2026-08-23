/**
 * Scoped campaign snapshot types (design D4, task 3.4).
 *
 * A snapshot is a compression of one grant's projected stream. It is
 * keyed by grantId so a page built for grant A cannot be served as
 * grant B's baseline. asOfDeliverySequence is the per-grant cursor the
 * state is current as of; journal positions stay off this record.
 */

import type { IDeliveryEpochBaseline } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type {
  CampaignEventScope,
  ICampaignAuthoritativeState,
} from '@/types/campaign/CampaignSync';

/** Synthetic author on derived snapshot frames; not a journal actor. */
export const CAMPAIGN_GRANT_SNAPSHOT_AUTHOR = 'campaign-grant-snapshot';

export const SNAPSHOT_GRANT_MISMATCH_REASON =
  'snapshot-grant-mismatch' as const;
export const SNAPSHOT_CUT_PAST_HEAD_REASON = 'snapshot-cut-past-head' as const;
export const SNAPSHOT_CUT_INVALID_REASON = 'snapshot-cut-invalid' as const;

/**
 * Grant-keyed scoped snapshot. `state` is the fold of in-scope items
 * with deliverySequence <= asOfDeliverySequence. No journal field
 * belongs here: no sequence, revision, digest, or commit position.
 */
export interface IScopedCampaignSnapshot {
  readonly grantId: string;
  readonly campaignId: string;
  readonly deliveryEpochId: string;
  readonly baseline: IDeliveryEpochBaseline;
  readonly asOfDeliverySequence: number;
  readonly snapshotScope: CampaignEventScope;
  readonly ts: string;
  readonly authorPlayerId: string;
  readonly state: ICampaignAuthoritativeState;
}

export interface ISnapshotCutRejected {
  readonly kind: 'cut-rejected';
  readonly reason:
    | typeof SNAPSHOT_CUT_PAST_HEAD_REASON
    | typeof SNAPSHOT_CUT_INVALID_REASON;
}

export interface ISnapshotGrantMismatch {
  readonly kind: 'refused';
  readonly reason: typeof SNAPSHOT_GRANT_MISMATCH_REASON;
}

export interface IServedScopedCampaignSnapshot {
  readonly kind: 'served';
  readonly snapshot: IScopedCampaignSnapshot;
}
