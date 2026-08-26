/**
 * A player can count the events they were not allowed to see.
 *
 * `multiplayer-sync` spec, `Authority and Viewer Sequences Are Separate`:
 *
 *   "The server SHALL maintain a private global authority sequence and
 *    SHALL assign a gapless delivery sequence independently for each
 *    viewer projection stream. Player payloads SHALL NOT expose hidden
 *    authority identifiers or gaps that reveal concealed events."
 *
 * Both halves are violated today, and this measures by how much. Each
 * `Event` frame carries the raw AUTHORITY sequence, and under fog the
 * server skips the send for events a viewer may not see while every
 * event it does send keeps that sequence. So the holes in a player's
 * own stream are a side channel: arithmetic on numbers they were handed
 * tells them how many events were concealed and where in the ordering
 * they fell.
 *
 * That is not a hypothetical inference. The player needs nothing but
 * their own received frames — no second client, no timing, no server
 * access.
 *
 * WHY THIS IS A CHARACTERIZATION AND NOT A FIX. Closing it means giving
 * each viewer its own gapless `deliverySequence` and never putting the
 * authority sequence on the wire — the pre-serialization viewer
 * projection work (umbrella section 11), not a patch here. A previous
 * attempt to address the symptom client-side, by treating a skipped
 * sequence as a delivery gap, shipped as a regression and was reverted:
 * under fog it stalls the client forever, waiting on a sequence it is
 * never allowed to receive.
 *
 * WHEN THE FIX LANDS, THIS TEST MUST BE INVERTED — `concealedCount`
 * becomes 0 and the assertions below flip. Its failure is the signal
 * that the leak closed.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-sync/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (1.3, 5.3)
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
  it('lets a player count and locate the events hidden from them', async () => {
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

    const playerLeak = concealmentLeak(deliveredSequences(player));
    const opponentLeak = concealmentLeak(deliveredSequences(opponent));

    // THE LEAK. Each player can name events they never received.
    expect(playerLeak.concealedCount).toBeGreaterThan(0);
    expect(opponentLeak.concealedCount).toBeGreaterThan(0);

    // And it is genuinely private information, not a shared blind spot:
    // the two players' concealed sets are different, so each is learning
    // about the OTHER's activity specifically.
    expect(playerLeak.concealedPositions).not.toEqual(
      opponentLeak.concealedPositions,
    );
  });

  it('puts the raw authority sequence on the wire', async () => {
    // The other half of the same requirement: "SHALL NOT expose hidden
    // authority identifiers". The number in an Event frame IS the
    // private global authority sequence, not a per-viewer one — which
    // is what makes the arithmetic above possible at all.
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

    const delivered = deliveredSequences(player);
    const stored = (await host.getEventsFromSeq(0)).map((e) => e.sequence);

    // Every number the player received is the SAME number the durable
    // authority log uses. There is no viewer-scoped numbering at all.
    expect(delivered.length).toBeGreaterThan(0);
    for (const sequence of delivered) {
      expect(stored).toContain(sequence);
    }
  });
});
