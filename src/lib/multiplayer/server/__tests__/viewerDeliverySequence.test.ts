/**
 * Each viewer gets a gapless delivery sequence of their own, even when
 * the authority sequence they can also see is full of holes.
 *
 * This is the first slice of umbrella 11.1. The spec requires the server
 * to "assign a gapless delivery sequence independently for each viewer
 * projection stream"; before this there was only the global authority
 * sequence, and under fog each viewer sees a sparse slice of it. That
 * sparsity is why client-side gap detection was impossible — a hole
 * meant "withheld from you", not "lost", and a client that waited on one
 * stalled forever.
 *
 * NOT CLAIMED HERE: the concealment leak is still open. The authority
 * sequence is still on the wire alongside this one, so a player can
 * still count what was hidden from them (`viewerSequenceConcealmentLeak`
 * still passes). Closing that means removing the authority sequence from
 * player frames and resuming replay from the delivery cursor — the next
 * slices, not this one.
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

function frames(socket: { readonly sent: readonly IServerMessage[] }) {
  return socket.sent.filter((m) => m.kind === 'Event') as Array<
    IServerMessage & {
      deliverySequence?: number;
      event?: { sequence?: number };
    }
  >;
}

async function fogMatch(matchId: string): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
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
    config: { mapRadius: 12, turnLimit: 5, fogOfWar: true },
  });
  const host = ServerMatchHost.create(matchId, store, {
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
  return host;
}

async function drive(host: ServerMatchHost, matchId: string): Promise<void> {
  for (const intentId of ['i1', 'i2', 'i3', 'i4']) {
    await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intentId,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent);
  }
}

describe('per-viewer delivery sequence', () => {
  it('is gapless for each viewer while the authority sequence is not', async () => {
    const host = await fogMatch('m-vds');
    const player = makeSocket();
    const opponent = makeSocket();
    host.attachSocket(player, 'pid_host');
    host.attachSocket(opponent, 'pid_opp');

    await drive(host, 'm-vds');

    for (const socket of [player, opponent]) {
      const received = frames(socket);
      expect(received.length).toBeGreaterThan(0);

      const delivery = received.map((f) => f.deliverySequence);
      // Gapless and starting at zero: 0,1,2,...
      expect(delivery).toEqual(delivery.map((_, index) => index));

      // ...whereas the authority sequence in the SAME frames is not.
      const authority = received.map((f) => f.event?.sequence ?? -1);
      const authorityIsGapless = authority.every(
        (value, index) => index === 0 || value === authority[index - 1] + 1,
      );
      expect(authorityIsGapless).toBe(false);
    }
  });

  it('numbers the two viewers independently', async () => {
    // Each stream is its own. The counters must not be shared, or one
    // viewer's withheld event would punch a hole in the other's stream.
    const host = await fogMatch('m-vds-independent');
    const player = makeSocket();
    const opponent = makeSocket();
    host.attachSocket(player, 'pid_host');
    host.attachSocket(opponent, 'pid_opp');

    await drive(host, 'm-vds-independent');

    const playerDelivery = frames(player).map((f) => f.deliverySequence);
    const opponentDelivery = frames(opponent).map((f) => f.deliverySequence);

    expect(playerDelivery[0]).toBe(0);
    expect(opponentDelivery[0]).toBe(0);
    // They received different numbers of frames - which is exactly why a
    // shared counter would have gapped one of them.
    const playerAuthority = frames(player).map((f) => f.event?.sequence);
    const opponentAuthority = frames(opponent).map((f) => f.event?.sequence);
    expect(playerAuthority).not.toEqual(opponentAuthority);
  });

  it('does not consume a number for a frame the viewer never receives', async () => {
    // The heart of it. Fog withholds events; those must not advance the
    // withheld viewer's counter, or their sequence would carry the same
    // holes the authority sequence does and be equally useless.
    const host = await fogMatch('m-vds-withheld');
    const player = makeSocket();
    const opponent = makeSocket();
    host.attachSocket(player, 'pid_host');
    host.attachSocket(opponent, 'pid_opp');

    await drive(host, 'm-vds-withheld');

    const playerFrames = frames(player);
    const opponentFrames = frames(opponent);
    // Each was withheld something the other received. NOTE: the counts
    // can be EQUAL - they were, first time this ran - because each side
    // loses a different event. Comparing counts would have passed for
    // the wrong reason, so compare what actually arrived.
    const playerAuthority = playerFrames.map((f) => f.event?.sequence);
    const opponentAuthority = opponentFrames.map((f) => f.event?.sequence);
    expect(playerAuthority).not.toEqual(opponentAuthority);
    expect(
      playerAuthority.filter((s) => !opponentAuthority.includes(s)).length,
    ).toBeGreaterThan(0);

    // Yet each still counted from zero with no holes.
    for (const received of [playerFrames, opponentFrames]) {
      const delivery = received.map((f) => f.deliverySequence);
      expect(delivery[delivery.length - 1]).toBe(delivery.length - 1);
    }
  });
});
