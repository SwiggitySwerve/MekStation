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

import type { StreamRebuildRefusal } from '@/lib/events/journal/EventHistoryCommandAdmission';
import type {
  ICampaignSessionParticipantPort,
  IEventHistoryBranchPort,
  IParticipantDeliveryCursorPort,
} from '@/lib/events/storeCapabilityPorts';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { readDurableStreamRebuild } from '@/lib/events/journal/EventHistoryDurableRebuild';
import { normalizeRoomCode } from '@/lib/p2p/roomCodes';
import { isSqliteUniqueConstraintError } from '@/services/persistence/sqliteConstraintErrors';

import type {
  IMatchCommandBatch,
  IMatchCommandReceipt,
  MatchBatchAppendResult,
} from './matchCommandBatch';
import type {
  IMatchJournalAuthorityBaseline,
  IMatchJournalAuthorityStarted,
} from './matchJournalAuthority';

import { bindDurableCapabilityPorts } from './durableCapabilityPorts';
import {
  insertJournalAuthorityBaselineRow,
  JOURNAL_AUTHORITY_BASELINE_SCHEMA_SQL,
  readJournalAuthorityBaseline,
} from './DurableMatchStore.journalAuthorityBaseline';
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
  VIEWER_DELIVERY_ACK_SCHEMA_SQL,
  VIEWER_DELIVERY_SCHEMA_SQL,
  selectViewerDeliveryAcknowledgement,
  upsertViewerDeliveryAcknowledgement,
} from './DurableMatchStore.viewerDelivery';
import {
  MatchNotFoundError,
  MatchStoreSequenceCollisionError,
  type IMatchMeta,
  type IMatchMetaPatch,
  type IMatchCombatOutcomeOutbox,
  type IMatchPublication,
  type IMatchStore,
  type IMatchStreamRebuildStore,
  type IPublicationOutboxStore,
  type IViewerDeliveryAcknowledgement,
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
  matchesCommandFingerprint,
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

  CREATE TABLE IF NOT EXISTS mp_combat_outcome_outbox (
    match_id       TEXT PRIMARY KEY,
    outcome_id     TEXT NOT NULL,
    outcome_version INTEGER NOT NULL,
    outcome_json   TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    published_at   TEXT,
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
  CREATE INDEX IF NOT EXISTS idx_mp_combat_outcome_outbox_pending
    ON mp_combat_outcome_outbox(match_id, published_at);
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

interface ICombatOutcomeOutboxRow {
  readonly outcome_id: string;
  readonly outcome_version: number;
  readonly outcome_json: string;
  readonly created_at: string;
  readonly published_at: string | null;
}

// =============================================================================
// Store
// =============================================================================

let failAtHeadUpdateForTests = false;
let failAtHeadUpdateOnce = false;
export type E2EFaultKind =
  | 'append-event-insert'
  | 'append-outbox-insert'
  | 'append-head-update'
  | 'process-exit-before-commit'
  | 'process-exit-after-commit';

/** Every fault kind the lever can arm, in batch-lifecycle order. */
export const E2E_FAULT_KINDS: readonly E2EFaultKind[] = [
  'append-event-insert',
  'append-outbox-insert',
  'append-head-update',
  'process-exit-before-commit',
  'process-exit-after-commit',
];

/**
 * The session an arm belongs to (umbrella finding #72).
 *
 * The catalog header governing E2E-61..70 and design D9 both require every
 * fault seam to carry "explicit session scope"; this lever carried none,
 * so an arm was process-wide and the next batch append on ANY match
 * consumed it. A fault that cannot say which session it belongs to cannot
 * be used by a pack that arms several faults across several tests.
 */
export interface IE2EFaultScope {
  readonly matchId: string;
}

/**
 * Run-scoped sentinel root. The paths under it used to be fixed and
 * repo-relative (`data/.e2e-fault-append-head-update`), which made an
 * aborted run's leftover sentinel indistinguishable from this run's - a
 * live landmine for whoever ran next. Keying on the Playwright run id
 * makes a foreign run's sentinel visibly foreign, and makes the
 * start-up sweep below able to tell the difference.
 */
export const E2E_FAULT_SENTINEL_ROOT = 'data/.e2e-fault';

/** The current run id, or null when nothing identifies this run. */
function currentE2ERunId(): string | null {
  const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  return runId && runId.length > 0 ? runId : null;
}

/** Sentinel path for one kind in one run, or null without a run id. */
export function e2eFaultSentinelPath(
  kind: E2EFaultKind,
  runId: string | null = currentE2ERunId(),
): string | null {
  return runId ? path.join(E2E_FAULT_SENTINEL_ROOT, runId, kind) : null;
}

const armedE2EFaults: Record<E2EFaultKind, IE2EFaultScope | null> = {
  'append-event-insert': null,
  'append-outbox-insert': null,
  'append-head-update': null,
  'process-exit-before-commit': null,
  'process-exit-after-commit': null,
};
let exitProcessForE2EFault: (code: number) => void = process.exit;

/**
 * Cross-module-graph one-shot arm. The e2e fault route runs in Next's
 * bundle while the socket host's store lives in the tsx graph - two
 * module graphs, two copies of the flags above (the same split that
 * once left the socket path's SQLite singleton uninitialized). A
 * sentinel file is graph-agnostic; it carries its scope as its contents,
 * is consumed (unlinked) at the failure point, and the stat only ever
 * runs in e2e mode.
 */
function readSentinelScope(sentinel: string): IE2EFaultScope | null {
  try {
    const raw = fs.readFileSync(sentinel, 'utf-8');
    const parsed = JSON.parse(raw) as { matchId?: unknown };
    return typeof parsed.matchId === 'string'
      ? { matchId: parsed.matchId }
      : null;
  } catch {
    // An unreadable or unparseable sentinel names no session, and a
    // fault that cannot name its session must not fire.
    return null;
  }
}

/** Write one run-scoped sentinel carrying its session scope. */
export function _writeE2EFaultSentinel(
  kind: E2EFaultKind,
  scope: IE2EFaultScope,
): void {
  const sentinel = e2eFaultSentinelPath(kind);
  if (!sentinel) return;
  fs.mkdirSync(path.dirname(sentinel), { recursive: true });
  fs.writeFileSync(
    sentinel,
    JSON.stringify({
      matchId: scope.matchId,
      armedAt: new Date().toISOString(),
    }),
  );
}

function consumeSentinelFault(kind: E2EFaultKind, matchId: string): boolean {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return false;
  try {
    const sentinel = e2eFaultSentinelPath(kind);
    if (!sentinel || !fs.existsSync(sentinel)) return false;
    // Scope is checked BEFORE the unlink: a fault armed for another match
    // must still be waiting when that match arrives, not burned by this
    // one. Consuming first and comparing after would silently disarm it.
    const scope = readSentinelScope(sentinel);
    if (!scope || scope.matchId !== matchId) return false;
    fs.unlinkSync(sentinel);
    return true;
  } catch {
    return false;
  }
}

function consumeE2EFault(kind: E2EFaultKind, matchId: string): boolean {
  // Evaluate EVERY arm - the route arms both the module map and the
  // cross-graph sentinel, and one fault must consume them together or
  // the survivor fires a second time (the short-circuit bug, twice).
  const armedInGraph = armedE2EFaults[kind];
  const graphFired = armedInGraph?.matchId === matchId;
  if (graphFired) armedE2EFaults[kind] = null;
  const sentinelFired = consumeSentinelFault(kind, matchId);
  return graphFired || sentinelFired;
}

export function _armE2EFaultOnce(
  kind: E2EFaultKind,
  scope: IE2EFaultScope,
): void {
  armedE2EFaults[kind] = scope;
}

export function _isE2EFaultArmed(kind: E2EFaultKind): boolean {
  const sentinel = e2eFaultSentinelPath(kind);
  return (
    armedE2EFaults[kind] !== null ||
    (sentinel !== null && fs.existsSync(sentinel))
  );
}

/**
 * Delete every fault sentinel that does NOT belong to the current run,
 * returning how many were cleared. Called at server start so an aborted
 * run cannot arm the next one; never touches the current run's own
 * sentinels, and does nothing at all outside e2e mode.
 */
export function clearStaleE2EFaultSentinels(): number {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return 0;
  const keep = currentE2ERunId();
  let cleared = 0;
  try {
    for (const entry of fs.readdirSync(E2E_FAULT_SENTINEL_ROOT)) {
      if (entry === keep) continue;
      fs.rmSync(path.join(E2E_FAULT_SENTINEL_ROOT, entry), {
        recursive: true,
        force: true,
      });
      cleared += 1;
    }
  } catch {
    // No sentinel root is the normal case: nothing stale to clear.
  }
  return cleared;
}

/** Test-only: replace the fatal process-exit boundary with an observable seam. */
export function _setE2EFaultProcessExitForTests(
  exit: (code: number) => void,
): void {
  exitProcessForE2EFault = exit;
}

/** Test-only: restore all one-shot e2e arms and their process-exit seam. */
export function _resetE2EFaultsForTests(): void {
  for (const kind of E2E_FAULT_KINDS) {
    armedE2EFaults[kind] = null;
    const sentinel = e2eFaultSentinelPath(kind);
    try {
      if (sentinel) fs.unlinkSync(sentinel);
    } catch {
      // A missing sentinel is already reset.
    }
  }
  failAtHeadUpdateOnce = false;
  exitProcessForE2EFault = process.exit;
}

/** Exit at an e2e-only failure boundary after consuming its one-shot arm. */
export function exitForE2EFault(kind: E2EFaultKind, matchId: string): void {
  if (!consumeE2EFault(kind, matchId)) return;
  exitProcessForE2EFault(1);
  throw new Error(`test-${kind}`);
}

/** Test-only: crash the batch transaction at the head-update statement. */
export function _setFailAtHeadUpdateForTests(fail: boolean): void {
  failAtHeadUpdateForTests = fail;
}

/**
 * Whether a head-update fault is currently armed (introspection).
 *
 * `_armFailAtHeadUpdateOnce` used to sit here as an UNSCOPED arm with no
 * callers left. It is deleted rather than updated: leaving a
 * scope-free way to arm the lever would reopen finding #72 from inside
 * the module that just closed it.
 */
export function _isFailAtHeadUpdateArmed(): boolean {
  return (
    failAtHeadUpdateOnce ||
    failAtHeadUpdateForTests ||
    _isE2EFaultArmed('append-head-update')
  );
}

export interface IDurableMatchStoreOptions {
  /**
   * On-disk path for the SQLite file. Defaults to
   * `MULTIPLAYER_DB_PATH` env var or `./data/multiplayer-matches.db`.
   * Pass `':memory:'` for an ephemeral store (used by the contract test
   * suite so it never touches disk).
   */
  readonly path?: string;
  /**
   * Campaign-database handle. Branch, participant, and cursor tables
   * live in SQLiteService (mekstation.db), never this store's match
   * file. A getter so construction does not open that database unless
   * a capability method actually runs.
   */
  readonly capabilityDb?: () => Database.Database;
}

export class DurableMatchStore
  implements
    IMatchStore,
    IMatchStreamRebuildStore,
    IPublicationOutboxStore,
    IViewerDeliveryStore
{
  // Port members are assigned at construction by bindDurableCapabilityPorts; declare keeps them on the type with no runtime emit and no class/interface merge.
  declare readBranch: IEventHistoryBranchPort['readBranch'];
  declare requireBranch: IEventHistoryBranchPort['requireBranch'];
  declare readEffectiveHead: IEventHistoryBranchPort['readEffectiveHead'];
  declare requireEffectiveHead: IEventHistoryBranchPort['requireEffectiveHead'];
  declare createBranch: IEventHistoryBranchPort['createBranch'];
  declare transitionBranchStatus: IEventHistoryBranchPort['transitionBranchStatus'];
  declare bindCampaignSessionParticipant: ICampaignSessionParticipantPort['bindCampaignSessionParticipant'];
  declare activeCampaignSessionMembership: ICampaignSessionParticipantPort['activeCampaignSessionMembership'];
  declare isActiveCampaignGm: ICampaignSessionParticipantPort['isActiveCampaignGm'];
  declare campaignHasAnyActiveSeat: ICampaignSessionParticipantPort['campaignHasAnyActiveSeat'];
  declare isActiveCampaignSeat: ICampaignSessionParticipantPort['isActiveCampaignSeat'];
  declare listActiveCampaignSessionParticipants: ICampaignSessionParticipantPort['listActiveCampaignSessionParticipants'];
  declare revokeCampaignSessionParticipant: ICampaignSessionParticipantPort['revokeCampaignSessionParticipant'];
  declare isRevokedCampaignSessionParticipant: ICampaignSessionParticipantPort['isRevokedCampaignSessionParticipant'];
  declare readParticipantDeliveryCursor: IParticipantDeliveryCursorPort['readParticipantDeliveryCursor'];
  declare recordParticipantAcknowledgement: IParticipantDeliveryCursorPort['recordParticipantAcknowledgement'];

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
    this.db.exec(VIEWER_DELIVERY_ACK_SCHEMA_SQL);
    this.db.exec(JOURNAL_AUTHORITY_BASELINE_SCHEMA_SQL);
    // Capability tables are not in this.db — see durableCapabilityPorts.
    bindDurableCapabilityPorts(this, options);
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

  getJournalAuthorityBaseline = (
    matchId: string,
  ): IMatchJournalAuthorityBaseline | null =>
    readJournalAuthorityBaseline(this.db, matchId);

  insertJournalAuthorityBaseline = (
    baseline: IMatchJournalAuthorityBaseline,
  ): void => insertJournalAuthorityBaselineRow(this.db, baseline);

  /**
   * Whether a correction lease is rebuilding this match's history.
   *
   * `this.db` is deliberately NOT passed. The branch and lease tables
   * live in `SQLiteService`'s database, not this store's own file — see
   * `EventHistoryDurableRebuild` for the measurement. The capability is
   * still implemented HERE, which is what makes it structural: a store
   * with no database at all cannot answer it, and says so by not having
   * the method.
   */
  readMatchStreamRebuild = (matchId: string): StreamRebuildRefusal | null =>
    readDurableStreamRebuild({ streamType: 'match', streamId: matchId });

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
        return matchesCommandFingerprint(prior.fingerprint, batch)
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
      // E2E-63's letter names three failure points - "a middle event, head
      // update, or outbox insert" - and only the head update existed
      // (finding #75). The two below are the other two, fired at the
      // MIDDLE of the batch so a partial write is genuinely attempted:
      // failing the first event would prove only that an empty
      // transaction rolls back, which is not what the scenario claims.
      // An index loop rather than `.entries()`: this tsconfig's target
      // rejects iterating an array iterator without `downlevelIteration`.
      const middleIndex = Math.floor(batch.events.length / 2);
      for (let index = 0; index < batch.events.length; index += 1) {
        const event = batch.events[index];
        const eventJson = JSON.stringify(event);
        if (
          index === middleIndex &&
          consumeE2EFault('append-event-insert', matchId)
        ) {
          throw new Error('test-append-event-insert');
        }
        insertEvent.run(matchId, event.sequence, eventJson);
        if (
          index === middleIndex &&
          consumeE2EFault('append-outbox-insert', matchId)
        ) {
          // Deliberately AFTER its own event insert: this is the window
          // the outbox exists to close - an event durable with nothing
          // durable saying anyone still has to be told about it.
          throw new Error('test-append-outbox-insert');
        }
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
      // Umbrella 3.2's named crash seam: die between the receipt insert
      // and the head update, proving the transaction takes everything
      // above down with it. Test-only, same pattern as the other seams.
      // Evaluate EVERY arm before deciding - the route arms both the
      // module flag and the cross-graph sentinel, and one fault must
      // consume them together or the survivor fires a second time.
      exitForE2EFault('process-exit-before-commit', matchId);
      const armedOnce = failAtHeadUpdateOnce;
      const armedFault = consumeE2EFault('append-head-update', matchId);
      if (failAtHeadUpdateForTests || armedOnce || armedFault) {
        failAtHeadUpdateOnce = false;
        throw new Error('test-crash-at-head-update');
      }
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
      if (batch.combatOutcome) {
        const already = this.db
          .prepare(`SELECT 1 FROM mp_combat_outcome_outbox WHERE match_id = ?`)
          .get(matchId);
        if (already) {
          throw new Error('combat-outcome already exists');
        }
        const outcome = batch.combatOutcome;
        this.db
          .prepare(
            `INSERT INTO mp_combat_outcome_outbox
               (match_id, outcome_id, outcome_version, outcome_json, created_at, published_at)
             VALUES (?, ?, ?, ?, ?, NULL)`,
          )
          .run(
            matchId,
            outcome.outcomeId,
            outcome.outcomeVersion,
            JSON.stringify(outcome.outcome),
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

  getLastCommandReceipt = async (
    matchId: string,
  ): Promise<IMatchCommandReceipt | null> => {
    const row = this.db
      .prepare(
        `SELECT * FROM mp_command_receipts
         WHERE match_id = ?
         ORDER BY last_revision DESC
         LIMIT 1`,
      )
      .get(matchId) as ICommandReceiptRow | undefined;
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

  getCombatOutcomeOutbox = async (
    matchId: string,
  ): Promise<IMatchCombatOutcomeOutbox | null> => {
    const row = this.db
      .prepare(
        `SELECT outcome_id, outcome_version, outcome_json, created_at, published_at
         FROM mp_combat_outcome_outbox WHERE match_id = ?`,
      )
      .get(matchId) as ICombatOutcomeOutboxRow | undefined;
    if (!row) return null;
    return {
      matchId,
      outcomeId: row.outcome_id,
      outcomeVersion: row.outcome_version,
      outcome: JSON.parse(row.outcome_json) as ICombatOutcome,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    };
  };

  markCombatOutcomePublished = async (
    matchId: string,
    outcomeId: string,
  ): Promise<void> => {
    this.db
      .prepare(
        `UPDATE mp_combat_outcome_outbox SET published_at = ?
         WHERE match_id = ? AND outcome_id = ? AND published_at IS NULL`,
      )
      .run(new Date().toISOString(), matchId, outcomeId);
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

  /** See `IViewerDeliveryAcknowledgementStore`. Monotonic in the SQL. */
  acknowledgeViewerDelivery = async (
    ack: IViewerDeliveryAcknowledgement,
  ): Promise<void> => {
    upsertViewerDeliveryAcknowledgement(this.db, ack);
  };

  getViewerDeliveryAcknowledgement = async (
    matchId: string,
    playerId: string,
  ): Promise<IViewerDeliveryAcknowledgement | null> => {
    return selectViewerDeliveryAcknowledgement(this.db, matchId, playerId);
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
