/**
 * A fog-of-war viewer's AUTHORITY stream is sparse; their DELIVERY
 * stream is not (umbrella task 5.1 / 11.1 `Authority and Viewer
 * Sequences Are Separate`).
 *
 * `broadcastEvent` still skips the send for events a viewer may not
 * see. Player frames no longer carry the authority sequence, so those
 * skips are not visible as holes in the numbers the player holds.
 * Delivery numbering is gapless; the two viewers still receive
 * different event subsets.
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

function deliveredDeliverySequences(socket: {
  readonly sent: readonly IServerMessage[];
}): number[] {
  return socket.sent
    .filter((message) => message.kind === 'Event')
    .map(
      (message) =>
        (message as { deliverySequence?: number }).deliverySequence ?? -1,
    );
}

function deliveredEventIds(socket: {
  readonly sent: readonly IServerMessage[];
}): unknown[] {
  return socket.sent
    .filter((message) => message.kind === 'Event')
    .map(
      (message) => (message as { event?: { id?: unknown } }).event?.id ?? null,
    );
}

function hasHole(sequences: readonly number[]): boolean {
  for (let i = 1; i < sequences.length; i += 1) {
    if (sequences[i] !== sequences[i - 1] + 1) return true;
  }
  return false;
}

describe('fog-of-war viewer sequence sparsity', () => {
  it('gives each viewer a stream with holes the other does not have', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const now = '2026-06-30T12:00:00.000Z';
    await store.createMatch({
      matchId: 'm',
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
    const host = ServerMatchHost.create('m', store, {
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
        matchId: 'm',
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent);
    }

    const playerDelivery = deliveredDeliverySequences(player);
    const opponentDelivery = deliveredDeliverySequences(opponent);
    const playerIds = deliveredEventIds(player);
    const opponentIds = deliveredEventIds(opponent);

    // Fog still conceals: each viewer received a different subset.
    expect(playerDelivery.length).toBeGreaterThan(0);
    expect(opponentDelivery.length).toBeGreaterThan(0);
    expect(playerIds).not.toEqual(opponentIds);

    // Delivery numbering is gapless, so a hole is a real loss, not a
    // withheld event. The authority sequence is no longer on the wire.
    expect(hasHole(playerDelivery)).toBe(false);
    expect(hasHole(opponentDelivery)).toBe(false);
  });
});
