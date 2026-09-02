/**
 * The branch rule that replaced the journal's root pin (task 16.2).
 *
 * The journal held exactly one branch, pinned in three places: the
 * `EventBranchId` literal type, `z.literal(ROOT_EVENT_BRANCH_ID)` in the
 * append schema, and a storage CHECK on three tables. All three are gone,
 * so the journal will now STORE any non-empty branch id.
 *
 * What refuses an arbitrary one is this rule rather than a wall: a
 * command naming a branch is checked against the stream's CURRENT
 * EFFECTIVE branch and refused typed when they disagree. The only thing
 * that can move which id a stream accepts is therefore an activation
 * through the branches leaf - which is exactly the property the pin used
 * to provide by forbidding everything, and which it could not provide
 * without also forbidding the legitimate path.
 *
 * Extracted from `JournalCampaignEventStore` when that module crossed the
 * per-file line limit; the rule is its own concept and reads better here
 * than as two members of a storage adapter.
 */

import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';

import { readActiveBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';

/** The stream type every campaign journal record carries. */
const CAMPAIGN_STREAM_TYPE = 'campaign';

/**
 * A command named a branch that is not the stream's effective one.
 *
 * Typed rather than a bare Error because the campaign refusal vocabulary
 * already carries `STALE_BRANCH`, and a client handling it should not
 * have to parse a message to know what happened.
 */
export class CampaignStaleBranchError extends Error {
  public readonly name = 'CampaignStaleBranchError';
  public readonly code = 'STALE_BRANCH';
  public constructor(
    public readonly campaignId: string,
    public readonly requestedBranchId: string,
    public readonly effectiveBranchId: string,
  ) {
    super(
      `Campaign ${campaignId} is answering from branch '${effectiveBranchId}', not '${requestedBranchId}'`,
    );
  }
}

/**
 * The branch a campaign's next command lands on.
 *
 * `branches` ABSENT is the production shape today: without a way to read
 * the effective head, the answer is genesis, which is exactly where every
 * campaign wrote before branches existed - so adopting this rule changed
 * nothing observable until someone hands a store in.
 *
 * A caller that NAMES a branch is checked; one that names nothing gets
 * whatever is effective. Naming is how a rewind-aware caller says which
 * history it believes it is writing to, and being refused is how it finds
 * out that belief is stale.
 */
export function resolveCampaignBranchId(
  campaignId: string,
  requested: string | undefined,
  branches: SQLiteEventHistoryBranchStore | undefined,
): string {
  const effective =
    branches === undefined
      ? ROOT_EVENT_BRANCH_ID
      : readActiveBranchHead(
          branches,
          { streamType: CAMPAIGN_STREAM_TYPE, streamId: campaignId },
          0,
        ).branchId;
  if (requested !== undefined && requested !== effective) {
    throw new CampaignStaleBranchError(campaignId, requested, effective);
  }
  return effective;
}
