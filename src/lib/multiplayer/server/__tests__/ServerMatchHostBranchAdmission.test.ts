/**
 * Live-path branch admission (umbrella 14.2). DurableMatchStore + temp
 * SQLiteService so the branch port is present. Predicted red on shipped
 * handleIntent: AdvancePhase commits; RewindRequest is unknown-kind.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { _branchCreationSeamForTests } from '@/lib/events/journal/EventHistoryBranchContract';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { hasHistoryBranchStore } from '@/lib/events/storeCapabilityPorts';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { NON_COMBAT_WIRE_INTENT_KINDS } from '@/simulation/runner/CombatActionSupport.wireIntentSupport';
import { type IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import {
  ErrorCodeSchema,
  nowIso,
  type IIntent,
} from '@/types/multiplayer/Protocol';

import type { IMatchMeta, IMatchStore } from '../IMatchStore';

import { LIVE_BRANCH_ADMISSION_PHRASING } from '../ServerMatchHostBranchAdmission';
import { DurableMatchStore } from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const AT = '2026-09-02T00:00:00.000Z';
describe('ServerMatchHost live branch admission', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'branch-admit-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'history.db') }).initialize();
    db = getSQLiteService().getDatabase();
    store = new DurableMatchStore({ path: ':memory:' });
  });

  afterEach(async () => {
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db, _branchCreationSeamForTests());
  }

  function seedStream(matchId: string): void {
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', 3, ?)`,
    ).run(matchId, 'd'.repeat(64));
    branches().backfillGenesisBranches();
  }

  function activateReplacement(matchId: string): void {
    const stream = { streamType: 'match' as const, streamId: matchId };
    const subject = branches();
    subject.createBranch({
      ...stream,
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 2,
      baseEventId: 'root#2',
      baseDigest: 'b'.repeat(64),
      status: 'building',
      createdBy: 'gm-1',
      reason: 'authorized rewind',
      createdAt: AT,
    });
    subject.transitionBranchStatus(stream, 'root', 'superseded');
    subject.transitionBranchStatus(stream, 'candidate-1', 'effective');
    db.prepare(
      `UPDATE event_history_effective_heads
         SET branch_id = 'candidate-1', effective_generation = 2
       WHERE stream_id = ?`,
    ).run(matchId);
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

  async function makeHost(
    matchId: string,
    matchStore: IMatchStore = store,
  ): Promise<ServerMatchHost> {
    await matchStore.createMatch(meta(matchId));
    const host = ServerMatchHost.create(matchId, matchStore, {
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

  function envelope(
    matchId: string,
    playerId: string,
    intent: IIntent['intent'],
    intentId: string,
  ): IIntent {
    return { kind: 'Intent', matchId, ts: nowIso(), playerId, intent, intentId };
  }

  function errorOf(
    frames: readonly { kind: string; code?: string }[],
    code: string,
  ) {
    return frames.find((frame) => frame.kind === 'Error' && frame.code === code);
  }

  function journalCount(): number {
    return (
      db.prepare('SELECT COUNT(*) AS n FROM event_journal_events').get() as {
        n: number;
      }
    ).n;
  }

  it('LAW-40 tripwires name every live-path refusal and RewindRequest', () => {
    expect(Object.keys(LIVE_BRANCH_ADMISSION_PHRASING)).toHaveLength(2);
    expect(ErrorCodeSchema.options).toEqual(
      expect.arrayContaining(['STALE_BRANCH', 'GM_ONLY']),
    );
    expect(NON_COMBAT_WIRE_INTENT_KINDS).toContain('RewindRequest');
  });

  it('player intent on a non-effective branch refused STALE_BRANCH with head + resync', async () => {
    const matchId = 'stale-other-branch';
    seedStream(matchId);
    activateReplacement(matchId);
    const host = await makeHost(matchId);
    const before = (await store.getEvents(matchId)).length;
    const frames = await host.handleIntent(
      envelope(matchId, 'pid_opp', { kind: 'AdvancePhase' }, 'stale-1'),
    );
    expect(errorOf(frames, 'STALE_BRANCH')).toMatchObject({
      code: 'STALE_BRANCH',
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
      conflictHead: { branchId: 'candidate-1' },
    });
    expect((await store.getEvents(matchId)).length).toBe(before);
  });

  it('intent on a superseded effective branch refused', async () => {
    const matchId = 'stale-superseded';
    seedStream(matchId);
    branches().transitionBranchStatus(
      { streamType: 'match', streamId: matchId },
      'root',
      'superseded',
    );
    const host = await makeHost(matchId);
    const frames = await host.handleIntent(
      envelope(matchId, 'pid_opp', { kind: 'AdvancePhase' }, 'sup-1'),
    );
    expect(errorOf(frames, 'STALE_BRANCH')).toMatchObject({
      code: 'STALE_BRANCH',
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
      conflictHead: { branchId: 'root' },
    });
  });

  it("a targetRevision-bearing intent from a player refused GM_ONLY while the host's passes admission (and is then handled as today)", async () => {
    const matchId = 'cut-gm-only';
    seedStream(matchId);
    const host = await makeHost(matchId);
    const cut = { kind: 'AdvancePhase' as const, targetRevision: 2 };
    const before = (await store.getEvents(matchId)).length;
    const player = await host.handleIntent(
      envelope(matchId, 'pid_opp', cut as IIntent['intent'], 'cut-p'),
    );
    expect(errorOf(player, 'GM_ONLY')).toMatchObject({
      code: 'GM_ONLY',
      reason: 'gm-role-required',
    });
    expect((await store.getEvents(matchId)).length).toBe(before);
    const fromHost = await host.handleIntent(
      envelope(matchId, 'pid_host', cut as IIntent['intent'], 'cut-h'),
    );
    expect(errorOf(fromHost, 'GM_ONLY')).toBeUndefined();
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(before);
  });

  it("the player's RewindRequest is accepted-for-gm-review and derives no event (journal census)", async () => {
    const matchId = 'rewind-request';
    seedStream(matchId);
    const host = await makeHost(matchId);
    const matchBefore = (await store.getEvents(matchId)).length;
    const journalBefore = journalCount();
    const frames = await host.handleIntent(
      envelope(
        matchId,
        'pid_opp',
        {
          kind: 'RewindRequest',
          targetRevision: 2,
          reason: 'please rewind to the last clean turn',
        },
        'req-1',
      ),
    );
    expect(errorOf(frames, 'INVALID_INTENT')).toMatchObject({
      reason: 'accepted-for-gm-review',
    });
    expect((await store.getEvents(matchId)).length).toBe(matchBefore);
    expect(journalCount()).toBe(journalBefore);
  });

  it('with an in-memory store that lacks the branch port every refusal is inert (pin the no-op)', async () => {
    const matchId = 'noop-memory';
    // DurableMatchStore always binds the branch port via
    // bindDurableCapabilityPorts. InMemoryMatchStore also inherits
    // IEventHistoryBranchPort, so the inert pin cannot use either class
    // as-is. This facade copies only IMatchStore methods — the six
    // branch members stay absent, which is what hasHistoryBranchStore
    // checks.
    const inner = new InMemoryMatchStore({
      quiet: true,
      branchCreationSeam: _branchCreationSeamForTests(),
    });
    inner.createBranch({
      streamType: 'match',
      streamId: matchId,
      branchId: 'candidate-1',
      parentBranchId: null,
      ancestorDepth: 0,
      baseRevision: 0,
      baseEventId: null,
      baseDigest: 'c'.repeat(64),
      status: 'effective',
      createdBy: 'gm-1',
      reason: 'replacement',
      createdAt: AT,
    });
    const stripped: IMatchStore = {
      createMatch: (row) => inner.createMatch(row),
      appendEvent: (id, event) => inner.appendEvent(id, event),
      getEvents: (id, from) => inner.getEvents(id, from),
      getMatchMeta: (id) => inner.getMatchMeta(id),
      getMatchByRoomCode: (code) => inner.getMatchByRoomCode(code),
      updateMatchMeta: (id, patch) => inner.updateMatchMeta(id, patch),
      closeMatch: (id) => inner.closeMatch(id),
      listMatches: (filter) => inner.listMatches(filter),
    };
    expect(hasHistoryBranchStore(stripped)).toBe(false);
    const host = await makeHost(matchId, stripped);
    const frames = await host.handleIntent(
      envelope(matchId, 'pid_opp', { kind: 'AdvancePhase' }, 'noop-1'),
    );
    expect(errorOf(frames, 'STALE_BRANCH')).toBeUndefined();
    expect((await stripped.getEvents(matchId)).length).toBeGreaterThan(0);
  });
});

