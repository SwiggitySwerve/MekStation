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
 * THE RULE (owner decision OD-launch-head-gate). The head is the
 * journal's effective head: the branch and revision
 * `readEffectiveStreamHead` reads - the seam the correction lease
 * compares against - with the effective head's generation.
 * `no-authoritative-stream` means exactly that the campaign has no
 * journal stream: the journal holds no committed event for it. A
 * stream's first journal append installs its genesis branch and
 * effective head in the same transaction (`SQLiteEventJournalWriter`),
 * so a campaign's stream has a head from its first append on, and the
 * mission launch is gated whenever a head exists: it proceeds ungated
 * only on `no-authoritative-stream`, and on a head
 * `campaignLaunchAuthorityRoute` runs the progression gate and the
 * expected-head comparison against it.
 *
 * A journaled campaign with no effective head (a stream first appended
 * before that install existed and never backfilled) is refused with the
 * branch store's `no-effective-branch` error, not answered: it has no
 * installed head to name, and `no-authoritative-stream` would launch a
 * journaled campaign ungated.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { IEventHistoryEffectiveHead } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IEventHistoryEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
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
  /** The campaign exists and the journal holds no stream for it. */
  | { readonly kind: 'no-authoritative-stream' }
  | { readonly kind: 'campaign-not-found' };

type CampaignReadLike =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly id: string }
  | { readonly kind: 'invalid_authority'; readonly reason: string };

export interface ICampaignLaunchHeadPorts {
  readonly readCampaign: (campaignId: string) => CampaignReadLike;
  /** Whether the journal holds any committed event on this stream. */
  readonly hasJournalStream: (stream: IEventHistoryStreamRef) => boolean;
  /** The stream's effective head; throws `no-effective-branch` if none. */
  readonly requireEffectiveHead: (
    stream: IEventHistoryStreamRef,
  ) => IEventHistoryEffectiveHead;
  /** The journal's effective head, read through the correction lease's seam. */
  readonly readEffectiveStreamHead: (
    stream: IEventHistoryStreamRef,
  ) => IEventHistoryEffectiveStreamHead;
}

/**
 * Resolve the head, or say why there is none.
 *
 * The campaign is checked first: a head for a campaign that does not
 * exist is not a head, and answering `no-authoritative-stream` for one
 * would tell the launch to proceed ungated into nothing. Then the
 * journal alone decides whether there is a stream: only a campaign with
 * no committed journal event answers `no-authoritative-stream`. Any
 * other campaign answers the journal's effective head - branch and
 * revision from `readEffectiveStreamHead` (revision 0 when the effective
 * branch has no head row yet), generation from the effective head - and
 * one with no effective head throws `no-effective-branch` from
 * `requireEffectiveHead` before the head is read.
 */
export function resolveCampaignLaunchHead(
  ports: ICampaignLaunchHeadPorts,
  campaignId: string,
): CampaignLaunchHeadResult {
  const read = ports.readCampaign(campaignId);
  if (read.kind !== 'ok') return { kind: 'campaign-not-found' };

  const stream = campaignStreamRef(campaignId);
  if (!ports.hasJournalStream(stream)) {
    return { kind: 'no-authoritative-stream' };
  }

  const effective = ports.requireEffectiveHead(stream);
  const head = ports.readEffectiveStreamHead(stream);
  return {
    kind: 'head',
    branchId: head.branchId,
    revision: head.revision,
    effectiveGeneration: effective.effectiveGeneration,
  };
}

/**
 * Whether the journal holds any committed event on this stream, on any
 * branch. Journal events are immutable (the journal migration's
 * no-delete trigger), so this reads the durable fact "the campaign has a
 * journal stream"; the head rows, a mutable pointer over those events,
 * are not asked.
 */
function hasJournalStream(stream: IEventHistoryStreamRef): boolean {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT 1 AS ok FROM event_journal_events
        WHERE stream_type = ? AND stream_id = ? LIMIT 1`,
    )
    .get(stream.streamType, stream.streamId);
  return row !== undefined;
}

/**
 * The durable ports. Lives here rather than in either route so the two
 * launch endpoints cannot drift into two different definitions of "the
 * head" - the whole point of this module is that there is one. Each port
 * opens its reads on the current database when it is called.
 */
export function campaignLaunchHeadPorts(): ICampaignLaunchHeadPorts {
  return {
    readCampaign,
    hasJournalStream,
    requireEffectiveHead: (stream) =>
      new SQLiteEventHistoryBranchStore(
        getSQLiteService().getDatabase(),
      ).requireEffectiveHead(stream),
    readEffectiveStreamHead: (stream) => {
      const db = getSQLiteService().getDatabase();
      return readEffectiveStreamHead(
        db,
        new SQLiteEventHistoryBranchStore(db),
        stream,
      );
    },
  };
}
