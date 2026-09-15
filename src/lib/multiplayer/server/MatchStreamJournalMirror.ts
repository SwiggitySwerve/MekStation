/**
 * S1 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.1):
 * mirror a committed combat batch into the authoritative journal.
 *
 * Until this seam combat commands existed only in `mp_match_events`, so
 * every match stream had no journal head and no effective branch —
 * which is why both GM rewind routes refuse `no-authoritative-history`.
 *
 * MIRROR, NOT AUTHORITY. S1 is "mirror and genesis": the rows land,
 * but nothing reads them yet (`readEffectiveHead` and the branch
 * admission consult move in S2, the expected revision in S5-b). This
 * module never refuses or decides a command; it records what the match
 * store already committed.
 *
 * TWO DATABASES, ONE TRANSACTION EACH. The journal lives in
 * SQLiteService's campaign file and `mp_match_events` in the match file
 * (see `durableCapabilityPorts`), so no transaction spans both. What IS
 * indivisible here is the journal side: event rows, stream head,
 * genesis branch and effective head commit together or not at all. The
 * cross-file pair is deliberately NOT atomic at S1 — a mirror nobody
 * reads may lag; S4 owns restart recovery and S6 the parity gate.
 *
 * REVISION OFFSET. A match event carries a 0-based `sequence` and the
 * journal numbers revisions from 1, so the match store's "next
 * sequence" already equals the journal head's revision — which is why
 * `expectedRevision` passes through untranslated. S5-a makes every
 * derivation site state that explicitly.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S1)
 */

import type Database from 'better-sqlite3';

import type * as Journal from '@/lib/events/journal/EventJournalContract';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';

import { MATCH_BASELINE_BRANCH_ID } from './matchAuthorityBaseline';

/** The stream type every match stream is keyed by. */
export const MATCH_STREAM_TYPE = 'match';

/**
 * What one mirrored combat event carries: the whole `IGameEvent`,
 * unaltered. A mirror that stored a projection would make S6's parity
 * comparison compare that projection against itself.
 */
export interface IMatchJournalEnvelope {
  readonly matchEvent: IGameEvent;
  /** Present on the batch's final event only, as the campaign side does. */
  readonly expectedPostStateDigest: string | null;
}

export interface IMirrorMatchBatchInput {
  readonly matchId: string;
  readonly commandId: string;
  readonly actorId: string;
  /** The journal revision this batch must land on (= the match's next sequence). */
  readonly expectedRevision: number;
  readonly events: readonly IGameEvent[];
  readonly expectedPostStateDigest?: string | null;
}

export type MatchJournalMirrorResult =
  | {
      readonly kind: 'mirrored';
      readonly branchId: string;
      readonly firstRevision: number;
      readonly lastRevision: number;
    }
  | {
      readonly kind: 'revision-conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | { readonly kind: 'duplicate-command'; readonly commandId: string }
  | { readonly kind: 'integrity-conflict' };

/**
 * Build the journal batch for one committed combat command. Event ids
 * are deterministic per (command, index), exactly as `toJournalBatch`
 * does for campaigns: a retried command re-derives the same ids so the
 * command-identity check answers first, while a racing DIFFERENT
 * command derives different ids and reaches the typed revision
 * conflict instead of an id-uniqueness throw.
 */
function toMatchJournalBatch(
  input: IMirrorMatchBatchInput,
  branchId: string,
): Journal.IAppendEventBatch<IMatchJournalEnvelope> {
  const last = input.events.length - 1;
  return {
    streamType: MATCH_STREAM_TYPE,
    streamId: input.matchId,
    expectedBranchId: branchId,
    expectedRevision: input.expectedRevision,
    commandId: input.commandId,
    events: input.events.map((matchEvent, index) => ({
      eventId: `${input.commandId}:${index}`,
      eventType: matchEvent.type,
      eventVersion: 1,
      correlationId: input.commandId,
      causationEventIds: [],
      occurredAt: matchEvent.timestamp,
      payload: {
        matchEvent,
        expectedPostStateDigest:
          index === last ? (input.expectedPostStateDigest ?? null) : null,
      },
      entityRefs: [
        { entityType: 'match', entityId: input.matchId, role: 'stream' },
      ],
    })),
    principal: {
      // A combat command always has a player behind it; the store
      // carries that actor on the batch and it is the only honest
      // principal this seam has.
      actorKind: 'human',
      actorId: input.actorId,
      authorityType: MATCH_STREAM_TYPE,
      authorityId: input.matchId,
    },
  };
}

/**
 * Append one committed combat batch to the journal and make sure the
 * match stream has a genesis branch and an effective head. Genesis
 * goes through `backfillGenesisBranches` rather than a second INSERT
 * here: it runs the migration's own `EVENT_HISTORY_GENESIS_BACKFILL_SQL`,
 * so migration-time and commit-time "genesis" cannot drift into two
 * answers. It runs AFTER the append because it reads
 * `event_journal_stream_heads`, where this stream has no row until
 * then, and is `NOT EXISTS`-guarded so later batches find it already
 * there.
 */
export async function mirrorMatchBatchToJournal(
  db: Database.Database,
  input: IMirrorMatchBatchInput,
): Promise<MatchJournalMirrorResult> {
  const writer = new SQLiteEventJournalWriter<IMatchJournalEnvelope>(db);
  const branches = new SQLiteEventHistoryBranchStore(db);
  const stream = { streamType: MATCH_STREAM_TYPE, streamId: input.matchId };
  return writer.appendPreparedWithExtension<string, MatchJournalMirrorResult>(
    () => {
      // Read inside the transaction so a concurrent activation cannot
      // move the effective branch between the read and the append.
      const effective = branches.readEffectiveHead(stream);
      const branchId = effective?.branchId ?? MATCH_BASELINE_BRANCH_ID;
      return {
        kind: 'ready',
        context: branchId,
        raw: toMatchJournalBatch(input, branchId),
      };
    },
    (_handle, branchId, append) => {
      const appended = append();
      if (appended.kind === 'revision-conflict') {
        return {
          kind: 'revision-conflict',
          expectedRevision: appended.expectedRevision,
          actualRevision: appended.actualRevision,
        };
      }
      if (appended.kind === 'command-identity-conflict') {
        return { kind: 'duplicate-command', commandId: appended.commandId };
      }
      if (appended.kind !== 'committed') return { kind: 'integrity-conflict' };
      branches.backfillGenesisBranches();
      return {
        kind: 'mirrored',
        branchId,
        firstRevision: appended.receipt.firstStreamRevision,
        lastRevision: appended.receipt.lastStreamRevision,
      };
    },
  );
}
