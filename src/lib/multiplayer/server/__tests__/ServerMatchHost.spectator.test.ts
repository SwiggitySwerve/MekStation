/**
 * ServerMatchHost spectator integration tests — M3.
 *
 * Covers design D5 (spectator connection + intent rejection) and D6
 * (spectator fog-of-war scope): a spectator receives the replay then
 * live events, never an event about a unit hidden from a participant,
 * and any intent from a spectator seat is rejected.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-server/spec.md
 */

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
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
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
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type: GameEventType.MovementLocked,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: unitId,
    visibility: 'observer-visible',
    payload: { unitId },
  };
}

function publicPhaseEvent(sequence: number): IGameEvent {
  return {
    id: `evt-phase-${sequence}`,
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    visibility: 'public',
    payload: { phase: GamePhase.Movement } as never,
  } as IGameEvent;
}

/**
 * Build an `active` host whose seat roster has a spectator appended.
 */
async function makeHostWithSpectator(fogOfWar: boolean) {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-spectator';
  const now = '2026-05-01T00:00:00.000Z';
  let seats: IMatchSeat[] = defaultSeats('1v1');
  seats = seats.map((s, i) =>
    i === 0
      ? { ...s, occupant: { playerId: 'pid_host', displayName: 'Host' } }
      : { ...s, occupant: { playerId: 'pid_opp', displayName: 'Opp' } },
  );
  seats = addSpectatorSeat(seats, {
    playerId: 'pid_watcher',
    displayName: 'Watcher',
  });
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
    seats,
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 25,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(25),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      makeUnit('player-scout', GameSide.Player),
      ...Array.from({ length: 4 }, (_, i) =>
        makeUnit(`opp-${i}`, GameSide.Opponent),
      ),
    ],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

function broadcast(host: ServerMatchHost, event: IGameEvent): Promise<void> {
  const fn = (
    host as unknown as {
      broadcastEvent(message: IEventMessage): Promise<void>;
    }
  ).broadcastEvent.bind(host);
  return fn({
    kind: 'Event',
    matchId: 'match-spectator',
    ts: '2026-05-01T00:00:00.000Z',
    event,
  });
}

describe('ServerMatchHost spectator connection — design D5', () => {
  it('streams the replay then live events to a connecting spectator', async () => {
    // Scenario: Spectator joins and receives the stream.
    const { host } = await makeHostWithSpectator(false);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_watcher');
    await host.handleSessionJoin(sock, 'pid_watcher', undefined);

    expect(sock.sent.some((s) => s.parsed.kind === 'ReplayStart')).toBe(true);
    expect(sock.sent.some((s) => s.parsed.kind === 'ReplayEnd')).toBe(true);

    await broadcast(host, publicPhaseEvent(host.highestSeq() + 1));
    expect(sock.sent.some((s) => s.parsed.kind === 'Event')).toBe(true);
  });

  it('rejects an Intent from a spectator with spectator-cannot-act', async () => {
    // Scenario: Spectator intent rejected.
    const { host, store, matchId } = await makeHostWithSpectator(false);
    const before = (await store.getEvents(matchId, 0)).length;

    const result = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: '2026-05-01T00:00:00.000Z',
      playerId: 'pid_watcher',
      intentId: 'intent-spec-1',
      intent: { kind: 'AdvancePhase' },
    });

    expect(result).toHaveLength(1);
    const err = result[0];
    expect(err.kind).toBe('Error');
    if (err.kind === 'Error') {
      expect(err.code).toBe('INVALID_INTENT');
      expect(err.reason).toBe('spectator-cannot-act');
    }
    // No event appended.
    expect((await store.getEvents(matchId, 0)).length).toBe(before);
  });

  it('still accepts a participant intent in the same match', async () => {
    const { host, matchId } = await makeHostWithSpectator(false);
    const result = await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: '2026-05-01T00:00:00.000Z',
      playerId: 'pid_host',
      intentId: 'intent-host-1',
      intent: { kind: 'AdvancePhase' },
    });
    // A participant intent is NOT rejected with spectator-cannot-act.
    const rejectedAsSpectator = result.some(
      (m) => m.kind === 'Error' && m.reason === 'spectator-cannot-act',
    );
    expect(rejectedAsSpectator).toBe(false);
  });
});

describe('ServerMatchHost spectator fog-of-war scope — design D6', () => {
  it('a fog-on spectator never receives a hidden-unit event', async () => {
    // Scenario: Spectator of a fog-on match sees no hidden units.
    const { host } = await makeHostWithSpectator(true);
    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');

    // An opponent-owned unit hidden from the host participant: a
    // spectator must NOT receive this event.
    await broadcast(host, movementLockedEvent('opp-3', host.highestSeq() + 1));

    const watcherEvents = watcherSock.sent.filter(
      (s) => s.parsed.kind === 'Event',
    );
    expect(watcherEvents).toHaveLength(0);
  });

  it('a fog-on spectator still receives public events', async () => {
    const { host } = await makeHostWithSpectator(true);
    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');

    await broadcast(host, publicPhaseEvent(host.highestSeq() + 1));

    expect(watcherSock.sent.some((s) => s.parsed.kind === 'Event')).toBe(true);
  });

  it('a fog-off spectator receives every event unredacted', async () => {
    // Scenario: Spectator of a fog-off match sees everything.
    const { host } = await makeHostWithSpectator(false);
    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');

    const event = movementLockedEvent('opp-3', host.highestSeq() + 1);
    await broadcast(host, event);

    const received = watcherSock.sent.find(
      (s) => s.parsed.kind === 'Event',
    )?.parsed;
    expect(received).toBeDefined();
    if (received?.kind === 'Event') {
      expect((received.event as IGameEvent).payload).toMatchObject({
        unitId: 'opp-3',
      });
    }
  });
});
