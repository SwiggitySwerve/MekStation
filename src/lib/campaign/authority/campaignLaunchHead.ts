/**
 * The head a campaign launch is allowed to name (umbrella task 10.3).
 *
 * `validateExpectedBranchHead` is built around a client that names the
 * branch, revision and generation it believes is current. Nothing told a
 * browser any of those. No client-facing campaign type carries a branch
 * id, and the two revision-shaped numbers a client does hold are both
 * the wrong number:
 *
 * - `SerializedCampaign.version` is the campaigns table's optimistic
 *   concurrency WRITE COUNTER. It moves on every save and has no
 *   relationship to the journal at all.
 * - The co-op snapshot's `revision` is a campaign event SEQUENCE. Per
 *   `JournalCampaignEventStore`, sequence N lives at journal
 *   `streamRevision` N + 1, so it is reliably one too low.
 *
 * This module resolves the real thing server-side. The revision it
 * returns is the JOURNAL revision - the same number
 * `readActiveBranchHead` takes as `currentRevision` and therefore the
 * number `validateExpectedBranchHead` compares against. Returning either
 * of the other two would compile, pass a naive test, and compare two
 * unrelated counters forever.
 *
 * A campaign with no effective branch is NOT an error and NOT a missing
 * campaign. While the cutover flag is off no campaign has a journal
 * stream, so `no-authoritative-stream` is the ordinary answer and the
 * launch acts on it by proceeding ungated - which is exactly today's
 * behaviour, preserved structurally rather than by a flag read.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { IEventHistoryEffectiveHead } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/** The stream a campaign's authoritative history lives on. */
export function campaignStreamRef(campaignId: string): IEventHistoryStreamRef {
  return { streamType: CAMPAIGN_STREAM_TYPE, streamId: campaignId };
}

/**
 * What a launch may name as its expected head.
 *
 * `revision` is the journal `streamRevision`, never a campaign event
 * sequence and never `SerializedCampaign.version`. The field is called
 * `revision` because that is what `IExpectedBranchHead` calls it, and
 * renaming it here would only move the confusion.
 */
export interface ICampaignLaunchHead {
  readonly kind: 'head';
  readonly branchId: string;
  readonly revision: number;
  readonly effectiveGeneration: number;
}

export type CampaignLaunchHeadResult =
  | ICampaignLaunchHead
  /** The campaign exists and has no authoritative stream to name. */
  | { readonly kind: 'no-authoritative-stream' }
  | { readonly kind: 'campaign-not-found' };

type CampaignReadLike =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly id: string }
  | { readonly kind: 'invalid_authority'; readonly reason: string };

export interface ICampaignLaunchHeadPorts {
  readonly readCampaign: (campaignId: string) => CampaignReadLike;
  readonly readEffectiveHead: (
    stream: IEventHistoryStreamRef,
  ) => IEventHistoryEffectiveHead | null;
  /** The journal's own head revision for this stream and branch. */
  readonly readJournalRevision: (
    stream: IEventHistoryStreamRef,
    branchId: string,
  ) => number;
}

/**
 * Resolve the head, or say why there is none.
 *
 * The campaign is checked first: a head for a campaign that does not
 * exist is not a head, and answering `no-authoritative-stream` for one
 * would tell the launch to proceed ungated into nothing.
 */
export function resolveCampaignLaunchHead(
  ports: ICampaignLaunchHeadPorts,
  campaignId: string,
): CampaignLaunchHeadResult {
  const read = ports.readCampaign(campaignId);
  if (read.kind !== 'ok') return { kind: 'campaign-not-found' };

  const stream = campaignStreamRef(campaignId);
  const head = ports.readEffectiveHead(stream);
  // Deliberately `readEffectiveHead` rather than `requireEffectiveHead`:
  // the absence of a branch is an answer this endpoint gives, not an
  // exception it raises.
  if (head === null) return { kind: 'no-authoritative-stream' };

  return {
    kind: 'head',
    branchId: head.branchId,
    revision: ports.readJournalRevision(stream, head.branchId),
    effectiveGeneration: head.effectiveGeneration,
  };
}

/**
 * The journal head revision for a stream and branch.
 *
 * A branch with no head row sits at revision 0: it exists and nothing
 * has been appended to it yet. That is the genesis case (and what a
 * freshly minted candidate branch will look like), not a missing
 * stream - the correction-lease store reads a missing row the same way.
 * Defaulting it to anything else compares a fabricated revision against
 * a head of 0 and refuses a fresh campaign its first launch.
 */
function readJournalRevision(
  stream: IEventHistoryStreamRef,
  branchId: string,
): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT stream_revision AS revision
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
    )
    .get(stream.streamType, stream.streamId, branchId) as
    | { readonly revision: number }
    | undefined;
  return row?.revision ?? 0;
}

/**
 * The durable ports. Lives here rather than in either route so the two
 * launch endpoints cannot drift into two different definitions of "the
 * head" - the whole point of this module is that there is one.
 */
export function campaignLaunchHeadPorts(): ICampaignLaunchHeadPorts {
  return {
    readCampaign,
    readEffectiveHead: (stream) =>
      new SQLiteEventHistoryBranchStore(
        getSQLiteService().getDatabase(),
      ).readEffectiveHead(stream),
    readJournalRevision,
  };
}
