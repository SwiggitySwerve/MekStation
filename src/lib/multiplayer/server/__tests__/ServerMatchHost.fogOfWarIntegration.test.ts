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
  Facing,
  MovementType,
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

async function nextSequence(store: InMemoryMatchStore, matchId: string) {
  const events = await store.getEvents(matchId, 0);
  return Math.max(-1, ...events.map((event) => event.sequence)) + 1;
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

function movementDeclaredEvent(
  unitId: string,
  sequence: number,
  to: { q: number; r: number },
): IGameEvent {
  return {
    id: `evt-move-${unitId}-${sequence}`,
    gameId: 'match-fog-host',
    sequence,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.MovementDeclared,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: unitId,
    visibility: 'actor-only',
    payload: {
      unitId,
      from: { q: -2, r: 5 },
      to,
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    },
  };
}

function attackResolvedEvent(
  attackerId: string,
  targetId: string,
  sequence: number,
): IGameEvent {
  return {
    id: `evt-attack-${sequence}`,
    gameId: 'match-fog-host',
    sequence,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.AttackResolved,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    actorId: attackerId,
    visibility: 'target-visible',
    payload: {
      attackerId,
      targetId,
      weaponId: 'medium-laser-1',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      location: 'center_torso',
      damage: 5,
      heat: 3,
      attackerArc: 'front',
      ammoBinId: null,
      rolls: [3, 5, 2, 6],
    },
  };
}

async function makeHost(
  fogOfWar: boolean,
  units: readonly IGameUnit[] = [
    makeUnit('player-scout', GameSide.Player),
    ...Array.from({ length: 22 }, (_, i) =>
      makeUnit(`opp-${i}`, GameSide.Opponent),
    ),
  ],
) {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-fog-host';
  const now = '2026-04-30T00:00:00.000Z';
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

  it('filters replay movement while a unit leaves LOS and resumes when it re-enters', async () => {
    const { host, store, matchId } = await makeHost(true, [
      makeUnit('player-scout', GameSide.Player),
      makeUnit('opp-0', GameSide.Opponent),
    ]);
    let sequence = await nextSequence(store, matchId);
    const movedOut = movementDeclaredEvent('player-scout', sequence++, {
      q: 20,
      r: 5,
    });
    const hiddenLock = movementLockedEvent('player-scout', sequence++);
    const movedBack = movementDeclaredEvent('player-scout', sequence++, {
      q: -2,
      r: 5,
    });
    const visibleLock = movementLockedEvent('player-scout', sequence++);
    for (const event of [movedOut, hiddenLock, movedBack, visibleLock]) {
      await store.appendEvent(matchId, event);
    }

    const oppSock = makeSocket();
    await host.sendReplay(oppSock, movedOut.sequence, 'pid_opp');

    const chunks = oppSock.sent.filter((s) => s.parsed.kind === 'ReplayChunk');
    const replayed =
      chunks[0].parsed.kind === 'ReplayChunk' ? chunks[0].parsed.events : [];
    expect(replayed.map((event) => (event as IGameEvent).id)).toEqual([
      visibleLock.id,
    ]);
  });

  it('redacts ambush attack details for the target while preserving attacker detail', async () => {
    const playerUnits = Array.from({ length: 22 }, (_, i) =>
      makeUnit(`player-${i}`, GameSide.Player),
    );
    const { host } = await makeHost(true, [
      ...playerUnits,
      makeUnit('opp-0', GameSide.Opponent),
    ]);
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    const event = attackResolvedEvent(
      'player-21',
      'opp-0',
      host.highestSeq() + 1,
    );
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

    const hostEvent = hostSock.sent.find(
      (s) => s.parsed.kind === 'Event',
    )?.parsed;
    const oppEvent = oppSock.sent.find(
      (s) => s.parsed.kind === 'Event',
    )?.parsed;
    expect(hostEvent).toBeDefined();
    expect(oppEvent).toBeDefined();
    if (hostEvent?.kind === 'Event' && oppEvent?.kind === 'Event') {
      expect((hostEvent.event as IGameEvent).payload).toMatchObject({
        attackerId: 'player-21',
        targetId: 'opp-0',
      });
      expect((oppEvent.event as IGameEvent).payload).toEqual({
        targetId: 'opp-0',
        roll: 8,
        toHitNumber: 7,
        hit: true,
        location: 'center_torso',
        damage: 5,
        rolls: [3, 5, 2, 6],
      });
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
