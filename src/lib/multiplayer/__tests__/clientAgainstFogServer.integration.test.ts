/**
 * The real client, driven by a real fog-of-war server.
 *
 * This bridge did not exist, and its absence is why PR #1369 shipped a
 * regression through a full green gate. That change taught the client to
 * treat an event whose sequence skips ahead as a delivery gap and hold
 * it — reasonable against a contiguous stream, fatal against this one.
 * Under fog the server filters per recipient and skips the send entirely
 * (`ServerMatchHostEvents.ts`, `if (!filtered) continue;`), so a viewer's
 * stream is legitimately sparse and the client would have stalled at the
 * first hole, waiting for a sequence it is never allowed to see.
 *
 * Every gate passed on that PR: typecheck, lint, ~33k unit tests, 30/30
 * CI, and a falsification pass. They passed because the client's own
 * tests hand-fed a synthetic socket exactly the sequence the new code
 * expected — the code was tested against its own assumption. Nothing
 * connected it to the thing that actually produces its input.
 *
 * So this file connects them. `client.ts` accepts an injectable
 * `socketFactory`, and the server's `IMatchSocket` is a plain
 * send/close/readyState interface; an in-memory duplex pairing the two
 * is enough to make the real producer drive the real consumer.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (5.3)
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import type { IClientWebSocket } from '../client';
import type { IMatchSocket } from '../server/ServerMatchSocketTypes';

import { connect } from '../client';
import { InMemoryMatchStore } from '../server/InMemoryMatchStore';
import { ServerMatchHost } from '../server/ServerMatchHost';

const MATCH_ID = 'match-client-fog-bridge';

/**
 * One in-memory duplex link: the server half is an `IMatchSocket`, the
 * client half an `IClientWebSocket`, and what the server sends is what
 * the client receives. No transport, no framing, no schema shortcuts —
 * both ends are the real production interfaces.
 */
function duplexLink(): {
  readonly serverSide: IMatchSocket;
  readonly clientSide: IClientWebSocket;
  readonly sentToClient: string[];
} {
  const sentToClient: string[] = [];
  const clientSide: IClientWebSocket = {
    send: () => {},
    close: () => {},
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  };
  const serverSide: IMatchSocket = {
    send(data: string) {
      sentToClient.push(data);
      clientSide.onmessage?.({ data });
    },
    close() {
      clientSide.onclose?.({});
    },
    readyState: 1,
  };
  return { serverSide, clientSide, sentToClient };
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

async function fogHost(): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId: MATCH_ID,
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
  const host = ServerMatchHost.create(MATCH_ID, store, {
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
  return host;
}

describe('real client against a real fog-of-war server', () => {
  it('keeps applying events after the server withholds one', async () => {
    // The regression this file exists for. The server drops events the
    // viewer cannot see while keeping the authority sequence on the
    // rest, so the client meets a hole it must not wait on.
    const host = await fogHost();
    const link = duplexLink();
    const applied: { sequence: number }[] = [];

    const client = connect(
      'ws://in-memory/x',
      MATCH_ID,
      { playerId: 'pid_host', token: 'tok' },
      { socketFactory: () => link.clientSide, reconnect: false },
    );
    client.on('event', (event) => {
      applied.push(event as { sequence: number });
    });
    link.clientSide.onopen?.({});
    host.attachSocket(link.serverSide, 'pid_host');
    // The join the binder performs when the client's SessionJoin lands.
    // Without it the client never leaves its replay window and buffers
    // every live event instead of applying it - which is how the first
    // draft of this test failed for a reason unrelated to fog.
    await host.handleSessionJoin(
      link.serverSide,
      'pid_host',
      undefined,
      MATCH_ID,
    );
    // Both sides reset together, so the comparison below counts only
    // post-join traffic. The replay flush lands in `applied` but not in
    // `delivered` (it arrives as ReplayChunk, not Event), and clearing
    // only one of them made the first draft fail on bookkeeping rather
    // than on behaviour.
    link.sentToClient.length = 0;
    applied.length = 0;

    for (const intentId of ['i1', 'i2', 'i3', 'i4']) {
      await host.handleIntent({
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent);
    }

    const delivered = link.sentToClient
      .map(
        (raw) =>
          JSON.parse(raw) as { kind: string; event?: { sequence: number } },
      )
      .filter((message) => message.kind === 'Event')
      .map((message) => message.event?.sequence ?? -1);

    // The server really did withhold something - otherwise this test
    // proves nothing about sparsity and would pass against a contiguous
    // stream too.
    const hasHole = delivered.some(
      (sequence, index) => index > 0 && sequence !== delivered[index - 1] + 1,
    );
    expect(delivered.length).toBeGreaterThan(0);
    expect(hasHole).toBe(true);

    // And the client applied everything it was given, INCLUDING the
    // events after the hole. A client that stalled at the gap would
    // stop here, which is exactly what #1369 would have done.
    expect(applied.map((event) => event.sequence)).toEqual(delivered);
  });

  it('advances its resume cursor past a withheld sequence', async () => {
    // `lastSeq` is what a reconnect resumes from. Parking it at the hole
    // would make every reconnect re-request events the server will never
    // send, so the sparse stream has to move the cursor.
    const host = await fogHost();
    const link = duplexLink();

    const client = connect(
      'ws://in-memory/x',
      MATCH_ID,
      { playerId: 'pid_host', token: 'tok' },
      { socketFactory: () => link.clientSide, reconnect: false },
    );
    link.clientSide.onopen?.({});
    host.attachSocket(link.serverSide, 'pid_host');
    await host.handleSessionJoin(
      link.serverSide,
      'pid_host',
      undefined,
      MATCH_ID,
    );
    link.sentToClient.length = 0;

    for (const intentId of ['i1', 'i2', 'i3', 'i4']) {
      await host.handleIntent({
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent);
    }

    const delivered = link.sentToClient
      .map(
        (raw) =>
          JSON.parse(raw) as { kind: string; event?: { sequence: number } },
      )
      .filter((message) => message.kind === 'Event')
      .map((message) => message.event?.sequence ?? -1);
    const highest = Math.max(...delivered);

    expect(client.lastSeq()).toBe(highest);
  });
});
