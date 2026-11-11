/** @spec openspec/changes/fix-mp-refusals-sender-only/specs/multiplayer-server/spec.md */
import { EventEmitter } from 'node:events';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, GameStatus } from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import {
  nowIso,
  type IErrorCode,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import type {
  IJournalAuthorityHostHandle,
  IServerMatchHostIntentContext,
} from '../ServerMatchHostIntent';

import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
} from '../authorization/AuthorizedViewer';
import * as authorization from '../authorization/HumanActionAuthorizationGate';
import { MembershipSourceUnavailableError } from '../authorization/MatchSeatMembershipSource';
import { bindMultiplayerSocketConnection } from '../bindMultiplayerSocketConnection';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { INTENT_REFUSAL_REASONS } from '../intentRefusal';
import * as journalAuthority from '../matchJournalAuthority';
import { AcceptedIntentTracker } from '../reconnection/AcceptedIntentTracker';
import { IntentRateLimiter } from '../reconnection/IntentRateLimiter';
import { ServerMatchHost } from '../ServerMatchHost';
import * as contexts from '../ServerMatchHostContexts';
import * as decisions from '../ServerMatchHostDecision';
import * as engine from '../ServerMatchHostEngineDispatch';

jest.mock('@/lib/multiplayer/server/ServerMatchHostContexts', () => {
  const actual = jest.requireActual<
    typeof import('../ServerMatchHostContexts')
  >('../ServerMatchHostContexts');
  return {
    ...actual,
    buildIntentContext: jest.fn(actual.buildIntentContext),
    buildLobbyContext: jest.fn(actual.buildLobbyContext),
  };
});
jest.mock('@/lib/multiplayer/server/ServerMatchHostDecision', () => {
  const actual = jest.requireActual<
    typeof import('../ServerMatchHostDecision')
  >('../ServerMatchHostDecision');
  return { ...actual, decideCommandBatch: jest.fn(actual.decideCommandBatch) };
});
jest.mock('@/lib/multiplayer/server/ServerMatchHostEngineDispatch', () => {
  const actual = jest.requireActual<
    typeof import('../ServerMatchHostEngineDispatch')
  >('../ServerMatchHostEngineDispatch');
  return { ...actual, dispatchToEngine: jest.fn(actual.dispatchToEngine) };
});
jest.mock(
  '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate',
  () => {
    const actual = jest.requireActual<
      typeof import('../authorization/HumanActionAuthorizationGate')
    >('../authorization/HumanActionAuthorizationGate');
    return {
      ...actual,
      authorizeHumanAction: jest.fn(actual.authorizeHumanAction),
    };
  },
);

const MATCH = 'private-refusal';
const RAW = 'SECRET engine target at hex 19,-7 blocked by unseen unit';
class Socket extends EventEmitter {
  readonly frames: IServerMessage[] = [];
  readyState = 1;
  send(data: string): void {
    this.frames.push(JSON.parse(data) as IServerMessage);
  }
  close(): void {
    this.readyState = 3;
    this.emit('close');
  }
}

async function fixture() {
  const store = new InMemoryMatchStore({ quiet: true });
  await store.createMatch({
    matchId: MATCH,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    config: { mapRadius: 4, turnLimit: 5 },
    seats: [
      ...defaultSeats('1v1').map((seat) => ({
        ...seat,
        occupant: {
          playerId: seat.slotId === 'alpha-1' ? 'p1' : 'p2',
          displayName: seat.slotId,
        },
      })),
      {
        slotId: 'spectator-1',
        side: 'spectator',
        seatNumber: 1,
        kind: 'spectator',
        ready: false,
        occupant: { playerId: 'watch', displayName: 'Watcher' },
      },
    ],
  });
  const host = ServerMatchHost.create(MATCH, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      {
        id: 'own',
        name: 'Own',
        side: GameSide.Player,
        unitRef: 'own',
        pilotRef: 'pilot',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'enemy',
        name: 'Enemy',
        side: GameSide.Opponent,
        unitRef: 'enemy',
        pilotRef: 'pilot',
        gunnery: 4,
        piloting: 5,
      },
    ],
  });
  await Promise.resolve();
  await Promise.resolve();
  const sockets = {
    p1: new Socket(),
    p2: new Socket(),
    watch: new Socket(),
    second: new Socket(),
  };
  for (const [key, socket] of Object.entries(sockets)) {
    const bound = await bindMultiplayerSocketConnection({
      socket,
      matchId: MATCH,
      verifiedPlayerId: key === 'second' ? 'p1' : key,
      connectionKey: key,
      registry: { getOrCreate: async () => host },
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    expect(bound).not.toBeNull();
  }
  Object.values(sockets).forEach((socket) => {
    socket.frames.length = 0;
  });
  return { host, store, sockets };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
function envelope(playerId = 'p1'): IIntent {
  return {
    kind: 'Intent',
    matchId: MATCH,
    ts: nowIso(),
    playerId,
    intentId: 'private-intent',
    intent: { kind: 'AdvancePhase' },
  };
}
function overrideContext(patch: Partial<IServerMatchHostIntentContext>) {
  const build = jest.requireActual<typeof import('../ServerMatchHostContexts')>(
    '../ServerMatchHostContexts',
  ).buildIntentContext;
  jest
    .spyOn(contexts, 'buildIntentContext')
    .mockImplementation((host) => ({ ...build(host), ...patch }));
}
function journal(): IJournalAuthorityHostHandle {
  return {
    enabled: true,
    shadow: false,
    decideDeps: {
      randomSeed: 42,
      diceSeed: 42,
      playerUnits: [],
      opponentUnits: [],
    },
    d6: () => 3,
    replaceSession: () => {},
    markDivergence: () => {},
    setLastBroadcastSeq: () => {},
    publishDurableCombatOutcome: async () => {},
    recordRecovery: () => {},
    recordShadowComparison: () => {},
  };
}
function branchPort(store: InMemoryMatchStore, corrupt = false) {
  Object.assign(store, {
    readBranch: () => null,
    requireBranch: () => null,
    requireEffectiveHead: () => null,
    createBranch: () => null,
    transitionBranchStatus: () => null,
    readEffectiveHead: () => {
      if (corrupt) throw new EventHistoryBranchError('branch-integrity', RAW);
      return { branchId: 'replacement', effectiveGeneration: 2 };
    },
  });
}
interface Case {
  name: string;
  code: IErrorCode;
  sender?: 'p1' | 'watch';
  prepare: (f: Fixture, intent: IIntent) => void | Promise<void>;
}
const cases: Case[] = [
  {
    name: 'closed host gate',
    code: 'UNKNOWN_MATCH',
    prepare: () => overrideContext({ closed: true }),
  },
  {
    name: 'reserved server command id',
    code: 'AUTH_REJECTED',
    prepare: (_, i) => {
      i.intentId = 'coop-ai:private';
    },
  },
  {
    name: 'principal mismatch',
    code: 'AUTH_REJECTED',
    prepare: (_, i) => {
      i.playerId = 'p2';
    },
  },
  {
    name: 'spectator engine command',
    code: 'INVALID_INTENT',
    sender: 'watch',
    prepare: () => {},
  },
  {
    name: 'spectator lobby command',
    code: 'INVALID_INTENT',
    sender: 'watch',
    prepare: (_, i) => {
      i.intent = { kind: 'LaunchMatch' };
    },
  },
  {
    name: 'rollback blocked',
    code: 'INTERNAL_ERROR',
    prepare: () => overrideContext({ rollbackBlockReason: 'digest-mismatch' }),
  },
  {
    name: 'rebuild lease',
    code: 'PROJECTION_REBUILDING',
    prepare: ({ store }) => {
      Object.assign(store, {
        readMatchStreamRebuild: () => ({
          code: 'PROJECTION_REBUILDING',
          action: 'retry-after-rebuild',
        }),
      });
    },
  },
  {
    name: 'corrupt rebuild reader',
    code: 'MATCH_QUARANTINED',
    prepare: ({ store }) => {
      Object.assign(store, {
        readMatchStreamRebuild: () => {
          throw new EventHistoryBranchError('branch-integrity', RAW);
        },
      });
    },
  },
  {
    name: 'stale branch',
    code: 'STALE_BRANCH',
    prepare: ({ store }) => branchPort(store),
  },
  {
    name: 'corrupt branch',
    code: 'MATCH_QUARANTINED',
    prepare: ({ store }) => branchPort(store, true),
  },
  {
    name: 'GM-only rewind cut',
    code: 'GM_ONLY',
    prepare: async ({ store }, i) => {
      branchPort(store);
      await store.updateMatchMeta(MATCH, { hostPlayerId: 'p2' });
      Reflect.set(i.intent, 'targetRevision', 1);
    },
  },
  {
    name: 'rewind review response',
    code: 'INVALID_INTENT',
    prepare: ({ store }, i) => {
      branchPort(store);
      i.intent = {
        kind: 'RewindRequest',
        targetRevision: 1,
        reason: 'please review',
      };
    },
  },
  {
    name: 'authorization scope refusal',
    code: 'AUTH_REJECTED',
    prepare: () => {
      jest
        .spyOn(authorization, 'authorizeHumanAction')
        .mockRejectedValue(
          new authorization.HumanActionAuthorizationError(
            'scope-escalation',
            RAW,
          ),
        );
    },
  },
  {
    name: 'revoked membership',
    code: 'AUTH_REJECTED',
    prepare: () => {
      jest
        .spyOn(AuthorizedViewerResolver.prototype, 'resolve')
        .mockRejectedValue(
          new AuthorizedViewerError('no-active-membership', RAW),
        );
    },
  },
  {
    name: 'membership source unavailable',
    code: 'INTERNAL_ERROR',
    prepare: () => {
      jest
        .spyOn(AuthorizedViewerResolver.prototype, 'resolve')
        .mockRejectedValue(new MembershipSourceUnavailableError(RAW));
    },
  },
  {
    name: 'foreign unit',
    code: 'INVALID_INTENT',
    prepare: (_, i) => {
      i.intent = { kind: 'GoProne', unitId: 'enemy' };
    },
  },
  {
    name: 'unknown unit',
    code: 'INVALID_INTENT',
    prepare: (_, i) => {
      i.intent = { kind: 'GoProne', unitId: 'unknown-private-unit' };
    },
  },
  {
    name: 'rate limit',
    code: 'RATE_LIMITED',
    prepare: () => {
      jest
        .spyOn(IntentRateLimiter.prototype, 'tryConsume')
        .mockReturnValue(false);
    },
  },
  {
    name: 'duplicate intent',
    code: 'DUPLICATE_INTENT',
    prepare: () => {
      jest
        .spyOn(AcceptedIntentTracker.prototype, 'isDuplicate')
        .mockReturnValue(true);
    },
  },
  {
    name: 'paused match',
    code: 'MATCH_PAUSED',
    prepare: () => overrideContext({ isPaused: true, pauseRefusal: RAW }),
  },
  {
    name: 'completed match',
    code: 'INVALID_INTENT',
    prepare: ({ host }) => {
      Reflect.set(
        host.getSessionForTests().currentState,
        'status',
        GameStatus.Completed,
      );
    },
  },
  {
    name: 'forbidden client dice',
    code: 'INVALID_INTENT',
    prepare: (_, i) => {
      Reflect.set(i.intent, 'rolls', [6]);
    },
  },
  {
    name: 'legacy engine exception',
    code: 'INVALID_INTENT',
    prepare: () => {
      jest.spyOn(engine, 'dispatchToEngine').mockImplementation(() => {
        throw new Error(RAW);
      });
    },
  },
  {
    name: 'journal engine exception',
    code: 'INVALID_INTENT',
    prepare: () => {
      overrideContext({ journalAuthority: journal() });
      jest.spyOn(decisions, 'decideCommandBatch').mockImplementation(() => {
        throw new Error(RAW);
      });
    },
  },
  {
    name: 'journal persistence exception',
    code: 'STORE_FAILURE',
    prepare: ({ store }) => {
      overrideContext({ journalAuthority: journal() });
      jest.spyOn(store, 'appendCommandBatch').mockRejectedValue(new Error(RAW));
    },
  },
  {
    name: 'journal missing batch capability',
    code: 'STORE_FAILURE',
    prepare: ({ store }) => {
      overrideContext({ journalAuthority: journal() });
      Reflect.set(store, 'appendCommandBatch', undefined);
    },
  },
  {
    name: 'journal revision conflict',
    code: 'STORE_FAILURE',
    prepare: ({ store }) => {
      overrideContext({ journalAuthority: journal() });
      jest.spyOn(store, 'appendCommandBatch').mockResolvedValue({
        kind: 'revision-conflict',
        expectedRevision: 1,
        actualRevision: 2,
      });
    },
  },
  {
    name: 'journal integrity conflict',
    code: 'STORE_FAILURE',
    prepare: ({ store }) => {
      overrideContext({ journalAuthority: journal() });
      jest.spyOn(store, 'appendCommandBatch').mockResolvedValue({
        kind: 'integrity-conflict',
        commandId: 'private-intent',
      });
    },
  },
  ...(['exception', 'revision', 'integrity'] as const).map(
    (result): Case => ({
      name: `journal resume ${result}`,
      code: 'STORE_FAILURE',
      prepare: ({ store }) => {
        overrideContext({ journalAuthority: journal() });
        jest.spyOn(store, 'getCommandReceipt').mockResolvedValue({
          commandId: 'private-intent',
          actorId: 'p1',
          matchId: MATCH,
          firstRevision: 0,
          lastRevision: 0,
          eventCount: 1,
          fingerprint: 'receipt',
          expectedPostStateDigest: null,
          committedAt: nowIso(),
        });
        const append = jest.spyOn(store, 'appendCommandBatch');
        if (result === 'exception') append.mockRejectedValue(new Error(RAW));
        else if (result === 'revision')
          append.mockResolvedValue({
            kind: 'revision-conflict',
            expectedRevision: 1,
            actualRevision: 2,
          });
        else
          append.mockResolvedValue({
            kind: 'integrity-conflict',
            commandId: 'private-intent',
          });
      },
    }),
  ),
  {
    name: 'journal projection divergence',
    code: 'INTERNAL_ERROR',
    prepare: () => {
      overrideContext({ journalAuthority: journal() });
      journalAuthority._setApplyCommittedForTests((live, events, deps) => {
        const applied = journalAuthority.foldCommittedEvents(
          live,
          events,
          deps,
        );
        applied.applyCorrectedState({
          ...applied.getState(),
          turn: applied.getState().turn + 1,
        });
        return applied;
      });
    },
  },
  {
    name: 'lobby host-only',
    code: 'AUTH_REJECTED',
    prepare: async ({ store }, i) => {
      await store.updateMatchMeta(MATCH, { hostPlayerId: 'p2' });
      i.intent = { kind: 'LaunchMatch' };
    },
  },
  {
    name: 'lobby state refusal',
    code: 'INVALID_INTENT',
    prepare: (_, i) => {
      i.intent = { kind: 'LaunchMatch' };
    },
  },
  {
    name: 'lobby persistence exception',
    code: 'STORE_FAILURE',
    prepare: async ({ store }, i) => {
      const meta = await store.getMatchMeta(MATCH);
      jest
        .spyOn(store, 'getMatchMeta')
        .mockResolvedValue({ ...meta, status: 'lobby' });
      i.intent = { kind: 'SetReady', slotId: 'alpha-1', ready: true };
      jest.spyOn(store, 'updateMatchMetaIf').mockRejectedValue(new Error(RAW));
    },
  },
  {
    name: 'lobby write contention',
    code: 'STORE_FAILURE',
    prepare: async ({ store }, i) => {
      const meta = {
        ...(await store.getMatchMeta(MATCH)),
        status: 'lobby' as const,
      };
      jest.spyOn(store, 'getMatchMeta').mockResolvedValue(meta);
      i.intent = { kind: 'SetReady', slotId: 'alpha-1', ready: true };
      jest
        .spyOn(store, 'updateMatchMetaIf')
        .mockResolvedValue({ kind: 'conflict', meta });
    },
  },
  {
    name: 'forfeit engine exception',
    code: 'INVALID_INTENT',
    prepare: (_, i) => {
      i.intent = { kind: 'ForfeitMatch' };
      const build = jest.requireActual<
        typeof import('../ServerMatchHostContexts')
      >('../ServerMatchHostContexts').buildLobbyContext;
      jest.spyOn(contexts, 'buildLobbyContext').mockImplementation((host) => {
        jest.spyOn(host.session, 'concede').mockImplementation(() => {
          throw new Error(RAW);
        });
        return build(host);
      });
    },
  },
  {
    name: 'forfeit persistence exception',
    code: 'STORE_FAILURE',
    prepare: ({ store }, i) => {
      i.intent = { kind: 'ForfeitMatch' };
      jest.spyOn(store, 'appendEvent').mockRejectedValue(new Error(RAW));
    },
  },
];

describe('hosted refusal privacy with two players and a spectator', () => {
  let f: Fixture;
  beforeEach(async () => {
    jest
      .mocked(contexts.buildIntentContext)
      .mockImplementation(
        jest.requireActual<typeof import('../ServerMatchHostContexts')>(
          '../ServerMatchHostContexts',
        ).buildIntentContext,
      );
    jest
      .mocked(contexts.buildLobbyContext)
      .mockImplementation(
        jest.requireActual<typeof import('../ServerMatchHostContexts')>(
          '../ServerMatchHostContexts',
        ).buildLobbyContext,
      );
    jest
      .mocked(engine.dispatchToEngine)
      .mockImplementation(
        jest.requireActual<typeof import('../ServerMatchHostEngineDispatch')>(
          '../ServerMatchHostEngineDispatch',
        ).dispatchToEngine,
      );
    jest
      .mocked(decisions.decideCommandBatch)
      .mockImplementation(
        jest.requireActual<typeof import('../ServerMatchHostDecision')>(
          '../ServerMatchHostDecision',
        ).decideCommandBatch,
      );
    jest
      .mocked(authorization.authorizeHumanAction)
      .mockImplementation(
        jest.requireActual<
          typeof import('../authorization/HumanActionAuthorizationGate')
        >('../authorization/HumanActionAuthorizationGate').authorizeHumanAction,
      );

    f = await fixture();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    journalAuthority._setApplyCommittedForTests(null);
    await f.host.closeMatch();
  });
  it.each(cases)(
    '$name replies only to its sender with $code',
    async ({ name, code, sender = 'p1', prepare }) => {
      const intent = envelope(sender);
      await prepare(f, intent);
      const logs = jest.spyOn(logger, 'warn');
      const before = f.host.getSessionForTests().events.length;
      const messages = await f.host.handleIntent(intent, sender, sender);
      expect(f.sockets[sender].frames).toEqual([
        expect.objectContaining({
          kind: 'Error',
          code,
          intentId: intent.intentId,
          reason: INTENT_REFUSAL_REASONS[code],
        }),
      ]);
      expect(messages).toEqual(f.sockets[sender].frames);
      for (const [key, socket] of Object.entries(f.sockets)) {
        if (key !== sender) expect(socket.frames).toEqual([]);
        expect(JSON.stringify(socket.frames)).not.toContain(RAW);
      }
      if (name !== 'forfeit persistence exception')
        expect(f.host.getSessionForTests().events.length).toBe(before);
      expect(logs).toHaveBeenCalledWith(
        '[multiplayer] intent refused',
        expect.objectContaining({
          matchId: MATCH,
          intentId: intent.intentId,
          code,
        }),
      );
      if (
        name === 'legacy engine exception' ||
        name === 'journal engine exception'
      ) {
        expect(logs).toHaveBeenCalledWith(
          '[multiplayer] intent refused',
          expect.objectContaining({ diagnostic: RAW }),
        );
      }
    },
  );
  it('delivers a real bound wire intent refusal and keeps all other sockets silent', async () => {
    jest.spyOn(engine, 'dispatchToEngine').mockImplementation(() => {
      throw new Error(RAW);
    });
    const call = jest.spyOn(f.host, 'handleIntent');
    f.sockets.p1.emit('message', JSON.stringify(envelope()));
    await Promise.resolve();
    await Promise.resolve();
    await call.mock.results[0].value;
    expect(f.sockets.p1.frames).toEqual([
      expect.objectContaining({
        code: 'INVALID_INTENT',
        reason: 'Intent could not be applied.',
      }),
    ]);
    expect(f.sockets.p2.frames).toEqual([]);
    expect(f.sockets.watch.frames).toEqual([]);
    expect(f.sockets.second.frames).toEqual([]);
    expect(
      JSON.stringify(Object.values(f.sockets).map((s) => s.frames)),
    ).not.toContain(RAW);
  });
  it('never falls back to broadcasting for a missing or released connection key', async () => {
    f.host.releaseConnection('p1');
    jest.spyOn(engine, 'dispatchToEngine').mockImplementation(() => {
      throw new Error(RAW);
    });
    for (const key of ['p1', 'missing'])
      await f.host.handleIntent(envelope(), key, 'p1');
    for (const socket of Object.values(f.sockets))
      expect(socket.frames).toEqual([]);
  });
});
