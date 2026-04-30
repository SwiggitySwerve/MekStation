import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  parsed: IServerMessage;
}

function makeSocket(): IMatchSocket & { sent: IRecordedSend[] } {
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
  } as IMatchSocket & { sent: IRecordedSend[] };
}

function makeUnit(id: string, side: GameSide): IGameUnit {
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

function movementLockedEvent(unitId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${unitId}-${sequence}`,
    gameId: 'match-fog-host',
    sequence,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.MovementLocked,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: unitId,
    visibility: 'observer-visible',
    payload: { unitId },
  };
}

async function makeHost(fogOfWar: boolean) {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-fog-host';
  const now = '2026-04-30T00:00:00.000Z';
  const units = [
    makeUnit('player-scout', GameSide.Player),
    ...Array.from({ length: 22 }, (_, i) =>
      makeUnit(`opp-${i}`, GameSide.Opponent),
    ),
  ];
  await store.createMatch({
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
    config: { mapRadius: 25, turnLimit: 5, fogOfWar },
    layout: '1v1',
    seats: defaultSeats('1v1'),
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 25,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(25),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: units,
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

describe('ServerMatchHost fog-of-war integration', () => {
  it('filters live Event envelopes per attached player when fog is enabled', async () => {
    const { host } = await makeHost(true);
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    const event = movementLockedEvent('opp-21', host.highestSeq() + 1);
    const broadcastEvent = (
      host as unknown as {
        broadcastEvent(message: IEventMessage): Promise<void>;
      }
    ).broadcastEvent.bind(host);
    await broadcastEvent({
      kind: 'Event',
      matchId: 'match-fog-host',
      ts: '2026-04-30T00:00:00.000Z',
      event,
    });

    expect(hostSock.sent.some((s) => s.parsed.kind === 'Event')).toBe(false);
    const eventForOpponent = oppSock.sent.find(
      (s) => s.parsed.kind === 'Event',
    )?.parsed;
    expect(eventForOpponent).toBeDefined();
    if (eventForOpponent?.kind === 'Event') {
      expect((eventForOpponent.event as IGameEvent).payload).toMatchObject({
        unitId: 'opp-21',
      });
    }
  });

  it('streams fog-filtered replay slices to reconnecting players', async () => {
    const { host, store, matchId } = await makeHost(true);
    const hiddenEvent = movementLockedEvent('opp-21', host.highestSeq() + 1);
    await store.appendEvent(matchId, hiddenEvent);

    const hostSock = makeSocket();
    const oppSock = makeSocket();
    await host.sendReplay(hostSock, hiddenEvent.sequence, 'pid_host');
    await host.sendReplay(oppSock, hiddenEvent.sequence, 'pid_opp');

    const hostChunks = hostSock.sent.filter(
      (s) => s.parsed.kind === 'ReplayChunk',
    );
    const oppChunks = oppSock.sent.filter(
      (s) => s.parsed.kind === 'ReplayChunk',
    );
    expect(hostChunks).toHaveLength(1);
    expect(oppChunks).toHaveLength(1);
    if (
      hostChunks[0].parsed.kind === 'ReplayChunk' &&
      oppChunks[0].parsed.kind === 'ReplayChunk'
    ) {
      expect(hostChunks[0].parsed.events).toEqual([]);
      expect(oppChunks[0].parsed.events).toHaveLength(1);
    }
  });

  it('bypasses per-player filtering when fog is disabled', async () => {
    const { host } = await makeHost(false);
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    const event = movementLockedEvent('opp-21', host.highestSeq() + 1);
    const broadcastEvent = (
      host as unknown as {
        broadcastEvent(message: IEventMessage): Promise<void>;
      }
    ).broadcastEvent.bind(host);
    await broadcastEvent({
      kind: 'Event',
      matchId: 'match-fog-host',
      ts: '2026-04-30T00:00:00.000Z',
      event,
    });

    expect(hostSock.sent.some((s) => s.parsed.kind === 'Event')).toBe(true);
    expect(oppSock.sent.some((s) => s.parsed.kind === 'Event')).toBe(true);
  });
});
