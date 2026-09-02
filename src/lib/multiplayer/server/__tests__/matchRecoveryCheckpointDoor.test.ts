/**
 * recoverActiveMatches is the MATCH checkpoint door (umbrella 15.2).
 *
 * Equivalence rows drive BranchCheckpointCache.recover with a hand-built
 * reader and never enter this function, so a wrong exclusive bound or a
 * raw-sequence revisionOf can skip the first tail event, fail continuity,
 * and still look green if anything then full-replays the whole log.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { AUTHORITY_HISTORY_START } from '@/lib/events/checkpoints/AuthorityRecoveryPort';
import { BranchCheckpointCache } from '@/lib/events/checkpoints/BranchCheckpointCache';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import { buildGmCombatRewindCommitDeps } from '@/pages-modules/api/rewindCommitDeps';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  lockMovement,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IMatchEventSource } from '../history/matchStoreBranchSegmentReader';
import type { IMatchMeta, IMatchStore } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { commitGmCombatRewind } from '../history/GmCombatRewindCommit';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import {
  matchStoreBranchSegmentReader,
  revisionForMatchSequence,
} from '../history/matchStoreBranchSegmentReader';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { matchStoreHistoryReader } from '../MatchCheckpointHistory';
import { recoverActiveMatches } from '../MatchRecovery';
import {
  createMatchSessionProjector,
  foldMatchSession,
  matchAuthoritativePipeline,
} from '../MatchSessionProjector';

const MATCH_ID = 'match-ckpt-eq';
const RECORDED_AT = '2026-09-02T00:00:00.000Z';

function unit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function buildLog(): readonly IGameEvent[] {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 5,
      victoryConditions: [],
      optionalRules: [],
      fogOfWar: true,
    },
    [unit('u-p1', GameSide.Player), unit('u-p2', GameSide.Opponent)],
    { id: MATCH_ID, createdAt: RECORDED_AT },
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session = lockMovement(session, 'u-p1');
  session = lockMovement(session, 'u-p2');
  session = advancePhase(session);
  return session.events;
}

// Same JSON round-trip as the equivalence fixture: the canonicalizer
// refuses undefined, and the store only ever hands back parsed JSON.
const EVENTS: readonly IGameEvent[] = JSON.parse(
  JSON.stringify(buildLog()),
) as readonly IGameEvent[];
const HEAD_REVISION = revisionForMatchSequence(
  EVENTS[EVENTS.length - 1]!.sequence,
);
const BASE_REVISION = 4;
const FULL_DIGEST = digestReplayCheckpointState(
  foldMatchSession(MATCH_ID, EVENTS),
);

const META: IMatchMeta = {
  matchId: MATCH_ID,
  hostPlayerId: 'p1',
  playerIds: ['p1', 'p2'],
  sideAssignments: [
    { playerId: 'p1', side: 'player' },
    { playerId: 'p2', side: 'opponent' },
  ],
  status: 'active',
  createdAt: RECORDED_AT,
  updatedAt: RECORDED_AT,
  config: { mapRadius: 6, turnLimit: 5, fogOfWar: true },
};

async function writeLog(store: IMatchStore): Promise<void> {
  await store.createMatch(META);
  for (const event of EVENTS) {
    await store.appendEvent(MATCH_ID, event);
  }
}

async function recordBase(source: IMatchEventSource): Promise<void> {
  const projector = createMatchSessionProjector(MATCH_ID);
  const pipeline = matchAuthoritativePipeline(MATCH_ID, projector);
  const history = matchStoreHistoryReader(source, MATCH_ID);
  const digest = await history.chainDigestAt(BASE_REVISION);
  if (digest === null) throw new Error('missing chain digest at base');
  const prefix = EVENTS.filter(
    (event) => revisionForMatchSequence(event.sequence) <= BASE_REVISION,
  );
  new BranchCheckpointCache(getSQLiteService().getDatabase()).record(
    pipeline,
    BASE_REVISION,
    digest,
    foldMatchSession(MATCH_ID, prefix),
    RECORDED_AT,
  );
}

describe('match recovery checkpoint door', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'match-ckpt-door-'));
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  describe('when SQLite can offer a checkpoint', () => {
    let store: DurableMatchStore;

    beforeEach(async () => {
      getSQLiteService({ path: path.join(dir, 'checkpoints.db') }).initialize();
      store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
      await writeLog(store);
      await recordBase(store);
    });

    afterEach(() => {
      store.close();
    });

    it('recovers through the checkpoint door and reads only the tail', async () => {
      const spy = jest.spyOn(store, 'getEvents');

      const result = await recoverActiveMatches(store);
      const host = result.hosts.get(MATCH_ID);

      expect(result.failed).toStrictEqual([]);
      expect(host).toBeDefined();
      expect(
        digestReplayCheckpointState(host!.getSessionForTests()),
      ).toStrictEqual(FULL_DIGEST);

      // (b) Exclusive tail fromSeq is 4. revision = sequence + 1, so a
      // checkpoint at R covers through sequence R-1. getEvents returns
      // sequence >= fromSeq, therefore getEvents(id, R) makes the first
      // tail event the one at revision R+1. The old inclusive form
      // (fromExclusive + 1) asks for 5, skips sequence 4, continuity
      // wants revision 5 and finds 6, and the door then either blocks
      // or silently full-replays. A full replay still matches FULL_DIGEST,
      // which is why the equivalence rows could not see it. revisionOf =
      // sequence fails the same continuity check: a checkpoint at R plus
      // a tail that claims to start at R (raw sequence) is a hole.
      expect(
        spy.mock.calls.filter(([, fromSeq]) => fromSeq !== 0),
      ).toStrictEqual([[MATCH_ID, 4]]);
    });

    it('records a fresh checkpoint at the live head after recovery', async () => {
      const result = await recoverActiveMatches(store);
      expect(result.hosts.has(MATCH_ID)).toBe(true);

      const offer = await new BranchCheckpointCache(
        getSQLiteService().getDatabase(),
      ).offer(
        matchAuthoritativePipeline(
          MATCH_ID,
          createMatchSessionProjector(MATCH_ID),
        ),
        HEAD_REVISION,
        matchStoreHistoryReader(store, MATCH_ID),
      );

      expect(offer).not.toBeNull();
      expect(offer!.metadata.revision).toBe(HEAD_REVISION);
    });
  });

  it('boot after a committed rewind yields the rewound session', async () => {
    const store = new DurableMatchStore({ path: path.join(dir, 'rewind.db') });
    getSQLiteService({
      path: path.join(dir, 'rewind-journal.db'),
    }).initialize();
    await writeLog(store);
    const db = getSQLiteService().getDatabase();
    // Same alignment as the rewind-commit route: journal id/digest must
    // be the match-store reader's, or candidate verification refuses.
    const stream = matchStreamRef(MATCH_ID);
    const chained = await matchStoreBranchSegmentReader(store).read(stream, {
      kind: 'prefix',
      branchId: 'root',
      fromRevision: 0,
      throughRevision: HEAD_REVISION,
      baseEventId: null,
      baseDigest: '0'.repeat(64),
    });
    const headEvent = chained[chained.length - 1];
    if (headEvent === undefined) {
      throw new Error('match-store reader returned no events');
    }
    db.prepare(
      `INSERT INTO event_journal_batches (
         command_id, command_digest, canonicalizer_version, stream_type,
         stream_id, branch_id, event_count, first_stream_revision,
         last_stream_revision, first_commit_position, last_commit_position,
         recorded_at)
       VALUES (?, ?, 1, 'match', ?, 'root', ?, 1, ?, 1, ?, ?)`,
    ).run(
      `cmd-${MATCH_ID}`,
      'a'.repeat(64),
      MATCH_ID,
      chained.length,
      chained.length,
      chained.length,
      RECORDED_AT,
    );
    const insert = db.prepare(
      `INSERT INTO event_journal_events (
         event_id, command_id, stream_type, stream_id, branch_id,
         stream_revision, commit_position, command_index, event_type,
         event_version, correlation_id, actor_kind, actor_id,
         authority_type, authority_id, occurred_at, recorded_at,
         canonicalizer_version, previous_stream_event_digest, event_digest,
         payload_json)
       VALUES (?, ?, 'match', ?, 'root', ?, ?, ?, ?, 1, ?, 'human', ?,
               'host', ?, ?, ?, 1, ?, ?, '{}')`,
    );
    chained.forEach((event, index) => {
      insert.run(
        event.eventId,
        `cmd-${MATCH_ID}`,
        MATCH_ID,
        event.streamRevision,
        index + 1,
        index,
        event.eventType,
        `corr-${MATCH_ID}`,
        META.hostPlayerId,
        MATCH_ID,
        RECORDED_AT,
        RECORDED_AT,
        event.previousStreamEventDigest,
        event.eventDigest,
      );
    });
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', ?, ?)`,
    ).run(MATCH_ID, headEvent.streamRevision, headEvent.eventDigest);
    expect(
      new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches(),
    ).toBe(1);
    const branches = new SQLiteEventHistoryBranchStore(db);
    const streamHead = readEffectiveStreamHead(db, branches, stream);
    const effective = branches.readEffectiveHead(stream);
    if (effective === null) {
      throw new Error('genesis backfill left no effective head');
    }
    const committed = await commitGmCombatRewind(
      buildGmCombatRewindCommitDeps({
        store,
        meta: META,
        priorHeadRevision: streamHead.revision,
        nowIso: () => RECORDED_AT,
      }),
      {
        actorId: META.hostPlayerId,
        role: 'gm',
        gameId: MATCH_ID,
        ownedStateRefs: [`game:${MATCH_ID}`],
      },
      {
        matchId: MATCH_ID,
        targetRevision: BASE_REVISION,
        expectedBranchId: streamHead.branchId,
        expectedRevision: streamHead.revision,
        expectedDigest: streamHead.digest,
        expectedGeneration: effective.effectiveGeneration,
        actor: META.hostPlayerId,
        reason: 'authorized combat rewind',
      },
    );
    expect(committed).toMatchObject({ kind: 'committed' });
    const recovered = await recoverActiveMatches(store);
    const host = recovered.hosts.get(MATCH_ID);
    expect(host).toBeDefined();
    const prefix = EVENTS.filter(
      (event) => revisionForMatchSequence(event.sequence) <= BASE_REVISION,
    );
    expect(host!.getSessionForTests().currentState.phase).toBe(
      foldMatchSession(MATCH_ID, prefix).currentState.phase,
    );
    store.close();
  });

  it('falls back to the reference port when SQLite is not initialized', async () => {
    expect(getSQLiteService().isInitialized()).toBe(false);
    const store = new InMemoryMatchStore();
    await writeLog(store);
    const spy = jest.spyOn(store, 'getEvents');

    const result = await recoverActiveMatches(store);
    const host = result.hosts.get(MATCH_ID);

    expect(result.failed).toStrictEqual([]);
    expect(host).toBeDefined();
    expect(
      digestReplayCheckpointState(host!.getSessionForTests()),
    ).toStrictEqual(FULL_DIGEST);
    // One full-log read. AUTHORITY_HISTORY_START is -1; both stores
    // clamp fromSeq <= 0 to sequence 0, so this is the InMemory promise.
    expect(spy.mock.calls).toStrictEqual([[MATCH_ID, AUTHORITY_HISTORY_START]]);
  });
});
