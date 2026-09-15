/**
 * S3-a of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.3, first
 * sub-prefix): "has journal authority started for this match stream"
 * derived from S1's real journal state instead of the
 * `mp_journal_authority_started` marker.
 *
 * ADDITIVE ONLY. No caller is repointed here and the marker table, its
 * write and its read all stay exactly where they are — which is why
 * every row below asserts the two signals SEPARATELY. If they were
 * asserted together a later sub-prefix could delete the marker write
 * and nothing would go red.
 *
 * Real boundary only: two temp-file SQLite databases opened the way
 * production opens them, plus a cold reopen, because the question is
 * whether the answer survives on DISK. A signal that lives in an open
 * handle would pass in-process and answer "not started" after a
 * restart, which is the exact failure the marker exists to avoid.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S3)
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
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
import type { IMatchJournalAuthorityStarted } from '../matchJournalAuthority';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta } from '../IMatchStore';
import {
  MATCH_BASELINE_BRANCH_ID,
  MATCH_BASELINE_FIRST_GENERATION,
} from '../matchAuthorityBaseline';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
} from '../matchJournalAuthority';
import { deriveMatchJournalAuthorityStartedHead } from '../matchJournalAuthorityStartedDerived';

const MATCH_ID = 'match-derived-started';
const AT = '2026-09-15T00:00:00.000Z';

function meta(): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [],
    status: 'lobby',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function event(sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    payload: { sequence },
  } as unknown as IGameEvent;
}

/** The one-time fact the OLD (still-off) task-2.3/2.4 path writes. */
function startedFact(): IMatchJournalAuthorityStarted {
  return {
    matchId: MATCH_ID,
    commandId: 'cmd-1',
    firstRevision: 0,
    lastRevision: 1,
    head: {
      streamType: 'match',
      streamId: MATCH_ID,
      branchId: MATCH_BASELINE_BRANCH_ID,
      revision: 1,
      digest: 'd'.repeat(64),
      effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
    },
    committedAt: AT,
  };
}

function batch(started?: IMatchJournalAuthorityStarted): IMatchCommandBatch {
  return {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
    expectedPostStateDigest: 'digest-1',
    ...(started ? { journalAuthorityStarted: started } : {}),
  };
}

let dir = '';
let matchDbPath = '';
let store: DurableMatchStore;

function openCampaign(): void {
  getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
}

function openStore(): DurableMatchStore {
  return new DurableMatchStore({
    path: matchDbPath,
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
}

/** The legacy marker read, kept separate from the derived answer. */
function marker(): Promise<IMatchJournalAuthorityStarted | null> {
  return store.getJournalAuthorityStarted(MATCH_ID);
}

/**
 * The boolean these rows are written around, projected at the CALL SITE
 * now that the module offers only the outcome. S7-b retired the
 * exported projection: a second export of the same question is the
 * drift task 1.3 removes, and a test helper cannot drift from
 * production because nothing in production reads it.
 */
function derived(): boolean {
  return (
    deriveMatchJournalAuthorityStartedHead(store, MATCH_ID).kind === 'started'
  );
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'derived-started-'));
  matchDbPath = path.join(dir, 'multiplayer-matches.db');
  resetSQLiteService();
  openCampaign();
  _resetProcessShadowStatsForTests();
  _setCombatJournalAuthorityModeForTests('shadow');
  store = openStore();
  await store.createMatch(meta());
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  store.close();
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('journal-authority "started" derived from the mirrored stream', () => {
  it('answers not-started for a match whose stream has no journal rows', async () => {
    // A created match is not a started stream: ServerMatchHost.create
    // persists its initial events through `appendEvent`, which never
    // mirrors. Only a COMMITTED BATCH installs the effective head.
    expect(derived()).toBe(false);
    expect(await marker()).toBeNull();
  });

  it('answers started once a batch is committed through the mirror', async () => {
    const result = await store.appendCommandBatch!(MATCH_ID, batch());

    expect(result.kind).toBe('committed');
    expect(derived()).toBe(true);
  });

  it('still answers started after a cold reopen of both databases', async () => {
    await store.appendCommandBatch!(MATCH_ID, batch());

    store.close();
    resetSQLiteService();
    openCampaign();
    store = openStore();

    expect(derived()).toBe(true);
  });

  it('answers not-started at the production default mode, marker unchanged', async () => {
    _setCombatJournalAuthorityModeForTests('off');

    const result = await store.appendCommandBatch!(MATCH_ID, batch());

    expect(result.kind).toBe('committed');
    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
    expect(derived()).toBe(false);
    expect(await marker()).toBeNull();
  });

  it('is not flipped by the legacy marker the old path writes', async () => {
    // The discriminating row for sub-prefix (2): a repoint that reads
    // the marker under a derived NAME would pass every other row here.
    _setCombatJournalAuthorityModeForTests('off');

    await store.appendCommandBatch!(MATCH_ID, batch(startedFact()));

    expect((await marker())?.commandId).toBe('cmd-1');
    expect(derived()).toBe(false);
  });

  it('does not write the legacy marker when the mirror starts the stream', async () => {
    await store.appendCommandBatch!(MATCH_ID, batch());

    expect(derived()).toBe(true);
    expect(await marker()).toBeNull();
  });

  it('offers exactly one derivation of started, not two', async () => {
    // S7-b (task 1.3, sub-prefix 3). `isMatchJournalAuthorityStartedDerived`
    // was added beside the outcome function in S3-a so a caller could be
    // repointed incrementally; the S3-b review measured that it has zero
    // production consumers once both call sites read the outcome. A
    // boolean projection nobody calls is a second shape of the question
    // task 1.3 exists to leave exactly one of, so the module surface
    // itself is the assertion.
    const surface = await import('../matchJournalAuthorityStartedDerived');

    expect(Object.keys(surface).sort()).toEqual([
      'deriveMatchJournalAuthorityStartedHead',
    ]);
  });

  it('refuses typed rather than answering not-started on a corrupt head', async () => {
    await store.appendCommandBatch!(MATCH_ID, batch());
    // A head naming a non-effective branch is persisted corruption, not
    // "never started". Answering false would hide it behind a legal
    // answer; History B refuses this shape MATCH_QUARANTINED upstream.
    getSQLiteService()
      .getDatabase()
      .prepare(
        `UPDATE event_history_branches SET status = 'superseded'
          WHERE stream_type = 'match' AND stream_id = ?`,
      )
      .run(MATCH_ID);

    expect(() => derived()).toThrow(EventHistoryBranchError);
  });
});
