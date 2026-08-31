/**
 * Read-only IEventJournal over a CampaignMatchHost event log.
 *
 * Production co-op still stores the live ledger in the host's
 * ICampaignEventStore (in-memory until journal cutover). The grant
 * projector reads IEventJournal, so the room-code guest path adapts
 * the host log into stored envelopes without dual-writing the source
 * journal. Append is refused: this adapter is a projection source,
 * never a second writer.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/tasks.md (3.5)
 */

import { sha256 } from 'js-sha256';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import {
  CURRENT_EVENT_CANONICALIZER_VERSION,
  ROOT_EVENT_BRANCH_ID,
  type IAppendEventBatch,
  type ICommandReceipt,
  type ICommittedReadPage,
  type IEventJournal,
  type IJournalHighWater,
  type IReadCommittedQuery,
  type IReadEntityHistoryQuery,
  type IReadEventHistoryQuery,
  type IReadStreamQuery,
  type IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';

import {
  CAMPAIGN_STREAM_TYPE,
  type ICampaignJournalEnvelope,
} from './JournalCampaignEventStore';

/** Reader bound to one campaign's host log. */
export type HostCampaignEventReader = () => Promise<readonly ICampaignEvent[]>;

const READ_ONLY_MESSAGE =
  'Host campaign event journal is a projection source and refuses append';

/**
 * Builds a read-only journal that pages the host event log as a
 * `campaign` stream so projectCampaignStreamForGrant can run unchanged.
 */
export function createHostCampaignEventJournal(
  campaignId: string,
  readEvents: HostCampaignEventReader,
): IEventJournal<ICampaignJournalEnvelope> {
  return new HostCampaignEventJournal(campaignId, readEvents);
}

class HostCampaignEventJournal implements IEventJournal<ICampaignJournalEnvelope> {
  /**
   * Pins the campaign id so a caller cannot ask this adapter to page
   * a different stream than the host it was bound to.
   */
  public constructor(
    private readonly campaignId: string,
    private readonly readEvents: HostCampaignEventReader,
  ) {}

  /**
   * Always refuses. Dual-writing the source journal is task 1.2/5.7,
   * not the guest-path adapter.
   */
  public async append(
    _input: IAppendEventBatch<ICampaignJournalEnvelope>,
  ): Promise<never> {
    throw new Error(READ_ONLY_MESSAGE);
  }

  /**
   * Pages host-log events as stored journal rows. streamRevision is
   * sequence + 1 so sequence 0 (genesis) occupies revision 1, matching
   * JournalCampaignEventStore. Identities are digests of the campaign
   * event so delivery sequences stay stable across rejoins.
   */
  public async readStream(
    query: IReadStreamQuery,
  ): Promise<readonly IStoredEvent<ICampaignJournalEnvelope>[]> {
    if (query.streamType !== CAMPAIGN_STREAM_TYPE) return [];
    if (query.streamId !== this.campaignId) return [];
    if (query.branchId !== ROOT_EVENT_BRANCH_ID) return [];
    const events = await this.readEvents();
    const stored = events
      .filter(function (event) {
        return event.campaignId === query.streamId;
      })
      .map(function (event) {
        return toStoredHostEvent(event);
      })
      .filter(function (row) {
        return row.streamRevision > query.afterRevision;
      });
    return stored.slice(0, query.limit);
  }

  /** Entity history is unused by grant projection; empty keeps the contract. */
  public async readEntityHistory(
    _query: IReadEntityHistoryQuery,
  ): Promise<readonly IStoredEvent<ICampaignJournalEnvelope>[]> {
    return [];
  }

  /** Event history is unused by grant projection; empty keeps the contract. */
  public async readEventHistory(
    _query: IReadEventHistoryQuery,
  ): Promise<readonly IStoredEvent<ICampaignJournalEnvelope>[]> {
    return [];
  }

  /** High-water is unused by grant projection. */
  public async captureHighWater(): Promise<IJournalHighWater> {
    return { commitPosition: 0 };
  }

  /** Committed-position reads are unused by grant projection. */
  public async readCommitted(
    _query: IReadCommittedQuery,
  ): Promise<ICommittedReadPage<ICampaignJournalEnvelope>> {
    return {
      events: [],
      nextAfterCommitPosition: 0,
      exhausted: true,
    };
  }

  /** Command receipts are unused by grant projection. */
  public async getCommandReceipt(
    _commandId: string,
  ): Promise<ICommandReceipt | null> {
    return null;
  }
}

/**
 * Wraps one host-log event as a stored journal envelope. The digest is
 * over the campaign event bytes so the delivery epoch can assign a
 * stable per-grant sequence without a durable source journal row.
 */
function toStoredHostEvent(
  event: ICampaignEvent,
): IStoredEvent<ICampaignJournalEnvelope> {
  const streamRevision = event.sequence + 1;
  const eventId = `host-log:${event.campaignId}:${event.sequence}`;
  const payload: ICampaignJournalEnvelope = {
    campaignEvent: event,
    expectedPostStateDigest: null,
    intentFingerprint: null,
  };
  return {
    eventId,
    eventType: event.type,
    eventVersion: 1,
    correlationId: eventId,
    causationEventIds: [],
    occurredAt: event.ts,
    payload,
    entityRefs: [],
    actorKind: 'human',
    actorId: event.authorPlayerId,
    authorityType: 'campaign-source',
    authorityId: event.campaignId,
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: event.campaignId,
    branchId: ROOT_EVENT_BRANCH_ID,
    streamRevision,
    commitPosition: streamRevision,
    commandId: eventId,
    commandIndex: 0,
    recordedAt: event.ts,
    canonicalizerVersion: CURRENT_EVENT_CANONICALIZER_VERSION,
    previousStreamEventDigest: null,
    eventDigest: sha256(canonicalizeJsonV1(payload)),
  };
}
