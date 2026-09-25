/**
 * U22a: a committed GM rewind reaches the players connected at that
 * moment, without a rejoin.
 *
 * The client half runs for real. Every socket the host writes to feeds
 * a real `connect()` client wired through `connectMultiplayerSession`
 * (the session hook's own helpers) with plain state cells in place of
 * React state, and the mirror is `buildMirrorSessionGated` over the
 * hook's mirror log - the value the lobby page renders `phase-name`
 * from (NetworkedGameSurface).
 *
 * Rows M1-M4 are the first admission attempt's probe
 * (evidence/u22a-admission-attempt1-20260923.json) kept as permanent
 * rows. The privacy rows pin that the push is each viewer's own
 * projection through the per-socket join path: no fog-hidden fact, no
 * authority-only field and no GM-private reason reaches a player.
 */

import type Database from 'better-sqlite3';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { SetStateAction } from 'react';

import { createMocks } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  IClientLifecycleState,
  IClientWebSocket,
} from '@/lib/multiplayer/client';
import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';
import type { IVaultIdentity } from '@/types/vault';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { connectMultiplayerSession } from '@/hooks/useMultiplayerSession.helpers';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { buildMirrorSessionGated } from '@/lib/multiplayer/mirrorMatchSession';
import { buildGmCombatRewindCommitDeps } from '@/pages-modules/api/rewindCommitDeps';
import commitHandler from '@/pages/api/matches/[id]/rewind-commit';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Facing, MovementType } from '@/types/gameplay';
import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';
import {
  advancePhase,
  createGameSession,
  declareMovement,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '../getDefaultMatchStore';
import { commitGmCombatRewind } from '../history/GmCombatRewindCommit';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import { revisionForMatchSequence } from '../history/matchStoreBranchSegmentReader';
import { MATCH_BASELINE_BRANCH_ID } from '../matchAuthorityBaseline';
import {
  _resetMatchHostRegistry,
  getMatchHostRegistry,
} from '../MatchHostRegistry';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { foldMatchSession } from '../MatchSessionProjector';
import { SeededDiceRoller } from '../RollCapture';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

const AT = '2026-09-02T00:00:00.000Z';
const SEED = 42;
const GM = 'gm-1';
const GUEST = 'player-2';
/** A GM-only reference an authority event may carry; players never see it. */
const PRIVATE_RECORD_REF = 'gm-private-record-u22a';

/** One play log shape: its match, its fog setting and the revision rewound to. */
interface IPlayLog {
  readonly matchId: string;
  readonly fogOfWar: boolean;
  readonly targetRevision: number;
}

/** GameCreated, GameStarted, two phase changes; the rewind keeps the first two. */
const PLAIN: IPlayLog = {
  matchId: 'u22a-live-1',
  fogOfWar: false,
  targetRevision: 2,
};
/** Fog on; the kept prefix holds the GM side's actor-only movement. */
const FOG: IPlayLog = {
  matchId: 'u22a-live-fog',
  fogOfWar: true,
  targetRevision: 4,
};

describe('ServerMatchHost rewind reaches connected players', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;
  const opened: IWiredViewer[] = [];

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'u22a-live-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    db = getSQLiteService().getDatabase();
    store = new DurableMatchStore({ path: ':memory:' });
    _setCombatJournalAuthorityModeForTests('enabled');
  });

  afterEach(async () => {
    for (const viewer of opened.splice(0)) viewer.close();
    _setCombatJournalAuthorityModeForTests(null);
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  describe('a player connected at the rewind (admission probe rows)', () => {
    it('M1 receives the rebuilt replay on its open socket, marked as replacing its stream', async () => {
      const fixture = await standUpCommittedRewind(PLAIN);
      const guest = await joinedViewer(fixture.host, GUEST);
      const before = guest.sent.length;

      await rebuild(fixture);

      const pushed = guest.sent.slice(before);
      expect(pushed.map((frame) => frame.kind)).toEqual([
        'ReplayStart',
        'ReplayChunk',
        'ReplayEnd',
      ]);
      expect(pushed[0]).toMatchObject({
        kind: 'ReplayStart',
        replacesStream: true,
      });
      expect(replayedIds(pushed)).toEqual(
        fixture.prefix.map((event) => event.id),
      );
    });

    it('M2 its session mirror shows the rebuilt phase without rejoining', async () => {
      const fixture = await standUpCommittedRewind(PLAIN);
      const guest = await joinedViewer(fixture.host, GUEST);
      expect(guest.phase()).toBe(fixture.preRewindPhase);

      await rebuild(fixture);

      expect(guest.phase()).toBe(fixture.expectedPhase);
      expect(guest.mirrorEventIds()).toEqual(
        fixture.prefix.map((event) => event.id),
      );
    });

    it('M3 a fresh connection after the rewind shows the rebuilt phase', async () => {
      const fixture = await standUpCommittedRewind(PLAIN);
      await rebuild(fixture);

      const fresh = await joinedViewer(fixture.host, GUEST);

      expect(fresh.phase()).toBe(fixture.expectedPhase);
    });

    it('M4 the next live event after the rewind applies on the connected client', async () => {
      const fixture = await standUpCommittedRewind(PLAIN);
      const guest = await joinedViewer(fixture.host, GUEST);
      await rebuild(fixture);

      const concede: IIntent = {
        kind: 'Intent',
        matchId: fixture.log.matchId,
        ts: AT,
        playerId: GM,
        intent: { kind: 'Concede', side: 'player' },
      };
      await fixture.host.handleIntent(concede, 'conn-after-rewind');
      await settle(() =>
        guest.mirrorEventTypes().includes(GameEventType.GameEnded),
      );

      expect(guest.lifecycle().blockedBySequenceCollision).toBe(false);
      expect(guest.mirrorEventTypes()).toContain(GameEventType.GameEnded);
    });
  });

  describe('privacy of the replay', () => {
    it('each socket gets its own projection: no fog-hidden fact and no authority-only field reaches a player', async () => {
      const fixture = await standUpCommittedRewind(FOG);
      const hidden = fixture.prefix.find(
        (event) => event.type === GameEventType.MovementDeclared,
      );
      // Fixture sanity: the kept prefix holds the GM side's actor-only
      // movement and an event carrying a GM-only record reference.
      expect(hidden).toBeDefined();
      expect(JSON.stringify(fixture.prefix)).toContain(PRIVATE_RECORD_REF);
      const gm = await joinedViewer(fixture.host, GM);
      const guest = await joinedViewer(fixture.host, GUEST);
      const marks = { gm: gm.sent.length, guest: guest.sent.length };

      await rebuild(fixture);

      const pushedToGm = gm.sent.slice(marks.gm);
      const pushedToGuest = guest.sent.slice(marks.guest);
      // The owner of the moving unit sees its movement; the opponent does not.
      expect(replayedIds(pushedToGm)).toContain(hidden!.id);
      expect(replayedIds(pushedToGuest).length).toBeGreaterThan(0);
      expect(replayedIds(pushedToGuest)).not.toContain(hidden!.id);
      // Both are player-role viewers in a tactical match: neither gets
      // the authority sequence or the GM-only record reference.
      for (const frame of [...pushedToGm, ...pushedToGuest]) {
        for (const event of eventsOf(frame)) {
          expect(Object.hasOwn(event as object, 'sequence')).toBe(false);
        }
      }
      expect(JSON.stringify(pushedToGm)).not.toContain(PRIVATE_RECORD_REF);
      expect(JSON.stringify(pushedToGuest)).not.toContain(PRIVATE_RECORD_REF);
      // Each push is exactly what that viewer's own fresh join receives.
      const freshGuest = await joinedViewer(fixture.host, GUEST);
      const freshGm = await joinedViewer(fixture.host, GM);
      expect(withoutReplayStamps(pushedToGuest)).toEqual(
        withoutReplayStamps(freshGuest.sent),
      );
      expect(withoutReplayStamps(pushedToGm)).toEqual(
        withoutReplayStamps(freshGm.sent),
      );
    });
  });

  describe('through the rewind commit route', () => {
    const MATCH_ID = 'u22a-live-route';
    const PRIVATE_REASON = `GM-only reason ${'u22a'} - never on a player wire`;
    let host: IHolder;
    let guest: IHolder;

    beforeEach(async () => {
      host = await mintHolder('host');
      guest = await mintHolder('guest');
      _setDefaultMatchStoreForTests(store);
      await writePlayLog(
        store,
        { matchId: MATCH_ID, fogOfWar: false, targetRevision: 2 },
        routeMeta(MATCH_ID, host, guest),
      );
    });

    afterEach(async () => {
      await getMatchHostRegistry().closeMatch(MATCH_ID);
      _resetMatchHostRegistry();
      _resetDefaultMatchStore();
    });

    it('a rewind committed with a private reason reaches the connected players and carries no reason', async () => {
      await getMatchHostRegistry().recoverActiveMatches();
      const live = getMatchHostRegistry().get(MATCH_ID);
      expect(live).not.toBeNull();
      const hostViewer = await joinedViewer(live!, host.playerId);
      const guestViewer = await joinedViewer(live!, guest.playerId);
      const marks = {
        host: hostViewer.sent.length,
        guest: guestViewer.sent.length,
      };
      const head = readEffectiveStreamHead(
        db,
        new SQLiteEventHistoryBranchStore(db),
        matchStreamRef(MATCH_ID),
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { id: MATCH_ID },
        headers: { authorization: `Bearer ${host.wire}` },
        body: {
          targetRevision: 2,
          expectedBranchId: MATCH_BASELINE_BRANCH_ID,
          expectedRevision: head.revision,
          expectedDigest: head.digest,
          expectedGeneration: 1,
          reason: PRIVATE_REASON,
        },
      });
      await commitHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const records = db
        .prepare(
          'SELECT payload FROM private_record WHERE campaign_session_id = ? AND record_kind = ?',
        )
        .all(MATCH_ID, 'gm-reason') as { readonly payload: string }[];
      expect(records.map((row) => row.payload)).toEqual([PRIVATE_REASON]);
      for (const [viewer, mark] of [
        [hostViewer, marks.host],
        [guestViewer, marks.guest],
      ] as const) {
        const pushed = viewer.sent.slice(mark);
        expect(pushed[0]).toMatchObject({
          kind: 'ReplayStart',
          replacesStream: true,
        });
        expect(JSON.stringify(viewer.sent)).not.toContain(PRIVATE_REASON);
      }
      expect(guestViewer.phase()).toBe(GamePhase.Initiative);
    });
  });

  // -------------------------------------------------------------------------
  // Fixture
  // -------------------------------------------------------------------------

  interface IStoodUp {
    readonly log: IPlayLog;
    readonly host: ServerMatchHost;
    readonly result: Extract<
      Awaited<ReturnType<typeof commitGmCombatRewind>>,
      { kind: 'committed' }
    >;
    readonly prefix: readonly IGameEvent[];
    readonly expectedPhase: GamePhase;
    readonly preRewindPhase: GamePhase;
  }

  /**
   * Writes the play log as one command batch (combat journal mode
   * enabled, so the mirror writes the journal the commit anchors to),
   * stands up a live host on it and commits the rewind to the log's
   * target revision. The host is not rebuilt yet.
   */
  async function standUpCommittedRewind(log: IPlayLog): Promise<IStoodUp> {
    const meta = await writePlayLog(store, log, tacticalMeta(log));
    const events = await store.getEvents(log.matchId);
    const host = new ServerMatchHost(
      log.matchId,
      store,
      await InteractiveSession.fromSessionAsync(
        foldMatchSession(log.matchId, events),
      ),
      new SeededDiceRoller(new SeededRandom(SEED)),
      {
        recovered: true,
        randomSeed: SEED,
        diceSeed: SEED,
        rollbackReader: { kind: 'legacy-compatible' },
      },
    );
    const stream = matchStreamRef(log.matchId);
    const branches = new SQLiteEventHistoryBranchStore(db);
    const head = readEffectiveStreamHead(db, branches, stream);
    const effective = branches.readEffectiveHead(stream);
    if (effective === null)
      throw new Error('the mirror left no effective head');
    const result = await commitGmCombatRewind(
      buildGmCombatRewindCommitDeps({
        store,
        meta,
        priorHeadRevision: head.revision,
        nowIso: () => AT,
      }),
      {
        actorId: meta.hostPlayerId,
        role: 'gm',
        gameId: log.matchId,
        ownedStateRefs: [`game:${log.matchId}`],
      },
      {
        matchId: log.matchId,
        targetRevision: log.targetRevision,
        expectedBranchId: head.branchId,
        expectedRevision: head.revision,
        expectedDigest: head.digest,
        expectedGeneration: effective.effectiveGeneration,
        actor: meta.hostPlayerId,
        reason: 'authorized combat rewind',
      },
    );
    expect(result).toMatchObject({ kind: 'committed' });
    if (result.kind !== 'committed')
      throw new Error('expected a committed rewind');
    const prefix = events.filter(
      (event) => revisionForMatchSequence(event.sequence) <= log.targetRevision,
    );
    return {
      log,
      host,
      result,
      prefix,
      expectedPhase: foldMatchSession(log.matchId, prefix).currentState.phase,
      preRewindPhase: host.getSessionForTests().currentState.phase,
    };
  }

  /** Rebuilds the live host on the committed branch, as the commit route does. */
  async function rebuild(fixture: IStoodUp): Promise<void> {
    await fixture.host.rebuildFromActivatedBranch({
      branchId: fixture.result.activatedBranchId,
      effectiveRevision: fixture.log.targetRevision,
      effectiveGeneration: fixture.result.effectiveGeneration,
    });
  }

  /** Attaches a wired viewer to the host and runs its join replay. */
  async function joinedViewer(
    host: ServerMatchHost,
    playerId: string,
  ): Promise<IWiredViewer> {
    const viewer = wireViewer(host, playerId);
    opened.push(viewer);
    await host.handleSessionJoin(viewer.serverSocket, playerId);
    return viewer;
  }
});

// ---------------------------------------------------------------------------
// The client half, wired the way the lobby page wires it
// ---------------------------------------------------------------------------

interface IWiredViewer {
  readonly serverSocket: IMatchSocket;
  readonly sent: IServerMessage[];
  readonly phase: () => GamePhase | null;
  readonly mirrorEventIds: () => string[];
  readonly mirrorEventTypes: () => GameEventType[];
  readonly lifecycle: () => IClientLifecycleState;
  readonly close: () => void;
}

/** A setter for hook state these rows never read. */
const ignoreState = (): void => undefined;

/** A React-state stand-in: holds one value and applies SetStateAction to it. */
function cell<T>(initial: T): {
  readonly get: () => T;
  readonly set: (action: SetStateAction<T>) => void;
} {
  let value = initial;
  return {
    get: () => value,
    set: (action) => {
      value =
        typeof action === 'function'
          ? (action as (previous: T) => T)(value)
          : action;
    },
  };
}

/**
 * Attaches a host socket whose every frame is delivered to a real
 * client connected through connectMultiplayerSession. The client's own
 * SessionJoin is not sent (its socket never opens); the test drives
 * joins through the host, as the upgrade handler does.
 */
function wireViewer(host: ServerMatchHost, playerId: string): IWiredViewer {
  let clientSocket: IClientWebSocket | null = null;
  const sent: IServerMessage[] = [];
  const serverSocket = {
    send(data: string) {
      sent.push(JSON.parse(data) as IServerMessage);
      clientSocket?.onmessage?.({ data });
    },
    close() {},
    get readyState() {
      return 1;
    },
  } as unknown as IMatchSocket;
  const mirrorLog = cell<readonly unknown[]>([]);
  const lifecycle = cell<IClientLifecycleState>({
    blockedBySequenceCollision: false,
    pendingIntentCount: 0,
    ready: false,
    reconnectScheduled: false,
    recoveringFromGap: false,
  });
  const disconnect = connectMultiplayerSession({
    auth: { playerId, token: 'u22a-token' },
    clientRef: { current: null },
    lobbyStateRef: { current: null },
    matchId: host.matchId,
    options: {
      reconnect: false,
      socketFactory: () => {
        const socket: IClientWebSocket = {
          send() {},
          close() {},
          readyState: 1,
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
        };
        clientSocket = socket;
        return socket;
      },
    },
    url: 'ws://u22a.test/socket',
    setClosedInfo: ignoreState,
    setClientLifecycle: lifecycle.set,
    setError: ignoreState,
    setEvents: cell<readonly unknown[]>([]).set,
    setIntentError: ignoreState,
    setLastSeq: cell(-1).set,
    setLobbyState: ignoreState,
    setMirrorLog: mirrorLog.set,
    setPausedInfo: ignoreState,
    setProjectionSignal: ignoreState,
    setStatus: ignoreState,
  });
  host.attachSocket(serverSocket, playerId);
  const mirror = () => buildMirrorSessionGated(mirrorLog.get());
  const mirrored = (): readonly IGameEvent[] => {
    const gated = mirror();
    return gated.kind === 'session' ? gated.events : [];
  };
  return {
    serverSocket,
    sent,
    phase: () => {
      const gated = mirror();
      return gated.kind === 'session'
        ? (gated.session as IGameSession).currentState.phase
        : null;
    },
    mirrorEventIds: () => mirrored().map((event) => event.id),
    mirrorEventTypes: () => mirrored().map((event) => event.type),
    lifecycle: lifecycle.get,
    close: () => {
      disconnect();
      host.detachSocket(serverSocket);
    },
  };
}

function eventsOf(frame: IServerMessage): readonly unknown[] {
  if (frame.kind === 'ReplayChunk') return frame.events;
  if (frame.kind === 'Event') return [frame.event];
  return [];
}

function replayedIds(frames: readonly IServerMessage[]): string[] {
  return frames.flatMap((frame) =>
    frame.kind === 'ReplayChunk'
      ? frame.events.map((event) => (event as { readonly id: string }).id)
      : [],
  );
}

/** The frames minus what legitimately differs between two sends: ts and the marker. */
function withoutReplayStamps(frames: readonly IServerMessage[]): unknown[] {
  return frames.map((frame) => {
    const { ts: _ts, ...rest } = frame as IServerMessage & {
      readonly replacesStream?: true;
    };
    const { replacesStream: _marker, ...unmarked } = rest as typeof rest & {
      readonly replacesStream?: true;
    };
    return unmarked;
  });
}

/** Lets queued microtasks run until `done` holds (at most 200 turns). */
async function settle(done: () => boolean): Promise<void> {
  for (let turn = 0; turn < 200 && !done(); turn += 1) {
    await Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Play logs and metas
// ---------------------------------------------------------------------------

function tacticalMeta(log: IPlayLog): IMatchMeta {
  return {
    matchId: log.matchId,
    hostPlayerId: GM,
    playerIds: [GM, GUEST],
    sideAssignments: [
      { playerId: GM, side: 'player' },
      { playerId: GUEST, side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: {
      mapRadius: 4,
      turnLimit: 5,
      ...(log.fogOfWar ? { fogOfWar: true } : {}),
    },
  };
}

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

/** A signed player token, as the route's bearer check reads it. */
async function mintHolder(name: string): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${name}`,
    displayName: name,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: AT,
  };
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

/** A seated 1v1 lobby match, as the lobby route writes it. */
function routeMeta(matchId: string, host: IHolder, guest: IHolder): IMatchMeta {
  return {
    matchId,
    hostPlayerId: host.playerId,
    playerIds: [host.playerId, guest.playerId],
    sideAssignments: [
      { playerId: host.playerId, side: 'player' },
      { playerId: guest.playerId, side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => ({
      ...seat,
      occupant: {
        playerId: seat.slotId === 'alpha-1' ? host.playerId : guest.playerId,
        displayName: seat.slotId === 'alpha-1' ? 'Host' : 'Guest',
      },
      ready: true,
    })),
  };
}

/**
 * Creates the match and commits its play log as one command batch.
 * Plain: GameCreated, GameStarted and two phase changes (initiative ->
 * movement -> weapon attack). Fog: the same with the player-side unit's
 * movement declared in the movement phase, and a GM-only record
 * reference on the first phase change.
 */
async function writePlayLog(
  matchStore: DurableMatchStore,
  log: IPlayLog,
  meta: IMatchMeta,
): Promise<IMatchMeta> {
  await matchStore.createMatch(meta);
  const units = [
    {
      id: 'u-p1',
      name: 'u-p1',
      side: GameSide.Player,
      unitRef: 'u-p1',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    },
    ...(log.fogOfWar
      ? [
          {
            id: 'u-o1',
            name: 'u-o1',
            side: GameSide.Opponent,
            unitRef: 'u-o1',
            pilotRef: 'o1',
            gunnery: 4,
            piloting: 5,
          },
        ]
      : []),
  ];
  let session = createGameSession(
    { mapRadius: 4, turnLimit: 5, victoryConditions: [], optionalRules: [] },
    units,
    { id: log.matchId, createdAt: AT },
  );
  session = advancePhase(startGame(session, GameSide.Player));
  if (log.fogOfWar) {
    const from = session.currentState.units['u-p1'].position;
    session = declareMovement(
      session,
      'u-p1',
      from,
      { q: from.q, r: from.r - 1 },
      Facing.North,
      MovementType.Walk,
      1,
      0,
    );
  }
  session = advancePhase(session);
  const events = log.fogOfWar
    ? session.events.map((event, index) =>
        index === 2
          ? { ...event, privateRecordRef: PRIVATE_RECORD_REF }
          : event,
      )
    : session.events;
  const committed = await matchStore.appendCommandBatch(log.matchId, {
    commandId: 'play-log',
    actorId: meta.hostPlayerId,
    expectedRevision: 0,
    events: events as readonly IGameEvent[],
  });
  expect(committed.kind).toBe('committed');
  return meta;
}
