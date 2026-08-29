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
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import type { IClientWebSocket } from '../client';
import type { IMatchSocket } from '../server/ServerMatchSocketTypes';

import { connect } from '../client';
import { buildMirrorSession, orderGameEvents } from '../mirrorMatchSession';
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
    // viewer cannot see. Delivery numbering is gapless, so the client
    // must not stall on a withheld authority sequence.
    const host = await fogHost();
    const link = duplexLink();
    const applied: { id?: string; sequence?: number }[] = [];

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
          JSON.parse(raw) as {
            kind: string;
            deliverySequence?: number;
            event?: { id?: string; sequence?: number };
          },
      )
      .filter((message) => message.kind === 'Event');
    const deliveredIds = delivered.map((message) => message.event?.id ?? '');
    const deliveredDelivery = delivered.map(
      (message) => message.deliverySequence ?? -1,
    );

    expect(delivered.length).toBeGreaterThan(0);
    const deliveryHasHole = deliveredDelivery.some(
      (sequence, index) =>
        index > 0 && sequence !== deliveredDelivery[index - 1] + 1,
    );
    expect(deliveryHasHole).toBe(false);

    // And the client applied everything it was given. A client that
    // stalled at a withheld authority sequence would stop here.
    expect(applied.map((event) => (event as { id?: string }).id ?? '')).toEqual(
      deliveredIds,
    );
  });

  it('R2: the multiplayer client path does not read a match-log mirror', async () => {
    const reads = jest.spyOn(matchLogStorage, 'getEventsForMatch');
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
    await host.handleIntent({
      kind: 'Intent',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      intentId: 'r2-1',
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent);
    client.close();
    expect(reads).not.toHaveBeenCalled();
    reads.mockRestore();
  });

  it('recovers a frame lost in transit, end to end', async () => {
    // THE ROUND TRIP, and nothing in the repo proved it before. Every
    // other row here - and every row in `clientDeliveryGap` - asserts
    // what the client WRITES to the wire. This one drops a frame the
    // server really sent, lets the real client notice, lets the real
    // server answer, and asserts the lost EVENT ends up applied.
    //
    // It took three separate fixes to make it pass, one in each of the
    // three places that touch the cursor: the client has to quote from
    // before the hole, the server has to resume AT the frame the viewer
    // lacks rather than after it, and the client has to accept an event
    // whose sequence sits below its own high-water - which every
    // recovered frame does, because the frame that revealed the hole
    // already moved the high-water past it.
    const host = await fogHost();
    const joins: (() => Promise<void>)[] = [];
    const dropped: string[] = [];
    const applied: { sequence?: number; id?: string }[] = [];
    const gapReports: unknown[] = [];
    let dropNextEvent = false;

    const clientSide: IClientWebSocket = {
      send: (data: string) => {
        const message = JSON.parse(data) as {
          kind: string;
          lastSeq?: number;
          deliveryCursor?: number;
        };
        if (message.kind !== 'SessionJoin') return;
        // Queued rather than awaited inline: the resync is written from
        // inside the client's own message handling, which is itself
        // inside the server's broadcast loop.
        joins.push(() =>
          host.handleSessionJoin(
            serverSide,
            'pid_host',
            message.lastSeq,
            MATCH_ID,
            message.deliveryCursor,
          ),
        );
      },
      close: () => {},
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };
    const serverSide: IMatchSocket = {
      send(data: string) {
        const frame = JSON.parse(data) as {
          kind: string;
          event?: { sequence?: number; id?: string };
        };
        if (dropNextEvent && frame.kind === 'Event') {
          // The loss. The server has already taken this viewer's next
          // delivery number for it, which is exactly what makes the
          // hole visible downstream.
          dropNextEvent = false;
          dropped.push(frame.event?.id ?? '');
          return;
        }
        clientSide.onmessage?.({ data });
      },
      close() {
        clientSide.onclose?.({});
      },
      readyState: 1,
    };

    const client = connect(
      'ws://in-memory/x',
      MATCH_ID,
      { playerId: 'pid_host', token: 'tok' },
      { socketFactory: () => clientSide, reconnect: false },
    );
    client.on('event', (event) => applied.push(event as { sequence: number }));
    client.on('error', (error) => {
      if ((error as { reason?: string }).reason === 'delivery-gap') {
        gapReports.push(error);
      }
    });
    clientSide.onopen?.({});
    host.attachSocket(serverSide, 'pid_host');
    await host.handleSessionJoin(serverSide, 'pid_host', undefined, MATCH_ID);
    joins.length = 0;
    applied.length = 0;

    const drainJoins = async () => {
      while (joins.length > 0) {
        const next = joins.shift();
        if (next !== undefined) await next();
      }
    };

    for (const intentId of ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']) {
      if (intentId === 'i3') dropNextEvent = true;
      await host.handleIntent({
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent);
      await drainJoins();
    }
    await drainJoins();

    // Something really was lost, and the client really noticed -
    // otherwise the assertion below would pass against a stream that
    // never had a hole in it.
    expect(dropped).toHaveLength(1);
    expect(gapReports.length).toBeGreaterThan(0);

    // And the lost event is HELD, not merely asked about.
    expect(applied.map((event) => event.id)).toContain(dropped[0]);
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
          JSON.parse(raw) as {
            kind: string;
            deliverySequence?: number;
            event?: { sequence?: number };
          },
      )
      .filter((message) => message.kind === 'Event');
    expect(delivered.length).toBeGreaterThan(0);
    // Authority sequence is gone from player frames, so lastSeq is no
    // longer an authority high-water. Resume quotes deliveryCursor.
    expect(
      delivered.every((message) => message.event?.sequence === undefined),
    ).toBe(true);
    expect(client.lastSeq()).toBe(-1);
  });

  it('applies, gaps, resyncs, and recovers when event.sequence is stripped', async () => {
    // SLICE A PROOF. Slice B will stop putting `event.sequence` on
    // player frames. This row is that future, today: the real fog
    // server still stamps the field, then the duplex deletes it before
    // the client sees the frame. Admission, exactly-once, gap
    // detection, and recovery must all survive on `deliverySequence`
    // (and event identity) alone.
    //
    // A client that still keys those on authority sequence passes
    // every unstripped event through (`sequence === null`) and then
    // double-applies the recovery tail. Exactly-once is the assertion
    // that dies first.
    const host = await fogHost();
    const joinMessages: {
      lastSeq?: number;
      deliveryCursor?: number;
    }[] = [];
    const joins: (() => Promise<void>)[] = [];
    const droppedIds: string[] = [];
    const applied: { id?: string; sequence?: number }[] = [];
    const gapReports: unknown[] = [];
    const liveIdsInOrder: string[] = [];
    let dropNextEvent = false;
    let sawStrippedLiveEvent = false;

    const clientSide: IClientWebSocket = {
      send: (data: string) => {
        const message = JSON.parse(data) as {
          kind: string;
          lastSeq?: number;
          deliveryCursor?: number;
        };
        if (message.kind !== 'SessionJoin') return;
        joinMessages.push({
          lastSeq: message.lastSeq,
          deliveryCursor: message.deliveryCursor,
        });
        joins.push(() =>
          host.handleSessionJoin(
            serverSide,
            'pid_host',
            message.lastSeq,
            MATCH_ID,
            message.deliveryCursor,
          ),
        );
      },
      close: () => {},
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };
    const serverSide: IMatchSocket = {
      send(data: string) {
        const frame = JSON.parse(data) as {
          kind: string;
          event?: { sequence?: number; id?: string };
        };
        if (dropNextEvent && frame.kind === 'Event') {
          dropNextEvent = false;
          if (typeof frame.event?.id === 'string') {
            droppedIds.push(frame.event.id);
          }
          return;
        }
        if (frame.kind === 'Event' && frame.event) {
          if (typeof frame.event.id === 'string') {
            liveIdsInOrder.push(frame.event.id);
          }
        }
        const stripped = stripAuthoritySequence(data);
        if (frame.kind === 'Event') {
          const parsed = JSON.parse(stripped) as {
            event?: { sequence?: number };
          };
          if (
            parsed.event !== undefined &&
            parsed.event.sequence === undefined
          ) {
            sawStrippedLiveEvent = true;
          }
        }
        clientSide.onmessage?.({ data: stripped });
      },
      close() {
        clientSide.onclose?.({});
      },
      readyState: 1,
    };

    const client = connect(
      'ws://in-memory/x',
      MATCH_ID,
      { playerId: 'pid_host', token: 'tok' },
      { socketFactory: () => clientSide, reconnect: false },
    );
    client.on('event', (event) =>
      applied.push(event as { id?: string; sequence?: number }),
    );
    client.on('error', (error) => {
      if ((error as { reason?: string }).reason === 'delivery-gap') {
        gapReports.push(error);
      }
    });
    clientSide.onopen?.({});
    host.attachSocket(serverSide, 'pid_host');
    await host.handleSessionJoin(serverSide, 'pid_host', undefined, MATCH_ID);
    joins.length = 0;
    joinMessages.length = 0;
    applied.length = 0;
    liveIdsInOrder.length = 0;
    sawStrippedLiveEvent = false;

    const drainJoins = async () => {
      while (joins.length > 0) {
        const next = joins.shift();
        if (next !== undefined) await next();
      }
    };

    for (const intentId of ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']) {
      if (intentId === 'i3') dropNextEvent = true;
      await host.handleIntent({
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent);
      await drainJoins();
    }
    await drainJoins();

    expect(sawStrippedLiveEvent).toBe(true);
    // Emitted events carry the client's LOCAL stamp - the delivery
    // number, this mirror's log position - never the authority
    // sequence. Ascending and duplicate-free is the property; the raw
    // wire frames carried no sequence at all (asserted above).
    const localSequences = applied.map((event) => event.sequence);
    expect(localSequences.every((value) => typeof value === 'number')).toBe(
      true,
    );
    // Arrival order is NOT ascending here by design: the dropped frame
    // is recovered late carrying its ORIGINAL number. The property is
    // duplicate-free and, once recovery lands, contiguous.
    const numeric = localSequences as number[];
    expect(new Set(numeric).size).toBe(numeric.length);
    const sorted = [...numeric].sort((a, b) => a - b);
    expect(sorted[sorted.length - 1]! - sorted[0]!).toBe(sorted.length - 1);
    expect(droppedIds).toHaveLength(1);
    expect(gapReports.length).toBeGreaterThan(0);
    expect(joinMessages.length).toBeGreaterThan(0);
    expect(
      joinMessages.some((join) => typeof join.deliveryCursor === 'number'),
    ).toBe(true);

    const appliedIds = applied
      .map((event) => event.id)
      .filter((id): id is string => typeof id === 'string');
    const uniqueIds = new Set(appliedIds);
    // Exactly-once: the recovery tail must not re-apply events the
    // live path already emitted, and the lost event must appear once.
    expect(appliedIds).toHaveLength(uniqueIds.size);
    expect(appliedIds).toContain(droppedIds[0]);
    expect(appliedIds.filter((id) => id === droppedIds[0])).toHaveLength(1);
    for (const liveId of liveIdsInOrder) {
      expect(appliedIds.filter((id) => id === liveId)).toHaveLength(1);
    }
  });
});

/**
 * Delete `event.sequence` (and the same field on ReplayChunk items)
 * after the server serializes, before the client parses. Live
 * `deliverySequence` is left intact: that is the number slice A keys
 * on, and the number slice B will still send.
 */
// =============================================================================
// The live shape: a sequence-stripped stream must still hydrate a mirror.
// =============================================================================

it('what the client emits from a sequence-stripped stream still hydrates a mirror', async () => {
  // The strip removes the authority sequence from player frames, and the
  // global isGameEvent guard rightly still requires one - engine events
  // always carry it. The bridge is the client: the delivery number IS
  // this mirror's local log position (the same meaning hydration gives
  // its own locally-appended events), so the client stamps it onto
  // sequence-less wire events at emission. Without the stamp every
  // emitted event fails isGameEvent, the mirror log stays empty, and a
  // real player sits at "loading match..." forever - while hook tests
  // stay green on locally-built events that still carry sequences.
  const host = await fogHost();
  const emitted: unknown[] = [];
  const clientSide: IClientWebSocket = {
    send() {},
    close() {
      this.onclose?.({});
    },
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  };
  const serverSide: IMatchSocket = {
    send(data: string) {
      clientSide.onmessage?.({ data: stripAuthoritySequence(data) });
    },
    close() {
      clientSide.onclose?.({});
    },
    readyState: 1,
  };

  const client = connect(
    'ws://in-memory/x',
    MATCH_ID,
    { playerId: 'pid_host', token: 'tok' },
    { socketFactory: () => clientSide, reconnect: false },
  );
  client.on('event', (event) => {
    emitted.push(event);
  });
  clientSide.onopen?.({});
  host.attachSocket(serverSide, 'pid_host');
  await host.handleSessionJoin(serverSide, 'pid_host', undefined, MATCH_ID);

  for (const intentId of ['m1', 'm2']) {
    await host.handleIntent(
      {
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'pid_host',
        intentId,
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent,
      'conn-a',
      'pid_host',
    );
  }
  client.close();

  const ordered = orderGameEvents(emitted);
  expect(ordered.length).toBeGreaterThan(0);
  expect(buildMirrorSession(ordered)).not.toBeNull();
});

function stripAuthoritySequence(raw: string): string {
  const parsed = JSON.parse(raw) as {
    kind?: string;
    event?: Record<string, unknown>;
    events?: Record<string, unknown>[];
  };
  if (
    parsed.kind === 'Event' &&
    parsed.event &&
    typeof parsed.event === 'object'
  ) {
    delete parsed.event.sequence;
  }
  if (parsed.kind === 'ReplayChunk' && Array.isArray(parsed.events)) {
    parsed.events = parsed.events.map((event) => {
      if (!event || typeof event !== 'object') return event;
      delete event.sequence;
      return event;
    });
  }
  return JSON.stringify(parsed);
}
