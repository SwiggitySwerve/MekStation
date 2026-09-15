/**
 * S2 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.2): the
 * live branch admission consult answered against a REAL journal head.
 *
 * The pre-existing 14.2 suite builds its head with raw SQL, so it
 * proves the consult's logic and nothing about where a head comes
 * from. Finding #48 is exactly that gap: in production
 * `readEffectiveHead` answers null for every match, so all four
 * illegal shapes are structurally dead. This file closes the S1-to-S2
 * join — a real combat batch commits through the store's command
 * boundary, S1's mirror installs the journal head and the genesis /
 * effective-head rows, and the four shapes are then driven through
 * `handleIntent` against THAT head.
 *
 * Two temp-file SQLite databases opened the way production opens them
 * (match file + campaign file), and one row restarts both so a head
 * that lived only in an open handle cannot pass.
 *
 * MODE IS THE DISCRIMINATOR. Only the test-configured override turns
 * the mirror on; the production constant is never touched. The last
 * row clears the override and runs on that constant, pinning the
 * honest shipped behaviour — no head, inert consult — and that is what
 * makes the other rows falsifiable: with the override removed they go
 * red because no head exists to read.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/tasks.md (1.2)
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  _branchCreationSeamForTests,
  type IEventHistoryEffectiveHead,
} from '@/lib/events/journal/EventHistoryBranchContract';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso, type IIntent } from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  COMBAT_JOURNAL_AUTHORITY_MODE,
  getCombatJournalAuthorityMode,
} from '../matchJournalAuthority';
import { ServerMatchHost } from '../ServerMatchHost';
import {
  HISTORY_INTEGRITY_BLOCKED_REASON,
  LIVE_BRANCH_ADMISSION_PHRASING,
} from '../ServerMatchHostBranchAdmission';

const AT = '2026-09-15T00:00:00.000Z';
const CANDIDATE = 'candidate-1';

let dir = '';
let matchDbPath = '';
let db: Database.Database;
let store: DurableMatchStore;

function streamOf(matchId: string) {
  return { streamType: 'match' as const, streamId: matchId };
}

function openCampaign(): void {
  getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
  db = getSQLiteService().getDatabase();
}

function openStore(): DurableMatchStore {
  return new DurableMatchStore({
    path: matchDbPath,
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
}

function meta(matchId: string): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) =>
      seat.slotId === 'alpha-1' || seat.slotId === 'bravo-1'
        ? {
            ...seat,
            occupant: {
              playerId: seat.slotId === 'alpha-1' ? 'pid_host' : 'pid_opp',
              displayName: seat.slotId === 'alpha-1' ? 'Host' : 'Opp',
            },
            ready: true,
          }
        : seat,
    ),
  };
}

/** Build a host over the current store; the match row may already exist. */
async function openHost(matchId: string): Promise<ServerMatchHost> {
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

/** Create the match, seed the head through the mirror, then open a host. */
async function makeSeededMatch(matchId: string): Promise<{
  readonly host: ServerMatchHost;
  readonly head: IEventHistoryEffectiveHead;
}> {
  await store.createMatch(meta(matchId));
  const head = await seedJournalHead(matchId);
  return { host: await openHost(matchId), head };
}

function envelope(
  matchId: string,
  playerId: string,
  intent: IIntent['intent'],
  intentId: string,
): IIntent {
  return { kind: 'Intent', matchId, ts: nowIso(), playerId, intent, intentId };
}

function advance(matchId: string, intentId: string, playerId = 'pid_opp') {
  return envelope(matchId, playerId, { kind: 'AdvancePhase' }, intentId);
}

function errorOf(
  frames: readonly { kind: string; code?: string }[],
  code: string,
) {
  return frames.find((frame) => frame.kind === 'Error' && frame.code === code);
}

function journalCount(matchId: string): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM event_journal_events
          WHERE stream_type = 'match' AND stream_id = ?`,
      )
      .get(matchId) as { n: number }
  ).n;
}

function seedEvent(matchId: string): IGameEvent {
  return {
    id: `${matchId}-seed-0`,
    sequence: 0,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    payload: {},
  } as unknown as IGameEvent;
}

/**
 * Commit one real combat batch through the store's command boundary —
 * the same `appendCommandBatch` the host's commit path calls — so S1's
 * mirror, not this test, installs the journal head and the genesis /
 * effective-head rows.
 *
 * It runs BEFORE the host exists on purpose. `ServerMatchHost.create`
 * persists its initial events outside the batch path, so a mirror that
 * starts after them is already behind the match log and every later
 * batch refuses `revision-conflict` (S1's disclosed no-catch-up). The
 * HEAD still stands, and the head is the only thing S2's consult
 * reads — which is exactly why the rows below assert on it and not on
 * the journal tail.
 */
async function seedJournalHead(
  matchId: string,
): Promise<IEventHistoryEffectiveHead> {
  const committed = await store.appendCommandBatch!(matchId, {
    commandId: `${matchId}-seed`,
    actorId: 'pid_host',
    expectedRevision: 0,
    events: [seedEvent(matchId)],
    expectedPostStateDigest: 'a'.repeat(64),
  });
  expect(committed.kind).toBe('committed');
  expect(journalCount(matchId)).toBe(1);
  const head = store.readEffectiveHead(streamOf(matchId));
  expect(head).not.toBeNull();
  return head!;
}

/**
 * Model a completed rewind activation on top of the mirror's head. The
 * branch port exposes no activation call (the compare-and-swap lives in
 * the branch-activation seam, not in this store), so the head row moves
 * directly — the same writer the shipped 14.2 suite uses. What is NOT
 * hand-built is the head being moved: the mirror installed it.
 */
function activateReplacement(matchId: string, genesisBranchId: string): void {
  const stream = streamOf(matchId);
  const branches = new SQLiteEventHistoryBranchStore(
    db,
    _branchCreationSeamForTests(),
  );
  branches.createBranch({
    ...stream,
    branchId: CANDIDATE,
    parentBranchId: genesisBranchId,
    ancestorDepth: 1,
    baseRevision: 1,
    baseEventId: `${genesisBranchId}#1`,
    baseDigest: 'b'.repeat(64),
    status: 'building',
    createdBy: 'gm-1',
    reason: 'authorized rewind',
    createdAt: AT,
  });
  branches.transitionBranchStatus(stream, genesisBranchId, 'superseded');
  branches.transitionBranchStatus(stream, CANDIDATE, 'effective');
  db.prepare(
    `UPDATE event_history_effective_heads
        SET branch_id = ?, effective_generation = 2
      WHERE stream_type = 'match' AND stream_id = ?`,
  ).run(CANDIDATE, matchId);
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'journal-head-admit-'));
  matchDbPath = path.join(dir, 'multiplayer-matches.db');
  resetSQLiteService();
  openCampaign();
  _resetProcessShadowStatsForTests();
  _setCombatJournalAuthorityModeForTests('shadow');
  store = openStore();
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  store.close();
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('live branch admission against a mirror-installed journal head', () => {
  it('the mirrored head is the live-path identity and admits legal intents', async () => {
    const matchId = 'join-live-path';
    const { host, head } = await makeSeededMatch(matchId);

    // The consult's live-path test is what this branchId has to satisfy;
    // asserting it here is what makes the refusal rows below meaningful
    // (a head off the live path would refuse everything).
    expect(head.effectiveGeneration).toBe(1);
    const before = (await store.getEvents(matchId)).length;
    const frames = await host.handleIntent(advance(matchId, 'legal-1'));
    expect(errorOf(frames, 'STALE_BRANCH')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(before);
  });

  it('shape 1: an intent off the live-path identity is STALE_BRANCH on the mirrored head, appends nothing, and the host resumes once rebuilt', async () => {
    const matchId = 'shape-stale';
    const { host, head } = await makeSeededMatch(matchId);
    activateReplacement(matchId, head.branchId);

    const before = (await store.getEvents(matchId)).length;
    const journalBefore = journalCount(matchId);
    const frames = await host.handleIntent(advance(matchId, 'stale-1'));

    expect(errorOf(frames, 'STALE_BRANCH')).toMatchObject({
      code: 'STALE_BRANCH',
      reason: LIVE_BRANCH_ADMISSION_PHRASING.STALE_BRANCH,
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
      conflictHead: { branchId: CANDIDATE, revision: before },
    });
    expect((await store.getEvents(matchId)).length).toBe(before);
    expect(journalCount(matchId)).toBe(journalBefore);

    // Alive, not poisoned: the refusal is a frame, and a host rebuilt
    // onto the activated branch is admitted again.
    host.adoptServedBranch(CANDIDATE);
    const after = await host.handleIntent(advance(matchId, 'stale-2'));
    expect(errorOf(after, 'STALE_BRANCH')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(before);
  });

  it('shape 2: a mirrored head left naming a non-effective branch is MATCH_QUARANTINED with no head to resync to', async () => {
    const matchId = 'shape-quarantine';
    const { host, head } = await makeSeededMatch(matchId);
    // Activation supersedes the prior branch and installs the
    // replacement head in ONE transaction, so this pair — branch
    // superseded, head still naming it — is state no activation can
    // produce. It is persisted corruption, not staleness.
    //
    // BOTH intent-path consults read this head, and History B guarded
    // both: measured on this branch, disabling either one alone leaves
    // this row green, and only disabling both turns it red. That is the
    // intended shape — the rebuild consult runs first, so it is where
    // the throw actually surfaces (History B's red stack), and the
    // branch consult's own guard is the backstop.
    new SQLiteEventHistoryBranchStore(db).transitionBranchStatus(
      streamOf(matchId),
      head.branchId,
      'superseded',
    );

    const before = (await store.getEvents(matchId)).length;
    const journalBefore = journalCount(matchId);
    const frames = await host.handleIntent(advance(matchId, 'corrupt-1'));

    const refusal = errorOf(frames, 'MATCH_QUARANTINED');
    expect(refusal).toMatchObject({
      code: 'MATCH_QUARANTINED',
      reason: HISTORY_INTEGRITY_BLOCKED_REASON,
    });
    expect(refusal).not.toHaveProperty('conflictHead');
    expect(refusal).not.toHaveProperty('recoveryAction');
    expect(errorOf(frames, 'STALE_BRANCH')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBe(before);
    expect(journalCount(matchId)).toBe(journalBefore);

    // Still answering, still refusing — a throw here would kill the match.
    const again = await host.handleIntent(advance(matchId, 'corrupt-2'));
    expect(errorOf(again, 'MATCH_QUARANTINED')).toMatchObject({
      reason: HISTORY_INTEGRITY_BLOCKED_REASON,
    });
    expect((await store.getEvents(matchId)).length).toBe(before);
    expect(journalCount(matchId)).toBe(journalBefore);
  });

  it("shape 3: a targetRevision-bearing intent from a player is GM_ONLY while the host's own passes admission", async () => {
    const matchId = 'shape-gm-only';
    const { host } = await makeSeededMatch(matchId);
    const cut = { kind: 'AdvancePhase' as const, targetRevision: 1 };

    const before = (await store.getEvents(matchId)).length;
    const journalBefore = journalCount(matchId);
    const player = await host.handleIntent(
      envelope(matchId, 'pid_opp', cut as IIntent['intent'], 'cut-p'),
    );

    expect(errorOf(player, 'GM_ONLY')).toMatchObject({
      code: 'GM_ONLY',
      reason: LIVE_BRANCH_ADMISSION_PHRASING.GM_ONLY,
    });
    expect(errorOf(player, 'GM_ONLY')).not.toHaveProperty('conflictHead');
    expect((await store.getEvents(matchId)).length).toBe(before);
    expect(journalCount(matchId)).toBe(journalBefore);

    const fromHost = await host.handleIntent(
      envelope(matchId, 'pid_host', cut as IIntent['intent'], 'cut-h'),
    );
    expect(errorOf(fromHost, 'GM_ONLY')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(before);
  });

  it('shape 4: a RewindRequest is accepted-for-gm-review, derives no event, and the next legal intent still commits', async () => {
    const matchId = 'shape-rewind-request';
    const { host } = await makeSeededMatch(matchId);

    const before = (await store.getEvents(matchId)).length;
    const journalBefore = journalCount(matchId);
    const frames = await host.handleIntent(
      envelope(
        matchId,
        'pid_opp',
        {
          kind: 'RewindRequest',
          targetRevision: 1,
          reason: 'please rewind to the last clean turn',
        },
        'req-1',
      ),
    );

    expect(errorOf(frames, 'INVALID_INTENT')).toMatchObject({
      reason: 'accepted-for-gm-review',
    });
    expect((await store.getEvents(matchId)).length).toBe(before);
    expect(journalCount(matchId)).toBe(journalBefore);

    const legal = await host.handleIntent(advance(matchId, 'after-req'));
    expect(errorOf(legal, 'INVALID_INTENT')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(before);
  });

  it('the head outlives the process: a cold reopen still refuses the stale shape', async () => {
    const matchId = 'cold-reopen';
    const { head } = await makeSeededMatch(matchId);
    activateReplacement(matchId, head.branchId);

    // Both files closed and reopened from disk. A head living only in
    // an open handle would answer null here and admit the intent. The
    // reopened host logs a sequence collision persisting its initial
    // events over the existing log — expected, and beside the point:
    // admission answers before any of that reaches the engine.
    store.close();
    resetSQLiteService();
    openCampaign();
    store = openStore();
    const host = await openHost(matchId);

    expect(store.readEffectiveHead(streamOf(matchId))?.branchId).toBe(
      CANDIDATE,
    );
    const before = (await store.getEvents(matchId)).length;
    const frames = await host.handleIntent(advance(matchId, 'reopen-1'));

    expect(errorOf(frames, 'STALE_BRANCH')).toMatchObject({
      code: 'STALE_BRANCH',
      conflictHead: { branchId: CANDIDATE },
    });
    expect((await store.getEvents(matchId)).length).toBe(before);
  });
});

describe('the shipped cutover mode', () => {
  it('installs no head, so the consult is inert and every intent commits', async () => {
    // The honest pin of finding #48: this is what ships today. It is
    // also the discriminator — the rows above depend on the mirror
    // being on, and go red without it.
    //
    // CLEARING the override rather than naming 'off' is the point: the
    // row runs on COMBAT_JOURNAL_AUTHORITY_MODE itself. Its VALUE is
    // then pinned, because that is the only assertion here a cutover
    // can falsify — measured, the outcome assertions below survive a
    // flip to 'shadow' on their own, since the mirror's first batch
    // still loses to `create`'s non-batch initial persist and never
    // lands. So the day S6 flips the constant, this row reds and has to
    // be rewritten instead of quietly restating a belief.
    _setCombatJournalAuthorityModeForTests(null);
    expect(getCombatJournalAuthorityMode()).toBe('off');
    expect(COMBAT_JOURNAL_AUTHORITY_MODE).toBe('off');
    const matchId = 'mode-off';
    await store.createMatch(meta(matchId));
    const host = await openHost(matchId);

    const frames = await host.handleIntent(advance(matchId, 'off-1'));

    expect(store.readEffectiveHead(streamOf(matchId))).toBeNull();
    expect(journalCount(matchId)).toBe(0);
    expect(errorOf(frames, 'STALE_BRANCH')).toBeUndefined();
    expect(errorOf(frames, 'MATCH_QUARANTINED')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(0);
  });
});
