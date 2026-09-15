/**
 * S1 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.1):
 * mirror a committed combat batch into the authoritative journal.
 *
 * MIRROR, NOT AUTHORITY. Until this seam combat commands existed only
 * in `mp_match_events`, so every match stream had no journal head and
 * no effective branch — which is why both GM rewind routes refuse
 * `no-authoritative-history`. S1 lands the rows; nothing reads them yet
 * (`readEffectiveHead` and the branch admission move in S2). This
 * module never refuses or decides a command.
 *
 * ONE TRANSACTION, JOURNAL SIDE ONLY. Event rows, stream head, genesis
 * branch and effective head commit together or not at all; the
 * cross-file pair is deliberately NOT atomic at S1 (see the wiring
 * sites in `DurableMatchStore` and `durableCapabilityPorts`).
 *
 * REVISION OFFSET. A match event carries a 0-based `sequence` and the
 * journal numbers revisions from 1, so the match store's "next
 * sequence" already equals the journal head's revision — which is why
 * `expectedRevision` passes through untranslated. TRUE ONLY ON A
 * STREAM NEVER REWOUND: the store reads `MAX(sequence) + 1` over LIVE
 * rows and a rewind MOVES the discarded tail into
 * `mp_match_events_superseded`, while the journal head is append-only.
 * The mirror must not be enabled on a rewound match until S5-b (task
 * 1.6) sources the expected revision from the journal head.
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

/** The whole `IGameEvent`, unaltered: a stored projection would make
 * S6's parity comparison compare that projection against itself. */
export interface IMatchJournalEnvelope {
  readonly matchEvent: IGameEvent;
  /** Present on the batch's final event only, as the campaign side does. */
  readonly expectedPostStateDigest: string | null;
}

export interface IMirrorMatchBatchInput {
  readonly matchId: string;
  readonly commandId: string;
  readonly actorId: string;
  /** The journal revision to land on (= the match's next sequence). */
  readonly expectedRevision: number;
  readonly events: readonly IGameEvent[];
  readonly expectedPostStateDigest?: string | null;
}

export type MatchJournalMirrorResult =
  | { readonly kind: 'mirrored' }
  | {
      readonly kind: 'revision-conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | { readonly kind: 'duplicate-command' }
  | { readonly kind: 'integrity-conflict' };

/**
 * Build the journal batch. Event ids are deterministic per (command,
 * index), as `toJournalBatch` does for campaigns: a retry re-derives
 * the same ids so the command-identity check answers first, while a
 * racing DIFFERENT command derives different ids and reaches the typed
 * revision conflict instead of an id-uniqueness throw.
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
      // A combat command always has a player behind it, and the batch's
      // actor is the only honest principal this seam has.
      actorKind: 'human',
      actorId: input.actorId,
      authorityType: MATCH_STREAM_TYPE,
      authorityId: input.matchId,
    },
  };
}

/**
 * Append one committed combat batch and make sure the match stream has
 * a genesis branch and an effective head. Genesis goes through
 * `backfillGenesisBranches` — the migration's own
 * `EVENT_HISTORY_GENESIS_BACKFILL_SQL`, so migration-time and
 * commit-time "genesis" cannot drift. It runs AFTER the append (it
 * reads `event_journal_stream_heads`, empty until then) and is
 * `NOT EXISTS`-guarded, so later batches no-op.
 */
export async function mirrorMatchBatchToJournal(
  db: Database.Database,
  input: IMirrorMatchBatchInput,
): Promise<MatchJournalMirrorResult> {
  const writer = new SQLiteEventJournalWriter<IMatchJournalEnvelope>(db);
  const branches = new SQLiteEventHistoryBranchStore(db);
  const stream = { streamType: MATCH_STREAM_TYPE, streamId: input.matchId };
  return writer.appendPreparedWithExtension<null, MatchJournalMirrorResult>(
    () => {
      // Read inside the transaction so a concurrent activation cannot
      // move the effective branch between the read and the append.
      const effective = branches.readEffectiveHead(stream);
      const branchId = effective?.branchId ?? MATCH_BASELINE_BRANCH_ID;
      return {
        kind: 'ready',
        context: null,
        raw: toMatchJournalBatch(input, branchId),
      };
    },
    (_handle, _context, append) => {
      const appended = append();
      if (appended.kind === 'revision-conflict') {
        return {
          kind: 'revision-conflict',
          expectedRevision: appended.expectedRevision,
          actualRevision: appended.actualRevision,
        };
      }
      if (appended.kind === 'command-identity-conflict') {
        return { kind: 'duplicate-command' };
      }
      if (appended.kind !== 'committed') return { kind: 'integrity-conflict' };
      branches.backfillGenesisBranches();
      return { kind: 'mirrored' };
    },
  );
}
