/**
 * A fog-of-war viewer's event stream is SPARSE, and that is a fact the
 * client depends on (umbrella task 5.1 `Authority and Viewer Sequences
 * Are Separate`).
 *
 * `broadcastEvent` filters each event per recipient and, when the event
 * is not visible to them, skips the send entirely — while every event
 * that IS sent keeps its authority sequence. So each viewer sees a
 * stream with holes, and the holes are different per viewer.
 *
 * This is written down as a test because the client was briefly changed
 * to treat a skipped sequence as a delivery gap and hold everything
 * behind it. Under fog that stalls the client permanently: the sequence
 * it waits for is one it is never allowed to see. The client now
 * advances instead, and this row is what keeps that decision anchored
 * to the server's actual behaviour rather than to a comment.
 *
 * If a future change makes per-viewer streams contiguous — which is
 * what a per-viewer `deliverySequence` would do — this test fails, and
 * that failure is the signal that client-side contiguity becomes
 * enforceable.
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

function deliveredSequences(socket: {
  readonly sent: readonly IServerMessage[];
}): number[] {
  return socket.sent
    .filter((message) => message.kind === 'Event')
    .map(
      (message) =>
        (message as { event?: { sequence?: number } }).event?.sequence ?? -1,
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

    const playerSeqs = deliveredSequences(player);
    const opponentSeqs = deliveredSequences(opponent);

    // Both received something, and neither received a contiguous run.
    expect(playerSeqs.length).toBeGreaterThan(0);
    expect(opponentSeqs.length).toBeGreaterThan(0);
    expect(hasHole(playerSeqs)).toBe(true);
    expect(hasHole(opponentSeqs)).toBe(true);

    // And the holes are DIFFERENT: each is missing an event the other
    // could see, which is what makes the authority sequence unusable as
    // a per-viewer contiguity check.
    expect(playerSeqs).not.toEqual(opponentSeqs);
  });
});
