/**
 * Journal-backed campaign event store (design-campaign-authority-and-sync
 * task 5.1 — absorbed adopt PR 1).
 *
 * Adapts the shared hash-chained event journal (`IEventJournal`) to the
 * `ICampaignEventStore` contract the campaign host already consumes, and
 * adds the atomic command-batch surface D10 requires: one campaign command's
 * whole event batch plus its expected post-state digest commit in a single
 * journal append (all-or-nothing at an expected revision), so funds /
 * roster / personnel changes can never partially apply, and a divergent
 * applied digest is detectable before any fan-out.
 *
 * Mapping: `streamType 'campaign'`, `streamId <campaignId>`, root branch;
 * `ICampaignEvent.sequence` N lives at journal `streamRevision` N + 1, so
 * an append of sequence N carries `expectedRevision` N and a sequence
 * collision surfaces as the journal's typed revision conflict.
 *
 * Cutover flag: `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` stays `false` — the
 * production factory keeps returning the in-memory store until the D10
 * migration-state machinery (task 5.2) lands. Explicit test/dev adapters
 * remain available either way.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D1, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/event-store/spec.md
 */

import { sha256 } from 'js-sha256';

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
  type IAppendEventBatch,
  type ICommandReceipt,
  type IEventJournal,
  type IEventToAppend,
  type IResolvedJournalPrincipal,
  type IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';

import { campaignEventEntityRefs } from './campaignEventEntityRefs';
import {
  CampaignEventSequenceCollisionError,
  type ICampaignEventStore,
} from './ICampaignEventStore';
import { InMemoryCampaignEventStore } from './InMemoryCampaignEventStore';

/** The journal stream type every campaign stream lives under (design D1). */
export const CAMPAIGN_STREAM_TYPE = 'campaign' as const;

/**
 * Cutover flag (task 5.1): the journal adapter exists and is fully tested,
 * but production stays on the in-memory store until the migration-state
 * machinery (task 5.2) makes cutover truthful per campaign.
 */
export const CAMPAIGN_JOURNAL_AUTHORITY_ENABLED = false;

/**
 * The durable journal envelope for one campaign event. The expected
 * post-state digest travels inside the canonical payload of its command's
 * FINAL event (null elsewhere), so the digest commits atomically with the
 * batch and is protected by the journal's own event digest chain.
 */
export interface ICampaignJournalEnvelope {
  readonly campaignEvent: ICampaignEvent;
  readonly expectedPostStateDigest: string | null;
}

export type CampaignBatchAppendFailure =
  | {
      readonly kind: 'sequence-conflict';
      readonly expectedNextSequence: number;
      readonly actualNextSequence: number;
    }
  | { readonly kind: 'duplicate-command'; readonly commandId: string }
  | { readonly kind: 'integrity-conflict' };

export type CampaignBatchAppendResult =
  | {
      readonly kind: 'committed';
      readonly receipt: ICommandReceipt;
      readonly expectedPostStateDigest: string | null;
    }
  | CampaignBatchAppendFailure;

/**
 * Deterministic digest of a campaign state projection — the digest the
 * source derives BEFORE commit and re-derives AFTER applying the committed
 * batch; inequality means the projection is quarantined, never fanned out
 * (D10).
 */
export function computeCampaignStateDigest(
  state: ICampaignAuthoritativeState,
): string {
  return sha256(new TextEncoder().encode(canonicalizeJsonV1(state)));
}

function campaignPrincipal(
  campaignId: string,
  authorPlayerId: string,
): IResolvedJournalPrincipal {
  return {
    actorKind: 'human',
    actorId: authorPlayerId,
    authorityType: 'campaign-source',
    authorityId: campaignId,
  };
}

function toAppendEvent(
  campaignId: string,
  commandId: string,
  commandIndex: number,
  event: ICampaignEvent,
  expectedPostStateDigest: string | null,
): IEventToAppend<ICampaignJournalEnvelope> {
  return {
    // Deterministic per (command, index): a retried command re-derives the
    // same ids (retry identity rides the journal's command-identity check,
    // which fires before the global event-id uniqueness guard), while a
    // RACING different command derives different ids and reaches the
    // typed expected-revision conflict instead of an id-uniqueness throw.
    eventId: `${commandId}:${commandIndex}`,
    eventType: event.type,
    eventVersion: 1,
    correlationId: commandId,
    causationEventIds: [],
    occurredAt: event.ts,
    payload: { campaignEvent: event, expectedPostStateDigest },
    // Task 5.3: the full durable identity chain (campaign, campaign-unit,
    // canonical/saved source, pilot, contract, session) per event type.
    entityRefs: campaignEventEntityRefs(campaignId, event),
  };
}

function envelopeOf(
  stored: IStoredEvent<ICampaignJournalEnvelope>,
): ICampaignEvent {
  return stored.payload.campaignEvent;
}

/**
 * Append one campaign command's WHOLE event batch atomically at the
 * expected head. The first event's `sequence` must equal the current
 * next-sequence; the journal's revision guard turns a lost race into a
 * typed `sequence-conflict` with nothing applied (all-or-nothing).
 */
export async function appendCampaignCommandBatch(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  input: {
    readonly campaignId: string;
    readonly commandId: string;
    readonly events: readonly ICampaignEvent[];
    readonly expectedPostStateDigest: string | null;
    /** Override the derived human principal (e.g. migration imports). */
    readonly principal?: IResolvedJournalPrincipal;
  },
): Promise<CampaignBatchAppendResult> {
  if (input.events.length === 0) {
    throw new Error('A campaign command batch must contain at least one event');
  }
  input.events.forEach((event, index) => {
    if (event.sequence !== input.events[0].sequence + index) {
      throw new Error('Campaign command batch sequences must be contiguous');
    }
  });
  const batch: IAppendEventBatch<ICampaignJournalEnvelope> = {
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: input.campaignId,
    expectedBranchId: ROOT_EVENT_BRANCH_ID,
    expectedRevision: input.events[0].sequence,
    commandId: input.commandId,
    events: input.events.map((event, index) =>
      toAppendEvent(
        input.campaignId,
        input.commandId,
        index,
        event,
        index === input.events.length - 1
          ? input.expectedPostStateDigest
          : null,
      ),
    ),
    principal:
      input.principal ??
      campaignPrincipal(input.campaignId, input.events[0].authorPlayerId),
  };
  const result = await journal.append(batch);
  if ('kind' in result && result.kind === 'committed') {
    return {
      kind: 'committed',
      receipt: result.receipt,
      expectedPostStateDigest: input.expectedPostStateDigest,
    };
  }
  if (result.kind === 'revision-conflict') {
    return {
      kind: 'sequence-conflict',
      expectedNextSequence: result.expectedRevision,
      actualNextSequence: result.actualRevision,
    };
  }
  if (result.kind === 'command-identity-conflict') {
    return { kind: 'duplicate-command', commandId: result.commandId };
  }
  return { kind: 'integrity-conflict' };
}

/**
 * `ICampaignEventStore` over the shared journal. Single-event appends are
 * one-event command batches (commandId = the deterministic event id), so
 * the existing `CampaignEventLog` facade and host keep working unchanged
 * when the cutover flag turns on.
 */
export class JournalCampaignEventStore implements ICampaignEventStore {
  public constructor(
    private readonly journal: IEventJournal<ICampaignJournalEnvelope>,
  ) {}

  /**
   * The D10 batch capability the host's command->append pipeline detects
   * (task 1.2): one command's whole contiguous event batch plus its
   * expected post-state digest, committed atomically at the expected head.
   * Absent on the in-memory store, so the host's legacy per-event path
   * remains the flag-off behavior structurally.
   */
  appendCommandBatch = async (
    campaignId: string,
    input: {
      readonly commandId: string;
      readonly events: readonly ICampaignEvent[];
      readonly expectedPostStateDigest: string;
    },
  ): Promise<CampaignBatchAppendResult> => {
    return appendCampaignCommandBatch(this.journal, {
      campaignId,
      commandId: input.commandId,
      events: input.events,
      expectedPostStateDigest: input.expectedPostStateDigest,
    });
  };

  appendEvent = async (
    campaignId: string,
    event: ICampaignEvent,
  ): Promise<void> => {
    const result = await appendCampaignCommandBatch(this.journal, {
      campaignId,
      commandId: `campaign-event:${campaignId}:${event.sequence}`,
      events: [event],
      // Single-event facade appends carry no derived post-state digest.
      expectedPostStateDigest: null,
    });
    if (result.kind === 'committed') return;
    throw new CampaignEventSequenceCollisionError(campaignId, event.sequence);
  };

  getEvents = async (
    campaignId: string,
    fromSeq = 0,
  ): Promise<readonly ICampaignEvent[]> => {
    const events: ICampaignEvent[] = [];
    // afterRevision is exclusive and sequence N lives at revision N + 1,
    // so starting after revision `fromSeq` yields sequence >= fromSeq.
    let afterRevision = Math.max(0, fromSeq);
    for (;;) {
      const page = await this.journal.readStream({
        streamType: CAMPAIGN_STREAM_TYPE,
        streamId: campaignId,
        branchId: ROOT_EVENT_BRANCH_ID,
        afterRevision,
        limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
      });
      for (const stored of page) events.push(envelopeOf(stored));
      if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return events;
      afterRevision = page[page.length - 1].streamRevision;
    }
  };

  highestSequence = async (campaignId: string): Promise<number> => {
    let highest = -1;
    let afterRevision = 0;
    for (;;) {
      const page = await this.journal.readStream({
        streamType: CAMPAIGN_STREAM_TYPE,
        streamId: campaignId,
        branchId: ROOT_EVENT_BRANCH_ID,
        afterRevision,
        limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
      });
      if (page.length > 0) {
        highest = envelopeOf(page[page.length - 1]).sequence;
        afterRevision = page[page.length - 1].streamRevision;
      }
      if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return highest;
    }
  };
}

/**
 * Production factory (the cutover flag point). Callers that previously
 * constructed the in-memory store directly go through here so flipping
 * `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is the single cutover switch once
 * task 5.2's migration states make it truthful. While the flag is false —
 * or no journal is provided — behavior is byte-identical to before.
 */
export function createDefaultCampaignEventStore(deps?: {
  readonly journal?: IEventJournal<ICampaignJournalEnvelope>;
}): ICampaignEventStore {
  if (CAMPAIGN_JOURNAL_AUTHORITY_ENABLED && deps?.journal) {
    return new JournalCampaignEventStore(deps.journal);
  }
  return new InMemoryCampaignEventStore();
}
