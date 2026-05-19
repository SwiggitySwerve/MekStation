/**
 * Matchmaking + spectator integration tests — M3 (tasks 8.1, 8.2).
 *
 * 8.1 — a player discovers a lobby through the joinable-lobby query,
 *       joins it via the room-code path, and the match launches.
 * 8.2 — a spectator connects to an active fog-on match and observes it
 *       without receiving hidden-unit events.
 *
 * These exercise the durable store query, the lobby launch path, and
 * the spectator broadcast path end-to-end against the production
 * `ServerMatchHost` wiring.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
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
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import {
  defaultSeats,
  type IMatchSeat,
  type TeamLayout,
} from '@/types/multiplayer/Lobby';

import type { IMatchMeta, MatchStatus } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { getJoinableLobbies, getSpectatableMatches } from '../joinableLobbies';
import { occupySeat, setReady } from '../lobby/lobbyStateMachine';
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

function meta(opts: {
  matchId: string;
  status: MatchStatus;
  layout: TeamLayout;
  seats: readonly IMatchSeat[];
  roomCode?: string;
  fogOfWar?: boolean;
}): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId: opts.matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: opts.status,
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 12, turnLimit: 5, fogOfWar: opts.fogOfWar ?? false },
    layout: opts.layout,
    seats: opts.seats,
    roomCode: opts.status === 'lobby' ? opts.roomCode : undefined,
  };
}

describe('M3 integration — discover, join, launch (task 8.1)', () => {
  it('a player discovers a lobby, joins it, and the match launches', async () => {
    const store = new InMemoryMatchStore({ quiet: true });

    // Host creates a lobby with their seat occupied; one human seat open.
    const hostSeats = occupySeat(defaultSeats('1v1'), 'alpha-1', {
      playerId: 'pid_host',
      displayName: 'Host',
    });
    await store.createMatch(
      meta({
        matchId: 'mm-1',
        status: 'lobby',
        layout: '1v1',
        seats: hostSeats,
        roomCode: 'FINDME',
      }),
    );

    // Discovery: the joinable-lobby query surfaces the open lobby.
    const discovered = await getJoinableLobbies(store);
    expect(discovered).toHaveLength(1);
    expect(discovered[0].roomCode).toBe('FINDME');

    // Join via the room-code path — the guest resolves the code, then
    // takes the open seat (the lobby state machine mutation the lobby
    // intent handler would apply).
    const resolved = await store.getMatchByRoomCode(discovered[0].roomCode);
    expect(resolved).not.toBeNull();
    let joinedSeats = occupySeat(resolved!.seats ?? [], 'bravo-1', {
      playerId: 'pid_guest',
      displayName: 'Guest',
    });
    joinedSeats = setReady(joinedSeats, 'alpha-1', true);
    joinedSeats = setReady(joinedSeats, 'bravo-1', true);
    await store.updateMatchMeta('mm-1', {
      seats: joinedSeats,
      status: 'active',
      roomCode: null,
    });

    // The launched match is no longer joinable and the code stops
    // resolving — consistent with expiry-at-launch.
    expect(await getJoinableLobbies(store)).toHaveLength(0);
    expect(await store.getMatchByRoomCode('FINDME')).toBeNull();

    // The match host boots and plays — it accepts an AdvancePhase intent.
    const host = ServerMatchHost.create('mm-1', store, {
      mapRadius: 12,
      turnLimit: 5,
      random: new SeededRandom(7),
      grid: createMinimalGrid(12),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [
        makeUnit('player-1', GameSide.Player),
        makeUnit('opp-1', GameSide.Opponent),
      ],
    });
    await Promise.resolve();
    const result = await host.handleIntent({
      kind: 'Intent',
      matchId: 'mm-1',
      ts: new Date().toISOString(),
      playerId: 'pid_host',
      intentId: 'mm-intent-1',
      intent: { kind: 'AdvancePhase' },
    });
    // The host did not reject the participant intent as a spectator.
    expect(
      result.some(
        (m) => m.kind === 'Error' && m.reason === 'spectator-cannot-act',
      ),
    ).toBe(false);
  });
});

describe('M3 integration — spectate a fog-on match (task 8.2)', () => {
  it('a spectator observes an active fog-on match without hidden-unit events', async () => {
    const store = new InMemoryMatchStore({ quiet: true });

    // An active fog-on 1v1 with both human seats filled.
    let seats: IMatchSeat[] = defaultSeats('1v1').map((s, i) =>
      i === 0
        ? { ...s, occupant: { playerId: 'pid_host', displayName: 'Host' } }
        : { ...s, occupant: { playerId: 'pid_guest', displayName: 'Guest' } },
    );
    await store.createMatch(
      meta({
        matchId: 'mm-spec',
        status: 'active',
        layout: '1v1',
        seats,
        fogOfWar: true,
      }),
    );

    // The match shows up in the spectatable-match query.
    const spectatable = await getSpectatableMatches(store);
    expect(spectatable.map((s) => s.matchId)).toContain('mm-spec');

    // The spectator registers a seat (the spectate endpoint's mutation).
    seats = addSpectatorSeat(seats, {
      playerId: 'pid_watcher',
      displayName: 'Watcher',
    });
    await store.updateMatchMeta('mm-spec', { seats });

    // Boot the host and connect the spectator.
    const host = ServerMatchHost.create('mm-spec', store, {
      mapRadius: 20,
      turnLimit: 5,
      random: new SeededRandom(3),
      grid: createMinimalGrid(20),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [
        makeUnit('player-1', GameSide.Player),
        ...Array.from({ length: 3 }, (_, i) =>
          makeUnit(`opp-${i}`, GameSide.Opponent),
        ),
      ],
    });
    await Promise.resolve();
    await Promise.resolve();

    const watcherSock = makeSocket();
    host.attachSocket(watcherSock, 'pid_watcher');
    await host.handleSessionJoin(watcherSock, 'pid_watcher', undefined);
    expect(watcherSock.sent.some((s) => s.parsed.kind === 'ReplayEnd')).toBe(
      true,
    );

    // Broadcast a hidden-unit (opponent-owned, observer-visible) event.
    const hiddenEvent: IGameEvent = {
      id: 'evt-hidden-1',
      gameId: 'mm-spec',
      sequence: host.highestSeq() + 1,
      timestamp: new Date().toISOString(),
      type: GameEventType.MovementLocked,
      turn: 1,
      phase: GamePhase.Movement,
      actorId: 'opp-2',
      visibility: 'observer-visible',
      payload: { unitId: 'opp-2' },
    };
    const broadcastEvent = (
      host as unknown as {
        broadcastEvent(message: IEventMessage): Promise<void>;
      }
    ).broadcastEvent.bind(host);
    await broadcastEvent({
      kind: 'Event',
      matchId: 'mm-spec',
      ts: new Date().toISOString(),
      event: hiddenEvent,
    });

    // The spectator never received the hidden-unit event.
    const spectatorEvents = watcherSock.sent.filter(
      (s) => s.parsed.kind === 'Event',
    );
    expect(spectatorEvents).toHaveLength(0);
  });
});
