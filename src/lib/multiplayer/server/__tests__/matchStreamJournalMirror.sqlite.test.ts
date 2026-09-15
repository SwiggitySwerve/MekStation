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
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S1)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
import { type IMatchMeta } from '../IMatchStore';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '../matchJournalAuthority';
import { mirrorMatchBatchToJournal } from '../MatchStreamJournalMirror';

const MATCH_ID = 'match-journal-mirror';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;

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
function mirrorDirect(commandId: string, expectedRevision: number) {
  return mirrorMatchBatchToJournal(getSQLiteService().getDatabase(), {
    matchId: MATCH_ID,
    commandId,
    actorId: 'p1',
    expectedRevision,
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
