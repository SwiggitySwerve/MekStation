/**
 * The client reports a delivery gap — and keeps applying anyway.
 *
 * A hole in the per-viewer delivery sequence means a frame was genuinely
 * LOST. A hole in the authority sequence means no such thing: under fog
 * it usually means the viewer was never allowed to see that event. That
 * difference is the entire reason the delivery sequence exists, and it
 * is why gap detection could not be built before it.
 *
 * The response is a signal, not a stall. Holding events behind a gap is
 * what a previous change did against the authority sequence, and under
 * fog it stalls the client forever on a sequence it may never receive.
 */

import { nowIso } from '@/types/multiplayer/Protocol';

import type { IClientWebSocket } from '../client';

import { connect } from '../client';

interface IMockSocket extends IClientWebSocket {
  fireOpen(): void;
  fireClose(): void;
  inject(message: unknown): void;
}

interface ISentMessage {
  kind: string;
  lastSeq?: number;
  deliveryCursor?: number;
}

function mockSocketFactory(): {
  factory: () => IClientWebSocket;
  last: () => IMockSocket;
  sentByClient: ISentMessage[];
} {
  const sockets: IMockSocket[] = [];
  const sentByClient: ISentMessage[] = [];
  const factory = (): IClientWebSocket => {
    const socket: IMockSocket = {
      send: (data: string) => {
        sentByClient.push(JSON.parse(data) as ISentMessage);
      },
      close: () => {},
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      fireOpen() {
        socket.onopen?.({});
      },
      fireClose() {
        socket.onclose?.({});
      },
      inject(message: unknown) {
        socket.onmessage?.({ data: JSON.stringify(message) });
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { factory, last: () => sockets[sockets.length - 1], sentByClient };
}

function eventFrame(deliverySequence: number, sequence: number) {
  return {
    kind: 'Event',
    matchId: 'm1',
    ts: nowIso(),
    deliverySequence,
    event: { sequence, type: 'TestEvent' },
  };
}

function openReadyClient(options: { reconnect?: boolean } = {}) {
  const sockets = mockSocketFactory();
  const errors: { reason?: string }[] = [];
  const applied: unknown[] = [];
  const client = connect(
    'ws://localhost/x',
    'm1',
    { playerId: 'p1', token: 'tok' },
    {
      socketFactory: sockets.factory,
      reconnect: options.reconnect ?? false,
    },
  );
  client.on('error', (e) => errors.push(e as { reason?: string }));
  client.on('event', (e) => applied.push(e));
  sockets.last().fireOpen();
  // Both frames carry their required fields. Without them the schema
  // rejects the frame, the client never leaves its replay window, and
  // every assertion about "no gap" below would pass because nothing was
  // processed at all - which is exactly how this helper failed first.
  sockets.last().inject({
    kind: 'ReplayStart',
    matchId: 'm1',
    ts: nowIso(),
    fromSeq: 0,
    totalEvents: 0,
  });
  sockets.last().inject({
    kind: 'ReplayEnd',
    matchId: 'm1',
    ts: nowIso(),
    toSeq: 0,
  });
  return { sockets, errors, applied, sentByClient: sockets.sentByClient };
}

function gaps(errors: readonly { reason?: string }[]): number {
  return errors.filter((e) => e.reason === 'delivery-gap').length;
}

/** A `ReplayEnd` covering authority sequences up to `toSeq`. */
function replayEnd(toSeq: number) {
  return { kind: 'ReplayEnd', matchId: 'm1', ts: nowIso(), toSeq };
}

/** The sequences the client actually emitted to its consumer. */
function appliedSequences(applied: readonly unknown[]): number[] {
  return applied.map((e) => (e as { sequence: number }).sequence);
}

/** The most recent `SessionJoin` the client wrote to the wire. */
function lastJoin(sentByClient: readonly ISentMessage[]): ISentMessage {
  const joins = sentByClient.filter((m) => m.kind === 'SessionJoin');
  return joins[joins.length - 1];
}

describe('client delivery-gap detection', () => {
  it('reports a gap but keeps applying what arrived', () => {
    const { sockets, errors, applied } = openReadyClient();

    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(1, 101));
    expect(gaps(errors)).toBe(0);

    // Delivery 2 never arrives.
    sockets.last().inject(eventFrame(3, 102));

    expect(gaps(errors)).toBe(1);
    // ...and the frame after the gap WAS applied. A client that stalled
    // here would be repeating the regression this number exists to fix.
    expect(applied).toHaveLength(3);
  });

  it('RECOVERS by asking for the tail it is missing', () => {
    // Reporting a hole without pulling the missing frames leaves the
    // client quietly wrong, which is worse than loud and wrong.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(1, 101));
    const joinsBefore = sentByClient.filter(
      (m) => m.kind === 'SessionJoin',
    ).length;

    sockets.last().inject(eventFrame(3, 102));

    const joins = sentByClient.filter((m) => m.kind === 'SessionJoin');
    expect(joins.length).toBe(joinsBefore + 1);
    // It asks from what it HAS, so the server replays the missing tail
    // rather than the whole match.
    expect(joins[joins.length - 1].lastSeq).toBe(102);
  });

  it('quotes a delivery cursor from BEFORE the hole', () => {
    // THE POINT OF THE WHOLE RECOVERY. `deliveryCursor` is the cursor
    // the server actually resumes from - it translates it through that
    // viewer's delivery record and only falls back to `lastSeq` when the
    // record is gone. So a cursor that has already advanced PAST the
    // hole asks for the tail after the loss, and the lost frame is
    // excluded from the very replay fetched to recover it.
    //
    // That is max-high-water reproduced on the new number: the cursor
    // moved to the highest thing seen, so the hole became unaskable.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(1, 101));

    // Delivery 2 is lost.
    sockets.last().inject(eventFrame(3, 102));

    expect(lastJoin(sentByClient).deliveryCursor).toBe(1);
  });

  it('advances the cursor across a long contiguous run', () => {
    // CONTROL. A client that simply pinned its cursor at the first frame
    // would pass the row above for the wrong reason - and would make
    // every recovery replay the entire match. The cursor has to track
    // the stream, and stop only where the stream actually broke.
    const { sockets, sentByClient } = openReadyClient();
    for (const delivery of [0, 1, 2, 3, 4]) {
      sockets.last().inject(eventFrame(delivery, 100 + delivery));
    }

    // Delivery 5 is lost.
    sockets.last().inject(eventFrame(6, 106));

    expect(lastJoin(sentByClient).deliveryCursor).toBe(4);
  });

  it('resumes advancing the cursor once a hole is behind it', () => {
    // CONTROL, and the reason the cursor cannot simply freeze at the
    // first hole of the connection. Pinning is for the moment of the
    // ask; once the stream runs contiguously again the client really
    // does hold those frames, so a LATER loss must be asked about from
    // where it now is, not from an ancient gap already recovered.
    // Freezing would make every subsequent recovery replay the whole
    // match.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(2, 101)); // delivery 1 lost
    expect(lastJoin(sentByClient).deliveryCursor).toBe(0);

    sockets.last().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: nowIso(),
      toSeq: 101,
    });
    sockets.last().inject(eventFrame(3, 102));
    sockets.last().inject(eventFrame(4, 103));

    // Delivery 5 is lost.
    sockets.last().inject(eventFrame(6, 104));

    expect(lastJoin(sentByClient).deliveryCursor).toBe(4);
  });

  it('does not leap a hole the replay never reached', () => {
    // The cursor's promise is "nothing missing BEFORE it", and a run of
    // contiguous frames DOWNSTREAM of a loss says nothing about the
    // loss. Here the recovery is answered by a replay whose `toSeq`
    // stops short of the frame that revealed the hole - the server
    // snapshotted before the lost event reached its store - so nothing
    // has been proven and the cursor must stay where it is. A cursor
    // that walked forward with the contiguous run would be quoting
    // delivery 4 while never having held 1, and the server would resume
    // it from 5.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(2, 101)); // delivery 1 lost
    expect(lastJoin(sentByClient).deliveryCursor).toBe(0);

    // Answered, but the answer stopped BEFORE sequence 101.
    sockets.last().inject(replayEnd(100));
    sockets.last().inject(eventFrame(3, 102));
    sockets.last().inject(eventFrame(4, 103));

    // A later loss, and the ask still names the last frame it holds.
    sockets.last().inject(eventFrame(6, 104));

    expect(lastJoin(sentByClient).deliveryCursor).toBe(0);
  });

  it('releases the pin on a stream that is never contiguous', () => {
    // The other failure mode, and the reason the pin cannot simply be
    // permanent. A viewer whose counter advances two at a time - one
    // player with two attached sockets each take alternate numbers, and
    // a send that FAILS consumes its number too - never produces a
    // contiguous step at all. If only a contiguous step could un-pin
    // the cursor, this connection would quote its FIRST frame forever
    // and every later recovery would replay the whole match at the
    // worst-off client. A completed recovery is what releases it.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(40, 200));
    sockets.last().inject(eventFrame(42, 201));
    expect(lastJoin(sentByClient).deliveryCursor).toBe(40);

    // A second hole while the first recovery is still in flight: the
    // latch swallows the extra ask, and the replay that is already
    // coming is a TAIL from the first hole, so it covers this one too.
    sockets.last().inject(eventFrame(44, 202));
    sockets.last().inject(replayEnd(202));

    sockets.last().inject(eventFrame(46, 203));

    expect(lastJoin(sentByClient).deliveryCursor).toBe(44);
  });

  it('applies a recovered frame that sits below its own high-water', () => {
    // Where the whole recovery used to die. A lost frame's authority
    // sequence is BY DEFINITION below the high-water - the frame that
    // revealed the hole already advanced it - so the replay fetched to
    // recover it arrived carrying a sequence the client discarded as
    // "already applied". It had never been applied.
    const { sockets, applied } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(2, 102)); // delivery 1 (seq 101) lost
    expect(appliedSequences(applied)).toEqual([100, 102]);

    // The recovery answer, resuming at the frame the client lacks.
    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromSeq: 101,
      totalEvents: 1,
    });
    sockets.last().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: nowIso(),
      events: [{ sequence: 101, type: 'TestEvent' }],
    });
    sockets.last().inject(replayEnd(102));

    expect(appliedSequences(applied)).toEqual([100, 102, 101]);
  });

  it('does not resurrect an old sequence outside a gap recovery', () => {
    // CONTROL for the row above, and the reason the opening is gated.
    // Under fog a viewer's authority stream is legitimately sparse:
    // sequence 101 here was WITHHELD, not lost, and no recovery ever
    // asked for it. A replay that happens to carry it - visibility can
    // differ between the live filter and a later one - must not apply
    // it out of order behind everything already emitted.
    const { sockets, applied } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(1, 102)); // delivery contiguous: no loss
    expect(appliedSequences(applied)).toEqual([100, 102]);

    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromSeq: 101,
      totalEvents: 1,
    });
    sockets.last().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: nowIso(),
      events: [{ sequence: 101, type: 'TestEvent' }],
    });
    sockets.last().inject(replayEnd(102));

    expect(appliedSequences(applied)).toEqual([100, 102]);
  });

  it('reaches back only as far as it still remembers what it applied', () => {
    // The other half of the gate. "Not remembered" means "never
    // applied" only inside the identity window; past it, it means
    // EVICTED, and re-admitting there would apply an old event a second
    // time. So a recovery may resurrect a recent unremembered sequence
    // and must not resurrect an ancient one.
    const { sockets, applied } = openReadyClient();
    // Authority advances two at a time - every odd sequence is withheld
    // and was never applied - while delivery stays contiguous.
    for (let delivery = 0; delivery < 300; delivery += 1) {
      sockets.last().inject(eventFrame(delivery, 1000 + delivery * 2));
    }
    const ancient = 1001;
    const recent = 1000 + 299 * 2 - 1;
    applied.length = 0;

    // Arm a recovery so the opening is available at all.
    sockets.last().inject(eventFrame(301, 1600)); // delivery 300 lost
    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromSeq: ancient,
      totalEvents: 2,
    });
    sockets.last().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: nowIso(),
      events: [
        { sequence: ancient, type: 'TestEvent' },
        { sequence: recent, type: 'TestEvent' },
      ],
    });
    sockets.last().inject(replayEnd(1600));

    expect(appliedSequences(applied)).toEqual([1600, recent]);
  });

  it('asks once for a burst of losses, not once per hole', () => {
    // Every resync is a full replay. One per lost frame turns a small
    // loss into a stampede.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    const joinsBefore = sentByClient.filter(
      (m) => m.kind === 'SessionJoin',
    ).length;

    sockets.last().inject(eventFrame(2, 101));
    sockets.last().inject(eventFrame(5, 102));
    sockets.last().inject(eventFrame(9, 103));

    const joinsAfter = sentByClient.filter(
      (m) => m.kind === 'SessionJoin',
    ).length;
    expect(joinsAfter).toBe(joinsBefore + 1);
  });

  it('allows a fresh recovery once the replay it asked for ends', () => {
    // The guard must not latch forever, or the second real loss of a
    // session would go unrecovered.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(2, 101));
    const afterFirst = sentByClient.filter(
      (m) => m.kind === 'SessionJoin',
    ).length;

    sockets.last().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: nowIso(),
      toSeq: 101,
    });
    sockets.last().inject(eventFrame(4, 102));

    expect(sentByClient.filter((m) => m.kind === 'SessionJoin').length).toBe(
      afterFirst + 1,
    );
  });

  it('does not cry gap over a sparse authority sequence', () => {
    // The control, and the reason the new number had to exist at all.
    // These authority sequences skip wildly — exactly what fog produces
    // — while the delivery sequence stays contiguous.
    const { sockets, errors, applied } = openReadyClient();

    for (const [delivery, authority] of [
      [0, 2],
      [1, 5],
      [2, 9],
      [3, 40],
    ]) {
      sockets.last().inject(eventFrame(delivery, authority));
    }

    expect(gaps(errors)).toBe(0);
    // Non-vacuous: the frames really were processed.
    expect(applied).toHaveLength(4);
  });

  it('says nothing about frames that carry no delivery sequence', () => {
    // Pre-rollout frames. Absent is not a gap — treating it as one would
    // make every un-migrated server look broken.
    const { sockets, errors, applied } = openReadyClient();

    for (const sequence of [7, 9, 30]) {
      sockets.last().inject({
        kind: 'Event',
        matchId: 'm1',
        ts: nowIso(),
        event: { sequence, type: 'TestEvent' },
      });
    }

    expect(gaps(errors)).toBe(0);
    expect(applied).toHaveLength(3);
  });
});

describe('client delivery cursor across a reconnect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('quotes the cursor from before a hole the socket died on', () => {
    // The server does NOT renumber a reconnecting viewer's stream -
    // `ViewerDeliveryCursors.forget` is teardown-only and has no
    // production caller - so the pre-drop cursor still indexes the
    // record the server will resume against. Dropping it on reconnect
    // would send a `SessionJoin` carrying no delivery cursor at all,
    // the server would fall back to `lastSeq`, and the hole that was
    // open when the socket died would become permanently unaskable:
    // exactly the authority high-water resume this change exists to
    // stop.
    const { sockets, sentByClient } = openReadyClient({ reconnect: true });
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(1, 101));
    sockets.last().inject(eventFrame(3, 102)); // delivery 2 lost
    expect(lastJoin(sentByClient).deliveryCursor).toBe(1);

    // The socket dies before the recovery lands.
    sockets.last().fireClose();
    jest.advanceTimersByTime(60_000);
    sockets.last().fireOpen();

    const join = lastJoin(sentByClient);
    expect(join.deliveryCursor).toBe(1);
    expect(join.lastSeq).toBe(102);
  });

  it('keeps the cursor when the replay lands before any live frame', () => {
    // A reconnect's own replay arrives BEFORE any numbered frame does,
    // so at that moment the client holds no delivery sequence on this
    // connection at all. There is nothing to un-pin to. A release that
    // ran anyway would blank the cursor, and the next reconnect would
    // quote nothing - the same permanent loss the row above exists to
    // prevent, reached by a different door.
    const { sockets, sentByClient } = openReadyClient({ reconnect: true });
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(2, 101)); // delivery 1 lost
    expect(lastJoin(sentByClient).deliveryCursor).toBe(0);

    sockets.last().fireClose();
    jest.advanceTimersByTime(60_000);
    sockets.last().fireOpen();
    // Answered - and the answer covers the hole - but no live frame has
    // arrived on this connection yet.
    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromSeq: 101,
      totalEvents: 0,
    });
    sockets.last().inject(replayEnd(101));

    // The connection flaps again before any live traffic.
    sockets.last().fireClose();
    jest.advanceTimersByTime(60_000);
    sockets.last().fireOpen();

    expect(lastJoin(sentByClient).deliveryCursor).toBe(0);
  });
});

function eventFrameDeliveryOnly(deliverySequence: number, id: string) {
  return {
    kind: 'Event',
    matchId: 'm1',
    ts: nowIso(),
    deliverySequence,
    event: { type: 'TestEvent', id },
  };
}

function appliedIds(applied: readonly unknown[]): string[] {
  return applied.map((event) => (event as { id: string }).id);
}

describe('client delivery-first admission without event.sequence', () => {
  it('dedupes sequence-stripped live frames by delivery number, not type', () => {
    // Same type and no `id`: identity collides across frames. Delivery
    // numbers are what distinguish them. A client that keys only on
    // authority sequence (absent here) re-applies the duplicate; a
    // client that keys only on identity drops the second distinct
    // delivery. Mutation M1 dies here.
    const { sockets, applied } = openReadyClient();
    sockets.last().inject({
      kind: 'Event',
      matchId: 'm1',
      ts: nowIso(),
      deliverySequence: 0,
      event: { type: 'TestEvent' },
    });
    sockets.last().inject({
      kind: 'Event',
      matchId: 'm1',
      ts: nowIso(),
      deliverySequence: 1,
      event: { type: 'TestEvent' },
    });
    sockets.last().inject({
      kind: 'Event',
      matchId: 'm1',
      ts: nowIso(),
      deliverySequence: 0,
      event: { type: 'TestEvent' },
    });
    expect(applied).toHaveLength(2);
  });

  it('applies sequence-stripped frames in delivery order, exactly once', () => {
    const { sockets, applied } = openReadyClient();
    sockets.last().inject(eventFrameDeliveryOnly(0, 'a'));
    sockets.last().inject(eventFrameDeliveryOnly(1, 'b'));
    sockets.last().inject(eventFrameDeliveryOnly(2, 'c'));
    // Recovery-shaped redelivery of the tail, still without sequence.
    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromSeq: 0,
      totalEvents: 2,
    });
    sockets.last().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: nowIso(),
      events: [
        { type: 'TestEvent', id: 'b' },
        { type: 'TestEvent', id: 'c' },
      ],
    });
    sockets.last().inject(replayEnd(2));

    expect(appliedIds(applied)).toEqual(['a', 'b', 'c']);
  });

  it('recovers when ReplayStart/End carry no authority bounds', () => {
    // Player-projected envelopes omit fromSeq/toSeq. Recovery must still
    // complete: schema admits the shape, ReplayStart opens the window,
    // ReplayEnd with toDeliverySequence releases the pin.
    const { sockets, errors, applied, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrameDeliveryOnly(0, 'a'));
    sockets.last().inject(eventFrameDeliveryOnly(1, 'b'));
    sockets.last().inject(eventFrameDeliveryOnly(3, 'd'));

    expect(gaps(errors)).toBe(1);
    expect(appliedIds(applied)).toEqual(['a', 'b', 'd']);
    expect(lastJoin(sentByClient).deliveryCursor).toBe(1);

    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromDeliverySequence: 2,
      totalEvents: 2,
    });
    sockets.last().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: nowIso(),
      deliverySequences: [2, 3],
      events: [
        { type: 'TestEvent', id: 'c' },
        { type: 'TestEvent', id: 'd' },
      ],
    });
    sockets.last().inject(eventFrameDeliveryOnly(4, 'e'));
    sockets.last().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: nowIso(),
      toDeliverySequence: 3,
    });
    sockets.last().inject(eventFrameDeliveryOnly(5, 'f'));
    sockets.last().inject(eventFrameDeliveryOnly(7, 'h'));

    expect(appliedIds(applied)).toEqual(['a', 'b', 'd', 'c', 'e', 'f', 'h']);
    expect(lastJoin(sentByClient).deliveryCursor).toBe(5);
  });

  it('releases the pin from a delivery-space ReplayEnd bound without authority numbers', () => {
    // M3. `toSeq` is too low to release via the old-server fallback;
    // `toDeliverySequence` is what un-pins. Dropping that field leaves
    // the cursor behind the hole forever.
    const { sockets, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrame(0, 100));
    sockets.last().inject(eventFrame(2, 101)); // delivery 1 lost
    expect(lastJoin(sentByClient).deliveryCursor).toBe(0);

    sockets.last().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: nowIso(),
      toSeq: 50,
      toDeliverySequence: 2,
    });
    sockets.last().inject(eventFrame(3, 102));
    sockets.last().inject(eventFrame(4, 103));
    sockets.last().inject(eventFrame(6, 104));

    expect(lastJoin(sentByClient).deliveryCursor).toBe(4);
  });

  it('reports a delivery gap, resyncs, and recovers without event.sequence', () => {
    const { sockets, errors, applied, sentByClient } = openReadyClient();
    sockets.last().inject(eventFrameDeliveryOnly(0, 'a'));
    sockets.last().inject(eventFrameDeliveryOnly(1, 'b'));
    sockets.last().inject(eventFrameDeliveryOnly(3, 'd'));

    expect(gaps(errors)).toBe(1);
    expect(appliedIds(applied)).toEqual(['a', 'b', 'd']);
    expect(typeof lastJoin(sentByClient).deliveryCursor).toBe('number');
    expect(lastJoin(sentByClient).deliveryCursor).toBe(1);

    sockets.last().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: nowIso(),
      fromSeq: 0,
      totalEvents: 2,
    });
    sockets.last().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: nowIso(),
      events: [
        { type: 'TestEvent', id: 'c' },
        { type: 'TestEvent', id: 'd' },
      ],
    });
    sockets.last().inject(replayEnd(3));

    expect(appliedIds(applied)).toEqual(['a', 'b', 'd', 'c']);
  });
});
