/**
 * Lobby intent integration test — Wave 3b.
 *
 * Drives a real `ServerMatchHost` through the full lobby flow: host
 * creates the match with `2v2` seats, joiners occupy via OccupySeat,
 * one slot is flipped to AI, host launches. Asserts that broadcasts go
 * out, seats persist on the meta blob, and the host check rejects
 * non-host attempts at host-only intents.
 */

import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';
import { InvalidMatchStatusTransitionError } from '@/types/multiplayer/MatchStatus';
import {
  nowIso,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { raceMetaWrites } from './matchMetaRace.test-helpers';

interface IRecorded {
  parsed: { kind: string };
}

function makeMockSocket(): IMatchSocket & { sent: IRecorded[] } {
  const sent: IRecorded[] = [];
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as { kind: string } });
    },
    close() {},
    get readyState() {
      return 1;
    },
    sent,
  } as IMatchSocket & { sent: IRecorded[] };
}

async function makeLobbyHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
  matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-lobby';
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host'],
    sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '2v2',
    // Pre-seat the host into alpha-1 so OccupySeat starts from the
    // same shape the REST handler would produce.
    seats: defaultSeats('2v2').map((s) =>
      s.slotId === 'alpha-1'
        ? {
            ...s,
            occupant: { playerId: 'pid_host', displayName: 'Host' },
          }
        : s,
    ),
    roomCode: 'ABCDEF',
  });

  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(7),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  // Let the constructor's persistInitialEvents() drain.
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

function intent(
  matchId: string,
  playerId: string,
  payload: IIntent['intent'],
): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId,
    intent: payload,
  };
}

function lastLobbyUpdate(broadcasts: readonly IServerMessage[]): IMatchSeat[] {
  for (let i = broadcasts.length - 1; i >= 0; i -= 1) {
    if (broadcasts[i].kind === 'LobbyUpdated') {
      return [...(broadcasts[i] as { seats: readonly IMatchSeat[] }).seats];
    }
  }
  throw new Error('No LobbyUpdated in broadcasts');
}

describe('ServerMatchHost lobby intents', () => {
  const setupIntents: IIntent['intent'][] = [
    { kind: 'OccupySeat', slotId: 'bravo-2' },
    { kind: 'LeaveSeat', slotId: 'alpha-1' },
    { kind: 'ReassignSeat', slotId: 'alpha-1', toSide: 'bravo', toSeat: 2 },
    { kind: 'SetAiSlot', slotId: 'alpha-1' },
    { kind: 'SetHumanSlot', slotId: 'alpha-2' },
    { kind: 'SetReady', slotId: 'alpha-1', ready: true },
    { kind: 'LaunchMatch' },
  ];

  describe.each(['active', 'completed'] as const)(
    '%s status gate',
    (status) => {
      it.each(setupIntents)(
        'rejects $kind without changing metadata or events',
        async (payload) => {
          const { host, store, matchId } = await makeLobbyHost();
          const meta = await store.getMatchMeta(matchId);
          await store.updateMatchMeta(matchId, {
            status,
            seats: meta.seats?.map((seat) => ({
              ...seat,
              kind: seat.slotId === 'alpha-2' ? 'ai' : 'human',
              ready: true,
              occupant:
                seat.slotId === 'alpha-2'
                  ? null
                  : seat.slotId === 'bravo-2' && payload.kind !== 'LaunchMatch'
                    ? null
                    : {
                        playerId:
                          seat.slotId === 'alpha-1' ? 'pid_host' : seat.slotId,
                        displayName: seat.slotId,
                      },
            })),
          });
          const before = await store.getMatchMeta(matchId);
          const events = await store.getEvents(matchId);
          const frames = await host.handleIntent({
            ...intent(matchId, 'pid_host', payload),
            intentId: 'status-refusal',
          });
          expect(frames).toEqual([
            expect.objectContaining({
              kind: 'Error',
              code: 'INVALID_INTENT',
              intentId: 'status-refusal',
              reason: 'Intent could not be applied.',
            }),
          ]);
          expect(await store.getMatchMeta(matchId)).toEqual(before);
          expect(await store.getEvents(matchId)).toEqual(events);
        },
      );
    },
  );

  it('rejects ForfeitMatch on completed metadata without engine events', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    await store.updateMatchMeta(matchId, { status: 'completed' });
    const events = await store.getEvents(matchId);
    expect(
      await host.handleIntent({
        ...intent(matchId, 'pid_host', { kind: 'ForfeitMatch' }),
        intentId: 'finished-forfeit',
      }),
    ).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        intentId: 'finished-forfeit',
      }),
    ]);
    expect(await store.getEvents(matchId)).toEqual(events);
  });

  it('merges a concurrent seat change instead of overwriting it', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    // Another writer seats a player in alpha-2 between the handler's read and write.
    const race = raceMetaWrites(store, matchId, (fresh) => ({
      seats: fresh.seats?.map((seat) =>
        seat.slotId === 'alpha-2'
          ? { ...seat, occupant: { playerId: 'pid_late', displayName: 'Late' } }
          : seat,
      ),
    }));

    const frames = await host.handleIntent({
      ...intent(matchId, 'pid_guest', {
        kind: 'OccupySeat',
        slotId: 'bravo-2',
      }),
      intentId: 'occupy-race',
    });

    expect(race.fired()).toBe(1);
    const occupants = Object.fromEntries(
      (await store.getMatchMeta(matchId)).seats?.map((seat) => [
        seat.slotId,
        seat.occupant?.playerId,
      ]) ?? [],
    );
    expect(occupants).toMatchObject({
      'alpha-2': 'pid_late',
      'bravo-2': 'pid_guest',
    });
    const broadcast = lastLobbyUpdate(frames);
    expect(
      broadcast.find((seat) => seat.slotId === 'alpha-2')?.occupant?.playerId,
    ).toBe('pid_late');
    expect(
      broadcast.find((seat) => seat.slotId === 'bravo-2')?.occupant?.playerId,
    ).toBe('pid_guest');
    expect((await store.getMatchMeta(matchId)).playerIds).toEqual(
      expect.arrayContaining(['pid_host', 'pid_late', 'pid_guest']),
    );
  });

  /** Fill and ready every seat so LaunchMatch would succeed. */
  async function makeLaunchable(store: InMemoryMatchStore, matchId: string) {
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: meta.seats?.map((seat) => ({
        ...seat,
        kind: seat.slotId === 'alpha-2' ? 'ai' : 'human',
        ready: true,
        occupant:
          seat.slotId === 'alpha-2'
            ? null
            : {
                playerId: seat.slotId === 'alpha-1' ? 'pid_host' : seat.slotId,
                displayName: seat.slotId,
              },
      })),
    });
  }

  it('refuses a LaunchMatch whose match completes before the write, and logs it', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    await makeLaunchable(store, matchId);
    // The match completes between the handler's read and its write.
    const race = raceMetaWrites(store, matchId, () => ({
      status: 'completed',
    }));
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const frames = await host.handleIntent({
      ...intent(matchId, 'pid_host', { kind: 'LaunchMatch' }),
      intentId: 'launch-race',
    });

    expect(race.fired()).toBe(1);
    expect(frames).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        intentId: 'launch-race',
        reason: 'Intent could not be applied.',
      }),
    ]);
    expect((await store.getMatchMeta(matchId)).status).toBe('completed');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('refused after a concurrent metadata change'),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it('maps a status edge the store refuses to a typed, logged INVALID_INTENT', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    await makeLaunchable(store, matchId);
    jest
      .spyOn(store, 'updateMatchMetaIf')
      .mockRejectedValueOnce(
        new InvalidMatchStatusTransitionError('completed', 'active'),
      );
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const frames = await host.handleIntent({
      ...intent(matchId, 'pid_host', { kind: 'LaunchMatch' }),
      intentId: 'launch-refused',
    });

    expect(frames).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        intentId: 'launch-refused',
        reason: 'Intent could not be applied.',
      }),
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('match status'),
      expect.objectContaining({ from: 'completed', to: 'active' }),
    );
    warn.mockRestore();
  });

  it('U4 broadcasts the originating SetReady intentId', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    const socket = makeMockSocket();
    host.attachSocket(socket, 'pid_host');
    const envelope = {
      ...intent(matchId, 'pid_host', {
        kind: 'SetReady',
        slotId: 'alpha-1',
        ready: true,
      }),
      intentId: 'ready-origin',
    };
    const frames = await host.handleIntent(envelope);
    expect(frames).toContainEqual(
      expect.objectContaining({
        kind: 'LobbyUpdated',
        intentId: envelope.intentId,
      }),
    );
    expect(socket.sent.map(({ parsed }) => parsed)).toContainEqual(
      expect.objectContaining({
        kind: 'LobbyUpdated',
        intentId: envelope.intentId,
      }),
    );
    const meta = await store.getMatchMeta(matchId);
    expect(meta.seats?.find((seat) => seat.slotId === 'alpha-1')?.ready).toBe(
      true,
    );
  });

  it.each(['AUTH_REJECTED', 'INVALID_INTENT', 'STORE_FAILURE'] as const)(
    'U4 correlates the lobby %s refusal',
    async (code) => {
      const { host, store, matchId } = await makeLobbyHost();
      const socket = makeMockSocket();
      const envelope = {
        ...intent(
          matchId,
          code === 'AUTH_REJECTED' ? 'pid_join' : 'pid_host',
          code === 'AUTH_REJECTED'
            ? { kind: 'SetAiSlot', slotId: 'alpha-2' }
            : {
                kind: 'SetReady',
                slotId: code === 'INVALID_INTENT' ? 'missing-slot' : 'alpha-1',
                ready: true,
              },
        ),
        intentId: `refused-${code}`,
      };
      if (code === 'STORE_FAILURE') {
        jest
          .spyOn(store, 'updateMatchMetaIf')
          .mockRejectedValueOnce(new Error('write failed'));
      }
      if (envelope.playerId === 'pid_join') {
        const meta = await store.getMatchMeta(matchId);
        await store.updateMatchMeta(matchId, {
          playerIds: [...meta.playerIds, 'pid_join'],
          seats: meta.seats?.map((seat) =>
            seat.slotId === 'alpha-2'
              ? {
                  ...seat,
                  occupant: { playerId: 'pid_join', displayName: 'Joiner' },
                }
              : seat,
          ),
        });
      }
      expect(
        await host.admitSocket(socket, envelope.playerId, 'refusal-sender'),
      ).not.toBeNull();
      const frames = await host.handleIntent(
        envelope,
        'refusal-sender',
        envelope.playerId,
      );
      expect(frames).toEqual([
        expect.objectContaining({
          kind: 'Error',
          code,
          intentId: envelope.intentId,
        }),
      ]);
      expect(socket.sent.map(({ parsed }) => parsed)).toContainEqual(frames[0]);
      const meta = await store.getMatchMeta(matchId);
      expect(meta.seats?.find((seat) => seat.slotId === 'alpha-1')?.ready).toBe(
        false,
      );
    },
  );

  it('OccupySeat seats the joiner and broadcasts LobbyUpdated', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    const sock = makeMockSocket();
    host.attachSocket(sock, 'pid_join');
    host.registerPlayerRef({
      playerId: 'pid_join',
      displayName: 'Joiner',
    });

    const broadcasts = await host.handleIntent(
      intent(matchId, 'pid_join', {
        kind: 'OccupySeat',
        slotId: 'bravo-1',
      }),
    );
    const seats = lastLobbyUpdate(broadcasts);
    const target = seats.find((s) => s.slotId === 'bravo-1');
    expect(target?.occupant?.playerId).toBe('pid_join');
    expect(target?.occupant?.displayName).toBe('Joiner');
    const meta = await store.getMatchMeta(matchId);
    expect(meta.playerIds).toEqual(['pid_host', 'pid_join']);
    expect(meta.sideAssignments).toEqual([
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_join', side: 'opponent' },
    ]);
    // The watching socket got the LobbyUpdated too.
    const kinds = sock.sent.map((s) => s.parsed.kind);
    expect(kinds).toContain('LobbyUpdated');
  });

  it('rejects host-only SetAiSlot from a non-host player', async () => {
    const { host, matchId } = await makeLobbyHost();
    const broadcasts = await host.handleIntent(
      intent(matchId, 'pid_join', {
        kind: 'SetAiSlot',
        slotId: 'alpha-2',
      }),
    );
    expect(broadcasts.length).toBe(1);
    expect(broadcasts[0].kind).toBe('Error');
    if (broadcasts[0].kind === 'Error') {
      expect(broadcasts[0].code).toBe('AUTH_REJECTED');
    }
  });

  it("LaunchMatch rejects when seats aren't ready", async () => {
    const { host, matchId } = await makeLobbyHost();
    const broadcasts = await host.handleIntent(
      intent(matchId, 'pid_host', { kind: 'LaunchMatch' }),
    );
    expect(broadcasts.some((b) => b.kind === 'Error')).toBe(true);
  });

  it('LaunchMatch flips status to active when canLaunch is satisfied', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    // Host marks own ready, fills the rest with AI, then launches.
    await host.handleIntent(
      intent(matchId, 'pid_host', {
        kind: 'SetReady',
        slotId: 'alpha-1',
        ready: true,
      }),
    );
    await host.handleIntent(
      intent(matchId, 'pid_host', {
        kind: 'SetAiSlot',
        slotId: 'alpha-2',
      }),
    );
    await host.handleIntent(
      intent(matchId, 'pid_host', {
        kind: 'SetAiSlot',
        slotId: 'bravo-1',
      }),
    );
    await host.handleIntent(
      intent(matchId, 'pid_host', {
        kind: 'SetAiSlot',
        slotId: 'bravo-2',
      }),
    );

    const broadcasts = await host.handleIntent(
      intent(matchId, 'pid_host', { kind: 'LaunchMatch' }),
    );
    const update = broadcasts.find((b) => b.kind === 'LobbyUpdated');
    expect(update).toBeDefined();
    if (update && update.kind === 'LobbyUpdated') {
      expect(update.status).toBe('active');
    }
    const meta = await store.getMatchMeta(matchId);
    expect(meta.status).toBe('active');
    expect(meta.roomCode).toBeUndefined();
    // Invite code should no longer resolve once launched.
    const resolved = await store.getMatchByRoomCode('ABCDEF');
    expect(resolved).toBeNull();
  });

  it('LeaveSeat clears occupancy + ready', async () => {
    const { host, store, matchId } = await makeLobbyHost();
    await host.handleIntent(
      intent(matchId, 'pid_host', {
        kind: 'SetReady',
        slotId: 'alpha-1',
        ready: true,
      }),
    );
    const broadcasts = await host.handleIntent(
      intent(matchId, 'pid_host', {
        kind: 'LeaveSeat',
        slotId: 'alpha-1',
      }),
    );
    const seats = lastLobbyUpdate(broadcasts);
    const target = seats.find((s) => s.slotId === 'alpha-1');
    expect(target?.occupant).toBeNull();
    expect(target?.ready).toBe(false);
    const meta = await store.getMatchMeta(matchId);
    expect(meta.playerIds).toEqual([]);
    expect(meta.sideAssignments).toEqual([]);
  });
});
