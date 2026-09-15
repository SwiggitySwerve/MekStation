/**
 * S1 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.1): a
 * committed combat batch reaches `event_journal_events`, its stream
 * head, and the match's genesis / effective-head rows.
 *
 * Real boundary only: two temp-file SQLite databases opened the way
 * production opens them, read back over a SEPARATE connection, because
 * the question is whether rows LAND. Nor is the cold reopen ceremony —
 * a head living only in an open handle would pass in-process and refuse
 * `no-authoritative-history` after a restart.
 *
 * S5 (task 1.5) adds the other half: the module's REVISION OFFSET note
 * warned that the untranslated passthrough is true only on a stream
 * never rewound, and nothing enforced it. A rewound stream is built
 * here with the real machinery - a candidate anchored below the head,
 * a sealed manifest, a held lease, `activateCandidateBranch`, and the
 * store tail moved into `mp_match_events_superseded`.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S1, S5)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchCommandBatch } from '../matchCommandBatch';

import { DurableMatchStore } from '../DurableMatchStore';
import { nextMatchSequenceAfter } from '../history/matchStoreBranchSegmentReader';
import { type IMatchMeta } from '../IMatchStore';
import { MATCH_BASELINE_BRANCH_ID } from '../matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '../matchJournalAuthority';
import { mirrorMatchBatchToJournal } from '../MatchStreamJournalMirror';

const MATCH_ID = 'match-journal-mirror';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-15T00:00:00.000Z';
const CANDIDATE_BRANCH_ID = 'candidate-rewind-1';
const REWIND_REASON = 'authorized combat rewind';

function meta(): IMatchMeta {
  const now = '2026-09-15T00:00:00.000Z';
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function event(sequence: number, id = `evt-${sequence}`): IGameEvent {
  return {
    id,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: '2026-09-15T00:00:00.000Z',
    phase: GamePhase.Movement,
    payload: { sequence },
  } as unknown as IGameEvent;
}

function batch(): IMatchCommandBatch {
  return {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
    expectedPostStateDigest: 'digest-1',
  };
}

let sqliteDir = '';
let matchDbPath = '';
let store: DurableMatchStore | undefined;

/** Call the mirror directly, outside the match store's commit path. */
function mirrorDirect(commandId: string, nextMatchSequence: number) {
  return mirrorMatchBatchToJournal(getSQLiteService().getDatabase(), {
    matchId: MATCH_ID,
    commandId,
    actorId: 'p1',
    nextMatchSequence,
    events: [event(2)],
  });
}

function openStore(): DurableMatchStore {
  return new DurableMatchStore({
    path: matchDbPath,
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
}

/** Query the campaign file directly so nothing in-process answers for it. */
function queryCampaign<T>(sql: string): readonly T[] {
  const db = new Database(path.join(sqliteDir, 'mekstation.db'), {
    fileMustExist: true,
  });
  try {
    return db.prepare(sql).all(STREAM.streamType, STREAM.streamId) as T[];
  } finally {
    db.close();
  }
}

interface IJournalRow {
  readonly revision: number;
  readonly branchId: string;
  readonly payloadJson: string;
}

function journalRows(): readonly IJournalRow[] {
  return queryCampaign<IJournalRow>(
    `SELECT stream_revision AS revision, branch_id AS branchId,
            payload_json AS payloadJson
       FROM event_journal_events
      WHERE stream_type = ? AND stream_id = ?
      ORDER BY stream_revision`,
  );
}

function streamHeadRevision(): number | undefined {
  return queryCampaign<{ readonly revision: number }>(
    `SELECT stream_revision AS revision FROM event_journal_stream_heads
      WHERE stream_type = ? AND stream_id = ?`,
  )[0]?.revision;
}

interface IHeadRow {
  readonly branchId: string;
  readonly generation: number;
}

function effectiveHeadRow(): IHeadRow | undefined {
  return queryCampaign<IHeadRow>(
    `SELECT branch_id AS branchId, effective_generation AS generation
       FROM event_history_effective_heads
      WHERE stream_type = ? AND stream_id = ?`,
  )[0];
}

/**
 * Take the stream off the live path the way a committed GM rewind
 * does. `cutRevision` is the last revision kept, so it is also the
 * first DISCARDED store sequence (revision = sequence + 1), which is
 * the number `supersedeActivatedTail` hands the store after a commit.
 */
async function rewindStream(cutRevision: number): Promise<string> {
  const db = getSQLiteService().getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
    nowMs: () => 1_000_000,
  });
  const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
  const head = db
    .prepare(
      `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ?`,
    )
    .get(STREAM.streamType, STREAM.streamId) as {
    readonly revision: number;
    readonly digest: string;
  };
  const base = db
    .prepare(
      `SELECT event_id AS eventId, event_digest AS digest
         FROM event_journal_events
        WHERE stream_type = ? AND stream_id = ? AND stream_revision = ?`,
    )
    .get(STREAM.streamType, STREAM.streamId, cutRevision) as {
    readonly eventId: string;
    readonly digest: string;
  };
  db.prepare(
    `INSERT INTO event_history_branches
       (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
        base_revision, base_event_id, base_digest, status, created_by,
        reason, created_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'building', 'p1', ?, ?)`,
  ).run(
    STREAM.streamType,
    STREAM.streamId,
    CANDIDATE_BRANCH_ID,
    MATCH_BASELINE_BRANCH_ID,
    cutRevision,
    base.eventId,
    base.digest,
    'correction-rebuild:lease:1:rewind',
    AT,
  );
  manifests.sealArtifactManifest(
    STREAM,
    CANDIDATE_BRANCH_ID,
    [{ artifactKind: 'checkpoint', artifactId: 'ckpt-1', sourceRevision: 2 }],
    AT,
  );
  const lease = leases.acquireCorrectionLease({
    ...STREAM,
    owner: 'p1',
    actor: 'p1',
    reason: REWIND_REASON,
    ttlMs: 30_000,
    expectedBranchId: MATCH_BASELINE_BRANCH_ID,
    expectedRevision: head.revision,
    expectedDigest: head.digest,
    expectedGeneration: 1,
  });
  const activated = activateCandidateBranch(db, branches, leases, manifests, {
    stream: STREAM,
    candidateBranchId: CANDIDATE_BRANCH_ID,
    held: {
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
    },
    reason: REWIND_REASON,
    activatedAt: AT,
  });
  await store!.supersedeFrom!(MATCH_ID, cutRevision, AT);
  return activated.branchId;
}

/**
 * The store's OWN commit-time next-sequence answer, read back through
 * the only surface that reports it: a contiguous batch aimed at a
 * sequence the stream can never be at is refused with `actualRevision`
 * set to what the store computed - `nextMatchSequenceAfter` over its
 * own `MAX(sequence)` read.
 */
async function storeNextSequence(probeId: string): Promise<number> {
  const probe = await store!.appendCommandBatch!(MATCH_ID, {
    commandId: probeId,
    actorId: 'p1',
    expectedRevision: 9_999,
    events: [event(9_999, `${probeId}-evt`)],
  });
  if (probe.kind !== 'revision-conflict') {
    throw new Error(`probe expected a revision conflict, got ${probe.kind}`);
  }
  return probe.actualRevision;
}

beforeEach(async () => {
  sqliteDir = await mkdtemp(path.join(tmpdir(), 'match-journal-mirror-'));
  matchDbPath = path.join(sqliteDir, 'multiplayer-matches.db');
  resetSQLiteService();
  getSQLiteService({
    path: path.join(sqliteDir, 'mekstation.db'),
  }).initialize();
  _setCombatJournalAuthorityModeForTests('shadow');
  store = openStore();
  await store.createMatch(meta());
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  store?.close();
  store = undefined;
  resetSQLiteService();
  await rm(sqliteDir, { recursive: true, force: true });
});

describe('committed combat batches reach the journal', () => {
  it('appends the batch at contiguous revisions and installs the heads', async () => {
    const result = await store!.appendCommandBatch!(MATCH_ID, batch());

    expect(result.kind).toBe('committed');
    // Sequence N lives at revision N+1 (design S5), so a two-event
    // batch on an empty stream occupies revisions 1 and 2.
    const rows = journalRows();
    expect(rows.map((row) => row.revision)).toEqual([1, 2]);
    expect(new Set(rows.map((row) => row.branchId)).size).toBe(1);
    expect(
      rows.map(
        (row) =>
          (JSON.parse(row.payloadJson) as { matchEvent: { id: string } })
            .matchEvent.id,
      ),
    ).toEqual(['evt-0', 'evt-1']);
    expect(streamHeadRevision()).toBe(2);

    const head = effectiveHeadRow();
    expect(head?.branchId).toBe(rows[0].branchId);
    expect(head?.generation).toBe(1);
  });

  it('answers readEffectiveHead after a cold reopen', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    const branchId = effectiveHeadRow()?.branchId;

    store!.close();
    resetSQLiteService();
    getSQLiteService({
      path: path.join(sqliteDir, 'mekstation.db'),
    }).initialize();
    store = openStore();

    const reopened = store.readEffectiveHead(STREAM);
    expect(reopened).not.toBeNull();
    expect(reopened?.branchId).toBe(branchId);
    expect(reopened?.effectiveGeneration).toBe(1);
  });

  it('writes no journal rows for a duplicate command', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    const before = journalRows().length;

    const retry = await store!.appendCommandBatch!(MATCH_ID, batch());

    expect(retry.kind).toBe('duplicate-command');
    expect(journalRows()).toHaveLength(before);
    expect(streamHeadRevision()).toBe(2);
  });

  it('refuses an expected-head mismatch typed and writes nothing', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    const before = journalRows().length;

    // Aimed one revision below the head. Nothing may land: a partly
    // applied mirror would leave the head naming an uncommitted event.
    const refused = await mirrorDirect('cmd-stale', 1);

    expect(refused).toEqual({
      kind: 'revision-conflict',
      expectedRevision: 1,
      actualRevision: 2,
    });
    expect(journalRows()).toHaveLength(before);
    expect(streamHeadRevision()).toBe(2);
  });

  it('records a failed mirror on the tripwire admission consults', async () => {
    // The honesty case for the non-atomic cross-file pair is that a
    // lagging mirror becomes VISIBLE, so prove the counter moves.
    await store!.appendCommandBatch!(MATCH_ID, batch());
    // Push the head out of band so the next mirror aims below it.
    await mirrorDirect('cmd-out-of-band', 2);
    _resetProcessShadowStatsForTests();

    const result = await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-2',
      expectedRevision: 2,
      events: [event(2)],
    });

    expect(result.kind).toBe('committed');
    expect(getProcessShadowMismatchCount()).toBe(1);
  });

  it('writes no journal rows while the cutover mode is off', async () => {
    _setCombatJournalAuthorityModeForTests('off');

    const result = await store!.appendCommandBatch!(MATCH_ID, batch());

    expect(result.kind).toBe('committed');
    expect(await store!.getEvents(MATCH_ID)).toHaveLength(2);
    expect(journalRows()).toHaveLength(0);
    expect(streamHeadRevision()).toBeUndefined();
    expect(effectiveHeadRow()).toBeUndefined();
  });
});

describe('the sequence-versus-revision offset is named, not implied', () => {
  it('refuses to mirror a batch against a rewound stream', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    const branchId = await rewindStream(1);
    const before = journalRows().length;

    // The store's next sequence is 1 again after the tail moved out,
    // while the journal head is still at 2. Passing that through
    // untranslated would aim the mirror at a revision the journal has
    // already committed on another branch.
    const refused = await mirrorDirect('cmd-after-rewind', 1);

    expect(refused).toEqual({ kind: 'rewound-stream', branchId });
    expect(journalRows()).toHaveLength(before);
    expect(streamHeadRevision()).toBe(2);
    expect(effectiveHeadRow()?.branchId).toBe(branchId);
  });

  it('records the rewound refusal on the tripwire rather than skipping', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    await rewindStream(1);
    _resetProcessShadowStatsForTests();

    const committed = await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-post-rewind',
      expectedRevision: 1,
      events: [event(1, 'evt-1-rebuilt')],
    });

    // The match store still commits: the mirror never fails a command.
    expect(committed.kind).toBe('committed');
    expect(getProcessShadowMismatchCount()).toBe(1);
    expect(journalRows()).toHaveLength(2);
  });

  it('mirrors a never-rewound stream exactly as before', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    _resetProcessShadowStatsForTests();

    const second = await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-2',
      expectedRevision: 2,
      events: [event(2)],
    });

    expect(second.kind).toBe('committed');
    const rows = journalRows();
    expect(rows.map((row) => row.revision)).toEqual([1, 2, 3]);
    expect(new Set(rows.map((row) => row.branchId))).toEqual(
      new Set([MATCH_BASELINE_BRANCH_ID]),
    );
    expect(streamHeadRevision()).toBe(3);
    expect(effectiveHeadRow()).toEqual({
      branchId: MATCH_BASELINE_BRANCH_ID,
      generation: 1,
    });
    expect(getProcessShadowMismatchCount()).toBe(0);
  });

  it('agrees with the store commit-time next sequence at 0, 1 and N', async () => {
    expect(await storeNextSequence('probe-empty')).toBe(
      nextMatchSequenceAfter(null),
    );

    await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-one',
      expectedRevision: 0,
      events: [event(0)],
    });
    expect(await storeNextSequence('probe-one')).toBe(
      nextMatchSequenceAfter(0),
    );

    await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-many',
      expectedRevision: 1,
      events: [event(1), event(2), event(3)],
    });
    expect(await storeNextSequence('probe-many')).toBe(
      nextMatchSequenceAfter(3),
    );
  });
});
