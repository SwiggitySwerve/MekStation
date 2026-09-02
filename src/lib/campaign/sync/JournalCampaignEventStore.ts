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

import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
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
import { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';

import { resolveCampaignBranchId } from './campaignBranchRule';
import { campaignEventEntityRefs } from './campaignEventEntityRefs';
import {
  readCampaignJournalEvents,
  readCampaignJournalHighestSequence,
} from './campaignJournalReads';
import {
  CampaignEventSequenceCollisionError,
  type CampaignCombatOutcomeInboxResult,
  type ICampaignCommandReceipt,
  type ICampaignCombatOutcomeReceipt,
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
  /** Stable identity of the client intent that produced this command. */
  readonly intentFingerprint: string | null;
}

export type CampaignBatchAppendFailure =
  | {
      readonly kind: 'sequence-conflict';
      readonly expectedNextSequence: number;
      readonly actualNextSequence: number;
    }
  | {
      readonly kind: 'command-identity-conflict';
      readonly commandId: string;
    }
  | { readonly kind: 'integrity-conflict' };

export type CampaignBatchAppendResult =
  | {
      readonly kind: 'committed';
      readonly receipt: ICommandReceipt & ICampaignCommandReceipt;
      readonly expectedPostStateDigest: string | null;
    }
  | {
      readonly kind: 'duplicate-command';
      readonly receipt: ICampaignCommandReceipt;
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
  intentFingerprint: string | null,
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
    payload: {
      campaignEvent: event,
      expectedPostStateDigest,
      intentFingerprint,
    },
    // Task 5.3: the full durable identity chain (campaign, campaign-unit,
    // canonical/saved source, pilot, contract, session) per event type.
    entityRefs: campaignEventEntityRefs(campaignId, event),
  };
}

export function envelopeOf(
  stored: IStoredEvent<ICampaignJournalEnvelope>,
): ICampaignEvent {
  return stored.payload.campaignEvent;
}

function toJournalBatch(input: {
  readonly campaignId: string;
  /** Genesis unless a caller resolved a branch. */
  readonly branchId?: string;
  readonly commandId: string;
  readonly events: readonly ICampaignEvent[];
  readonly expectedPostStateDigest: string | null;
  readonly intentFingerprint?: string | null;
  readonly principal?: IResolvedJournalPrincipal;
}): IAppendEventBatch<ICampaignJournalEnvelope> {
  if (input.events.length === 0) {
    throw new Error('A campaign command batch must contain at least one event');
  }
  input.events.forEach((event, index) => {
    if (event.sequence !== input.events[0].sequence + index) {
      throw new Error('Campaign command batch sequences must be contiguous');
    }
  });
  return {
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: input.campaignId,
    expectedBranchId: input.branchId ?? ROOT_EVENT_BRANCH_ID,
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
        input.intentFingerprint ?? null,
      ),
    ),
    principal:
      input.principal ??
      campaignPrincipal(input.campaignId, input.events[0].authorPlayerId),
  };
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
    readonly intentFingerprint?: string | null;
    /** Override the derived human principal (e.g. migration imports). */
    readonly principal?: IResolvedJournalPrincipal;
    /**
     * The branch this command lands on. Defaults to genesis, so every
     * caller that has not been taught about branches writes exactly
     * where it always did.
     */
    readonly branchId?: string;
  },
): Promise<CampaignBatchAppendResult> {
  const batch = toJournalBatch(input);
  const result = await journal.append(batch);
  if ('kind' in result && result.kind === 'committed') {
    return {
      kind: 'committed',
      receipt: {
        ...result.receipt,
        intentFingerprint: input.intentFingerprint ?? null,
        events: result.events.map(envelopeOf),
      },
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
    return { kind: 'command-identity-conflict', commandId: result.commandId };
  }
  return { kind: 'integrity-conflict' };
}

interface ICampaignCombatOutcomeInboxRow {
  readonly outcome_id: string;
  readonly outcome_version: number;
  readonly campaign_id: string;
  readonly command_id: string;
  readonly command_digest: string;
  readonly first_stream_revision: number;
  readonly last_stream_revision: number;
  readonly first_commit_position: number;
  readonly last_commit_position: number;
  readonly received_at: string;
}

function receiptOf(
  row: ICampaignCombatOutcomeInboxRow,
): ICampaignCombatOutcomeReceipt {
  return {
    outcomeId: row.outcome_id,
    outcomeVersion: row.outcome_version,
    campaignId: row.campaign_id,
    commandId: row.command_id,
    commandDigest: row.command_digest,
    firstStreamRevision: row.first_stream_revision,
    lastStreamRevision: row.last_stream_revision,
    firstCommitPosition: row.first_commit_position,
    lastCommitPosition: row.last_commit_position,
    receivedAt: row.received_at,
  };
}

/**
 * Commit campaign consequences and their combat-outcome receipt as one
 * transaction. The receipt lookup happens before journal append, so a replay
 * returns the original range without entering the consequence path.
 */
let failReceiptInsertForTests = false;

/** Test-only: crash between the consequence append and the receipt
 * insert, inside the extension transaction - the crash seam the
 * rollback proof drives without depending on engine CHECK behavior. */
export function _setFailReceiptInsertForTests(fail: boolean): void {
  failReceiptInsertForTests = fail;
}

export async function appendCampaignCombatOutcomeBatch(
  journal: SQLiteEventJournalWriter<ICampaignJournalEnvelope>,
  input: {
    readonly campaignId: string;
    readonly outcomeId: string;
    readonly outcomeVersion: number;
    readonly commandId: string;
    readonly events: readonly ICampaignEvent[];
    readonly expectedPostStateDigest: string;
  },
): Promise<CampaignCombatOutcomeInboxResult> {
  const batch = toJournalBatch(input);
  return journal.appendWithExtension(batch, (db, append) => {
    const accepted = db
      .prepare(
        `SELECT outcome_id, outcome_version, campaign_id, command_id,
                command_digest, first_stream_revision, last_stream_revision,
                first_commit_position, last_commit_position, received_at
           FROM campaign_combat_outcome_inbox
          WHERE outcome_id = ?`,
      )
      .get(input.outcomeId) as ICampaignCombatOutcomeInboxRow | undefined;
    if (accepted) {
      const receipt = receiptOf(accepted);
      if (receipt.outcomeVersion === input.outcomeVersion) {
        return { kind: 'duplicate', receipt };
      }
      return {
        kind: 'outcome-version-conflict',
        outcomeId: input.outcomeId,
        acceptedVersion: receipt.outcomeVersion,
        receivedVersion: input.outcomeVersion,
      };
    }

    const appended = append();
    if (appended.kind !== 'committed') {
      if (appended.kind === 'revision-conflict') {
        return {
          kind: 'sequence-conflict',
          expectedNextSequence: appended.expectedRevision,
          actualNextSequence: appended.actualRevision,
        };
      }
      if (appended.kind === 'command-identity-conflict') {
        return { kind: 'duplicate-command', commandId: appended.commandId };
      }
      return { kind: 'integrity-conflict' };
    }
    const receipt: ICampaignCombatOutcomeReceipt = {
      outcomeId: input.outcomeId,
      outcomeVersion: input.outcomeVersion,
      campaignId: input.campaignId,
      commandId: appended.receipt.commandId,
      commandDigest: appended.receipt.commandDigest,
      firstStreamRevision: appended.receipt.firstStreamRevision,
      lastStreamRevision: appended.receipt.lastStreamRevision,
      firstCommitPosition: appended.receipt.firstCommitPosition,
      lastCommitPosition: appended.receipt.lastCommitPosition,
      receivedAt: appended.receipt.recordedAt,
    };
    if (failReceiptInsertForTests) {
      throw new Error('test-crash-before-receipt-insert');
    }
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES (@outcomeId, @outcomeVersion, @campaignId, @commandId,
               @commandDigest, @firstStreamRevision, @lastStreamRevision,
               @firstCommitPosition, @lastCommitPosition, @receivedAt)`,
    ).run(receipt);
    return { kind: 'committed', receipt };
  });
}

/**
 * `ICampaignEventStore` over the shared journal. Single-event appends are
 * one-event command batches (commandId = the deterministic event id), so
 * the existing `CampaignEventLog` facade and host keep working unchanged
 * when the cutover flag turns on.
 */
export { CampaignStaleBranchError } from './campaignBranchRule';

export class JournalCampaignEventStore implements ICampaignEventStore {
  public constructor(
    private readonly journal: IEventJournal<ICampaignJournalEnvelope>,
    /**
     * Where the stream's effective branch is read from (task 16.2).
     * ABSENT by default, and every production site constructs it that
     * way today: without it this store writes on genesis exactly as it
     * did before branches existed. Handed one, the branch id is derived
     * from the effective head instead of assumed, which is what lets an
     * activation move it without touching this class.
     */
    private readonly branches?: SQLiteEventHistoryBranchStore,
  ) {}

  /** The branch this command lands on - see `campaignBranchRule`. */
  private resolveBranchId(campaignId: string, requested?: string): string {
    return resolveCampaignBranchId(campaignId, requested, this.branches);
  }

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
      readonly intentFingerprint?: string | null;
      readonly events: readonly ICampaignEvent[];
      readonly expectedPostStateDigest: string;
      readonly branchId?: string;
    },
  ): Promise<CampaignBatchAppendResult> => {
    // Before the duplicate check: a command naming the wrong branch is
    // refused whether or not it was seen before.
    const branchId = this.resolveBranchId(campaignId, input.branchId);
    const prior = await this.getCommandReceipt(campaignId, input.commandId);
    if (prior) {
      return prior.intentFingerprint === (input.intentFingerprint ?? null)
        ? { kind: 'duplicate-command', receipt: prior }
        : {
            kind: 'command-identity-conflict',
            commandId: input.commandId,
          };
    }
    return appendCampaignCommandBatch(this.journal, {
      campaignId,
      branchId,
      commandId: input.commandId,
      intentFingerprint: input.intentFingerprint,
      events: input.events,
      expectedPostStateDigest: input.expectedPostStateDigest,
    });
  };

  getCommandReceipt = async (
    campaignId: string,
    commandId: string,
  ): Promise<ICampaignCommandReceipt | null> => {
    const highWater = await this.journal.captureHighWater();
    if (highWater.commitPosition === 0) return null;
    const rows = await this.journal.readEventHistory({
      selector: { kind: 'correlation', id: commandId },
      afterCommitPosition: 0,
      throughCommitPosition: highWater.commitPosition,
      limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
    });
    if (rows.length === 0 || rows[0].streamId !== campaignId) return null;
    return {
      commandId,
      intentFingerprint: rows[0].payload.intentFingerprint ?? null,
      events: rows.map(envelopeOf),
    };
  };

  appendCombatOutcomeBatch = async (
    campaignId: string,
    input: {
      readonly outcomeId: string;
      readonly outcomeVersion: number;
      readonly commandId: string;
      readonly events: readonly ICampaignEvent[];
      readonly expectedPostStateDigest: string;
    },
  ): Promise<CampaignCombatOutcomeInboxResult> => {
    if (!(this.journal instanceof SQLiteEventJournalWriter)) {
      throw new Error('Campaign outcome inbox requires a SQLite journal');
    }
    return appendCampaignCombatOutcomeBatch(this.journal, {
      campaignId,
      ...input,
    });
  };

  appendEvent = async (
    campaignId: string,
    event: ICampaignEvent,
  ): Promise<void> => {
    const result = await appendCampaignCommandBatch(this.journal, {
      campaignId,
      branchId: this.resolveBranchId(campaignId),
      commandId: `campaign-event:${campaignId}:${event.sequence}`,
      events: [event],
      // Single-event facade appends carry no derived post-state digest.
      expectedPostStateDigest: null,
      intentFingerprint: null,
    });
    if (result.kind === 'committed') return;
    throw new CampaignEventSequenceCollisionError(campaignId, event.sequence);
  };

  getEvents = async (
    campaignId: string,
    fromSeq = 0,
  ): Promise<readonly ICampaignEvent[]> =>
    readCampaignJournalEvents(this.journal, campaignId, fromSeq);

  highestSequence = async (campaignId: string): Promise<number> =>
    readCampaignJournalHighestSequence(this.journal, campaignId);
}

/**
 * Production factory (the cutover flag point). Callers that previously
 * constructed the in-memory store directly go through here so flipping
 * `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is the single cutover switch once
 * task 5.2's migration states make it truthful. While the flag is false —
 * or no journal is provided — behavior is byte-identical to before.
 */
export function createDefaultCampaignEventStore(deps?: {
  /**
   * A FACTORY, not a handle: a caller on a request path would otherwise
   * open the database on every host creation just to hand it to a branch
   * the disabled flag never takes, and would throw wherever SQLite is
   * not initialised.
   */
  readonly journal?: () => IEventJournal<ICampaignJournalEnvelope>;
}): ICampaignEventStore {
  if (CAMPAIGN_JOURNAL_AUTHORITY_ENABLED && deps?.journal) {
    return new JournalCampaignEventStore(deps.journal());
  }
  return new InMemoryCampaignEventStore();
}
