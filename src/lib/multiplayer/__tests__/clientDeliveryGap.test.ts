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
} {
  const sockets: IMockSocket[] = [];
  const factory = (): IClientWebSocket => {
    const socket: IMockSocket = {
      send: () => {},
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
  return { factory, last: () => sockets[sockets.length - 1] };
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
  return { sockets, errors, applied };
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
