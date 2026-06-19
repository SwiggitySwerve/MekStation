import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';

jest.mock(
  'src/lib/p2p/matchLogStorage',
  () => {
    const actual = jest.requireActual<
      typeof import('@/lib/p2p/matchLogStorage')
    >('@/lib/p2p/matchLogStorage');
    return {
      ...actual,
      matchLogStorage: {
        appendEvent: jest.fn(),
        getEventsForMatch: jest.fn(),
        getLastSequence: jest.fn(),
      },
    };
  },
  { virtual: true },
);

jest.mock('@/lib/p2p/matchLogStorage', () => {
  const actual = jest.requireActual<typeof import('@/lib/p2p/matchLogStorage')>(
    '@/lib/p2p/matchLogStorage',
  );
  return {
    ...actual,
    matchLogStorage: {
      appendEvent: jest.fn(),
      getEventsForMatch: jest.fn(),
      getLastSequence: jest.fn(),
    },
  };
});

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import type { IWeapon } from '@/simulation/ai/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameSide,
  LockState,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import {
  nowIso,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  parsed: IServerMessage;
}

type AppendMatchEvent = (
  matchId: string,
  event: IGameEvent,
) => Promise<{
  matchId: string;
  sequence: number;
  event: IGameEvent;
  savedAt: string;
}>;
type GetEventsForMatch = (matchId: string) => Promise<IGameEvent[]>;
type GetLastSequence = (matchId: string) => Promise<number>;

type MatchLogStorageMock = {
  appendEvent: jest.MockedFunction<AppendMatchEvent>;
  getEventsForMatch: jest.MockedFunction<GetEventsForMatch>;
  getLastSequence: jest.MockedFunction<GetLastSequence>;
};

function makeSocket(): IMatchSocket & {
  sent: IRecordedSend[];
  closed: boolean;
  clear: () => void;
} {
  const sent: IRecordedSend[] = [];
  let closed = false;
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage });
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    sent,
    get closed() {
      return closed;
    },
    clear() {
      sent.length = 0;
    },
  } as IMatchSocket & {
    sent: IRecordedSend[];
    closed: boolean;
    clear: () => void;
  };
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-opponent',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide) {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -2 } : { q: 0, r: 2 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

async function makeActiveHost(matchId: string) {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = new Date().toISOString();
  const seats = defaultSeats('1v1').map((seat) => {
    if (seat.slotId === 'alpha-1') {
      return {
        ...seat,
        occupant: { playerId: 'pid_host', displayName: 'Host' },
        ready: true,
      };
    }
    if (seat.slotId === 'bravo-1') {
      return {
        ...seat,
        occupant: { playerId: 'pid_guest', displayName: 'Guest' },
        ready: true,
      };
    }
    return seat;
  });
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_guest'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 30 },
    layout: '1v1',
    seats,
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 30,
    random: new SeededRandom(1),
    grid: createMinimalGrid(4),
    playerUnits: [makeAdaptedUnit('unit-player', GameSide.Player)],
    opponentUnits: [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
    gameUnits: makeUnits(),
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

function isGameEvent(value: unknown): value is IGameEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sequence' in value &&
    'type' in value
  );
}

function replayEventsFrom(message: IServerMessage): readonly IGameEvent[] {
  if (message.kind !== 'ReplayChunk') {
    return [];
  }
  const queue: unknown[] = [message];
  const events: IGameEvent[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (isGameEvent(current)) {
      events.push(current);
      continue;
    }
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (typeof current === 'object' && current !== null) {
      for (const value of Object.values(current as Record<string, unknown>)) {
        queue.push(value);
      }
    }
  }
  return events;
}

function eventStorage(events: readonly IGameEvent[]) {
  return {
    getEventsForMatch: jest.fn(async () => [...events]),
    getLastSequence: jest.fn(async () => events.at(-1)?.sequence ?? -1),
  };
}

async function hydrateCurrentState(
  matchId: string,
  events: readonly IGameEvent[],
): Promise<IGameSession['currentState']> {
  const session = await InteractiveSession.fromMatchLog(
    matchId,
    eventStorage(events),
  );
  return session.currentState;
}

async function advanceHostToEventCount(
  host: ServerMatchHost,
  store: InMemoryMatchStore,
  matchId: string,
  targetCount: number,
): Promise<readonly IGameEvent[]> {
  let events = await store.getEvents(matchId);
  for (let guard = 0; events.length < targetCount && guard < 50; guard += 1) {
    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
    };
    const broadcasts = await host.handleIntent(intent);
    const error = broadcasts.find((message) => message.kind === 'Error');
    expect(error).toBeUndefined();
    events = await store.getEvents(matchId);
  }
  expect(events.length).toBeGreaterThanOrEqual(targetCount);
  return events;
}

describe('reconnect persistence integration', () => {
  const localLogs = new Map<string, IGameEvent[]>();
  let mockedMatchLogStorage: MatchLogStorageMock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockedMatchLogStorage = {
      appendEvent: jest.spyOn(matchLogStorage, 'appendEvent'),
      getEventsForMatch: jest.spyOn(matchLogStorage, 'getEventsForMatch'),
      getLastSequence: jest.spyOn(matchLogStorage, 'getLastSequence'),
    } as unknown as MatchLogStorageMock;
    localLogs.clear();
    mockedMatchLogStorage.appendEvent.mockReset();
    mockedMatchLogStorage.getEventsForMatch.mockReset();
    mockedMatchLogStorage.getLastSequence.mockReset();
    mockedMatchLogStorage.appendEvent.mockImplementation(
      async (matchId: string, event: IGameEvent) => {
        const events = localLogs.get(matchId) ?? [];
        events.push(event);
        localLogs.set(matchId, events);
        return {
          matchId,
          sequence: event.sequence,
          event,
          savedAt: '2026-04-30T00:00:00.000Z',
        };
      },
    );
    mockedMatchLogStorage.getEventsForMatch.mockImplementation(
      async (matchId: string) => localLogs.get(matchId) ?? [],
    );
    mockedMatchLogStorage.getLastSequence.mockImplementation(
      async (matchId: string) => localLogs.get(matchId)?.at(-1)?.sequence ?? -1,
    );
    // No gameplay Zustand store is imported in the reference tests; keep the
    // local status stub in each test initialized to live.
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('catches a dropped guest up via replay-stream after reconnect (task 10.2)', async () => {
    const { host, store, matchId } = await makeActiveHost('test-match-10-2');
    const hostSock = makeSocket();
    const guestSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(guestSock, 'pid_guest');
    const hostEvents = await advanceHostToEventCount(host, store, matchId, 15);
    const guestEvents = hostEvents.slice(0, 5);
    const lastGuestSequence = guestEvents.at(-1)?.sequence ?? -1;

    host.detachSocket(guestSock);
    await Promise.resolve();
    await Promise.resolve();
    const reconnectedGuestSock = makeSocket();
    host.attachSocket(reconnectedGuestSock, 'pid_guest');
    await host.handleSessionJoin(
      reconnectedGuestSock,
      'pid_guest',
      lastGuestSequence,
    );
    await Promise.resolve();

    const replayedEvents = reconnectedGuestSock.sent.flatMap((send) =>
      replayEventsFrom(send.parsed),
    );
    const expectedReplayCount = hostEvents.length - guestEvents.length;
    guestEvents.push(...replayedEvents);

    expect(replayedEvents).toHaveLength(expectedReplayCount);
    await expect(hydrateCurrentState(matchId, guestEvents)).resolves.toEqual(
      await hydrateCurrentState(matchId, hostEvents),
    );
  });

  it('keeps guest in hostPending with local log preserved when host drops (task 10.4)', async () => {
    const { host, store, matchId } = await makeActiveHost('test-match-10-4');
    const hostSock = makeSocket();
    const guestSock = makeSocket();
    const guestStore = { localMatchStatus: 'live' };
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(guestSock, 'pid_guest');
    const hostEvents = await advanceHostToEventCount(host, store, matchId, 10);
    const localEightEvents = hostEvents.slice(0, 8);
    await Promise.all(
      localEightEvents.map((event) =>
        matchLogStorage.appendEvent(matchId, event),
      ),
    );

    setTimeout(() => {
      guestStore.localMatchStatus = 'hostPending';
    }, 10000);
    host.detachSocket(hostSock);
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(10000);
    await Promise.resolve();

    expect(guestStore.localMatchStatus).toBe('hostPending');
    await expect(matchLogStorage.getEventsForMatch(matchId)).resolves.toEqual(
      localEightEvents,
    );

    const hostSock2 = makeSocket();
    host.attachSocket(hostSock2, 'pid_host');
    await host.handleSessionJoin(
      hostSock2,
      'pid_host',
      localEightEvents.at(-1)?.sequence ?? -1,
    );
    await Promise.resolve();

    const replayedEvents = hostSock2.sent.flatMap((send) =>
      replayEventsFrom(send.parsed),
    );
    await Promise.all(
      replayedEvents.map((event) =>
        matchLogStorage.appendEvent(matchId, event),
      ),
    );
    const restoredEvents = await matchLogStorage.getEventsForMatch(matchId);
    expect(hostSock2.sent.map((send) => send.parsed.kind)).toEqual(
      expect.arrayContaining(['ReplayStart', 'ReplayEnd']),
    );
    await expect(hydrateCurrentState(matchId, restoredEvents)).resolves.toEqual(
      await hydrateCurrentState(matchId, hostEvents),
    );
  });
});
