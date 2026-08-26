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
  inject(message: unknown): void;
}

function mockSocketFactory(): {
  factory: () => IClientWebSocket;
  last: () => IMockSocket;
  sentByClient: { kind: string; lastSeq?: number }[];
} {
  const sockets: IMockSocket[] = [];
  const sentByClient: { kind: string; lastSeq?: number }[] = [];
  const factory = (): IClientWebSocket => {
    const socket: IMockSocket = {
      send: (data: string) => {
        sentByClient.push(
          JSON.parse(data) as { kind: string; lastSeq?: number },
        );
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

function openReadyClient() {
  const sockets = mockSocketFactory();
  const errors: { reason?: string }[] = [];
  const applied: unknown[] = [];
  const client = connect(
    'ws://localhost/x',
    'm1',
    { playerId: 'p1', token: 'tok' },
    { socketFactory: sockets.factory, reconnect: false },
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
