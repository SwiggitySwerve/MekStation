/**
 * Checkpoint-plus-tail equals full replay for the authoritative match
 * session and the three combat viewer digests (umbrella task 15.2 MATCH).
 *
 * R2 keeps fogOfWar TRUE. filterEventForPlayer short-circuits when fog
 * is off and returns the event before state is read, so player:p1 and
 * player:p2 digest identically and the equality across recovery paths
 * would be a constant, not a proof.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type {
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { BranchCheckpointCache } from '@/lib/events/checkpoints/BranchCheckpointCache';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import { runFullReplay } from '@/lib/events/replay/ReplayEquivalenceHarness';
import { combatViewerProbe } from '@/lib/multiplayer/server/projection/combatViewerProbe';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  createGameSession,
  startGame,
  advancePhase,
  lockMovement,
} from '@/utils/gameplay/gameSession';

import type { IMatchMeta } from '../IMatchStore';

import {
  matchEventChainDigest,
  revisionForMatchSequence,
  type IMatchEventSource,
} from '../history/matchStoreBranchSegmentReader';
import { matchStoreHistoryReader } from '../MatchCheckpointHistory';
import {
  createMatchSessionProjector,
  foldMatchSession,
  matchAuthoritativePipeline,
  MATCH_SESSION_SCHEMA_REGISTRY,
} from '../MatchSessionProjector';

const MATCH_ID = 'match-ckpt-eq';
const RECORDED_AT = '2026-09-02T00:00:00.000Z';
const VIEWERS = ['gm', 'player:p1', 'player:p2'] as const;

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

// The builder's objects carry optional fields set to undefined, which the
// chain digest's canonicalizer refuses outright. The match store never hands
// the reader those objects - it hands back JSON it parsed - so the fixture
// is round-tripped once to be exactly what the reader sees in production.
const EVENTS: readonly IGameEvent[] = JSON.parse(
  JSON.stringify(buildLog()),
) as readonly IGameEvent[];
const HEAD_REVISION = revisionForMatchSequence(
  EVENTS[EVENTS.length - 1]!.sequence,
);
const BASE_REVISION = 4;

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

const source: IMatchEventSource = {
  getEvents: async (_matchId, fromSeq = 0) =>
    EVENTS.filter((event) => event.sequence >= (fromSeq <= 0 ? 0 : fromSeq)),
};

function projectable(events: readonly IGameEvent[]): IProjectableBranchEvent[] {
  let previous: string | null = null;
  return events.map((event) => {
    const eventDigest = matchEventChainDigest(previous, event);
    const row: IProjectableBranchEvent = {
      eventId: event.id,
      branchId: ROOT_EVENT_BRANCH_ID,
      streamRevision: revisionForMatchSequence(event.sequence),
      eventVersion: 1,
      previousStreamEventDigest: previous,
      eventDigest,
      entityRefs: [],
      eventType: String(event.type),
      payload: event,
    };
    previous = eventDigest;
    return row;
  });
}

describe('match checkpoint equivalence', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'match-ckpt-eq-'));
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function database(): Database.Database {
    getSQLiteService({ path: path.join(dir, 'checkpoints.db') }).initialize();
    return getSQLiteService().getDatabase();
  }

  async function seed(
    db: Database.Database,
    extras: { branchId?: string } = {},
  ): Promise<void> {
    const projector = createMatchSessionProjector(MATCH_ID);
    const pipeline = {
      ...matchAuthoritativePipeline(MATCH_ID, projector),
      ...extras,
    };
    const history = matchStoreHistoryReader(source, MATCH_ID);
    const prefix = EVENTS.filter(
      (event) => revisionForMatchSequence(event.sequence) <= BASE_REVISION,
    );
    const digest = await history.chainDigestAt(BASE_REVISION);
    if (digest === null) throw new Error('missing chain digest at base');
    new BranchCheckpointCache(db).record(
      pipeline,
      BASE_REVISION,
      digest,
      foldMatchSession(MATCH_ID, prefix),
      RECORDED_AT,
    );
  }

  it('checkpoint-plus-tail equals full replay for the authoritative match session', async () => {
    const db = database();
    await seed(db);
    const projector = createMatchSessionProjector(MATCH_ID);
    const history = matchStoreHistoryReader(source, MATCH_ID);
    const reference = runFullReplay(
      MATCH_SESSION_SCHEMA_REGISTRY,
      projector,
      await history.readTail(0),
    );
    const accelerated = await new BranchCheckpointCache(db).recover(
      matchAuthoritativePipeline(MATCH_ID, projector),
      HEAD_REVISION,
      history,
      MATCH_SESSION_SCHEMA_REGISTRY,
      projector,
    );

    expect(accelerated.path).toBe('checkpoint-plus-tail');
    expect(accelerated.stateDigest).toStrictEqual(reference.stateDigest);
    expect(accelerated.stateDigest).toStrictEqual(
      digestReplayCheckpointState(accelerated.state),
    );
    expect(accelerated.appliedRevisions).toBe(HEAD_REVISION - BASE_REVISION);
    expect(reference.appliedRevisions).toBe(HEAD_REVISION);
  });

  it('combat viewer digests stay equal across both paths when fog is on', async () => {
    const db = database();
    await seed(db);
    const projector = createMatchSessionProjector(MATCH_ID);
    const history = matchStoreHistoryReader(source, MATCH_ID);
    const reference = runFullReplay(
      MATCH_SESSION_SCHEMA_REGISTRY,
      projector,
      await history.readTail(0),
    );
    const accelerated = await new BranchCheckpointCache(db).recover(
      matchAuthoritativePipeline(MATCH_ID, projector),
      HEAD_REVISION,
      history,
      MATCH_SESSION_SCHEMA_REGISTRY,
      projector,
    );
    const audience = {
      gmPlayerId: META.hostPlayerId,
      playerIds: META.playerIds,
      sideAssignments: META.sideAssignments,
      config: { fogOfWar: true as const },
    };
    const refProbe = combatViewerProbe({
      state: reference.state.currentState,
      audience,
    });
    const accProbe = combatViewerProbe({
      state: accelerated.state.currentState,
      audience,
    });
    const refEvents = projectable(reference.state.events);
    const accEvents = projectable(accelerated.state.events);
    for (const viewer of VIEWERS) {
      expect(accProbe.digest(viewer, accEvents)).toStrictEqual(
        refProbe.digest(viewer, refEvents),
      );
    }
  });

  it('a version-1 checkpoint is ignored when recovering at projector version 2', async () => {
    const db = database();
    await seed(db);
    const projector = createMatchSessionProjector(MATCH_ID);
    const history = matchStoreHistoryReader(source, MATCH_ID);
    const accelerated = await new BranchCheckpointCache(db).recover(
      {
        ...matchAuthoritativePipeline(MATCH_ID, projector),
        projectorVersion: 2,
      },
      HEAD_REVISION,
      history,
      MATCH_SESSION_SCHEMA_REGISTRY,
      projector,
    );
    expect(accelerated.path).toBe('full-replay');
    expect(accelerated.appliedRevisions).toBe(HEAD_REVISION);
  });

  it('a checkpoint recorded on another branch is not offered on root', async () => {
    const db = database();
    await seed(db, { branchId: 'other' });
    const projector = createMatchSessionProjector(MATCH_ID);
    const history = matchStoreHistoryReader(source, MATCH_ID);
    const accelerated = await new BranchCheckpointCache(db).recover(
      matchAuthoritativePipeline(MATCH_ID, projector),
      HEAD_REVISION,
      history,
      MATCH_SESSION_SCHEMA_REGISTRY,
      projector,
    );
    expect(accelerated.path).toBe('full-replay');
    expect(accelerated.appliedRevisions).toBe(HEAD_REVISION);
  });
});
