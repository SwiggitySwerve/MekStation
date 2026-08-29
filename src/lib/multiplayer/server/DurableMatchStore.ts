/**
 * DurableMatchStore — production `IMatchStore` backed by an embedded
 * transactional SQLite database (better-sqlite3).
 *
 * Per `harden-multiplayer-transport` design D1/D2: this implements the
 * existing `IMatchStore` interface UNCHANGED, so `ServerMatchHost`, the
 * REST routes, and the WebSocket upgrade handler depend only on
 * `IMatchStore` and are agnostic to which implementation is wired.
 * `InMemoryMatchStore` is kept verbatim as the dev-only fallback.
 *
 * File layout (frozen by design D2):
 *   - `mp_matches`  — one row per match holding the serialized
 *     `IMatchMeta` JSON blob, plus a denormalized `status` /
 *     `room_code` column for cheap server-side filtering and invite
 *     resolution.
 *   - `mp_match_events` — one row per `(match_id, sequence)` holding the
 *     serialized `IGameEvent` JSON blob. `(match_id, sequence)` is the
 *     PRIMARY KEY so the storage layer's unique constraint enforces the
 *     `appendEvent` sequence-collision guarantee.
 *
 * Key invariants (mirror of `IMatchStore`):
 *   - `appendEvent` is transactional all-or-nothing — a sequence
 *     collision rejects with `MatchStoreSequenceCollisionError` and
 *     leaves the store untouched.
 *   - `getEvents(matchId, fromSeq?)` returns events with
 *     `sequence >= fromSeq`, ordered ascending, with no gaps.
 *   - `closeMatch` is idempotent.
 *   - Completed-match logs are retained for a 7-day window (design
 *     Open-Question resolution) so server-side post-match inspection
 *     works; `pruneExpiredMatches()` reaps anything older.
 *
 * Why a separate DB file from `mekstation.db`: the multiplayer match
 * store has a very different write profile (hot `appendEvent` path) and
 * retention policy from the unit-vault / campaign tables. Keeping it in
 * its own file avoids WAL contention and lets a deploy nuke the match
 * store without touching campaign data.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { normalizeRoomCode } from '@/lib/p2p/roomCodes';
import { isSqliteUniqueConstraintError } from '@/services/persistence/sqliteConstraintErrors';

import type {
  IMatchCommandBatch,
  IMatchCommandReceipt,
  MatchBatchAppendResult,
} from './matchCommandBatch';
import type { IMatchJournalAuthorityStarted } from './matchJournalAuthority';

import {
  createDurableLegacyImportStore,
  LEGACY_IMPORT_SCHEMA_SQL,
  readDurableImportedEventSources,
  readDurableLegacyImportMarker,
  type IImportedEventSourceRow,
} from './DurableMatchStore.legacyImport';
import {
  insertViewerDeliveryRecord,
  selectViewerDeliveryRecords,
  VIEWER_DELIVERY_SCHEMA_SQL,
} from './DurableMatchStore.viewerDelivery';
import {
  MatchNotFoundError,
  MatchStoreSequenceCollisionError,
  type IMatchMeta,
  type IMatchMetaPatch,
  type IMatchPublication,
  type IMatchStore,
  type IPublicationOutboxStore,
  type IViewerDeliveryRecord,
  type IViewerDeliveryStore,
} from './IMatchStore';
import {
  importLegacyMatchEvents,
  type IImportLegacyMatchEventsDeps,
  type ILegacyImportMarker,
  type LegacyEventImportResult,
} from './importLegacyMatchEvents';
import {
  firstNonContiguousSequence,
  matchCommandFingerprint,
} from './matchCommandBatch';

// =============================================================================
// Constants
// =============================================================================

/**
 * Completed-match retention window. Per the design Open-Question
 * resolution, the durable store honors the same 7-day retention the
 * `multiplayer-sync` spec describes for client-side IndexedDB so
 * server-side post-match inspection works. `pruneExpiredMatches` reaps
 * `completed` matches whose `updatedAt` is older than this.
 */
export const COMPLETED_MATCH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Default on-disk location for the multiplayer match database.
 * Resolved lazily (not at module-eval time) so a test or deploy can
 * set `MULTIPLAYER_DB_PATH` before the first store is constructed.
 */
function defaultDbPath(): string {
  return process.env.MULTIPLAYER_DB_PATH || './data/multiplayer-matches.db';
}

// =============================================================================
// Schema
// =============================================================================

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS mp_matches (
    match_id    TEXT PRIMARY KEY,
    status      TEXT NOT NULL,
    room_code   TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    meta_json   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mp_match_events (
    match_id   TEXT NOT NULL,
    sequence   INTEGER NOT NULL,
    event_json TEXT NOT NULL,
    PRIMARY KEY (match_id, sequence),
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mp_command_receipts (
    match_id       TEXT NOT NULL,
    command_id     TEXT NOT NULL,
    actor_id       TEXT NOT NULL,
    first_revision INTEGER NOT NULL,
    last_revision  INTEGER NOT NULL,
    event_count    INTEGER NOT NULL,
    fingerprint    TEXT NOT NULL,
    post_digest    TEXT,
    committed_at   TEXT NOT NULL,
    PRIMARY KEY (match_id, command_id),
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mp_match_outbox (
    match_id     TEXT NOT NULL,
    sequence     INTEGER NOT NULL,
    command_id   TEXT NOT NULL,
    event_json   TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    published_at TEXT,
    PRIMARY KEY (match_id, sequence),
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mp_journal_authority_started (
    match_id              TEXT NOT NULL PRIMARY KEY,
    command_id            TEXT NOT NULL,
    first_revision        INTEGER NOT NULL,
    last_revision         INTEGER NOT NULL,
    stream_type           TEXT NOT NULL CHECK (stream_type = 'match'),
    stream_id             TEXT NOT NULL,
    branch_id             TEXT NOT NULL,
    revision              INTEGER NOT NULL,
    digest                TEXT NOT NULL,
    effective_generation  INTEGER NOT NULL CHECK (effective_generation >= 1),
    committed_at          TEXT NOT NULL,
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_mp_matches_status ON mp_matches(status);
  CREATE INDEX IF NOT EXISTS idx_mp_matches_room_code ON mp_matches(room_code);
  CREATE INDEX IF NOT EXISTS idx_mp_match_events_match ON mp_match_events(match_id, sequence);
  CREATE INDEX IF NOT EXISTS idx_mp_match_outbox_pending
    ON mp_match_outbox(match_id, published_at, sequence);
`;

// =============================================================================
// Row shapes
// =============================================================================

interface ICommandReceiptRow {
  readonly match_id: string;
  readonly command_id: string;
  readonly actor_id: string;
  readonly first_revision: number;
  readonly last_revision: number;
  readonly event_count: number;
  readonly fingerprint: string;
  readonly post_digest: string | null;
  readonly committed_at: string;
}

/** Row -> receipt. Kept next to the row shape so they change together. */
function receiptFrom(row: ICommandReceiptRow): IMatchCommandReceipt {
  return {
    commandId: row.command_id,
    actorId: row.actor_id,
    matchId: row.match_id,
    firstRevision: row.first_revision,
    lastRevision: row.last_revision,
    eventCount: row.event_count,
    fingerprint: row.fingerprint,
    expectedPostStateDigest: row.post_digest,
    committedAt: row.committed_at,
  };
}

interface IJournalAuthorityStartedRow {
  readonly match_id: string;
  readonly command_id: string;
  readonly first_revision: number;
  readonly last_revision: number;
  readonly stream_type: 'match';
  readonly stream_id: string;
  readonly branch_id: string;
  readonly revision: number;
  readonly digest: string;
  readonly effective_generation: number;
  readonly committed_at: string;
}

function startedFrom(
  row: IJournalAuthorityStartedRow,
): IMatchJournalAuthorityStarted {
  return {
    matchId: row.match_id,
    commandId: row.command_id,
    firstRevision: row.first_revision,
    lastRevision: row.last_revision,
    head: {
      streamType: row.stream_type,
      streamId: row.stream_id,
      branchId: row.branch_id,
      revision: row.revision,
      digest: row.digest,
      effectiveGeneration: row.effective_generation,
    },
    committedAt: row.committed_at,
  };
}

interface IMatchRow {
  readonly match_id: string;
  readonly status: string;
  readonly room_code: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly meta_json: string;
}

interface IEventRow {
  readonly event_json: string;
}

interface IOutboxRow {
  readonly sequence: number;
  readonly command_id: string;
  readonly event_json: string;
  readonly created_at: string;
}

// =============================================================================
// Store
// =============================================================================

export interface IDurableMatchStoreOptions {
  /**
   * On-disk path for the SQLite file. Defaults to
   * `MULTIPLAYER_DB_PATH` env var or `./data/multiplayer-matches.db`.
   * Pass `':memory:'` for an ephemeral store (used by the contract test
   * suite so it never touches disk).
   */
  readonly path?: string;
}

export class DurableMatchStore
  implements IMatchStore, IPublicationOutboxStore, IViewerDeliveryStore
{
  private readonly db: Database.Database;

  /**
   * Open (and migrate) the SQLite-backed match store. The constructor
   * is synchronous — `better-sqlite3` is a synchronous-class embedded
   * store so `IMatchStore`'s async surface is satisfied trivially via
   * `Promise.resolve`, and the hot `appendEvent` path is a local
   * synchronous write wrapped in a transaction.
   */
  constructor(options: IDurableMatchStoreOptions = {}) {
    const dbPath = options.path ?? defaultDbPath();
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new Database(dbPath);
    // WAL mode keeps reads non-blocking during the hot append path.
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);
    this.db.exec(LEGACY_IMPORT_SCHEMA_SQL);
    this.db.exec(VIEWER_DELIVERY_SCHEMA_SQL);
  }

  /**
   * Copy a retained legacy log into this match's event table. See
   * `importLegacyMatchEvents` — the bulk path, not `appendCommandBatch`.
   */
  importLegacyEvents = (
    input: Omit<IImportLegacyMatchEventsDeps, 'store'>,
  ): LegacyEventImportResult =>
    importLegacyMatchEvents({
      ...input,
      store: createDurableLegacyImportStore(this.db),
    });

  getLegacyImportMarker = (matchId: string): ILegacyImportMarker | null =>
    readDurableLegacyImportMarker(this.db, matchId);

  getImportedEventSources = (
    matchId: string,
  ): readonly IImportedEventSourceRow[] =>
    readDurableImportedEventSources(this.db, matchId);

  createMatch = async (meta: IMatchMeta): Promise<string> => {
    const existing = this.db
      .prepare('SELECT match_id FROM mp_matches WHERE match_id = ?')
      .get(meta.matchId);
    if (existing) {
      throw new Error(
        `Match already exists in store: ${meta.matchId} (call createMatch with a fresh id)`,
      );
    }
    // A match's invite code only resolves while it is in `lobby`
    // status — mirror `InMemoryMatchStore`'s indexing rule.
    const indexedRoomCode =
      meta.roomCode && meta.status === 'lobby'
        ? normalizeRoomCode(meta.roomCode)
        : null;
    this.db
      .prepare(
        `INSERT INTO mp_matches
           (match_id, status, room_code, created_at, updated_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        meta.matchId,
        meta.status,
        indexedRoomCode,
        meta.createdAt,
        meta.updatedAt,
        JSON.stringify(meta),
      );
    return meta.matchId;
  };

  /**
   * Append one command's events atomically (PR 1, tasks 1.1-1.2).
   *
   * Everything happens inside ONE SQLite transaction: the identity
   * lookup, the revision check, every event INSERT, the receipt, and the
   * `updated_at` bump. That is what gives the command a boundary - a
   * failure anywhere rolls the whole thing back, so no reader ever sees
   * a command that half happened.
   *
   * Order inside the transaction is deliberate. Identity is checked
   * FIRST, because a retry that arrives after someone else moved the
   * stream is still a retry, and reporting it as a revision conflict
   * would send the caller off to rebuild state it already has.
   */
  appendCommandBatch = async (
    matchId: string,
    batch: IMatchCommandBatch,
  ): Promise<MatchBatchAppendResult> => {
    const match = this.getMatchRow(matchId);
    if (!match) throw new MatchNotFoundError(matchId);
    if (batch.events.length === 0) {
      // An empty batch would commit a receipt for a command that did
      // nothing, and a later retry would then "succeed" having still
      // done nothing.
      return { kind: 'empty-batch' };
    }
    const offending = firstNonContiguousSequence(batch);
    if (offending !== null) {
      return {
        kind: 'non-contiguous',
        expectedRevision: batch.expectedRevision,
        offendingSequence: offending,
      };
    }

    const fingerprint = matchCommandFingerprint(batch);
    const committedAt = new Date().toISOString();

    const tx = this.db.transaction((): MatchBatchAppendResult => {
      const prior = this.db
        .prepare(
          `SELECT * FROM mp_command_receipts
           WHERE match_id = ? AND command_id = ?`,
        )
        .get(matchId, batch.commandId) as ICommandReceiptRow | undefined;
      if (prior) {
        // Same id, same work: the caller never saw the acknowledgement.
        // Same id, different work: refuse rather than overwrite.
        return prior.fingerprint === fingerprint
          ? { kind: 'duplicate-command', receipt: receiptFrom(prior) }
          : { kind: 'integrity-conflict', commandId: batch.commandId };
      }

      const head = this.db
        .prepare(
          `SELECT COALESCE(MAX(sequence) + 1, 0) AS next
           FROM mp_match_events WHERE match_id = ?`,
        )
        .get(matchId) as { next: number };
      if (head.next !== batch.expectedRevision) {
        return {
          kind: 'revision-conflict',
          expectedRevision: batch.expectedRevision,
          actualRevision: head.next,
        };
      }

      const insertEvent = this.db.prepare(
        `INSERT INTO mp_match_events (match_id, sequence, event_json)
         VALUES (?, ?, ?)`,
      );
      // The publication row goes down beside its event, inside this
      // same transaction (umbrella task 7.1). Writing it afterwards
      // would leave a window where the event is committed and nothing
      // durable says anyone still has to be told about it - the hole
      // `Commit Precedes Recipient Publication` names. The contract
      // suite fails this INSERT on its own and asserts the events came
      // down with it, so a later move out of here is noticed.
      const insertOutbox = this.db.prepare(
        `INSERT INTO mp_match_outbox
           (match_id, sequence, command_id, event_json, created_at, published_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      );
      for (const event of batch.events) {
        const eventJson = JSON.stringify(event);
        insertEvent.run(matchId, event.sequence, eventJson);
        insertOutbox.run(
          matchId,
          event.sequence,
          batch.commandId,
          eventJson,
          committedAt,
        );
      }
      const first = batch.events[0].sequence;
      const last = batch.events[batch.events.length - 1].sequence;
      this.db
        .prepare(
          `INSERT INTO mp_command_receipts
             (match_id, command_id, actor_id, first_revision, last_revision,
              event_count, fingerprint, post_digest, committed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          matchId,
          batch.commandId,
          batch.actorId,
          first,
          last,
          batch.events.length,
          fingerprint,
          batch.expectedPostStateDigest ?? null,
          committedAt,
        );
      this.db
        .prepare(`UPDATE mp_matches SET updated_at = ? WHERE match_id = ?`)
        .run(committedAt, matchId);
      if (batch.journalAuthorityStarted) {
        const already = this.db
          .prepare(
            `SELECT 1 FROM mp_journal_authority_started WHERE match_id = ?`,
          )
          .get(matchId);
        if (already) {
          throw new Error('journal-authority-started already exists');
        }
        const fact = batch.journalAuthorityStarted;
        this.db
          .prepare(
            `INSERT INTO mp_journal_authority_started
               (match_id, command_id, first_revision, last_revision,
                stream_type, stream_id, branch_id, revision, digest,
                effective_generation, committed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            matchId,
            fact.commandId,
            fact.firstRevision,
            fact.lastRevision,
            fact.head.streamType,
            fact.head.streamId,
            fact.head.branchId,
            fact.head.revision,
            fact.head.digest,
            fact.head.effectiveGeneration,
            committedAt,
          );
      }

      return {
        kind: 'committed',
        receipt: {
          commandId: batch.commandId,
          actorId: batch.actorId,
          matchId,
          firstRevision: first,
          lastRevision: last,
          eventCount: batch.events.length,
          fingerprint,
          expectedPostStateDigest: batch.expectedPostStateDigest ?? null,
          committedAt,
        },
      };
    });

    return tx();
  };

  getCommandReceipt = async (
    matchId: string,
    commandId: string,
  ): Promise<IMatchCommandReceipt | null> => {
    const row = this.db
      .prepare(
        `SELECT * FROM mp_command_receipts
         WHERE match_id = ? AND command_id = ?`,
      )
      .get(matchId, commandId) as ICommandReceiptRow | undefined;
    return row ? receiptFrom(row) : null;
  };

  getJournalAuthorityStarted = async (
    matchId: string,
  ): Promise<IMatchJournalAuthorityStarted | null> => {
    const row = this.db
      .prepare(`SELECT * FROM mp_journal_authority_started WHERE match_id = ?`)
      .get(matchId) as IJournalAuthorityStartedRow | undefined;
    return row ? startedFrom(row) : null;
  };

  appendEvent = async (matchId: string, event: IGameEvent): Promise<void> => {
    const match = this.getMatchRow(matchId);
    if (!match) throw new MatchNotFoundError(matchId);
    // Transactional all-or-nothing: the sequence-collision check, the
    // event INSERT, and the `updated_at` bump all run inside a single
    // SQLite transaction.
    //
    // The collision is detected by an EXPLICIT check inside the
    // transaction (a SELECT for the existing `(matchId, sequence)`
    // row) rather than by catching the `(match_id, sequence)` PRIMARY
    // KEY violation — the explicit check is deterministic and
    // independent of how a given better-sqlite3 build phrases /
    // surfaces its `SqliteError`. The PRIMARY KEY constraint remains as
    // a defense-in-depth backstop against a concurrent writer that
    // races between the check and the INSERT.
    const tx = this.db.transaction((mId: string, evt: IGameEvent) => {
      const existing = this.db
        .prepare(
          `SELECT 1 FROM mp_match_events
           WHERE match_id = ? AND sequence = ?`,
        )
        .get(mId, evt.sequence);
      if (existing) {
        throw new MatchStoreSequenceCollisionError(mId, evt.sequence);
      }
      try {
        this.db
          .prepare(
            `INSERT INTO mp_match_events (match_id, sequence, event_json)
             VALUES (?, ?, ?)`,
          )
          .run(mId, evt.sequence, JSON.stringify(evt));
      } catch (e) {
        // Backstop: a concurrent writer won the race between the
        // SELECT above and this INSERT — the unique constraint catches
        // it. Map it to the same collision error.
        if (isUniqueConstraintError(e)) {
          throw new MatchStoreSequenceCollisionError(mId, evt.sequence);
        }
        throw e;
      }
      // Keep `updatedAt` fresh both on the row column and inside the
      // serialized meta blob so a later `getMatchMeta` agrees with the
      // column-level filter used by recovery.
      const nextMeta: IMatchMeta = {
        ...(JSON.parse(match.meta_json) as IMatchMeta),
        updatedAt: new Date().toISOString(),
      };
      this.db
        .prepare(
          `UPDATE mp_matches SET updated_at = ?, meta_json = ?
           WHERE match_id = ?`,
        )
        .run(nextMeta.updatedAt, JSON.stringify(nextMeta), mId);
    });
    tx(matchId, event);
  };

  /**
   * See `IPublicationOutboxStore.listPendingPublications`. An unknown
   * match answers `[]` rather than throwing, unlike every other reader
   * here.
   */
  listPendingPublications = async (
    matchId: string,
  ): Promise<readonly IMatchPublication[]> => {
    const rows = this.db
      .prepare(
        `SELECT sequence, command_id, event_json, created_at
         FROM mp_match_outbox
         WHERE match_id = ? AND published_at IS NULL
         ORDER BY sequence ASC`,
      )
      .all(matchId) as IOutboxRow[];
    return rows.map((row) => ({
      matchId,
      sequence: row.sequence,
      commandId: row.command_id,
      event: JSON.parse(row.event_json) as IGameEvent,
      createdAt: row.created_at,
    }));
  };

  /**
   * See `IPublicationOutboxStore.markPublicationsPublished`. ONLY the
   * named sequences are marked; a row nobody named stays pending, which
   * stops a drain that died halfway from forgetting the frames it never
   * sent.
   *
   * There is deliberately no `published_at IS NULL` guard. It would read
   * as "the first mark stays authoritative", but `published_at` is on no
   * record this store hands out and in no SELECT it answers with, so no
   * caller could tell whether the guard was there — and a rule whose
   * removal no test can notice is not a rule.
   */
  markPublicationsPublished = async (
    matchId: string,
    sequences: readonly number[],
  ): Promise<void> => {
    if (sequences.length === 0) return;
    const publishedAt = new Date().toISOString();
    const mark = this.db.prepare(
      `UPDATE mp_match_outbox SET published_at = ?
       WHERE match_id = ? AND sequence = ?`,
    );
    this.db.transaction(() => {
      for (const sequence of sequences) {
        mark.run(publishedAt, matchId, sequence);
      }
    })();
  };

  appendViewerDeliveryRecord = async (
    record: IViewerDeliveryRecord,
  ): Promise<void> => {
    insertViewerDeliveryRecord(this.db, record);
  };

  listViewerDeliveryRecords = async (
    matchId: string,
  ): Promise<readonly IViewerDeliveryRecord[]> => {
    return selectViewerDeliveryRecords(this.db, matchId);
  };

  getEvents = async (
    matchId: string,
    fromSeq = 0,
  ): Promise<readonly IGameEvent[]> => {
    if (!this.getMatchRow(matchId)) {
      throw new MatchNotFoundError(matchId);
    }
    const rows = this.db
      .prepare(
        `SELECT event_json FROM mp_match_events
         WHERE match_id = ? AND sequence >= ?
         ORDER BY sequence ASC`,
      )
      .all(matchId, fromSeq <= 0 ? 0 : fromSeq) as IEventRow[];
    return rows.map((r) => JSON.parse(r.event_json) as IGameEvent);
  };

  getMatchMeta = async (matchId: string): Promise<IMatchMeta> => {
    const row = this.getMatchRow(matchId);
    if (!row) throw new MatchNotFoundError(matchId);
    return JSON.parse(row.meta_json) as IMatchMeta;
  };

  updateMatchMeta = async (
    matchId: string,
    patch: IMatchMetaPatch,
  ): Promise<void> => {
    const row = this.getMatchRow(matchId);
    if (!row) throw new MatchNotFoundError(matchId);
    const before = JSON.parse(row.meta_json) as IMatchMeta;
    // Mirror `InMemoryMatchStore`: an explicit `roomCode: null` clears
    // the field; an absent key leaves it alone.
    const { roomCode: patchRoomCode, ...restPatch } = patch;
    const nextRoomCode =
      patchRoomCode === null ? undefined : (patchRoomCode ?? before.roomCode);
    const nextMeta: IMatchMeta = {
      ...before,
      ...restPatch,
      roomCode: nextRoomCode,
      updatedAt: new Date().toISOString(),
    };
    // Invite codes resolve ONLY while the match is in `lobby` status.
    const indexedRoomCode =
      nextMeta.roomCode && nextMeta.status === 'lobby'
        ? normalizeRoomCode(nextMeta.roomCode)
        : null;
    this.db
      .prepare(
        `UPDATE mp_matches
         SET status = ?, room_code = ?, updated_at = ?, meta_json = ?
         WHERE match_id = ?`,
      )
      .run(
        nextMeta.status,
        indexedRoomCode,
        nextMeta.updatedAt,
        JSON.stringify(nextMeta),
        matchId,
      );
  };

  getMatchByRoomCode = async (roomCode: string): Promise<IMatchMeta | null> => {
    const normalized = normalizeRoomCode(roomCode);
    const row = this.db
      .prepare('SELECT * FROM mp_matches WHERE room_code = ?')
      .get(normalized) as IMatchRow | undefined;
    if (!row) return null;
    if (row.status !== 'lobby') return null;
    return JSON.parse(row.meta_json) as IMatchMeta;
  };

  closeMatch = async (matchId: string): Promise<void> => {
    const row = this.getMatchRow(matchId);
    if (!row) return; // idempotent — closing a missing match is a no-op
    if (row.status === 'completed') return; // already closed
    const nextMeta: IMatchMeta = {
      ...(JSON.parse(row.meta_json) as IMatchMeta),
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `UPDATE mp_matches
         SET status = 'completed', room_code = NULL, updated_at = ?, meta_json = ?
         WHERE match_id = ?`,
      )
      .run(nextMeta.updatedAt, JSON.stringify(nextMeta), matchId);
  };

  // ---------------------------------------------------------------------------
  // Recovery + retention surface (not part of the IMatchStore contract)
  // ---------------------------------------------------------------------------

  /**
   * Enumerate the metadata of every match in `status: 'active'`. Used
   * by the server-startup recovery routine (design D3) to re-instantiate
   * a `ServerMatchHost` per surviving match. Synchronous-class read
   * exposed async to match the rest of the store's surface.
   */
  listActiveMatches = async (): Promise<readonly IMatchMeta[]> => {
    const rows = this.db
      .prepare("SELECT meta_json FROM mp_matches WHERE status = 'active'")
      .all() as Pick<IMatchRow, 'meta_json'>[];
    return rows.map((r) => JSON.parse(r.meta_json) as IMatchMeta);
  };

  /**
   * Enumerate every tracked match, optionally filtered by `status`.
   * `add-matchmaking-and-spectator` (M3, design D2): the joinable-lobby
   * and spectatable-match queries both read through this method. The
   * `status` filter hits the `idx_mp_matches_status` index so a scan is
   * never needed for a single-status query.
   */
  listMatches = async (
    filter: { readonly status?: IMatchMeta['status'] } = {},
  ): Promise<readonly IMatchMeta[]> => {
    const rows = filter.status
      ? (this.db
          .prepare('SELECT meta_json FROM mp_matches WHERE status = ?')
          .all(filter.status) as Pick<IMatchRow, 'meta_json'>[])
      : (this.db.prepare('SELECT meta_json FROM mp_matches').all() as Pick<
          IMatchRow,
          'meta_json'
        >[]);
    return rows.map((r) => JSON.parse(r.meta_json) as IMatchMeta);
  };

  /**
   * Reap `completed` matches whose `updatedAt` is older than the
   * 7-day retention window. Returns the number of matches pruned. The
   * `ON DELETE CASCADE` foreign key drops their event rows too.
   */
  pruneExpiredMatches = (now: number = Date.now()): number => {
    const cutoff = new Date(now - COMPLETED_MATCH_RETENTION_MS).toISOString();
    const result = this.db
      .prepare(
        `DELETE FROM mp_matches
         WHERE status = 'completed' AND updated_at < ?`,
      )
      .run(cutoff);
    return result.changes;
  };

  /** Number of matches currently tracked. Test/observability only. */
  size = (): number => {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM mp_matches')
      .get() as { n: number };
    return row.n;
  };

  /** Close the underlying SQLite handle. Call on server shutdown. */
  close = (): void => {
    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // best-effort checkpoint; close regardless
    }
    this.db.close();
  };

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private getMatchRow(matchId: string): IMatchRow | undefined {
    return this.db
      .prepare('SELECT * FROM mp_matches WHERE match_id = ?')
      .get(matchId) as IMatchRow | undefined;
  }
}

/**
 * True iff the error is a SQLite UNIQUE/PRIMARY-KEY constraint
 * violation. better-sqlite3 throws a `SqliteError` carrying a `.code`
 * (e.g. `SQLITE_CONSTRAINT_PRIMARYKEY`, `SQLITE_CONSTRAINT_UNIQUE`, or
 * the broader `SQLITE_CONSTRAINT`); the human message is
 * "UNIQUE constraint failed: ...". We match on EITHER so the detection
 * is robust across better-sqlite3 versions and platform builds — a CI
 * runner's prebuilt binary can phrase the message differently from a
 * locally-compiled one.
 */
function isUniqueConstraintError(e: unknown): boolean {
  // Delegates to the shared predicate, which duck-types rather than
  // gating on `instanceof Error` - a cross-realm error object carries a
  // usable message and code but fails the identity check.
  return isSqliteUniqueConstraintError(e);
}
