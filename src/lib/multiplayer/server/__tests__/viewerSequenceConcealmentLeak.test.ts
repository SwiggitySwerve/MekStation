/**
 * A player cannot count the events they were not allowed to see.
 *
 * `multiplayer-sync` spec, `Authority and Viewer Sequences Are Separate`:
 *
 *   "The server SHALL maintain a private global authority sequence and
 *    SHALL assign a gapless delivery sequence independently for each
 *    viewer projection stream. Player payloads SHALL NOT expose hidden
 *    authority identifiers or gaps that reveal concealed events."
 *
 * Fog still conceals events: each player receives a proper subset of
 * the authority log, and the two subsets differ. What closed is the
 * side channel. Player `Event` frames carry no `event.sequence`, and
 * the number they DO carry (`deliverySequence`) is gapless, so the
 * arithmetic that used to name concealed authority slots comes up
 * empty-handed. The durable log still has the authority sequence; the
 * projector removes it per viewer, not at the source.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-sync/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (1.3, 5.3, 11.1)
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

function makeSocket(): IMatchSocket & { sent: IServerMessage[] } {
  const sent: IServerMessage[] = [];
  return {
    send(data: string) {
      sent.push(JSON.parse(data) as IServerMessage);
    },
    close() {},
    readyState: 1,
    sent,
  } as IMatchSocket & { sent: IServerMessage[] };
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
  } as IGameUnit;
}

function deliveredEventFrames(socket: {
  readonly sent: readonly IServerMessage[];
}): Array<{
  readonly deliverySequence?: number;
  readonly event: Record<string, unknown>;
}> {
  return socket.sent
    .filter((message) => message.kind === 'Event')
    .map((message) => {
      const frame = message as {
        deliverySequence?: number;
        event?: Record<string, unknown>;
      };
      return {
        deliverySequence: frame.deliverySequence,
        event: frame.event ?? {},
      };
    });
}

function deliveredDeliverySequences(socket: {
  readonly sent: readonly IServerMessage[];
}): number[] {
  return deliveredEventFrames(socket).map(
    (frame) => frame.deliverySequence ?? -1,
  );
}

/**
 * What a player can work out about events they never received, using
 * only the sequence numbers they WERE given.
 */
function concealmentLeak(received: readonly number[]): {
  readonly concealedCount: number;
  readonly concealedPositions: number[];
} {
  if (received.length === 0) {
    return { concealedCount: 0, concealedPositions: [] };
  }
  const lowest = received[0];
  const highest = received[received.length - 1];
  const seen = new Set(received);
  const concealedPositions: number[] = [];
  for (let sequence = lowest; sequence <= highest; sequence += 1) {
    if (!seen.has(sequence)) concealedPositions.push(sequence);
  }
  return { concealedCount: concealedPositions.length, concealedPositions };
}

describe('viewer sequence concealment leak', () => {
  it('does not let a player count or locate the events hidden from them', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const now = '2026-06-30T12:00:00.000Z';
    await store.createMatch({
      matchId: 'm-leak',
      hostPlayerId: 'pid_host',
      playerIds: ['pid_host', 'pid_opp'],
      sideAssignments: [
        { playerId: 'pid_host', side: 'player' },
        { playerId: 'pid_opp', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 12, turnLimit: 5, fogOfWar: true },
    });
    const host = ServerMatchHost.create('m-leak', store, {
      mapRadius: 12,
      turnLimit: 5,
      random: new SeededRandom(7),
      grid: createMinimalGrid(12),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [
        makeUnit('u1', GameSide.Player),
        makeUnit('u2', GameSide.Opponent),
      ],
      diceSeed: 7,
    });
    await Promise.resolve();
    await Promise.resolve();

    const player = makeSocket();
    const opponent = makeSocket();
    host.attachSocket(player, 'pid_host');
    host.attachSocket(opponent, 'pid_opp');

    for (const intentId of ['i1', 'i2', 'i3', 'i4']) {
      await host.handleIntent({
        kind: 'Intent',
        matchId: 'm-leak',
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent);
    }

    const playerFrames = deliveredEventFrames(player);
    const opponentFrames = deliveredEventFrames(opponent);
    const stored = await host.getEventsFromSeq(0);

    // Fog actually concealed something. Vacuous gaplessness (both
    // players received the whole log) would not prove the leak closed.
    expect(playerFrames.length).toBeGreaterThan(0);
    expect(opponentFrames.length).toBeGreaterThan(0);
    expect(playerFrames.length).toBeLessThan(stored.length);
    expect(opponentFrames.length).toBeLessThan(stored.length);
    const playerIds = playerFrames.map((frame) => frame.event.id);
    const opponentIds = opponentFrames.map((frame) => frame.event.id);
    expect(playerIds).not.toEqual(opponentIds);

    const playerLeak = concealmentLeak(deliveredDeliverySequences(player));
    const opponentLeak = concealmentLeak(deliveredDeliverySequences(opponent));

    // THE GUARD. Delivery numbering is gapless, so the arithmetic that
    // used to name concealed authority slots finds nothing.
    expect(playerLeak.concealedCount).toBe(0);
    expect(opponentLeak.concealedCount).toBe(0);
    expect(playerLeak.concealedPositions).toEqual([]);
    expect(opponentLeak.concealedPositions).toEqual([]);

    for (const frame of [...playerFrames, ...opponentFrames]) {
      expect(Object.keys(frame.event)).not.toContain('sequence');
    }
  });

  it('keeps the authority sequence off player frames and in the durable log', async () => {
    // The other half of the same requirement: "SHALL NOT expose hidden
    // authority identifiers". Player Event frames carry a per-viewer
    // delivery number; the private global sequence stays on the durable
    // log and on authority viewers.
    const store = new InMemoryMatchStore({ quiet: true });
    const now = '2026-06-30T12:00:00.000Z';
    await store.createMatch({
      matchId: 'm-authority',
      hostPlayerId: 'pid_host',
      playerIds: ['pid_host', 'pid_opp'],
      sideAssignments: [
        { playerId: 'pid_host', side: 'player' },
        { playerId: 'pid_opp', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 12, turnLimit: 5, fogOfWar: true },
    });
    const host = ServerMatchHost.create('m-authority', store, {
      mapRadius: 12,
      turnLimit: 5,
      random: new SeededRandom(7),
      grid: createMinimalGrid(12),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [
        makeUnit('u1', GameSide.Player),
        makeUnit('u2', GameSide.Opponent),
      ],
      diceSeed: 7,
    });
    await Promise.resolve();
    await Promise.resolve();

    const player = makeSocket();
    host.attachSocket(player, 'pid_host');
    await host.handleIntent({
      kind: 'Intent',
      matchId: 'm-authority',
      ts: nowIso(),
      playerId: 'pid_host',
      intentId: 'i1',
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent);

    const frames = deliveredEventFrames(player);
    const stored = await host.getEventsFromSeq(0);

    expect(frames.length).toBeGreaterThan(0);
    expect(stored.some((event) => typeof event.sequence === 'number')).toBe(
      true,
    );
    for (const frame of frames) {
      expect(Object.keys(frame.event)).not.toContain('sequence');
      expect(typeof frame.deliverySequence).toBe('number');
    }
    const delivery = frames.map((frame) => frame.deliverySequence ?? -1);
    expect(concealmentLeak(delivery).concealedCount).toBe(0);
  });
});
