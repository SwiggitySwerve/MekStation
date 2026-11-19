/**
 * P11: match recovery folds once, builds its digest chain once, and boot
 * writes its checkpoints after the server listens.
 *
 * Every row compares against REFERENCE: a frozen copy of the recovery
 * binding as it stood at 8c8577add (parse refolds the cached events and
 * throws the cached state away, then the tail fold refolds base + tail).
 * The rows pin that today's recovery is byte-identical to it - recovered
 * session, event chain digests, and the checkpoint row it writes - for no
 * checkpoint, a checkpoint at every revision, a stale row, a corrupt row,
 * a row whose cached state no reducer of this log produces, the journal
 * arm, and a log carrying an automatic-fail PSR (targetNumber Infinity,
 * stored as null).
 *
 * The boot rows pin Root's two conditions for moving the checkpoint write
 * after listen: every recovered match still gets its row, and a process
 * that dies between listen and the write recovers identically next boot.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  IGameEvent,
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  BranchCheckpointCache,
  checkpointRecoveryPort,
  referenceRecoveryPort,
} from '@/lib/events/checkpoints/AuthorityRecoveryPort';
import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
} from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  lockMovement,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IMatchMeta, IMatchStore } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  _setDefaultMatchStoreForTests,
  _resetDefaultMatchStore,
} from '../getDefaultMatchStore';
import {
  matchEventChainDigest,
  revisionForMatchSequence,
} from '../history/matchStoreBranchSegmentReader';
import { matchStoreHistoryReader } from '../MatchCheckpointHistory';
import {
  _resetMatchHostRegistry,
  bootstrapMultiplayerServer,
  getMatchHostRegistry,
  writeDeferredRecoveryCheckpoints,
} from '../MatchHostRegistry';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { recoverActiveMatches } from '../MatchRecovery';
import {
  createMatchSessionProjector,
  foldMatchSession,
  matchAuthoritativePipeline,
} from '../MatchSessionProjector';

// Pass-through, so the chain-once row can count links. The bundler's
// export getters refuse jest.spyOn.
jest.mock('../history/matchStoreBranchSegmentReader', () => {
  const actual = jest.requireActual<
    typeof import('../history/matchStoreBranchSegmentReader')
  >('../history/matchStoreBranchSegmentReader');
  return {
    ...actual,
    matchEventChainDigest: jest.fn(actual.matchEventChainDigest),
  };
});

const RECORDED_AT = '2026-11-19T00:00:00.000Z';

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

/**
 * A short played log with the F4 shape in it: the PSR resolution an
 * automatic fall writes (gameSessionPSRResolution: targetNumber Infinity),
 * which the store's JSON image turns into null.
 */
function buildLog(matchId: string): readonly IGameEvent[] {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 5,
      victoryConditions: [],
      optionalRules: [],
      fogOfWar: true,
    },
    [unit('u-p1', GameSide.Player), unit('u-p2', GameSide.Opponent)],
    { id: matchId, createdAt: RECORDED_AT },
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session = lockMovement(session, 'u-p1');
  session = lockMovement(session, 'u-p2');
  session = advancePhase(session);
  const { turn, phase } = session.currentState;
  const context = { gameId: matchId, turn, phase, unitId: 'u-p1' };
  session = appendEvent(
    session,
    createPSRTriggeredEvent({
      ...context,
      sequence: session.events.length,
      reason: 'gyro_destroyed',
      additionalModifier: 0,
      triggerSource: 'gyro',
    }),
  );
  session = appendEvent(
    session,
    createPSRResolvedEvent({
      ...context,
      sequence: session.events.length,
      targetNumber: Infinity,
      roll: 0,
      modifiers: 0,
      passed: false,
      reason: 'gyro_destroyed',
    }),
  );
  // The store hands back parsed JSON; the reader and the folds only ever
  // see that image (Infinity -> null).
  return JSON.parse(JSON.stringify(session.events)) as IGameEvent[];
}

function meta(matchId: string): IMatchMeta {
  return {
    matchId,
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
}

const MATCH_ID = 'match-tail-fold';
const EVENTS = buildLog(MATCH_ID);
const HEAD = revisionForMatchSequence(EVENTS[EVENTS.length - 1]!.sequence);

function prefixTo(
  events: readonly IGameEvent[],
  revision: number,
): readonly IGameEvent[] {
  return events.filter(
    (event) => revisionForMatchSequence(event.sequence) <= revision,
  );
}

function pipelineFor(matchId: string) {
  return matchAuthoritativePipeline(
    matchId,
    createMatchSessionProjector(matchId),
  );
}

function cache(): BranchCheckpointCache {
  return new BranchCheckpointCache(getSQLiteService().getDatabase());
}

async function writeLog(
  store: IMatchStore,
  matchId: string,
  events: readonly IGameEvent[],
): Promise<void> {
  await store.createMatch(meta(matchId));
  for (const event of events) await store.appendEvent(matchId, event);
}

/** A checkpoint row as production writes one, with any state. */
async function recordAt(
  store: IMatchStore,
  matchId: string,
  revision: number,
  state: IGameSession,
): Promise<void> {
  const digest = await matchStoreHistoryReader(store, matchId).chainDigestAt(
    revision,
  );
  if (digest === null) throw new Error(`no chain digest at ${revision}`);
  cache().record(pipelineFor(matchId), revision, digest, state, RECORDED_AT);
}

/**
 * REFERENCE: MatchRecovery's legacy-arm port call at 8c8577add, frozen.
 * Read-only - it records nothing - so it runs on the same database before
 * the recovery under test.
 */
async function referenceRecover(
  store: IMatchStore,
  matchId: string,
  headRevision: number,
): Promise<IGameSession> {
  const port = getSQLiteService().isInitialized()
    ? checkpointRecoveryPort<IGameEvent, IGameSession>({
        cache: cache(),
        pipeline: pipelineFor(matchId),
        headRevision,
        history: matchStoreHistoryReader(store, matchId),
        parse: (stateJson) =>
          foldMatchSession(
            matchId,
            (JSON.parse(stateJson) as IGameSession).events,
          ),
      })
    : referenceRecoveryPort<IGameEvent, IGameSession>();
  const verdict = await port({
    authorityId: matchId,
    emptyHistory: 'corrupt',
    read: (fromExclusive) => store.getEvents(matchId, fromExclusive),
    revisionOf: (event) => revisionForMatchSequence(event.sequence),
    integrityOf: (event) => ({
      revision: event.sequence,
      receiptId: event.id,
      previousDigest: null,
      digest: null,
    }),
    fold: (events, base) => foldMatchSession(matchId, events, base),
  });
  if (verdict.kind !== 'recovered') {
    throw new Error(`reference blocked: ${verdict.reason}`);
  }
  return verdict.state;
}

function chainDigests(events: readonly IGameEvent[]): readonly string[] {
  const out: string[] = [];
  let previous: string | null = null;
  for (const event of events) {
    previous = matchEventChainDigest(previous, event);
    out.push(previous);
  }
  return out;
}

interface ICheckpointRowBytes {
  readonly source_tail_digest: string;
  readonly state_digest: string;
  readonly state_json: string;
}

function rowAt(
  db: Database.Database,
  matchId: string,
  revision: number,
): ICheckpointRowBytes | undefined {
  const row = db
    .prepare(
      `SELECT source_tail_digest, state_digest, state_json
         FROM replay_checkpoints WHERE stream_id = ? AND revision = ?`,
    )
    .get(JSON.stringify(['match', matchId]), revision) as
    | ICheckpointRowBytes
    | undefined;
  // The driver's row object is not a plain object; compare its columns.
  return row === undefined ? undefined : { ...row };
}

function rowCount(db: Database.Database, matchId: string): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM replay_checkpoints WHERE stream_id = ?`,
      )
      .get(JSON.stringify(['match', matchId])) as { n: number }
  ).n;
}

/** The row today's recovery writes at the head, from REFERENCE's state. */
async function referenceRow(
  store: IMatchStore,
  matchId: string,
  state: IGameSession,
  headRevision: number,
): Promise<ICheckpointRowBytes> {
  const digest = await matchStoreHistoryReader(store, matchId).chainDigestAt(
    headRevision,
  );
  return {
    source_tail_digest: digest!,
    state_digest: digestReplayCheckpointState(state),
    state_json: canonicalizeJsonV1(state),
  };
}

let dir: string;
let store: DurableMatchStore;
/** Stores a simulated crash walked away from; closed after the row. */
const abandoned: DurableMatchStore[] = [];

async function openStores(): Promise<void> {
  getSQLiteService({ path: path.join(dir, 'checkpoints.db') }).initialize();
  store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
}

function closeStores(): void {
  store.close();
  resetSQLiteService();
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'match-tail-fold-'));
  resetSQLiteService();
  await openStores();
  await writeLog(store, MATCH_ID, EVENTS);
});

afterEach(async () => {
  _resetMatchHostRegistry();
  _resetDefaultMatchStore();
  closeStores();
  for (const old of abandoned.splice(0)) old.close();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

/** Recover through the door and hold it to REFERENCE, all three outputs. */
async function expectReferenceEquivalent(): Promise<void> {
  const reference = await referenceRecover(store, MATCH_ID, HEAD);
  const expectedRow = await referenceRow(store, MATCH_ID, reference, HEAD);
  // An oracle outside the cache code both sides share: any recovery of
  // this log, accelerated or not, is the full fold of it.
  expect(canonicalizeJsonV1(reference)).toBe(
    canonicalizeJsonV1(foldMatchSession(MATCH_ID, EVENTS)),
  );

  const result = await recoverActiveMatches(store);
  expect(result.failed).toStrictEqual([]);
  const recovered = result.hosts.get(MATCH_ID)!.getSessionForTests();

  expect(canonicalizeJsonV1(recovered)).toBe(canonicalizeJsonV1(reference));
  expect(chainDigests(recovered.events)).toStrictEqual(
    chainDigests(reference.events),
  );
  expect(rowAt(getSQLiteService().getDatabase(), MATCH_ID, HEAD)).toStrictEqual(
    expectedRow,
  );
}

describe('match recovery folds once and matches the frozen reference', () => {
  it('stores the automatic-fail PSR as null, as production does', async () => {
    const stored = await store.getEvents(MATCH_ID, 0);
    const resolved = stored.find((event) => event.type === 'psr_resolved');
    expect(resolved?.payload).toMatchObject({ targetNumber: null });
  });

  it('with no checkpoint', async () => {
    await expectReferenceEquivalent();
  });

  it.each(
    Array.from({ length: HEAD }, (_, index) => index + 1).map((revision) => [
      revision,
    ]),
  )('with a checkpoint at revision %i of the log', async (revision) => {
    await recordAt(
      store,
      MATCH_ID,
      revision,
      foldMatchSession(MATCH_ID, prefixTo(EVENTS, revision)),
    );
    await expectReferenceEquivalent();
  });

  it('with a stale row recorded for a history this log does not hold', async () => {
    // Same revision, a different history: the live chain cannot attest it.
    const other = buildLog('match-other-history').map((event) => ({
      ...event,
      gameId: MATCH_ID,
    }));
    const otherStore = new DurableMatchStore({
      path: path.join(dir, 'other.db'),
    });
    await writeLog(otherStore, MATCH_ID, other);
    const revision = HEAD - 2;
    const digest = await matchStoreHistoryReader(
      otherStore,
      MATCH_ID,
    ).chainDigestAt(revision);
    otherStore.close();
    cache().record(
      pipelineFor(MATCH_ID),
      revision,
      digest!,
      foldMatchSession(MATCH_ID, prefixTo(other, revision)),
      RECORDED_AT,
    );
    await expectReferenceEquivalent();
  });

  it('with a corrupt row whose bytes no longer hash to their digest', async () => {
    const revision = HEAD - 1;
    await recordAt(
      store,
      MATCH_ID,
      revision,
      foldMatchSession(MATCH_ID, prefixTo(EVENTS, revision)),
    );
    // Rows are write-once (an UPDATE trigger aborts), so a torn or
    // tampered row is a delete and a raw re-insert with the old digest.
    const db = getSQLiteService().getDatabase();
    const row = db
      .prepare(`SELECT * FROM replay_checkpoints WHERE revision = ?`)
      .get(revision) as Record<string, unknown>;
    const state = JSON.parse(row.state_json as string) as IGameSession;
    // Folded, these events would change the session's config: a door
    // that skipped the digest check would recover a different match.
    const created = state.events[0]!;
    const createdPayload = created.payload as {
      config: { turnLimit: number };
    };
    const tampered = {
      ...state,
      events: [
        {
          ...created,
          payload: {
            ...createdPayload,
            config: {
              ...createdPayload.config,
              turnLimit: createdPayload.config.turnLimit + 7,
            },
          },
        },
        ...state.events.slice(1),
      ],
    };
    db.prepare(`DELETE FROM replay_checkpoints WHERE revision = ?`).run(
      revision,
    );
    const columns = Object.keys(row);
    db.prepare(
      `INSERT INTO replay_checkpoints (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
    ).run(
      ...columns.map((column) =>
        column === 'state_json' ? canonicalizeJsonV1(tampered) : row[column],
      ),
    );
    await expectReferenceEquivalent();
  });

  /** A row recorded under another reducer: digests hold, state does not. */
  async function recordDrifted(revision: number): Promise<void> {
    const honest = foldMatchSession(MATCH_ID, prefixTo(EVENTS, revision));
    await recordAt(store, MATCH_ID, revision, {
      ...honest,
      currentState: { ...honest.currentState, turn: 99 },
    });
  }

  it('with a valid row whose cached state the log does not fold to', async () => {
    // Recovery must take only the events from the row.
    await recordDrifted(HEAD - 2);
    await expectReferenceEquivalent();
  });

  it('with that row AT the head: the recovered state is the fold, never the cached one', async () => {
    await recordDrifted(HEAD);
    const reference = canonicalizeJsonV1(
      await referenceRecover(store, MATCH_ID, HEAD),
    );
    expect(reference).toBe(
      canonicalizeJsonV1(foldMatchSession(MATCH_ID, EVENTS)),
    );

    // Inline (unchanged from 8c8577add): the head slot is taken by a row
    // with another state digest, so the write after recovery throws and
    // the sweep names the match failed.
    const inline = await recoverActiveMatches(store);
    expect(inline.failed).toStrictEqual([MATCH_ID]);
    expect(inline.hosts.has(MATCH_ID)).toBe(false);

    // Boot: the same write now runs after listen, so it can no longer
    // fail the match. The match recovers to the fold; the write fails
    // and is reported, and the drifted row stays as it was.
    _setDefaultMatchStoreForTests(store);
    expect(
      await bootstrapMultiplayerServer({ deferCheckpointWrites: true }),
    ).toStrictEqual({
      recovered: 1,
      failed: 0,
      writeDeferredCheckpoints: writeDeferredRecoveryCheckpoints,
    });
    const host = getMatchHostRegistry().get(MATCH_ID);
    expect(canonicalizeJsonV1(host!.getSessionForTests())).toBe(reference);
    expect(await writeDeferredRecoveryCheckpoints()).toStrictEqual({
      written: 0,
      failed: 1,
    });
    expect(rowCount(getSQLiteService().getDatabase(), MATCH_ID)).toBe(1);
  });

  it('on the journal arm with a checkpoint behind the head', async () => {
    _setCombatJournalAuthorityModeForTests('shadow');
    try {
      await store.seedJournalFromInitialEvents!(MATCH_ID, EVENTS);
    } finally {
      _setCombatJournalAuthorityModeForTests(null);
    }
    await recordAt(
      store,
      MATCH_ID,
      HEAD - 2,
      foldMatchSession(MATCH_ID, prefixTo(EVENTS, HEAD - 2)),
    );
    await expectReferenceEquivalent();
  });

  it('builds the digest chain once per recovery', async () => {
    await recordAt(
      store,
      MATCH_ID,
      HEAD - 2,
      foldMatchSession(MATCH_ID, prefixTo(EVENTS, HEAD - 2)),
    );
    const links = jest.mocked(matchEventChainDigest);
    links.mockClear();
    const result = await recoverActiveMatches(store);
    expect(result.failed).toStrictEqual([]);
    // One link per event: ONE chain build served both the offer and the
    // checkpoint write. Before, the write rebuilt it (twice the links).
    expect(links).toHaveBeenCalledTimes(EVENTS.length);
  });
});

describe('boot writes checkpoints after listen', () => {
  const MATCH_IDS = ['match-boot-a', 'match-boot-b', 'match-boot-c'];

  async function seedBootMatches(): Promise<
    ReadonlyMap<string, readonly IGameEvent[]>
  > {
    const logs = new Map<string, readonly IGameEvent[]>();
    for (const matchId of MATCH_IDS) {
      const events = buildLog(matchId);
      await writeLog(store, matchId, events);
      logs.set(matchId, events);
    }
    // The fixture's own match is active too; boot recovers all four.
    logs.set(MATCH_ID, EVENTS);
    return logs;
  }

  function headOf(events: readonly IGameEvent[]): number {
    return revisionForMatchSequence(events[events.length - 1]!.sequence);
  }

  it('writes no row before the drain and one row per recovered match after it', async () => {
    const logs = await seedBootMatches();
    const expected = new Map<string, ICheckpointRowBytes>();
    for (const [matchId, events] of Array.from(logs)) {
      const state = await referenceRecover(store, matchId, headOf(events));
      expected.set(
        matchId,
        await referenceRow(store, matchId, state, headOf(events)),
      );
    }
    _setDefaultMatchStoreForTests(store);

    const boot = await bootstrapMultiplayerServer({
      deferCheckpointWrites: true,
    });
    // The drain server.js runs after listen rides on the boot result.
    expect(boot).toStrictEqual({
      recovered: logs.size,
      failed: 0,
      writeDeferredCheckpoints: writeDeferredRecoveryCheckpoints,
    });
    const db = getSQLiteService().getDatabase();
    // Recovery is done and nothing is written: this is the listen point.
    for (const matchId of Array.from(logs.keys())) {
      expect(rowCount(db, matchId)).toBe(0);
    }
    // The live game moves on before the writes run; each row still
    // describes the head its match was recovered to.
    const late = EVENTS[EVENTS.length - 1]!;
    await store.appendEvent(MATCH_ID, {
      ...late,
      id: `${late.id}-after-listen`,
      sequence: late.sequence + 1,
    });

    expect(await boot.writeDeferredCheckpoints!()).toStrictEqual({
      written: logs.size,
      failed: 0,
    });
    for (const [matchId, events] of Array.from(logs)) {
      expect(rowCount(db, matchId)).toBe(1);
      expect(rowAt(db, matchId, headOf(events))).toStrictEqual(
        expected.get(matchId),
      );
    }
    // Drained: a second call has nothing left to write.
    expect(await writeDeferredRecoveryCheckpoints()).toStrictEqual({
      written: 0,
      failed: 0,
    });
  });

  it('lets pending I/O run between checkpoint writes', async () => {
    const logs = await seedBootMatches();
    _setDefaultMatchStoreForTests(store);
    const boot = await bootstrapMultiplayerServer({
      deferCheckpointWrites: true,
    });
    // Each write is synchronous work over a whole session. A socket or
    // request that arrives during the drain must run before the next
    // write, not after all of them.
    const order: string[] = [];
    const record = jest
      .spyOn(BranchCheckpointCache.prototype, 'record')
      .mockImplementation(function recordSpy(this: BranchCheckpointCache) {
        order.push('write');
        setTimeout(() => order.push('io'), 0);
        return { kind: 'recorded', checkpointId: 'spy', revision: 1 };
      });
    try {
      await boot.writeDeferredCheckpoints!();
    } finally {
      record.mockRestore();
    }
    // The last write's callback runs after the drain returns.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(order).toStrictEqual(
      Array.from(logs.keys()).flatMap(() => ['write', 'io']),
    );
  });

  it.each([
    ['with no earlier checkpoint', false],
    ['with an earlier checkpoint', true],
  ])(
    'recovers identically after dying between listen and the write, %s',
    async (_label, earlier) => {
      const logs = await seedBootMatches();
      if (earlier) {
        for (const [matchId, events] of Array.from(logs)) {
          const revision = headOf(events) - 2;
          await recordAt(
            store,
            matchId,
            revision,
            foldMatchSession(matchId, prefixTo(events, revision)),
          );
        }
      }
      _setDefaultMatchStoreForTests(store);
      await bootstrapMultiplayerServer({ deferCheckpointWrites: true });
      // A committed move after listen, then the process dies before the
      // queued writes run.
      const late = EVENTS[EVENTS.length - 1]!;
      await store.appendEvent(MATCH_ID, {
        ...late,
        id: `${late.id}-after-listen`,
        sequence: late.sequence + 1,
      });
      // A dead process closes nothing: its hosts are not shut down (that
      // would mark the matches closed) and its queued writes never run.
      // Abandon them and open the same files fresh, as the next process.
      abandoned.push(store);
      _resetDefaultMatchStore();
      resetSQLiteService();

      // Next process.
      await openStores();
      const db = getSQLiteService().getDatabase();
      for (const matchId of Array.from(logs.keys())) {
        expect(rowCount(db, matchId)).toBe(earlier ? 1 : 0);
      }
      const expected = new Map<string, string>();
      for (const matchId of Array.from(logs.keys())) {
        const live = await store.getEvents(matchId, 0);
        expected.set(
          matchId,
          canonicalizeJsonV1(
            await referenceRecover(store, matchId, headOf(live)),
          ),
        );
        // And the normal recovery of that log: a full fold.
        expect(expected.get(matchId)).toBe(
          canonicalizeJsonV1(foldMatchSession(matchId, live)),
        );
      }
      const result = await recoverActiveMatches(store);
      expect({ failed: result.failed, blocked: result.blocked }).toStrictEqual({
        failed: [],
        blocked: [],
      });
      for (const matchId of Array.from(logs.keys())) {
        expect(
          canonicalizeJsonV1(result.hosts.get(matchId)!.getSessionForTests()),
        ).toBe(expected.get(matchId));
      }
    },
  );
});
