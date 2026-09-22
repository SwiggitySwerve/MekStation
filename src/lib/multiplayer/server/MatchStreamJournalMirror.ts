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
 * REVISION OFFSET, AND ITS GUARD (S5, task 1.5). A match event carries
 * a 0-based `sequence` and the journal numbers revisions from 1, so the
 * match store's "next sequence" already equals the journal head's
 * revision — `journalHeadRevisionForNextMatchSequence` is that step,
 * named rather than an untranslated field. TRUE ONLY ON A STREAM NEVER
 * REWOUND: the store reads `MAX(sequence)` over LIVE rows and derives
 * the next sequence via `nextMatchSequenceAfter`, while a rewind MOVES
 * the discarded tail into `mp_match_events_superseded` and the journal
 * head is append-only. S1 stated that in this comment and enforced
 * nothing; `isLivePathBranchId` over the effective head now refuses
 * `rewound-stream` before anything is appended, so a rewound match
 * cannot have a sequence mirrored onto an activated branch as though
 * it were a revision.
 *
 * WHERE THE EXPECTED REVISION COMES FROM (S5-b, task 1.6). The caller
 * now hands this module a resolved `MatchCommitExpectedRevision` rather
 * than a raw sequence, and the arm it carries decides whether the
 * paragraph above still applies: a `store` expectation is the
 * translated next sequence and keeps the rewound refusal, while a
 * `journal` expectation was read from the head itself and needs no such
 * guard — a head naming an activated branch is answering ABOUT that
 * branch. Resolving it is `matchCommitJournalHead`'s job, deliberately
 * outside this transaction so two writers can race for it.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S1, S5)
 */

import type Database from 'better-sqlite3';

import type * as Journal from '@/lib/events/journal/EventJournalContract';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';

import type { MatchCommitExpectedRevision } from './matchCommitJournalHead';

import {
  isLivePathBranchId,
  MATCH_BASELINE_BRANCH_ID,
} from './matchAuthorityBaseline';

/** The stream type every match stream is keyed by. */
export const MATCH_STREAM_TYPE = 'match';

/**
 * Drop own-enumerable properties whose value is `undefined`, all the
 * way down. NOT a projection and NOT a JSON round-trip.
 *
 * WHY THIS EXISTS. A real `InteractiveSession` launch log carries
 * explicitly-undefined optional properties — `game_created.actorId`,
 * `payload.config.seed`, each unit's `movementMode` /
 * `initiativeEquipment` / `c3Equipment` — and `Object.keys` includes
 * such keys, so the canonicalizer's `default:` arm refuses the whole
 * batch with `JCS cannot represent undefined`. Until this step the
 * mirror could not represent a single real match launch.
 *
 * WHY DROPPING IS THE RIGHT ANSWER RATHER THAN A LOSS. `DurableMatchStore`
 * persists an event as `JSON.stringify(event)` and reads it back with
 * `JSON.parse`, so the store's own durable form of the event ALREADY
 * has these properties dropped. Mirroring the in-memory form was the
 * anomaly; this makes the mirrored payload — and therefore the digest
 * taken over it — describe exactly what the store persists. It is also
 * a fixed point of the journal's own storage: the writer stores
 * `canonicalizeJsonV1(payload)` and re-canonicalizes the parsed form to
 * verify the digest on read, and a canonical string can never carry an
 * undefined back.
 *
 * WHY NOT `JSON.parse(JSON.stringify(event))`. That is the same drop
 * plus several silent coercions: a function or a symbol vanishes, a
 * `Date` becomes a string, a `BigInt` throws an untyped `TypeError`.
 * Only `undefined` is dropped here, so every genuinely
 * non-representable value still reaches the canonicalizer and is
 * refused as `EventJournalCanonicalizationError('unsupported-value')`.
 * Values this step does not descend into — anything that is not a
 * plain object or an array — are handed on untouched for that reason.
 */
export function withoutUndefinedProperties<T>(value: T): T {
  if (Array.isArray(value)) {
    // `map` preserves holes, so a sparse array is still refused typed.
    return value.map((item) => withoutUndefinedProperties(item)) as T;
  }
  if (value === null || typeof value !== 'object') return value;
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return value;
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key];
    if (child === undefined) continue;
    kept[key] = withoutUndefinedProperties(child);
  }
  return kept as T;
}

/** The whole `IGameEvent` minus its undefined-valued properties, which
 * is the form `DurableMatchStore` itself persists: a stored projection
 * would make S6's parity comparison compare that projection against
 * itself, and the in-memory form cannot be canonicalized at all. */
export interface IMatchJournalEnvelope {
  readonly matchEvent: IGameEvent;
  /** Present on the batch's final event only, as the campaign side does. */
  readonly expectedPostStateDigest: string | null;
}

export interface IMirrorMatchBatchInput {
  readonly matchId: string;
  readonly commandId: string;
  readonly actorId: string;
  /**
   * The revision this batch is appended at, and the source it came
   * from (task 1.6). Resolved by the caller through
   * `resolveMatchCommitExpectedRevision` BEFORE this call, so the view
   * a writer holds is older than the head its append re-reads.
   */
  readonly expected: MatchCommitExpectedRevision;
  readonly events: readonly IGameEvent[];
  readonly expectedPostStateDigest?: string | null;
}

export type MatchJournalMirrorResult =
  | { readonly kind: 'mirrored' }
  | {
      /**
       * The stream's effective head has left the live path, so its
       * store sequence and its journal revision no longer describe the
       * same history. Refused rather than mirrored: appending here
       * would put a live-path batch onto an activated branch at a
       * revision derived from a number that no longer means it.
       */
      readonly kind: 'rewound-stream';
      readonly branchId: string;
    }
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
    expectedRevision: input.expected.expectedRevision,
    commandId: input.commandId,
    events: input.events.map((matchEvent, index) => ({
      eventId: `${input.commandId}:${index}`,
      eventType: matchEvent.type,
      eventVersion: 1,
      correlationId: input.commandId,
      causationEventIds: [],
      occurredAt: matchEvent.timestamp,
      payload: {
        // Stripped HERE rather than at the call site: the raw batch is
        // canonicalized twice - once for the command identity and once
        // for each event digest - and both must see one form.
        matchEvent: withoutUndefinedProperties(matchEvent),
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
 * a genesis branch and an effective head. The journal writer installs
 * both inside the stream's first append, in the append's transaction.
 * The `backfillGenesisBranches` call after a committed append (the
 * migration's own `EVENT_HISTORY_GENESIS_BACKFILL_SQL`, global and
 * `NOT EXISTS`-guarded) therefore adds nothing for a stream the writer
 * installed; it still installs any journal stream that holds a head but
 * no branch row, such as one appended before the writer did this.
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
      if (input.expected.kind === 'store' && !isLivePathBranchId(branchId)) {
        // Refused INSIDE the transaction and before the append, so
        // nothing lands and nothing is skipped in silence: the caller
        // records this on the same shadow tripwire every other mirror
        // refusal reaches.
        //
        // Only a STORE expectation is refused here (task 1.6). The
        // number it carries is the match log's next sequence, and a
        // rewind has just made that stop meaning a journal revision. A
        // JOURNAL expectation was read from the effective head itself,
        // so it already describes the activated branch - refusing it
        // would refuse a rewound stream for being rewound, which is
        // what S5 could only do and what this task undoes.
        return {
          kind: 'refused',
          result: { kind: 'rewound-stream', branchId },
        };
      }
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
