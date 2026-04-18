/**
 * Multiplayer client wrapper tests.
 *
 * Verifies:
 *   - SessionJoin sent on open
 *   - Replay buffering (events between ReplayStart and ReplayEnd are
 *     drained as `event` callbacks AFTER `ready` fires)
 *   - Live events arriving during replay are queued, then flushed
 *   - Reconnect schedules with exponential backoff
 */

import { connect, type IClientWebSocket } from '../client';

// Stand-in for `setTimeout` we can drive deterministically.
jest.useFakeTimers();

interface IMockSocket extends IClientWebSocket {
  inject(message: unknown): void;
  fireOpen(): void;
  fireClose(): void;
  sentRaw: string[];
}

function makeMockSocketFactory(): {
  factory: (url: string) => IClientWebSocket;
  lastSocket: () => IMockSocket;
  socketsCreated: number;
} {
  const sockets: IMockSocket[] = [];

  const factory = (_url: string): IClientWebSocket => {
    const sentRaw: string[] = [];
    const socket: IMockSocket = {
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      sentRaw,
      send(data: string) {
        sentRaw.push(data);
      },
      close() {
        socket.readyState = 3;
        socket.onclose?.({});
      },
      inject(message: unknown) {
        socket.onmessage?.({ data: JSON.stringify(message) });
      },
      fireOpen() {
        socket.onopen?.({});
      },
      fireClose() {
        socket.onclose?.({});
      },
    };
    sockets.push(socket);
    return socket;
  };

  return {
    factory,
    lastSocket: () => sockets[sockets.length - 1],
    get socketsCreated() {
      return sockets.length;
    },
  };
}

describe('multiplayer client', () => {
  it('sends SessionJoin on open', () => {
    const f = makeMockSocketFactory();
    connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      {
        socketFactory: f.factory,
        reconnect: false,
      },
    );
    f.lastSocket().fireOpen();
    expect(f.lastSocket().sentRaw.length).toBe(1);
    const sent = JSON.parse(f.lastSocket().sentRaw[0]) as {
      kind: string;
      matchId: string;
      playerId: string;
      token: string;
    };
    expect(sent.kind).toBe('SessionJoin');
    expect(sent.matchId).toBe('m1');
    expect(sent.playerId).toBe('p1');
    expect(sent.token).toBe('tok');
  });

  it('buffers events during replay and fires ready then drains', () => {
    const f = makeMockSocketFactory();
    const events: unknown[] = [];
    let readyFired = false;

    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => events.push(e));
    client.on('ready', () => {
      readyFired = true;
    });

    f.lastSocket().fireOpen();

    // Server sends a replay batch.
    f.lastSocket().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: new Date().toISOString(),
      fromSeq: 0,
      totalEvents: 2,
    });
    f.lastSocket().inject({
      kind: 'ReplayChunk',
      matchId: 'm1',
      ts: new Date().toISOString(),
      events: [
        { id: 'a', sequence: 0 },
        { id: 'b', sequence: 1 },
      ],
    });
    // No events yet — they're buffered until ReplayEnd.
    expect(events.length).toBe(0);
    expect(readyFired).toBe(false);

    f.lastSocket().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: new Date().toISOString(),
      toSeq: 1,
    });
    expect(readyFired).toBe(true);
    expect(events.length).toBe(2);

    // A live event after ready fires immediately.
    f.lastSocket().inject({
      kind: 'Event',
      matchId: 'm1',
      ts: new Date().toISOString(),
      event: { id: 'c', sequence: 2 },
    });
    expect(events.length).toBe(3);
    expect(client.lastSeq()).toBe(2);
    expect(client.isReady()).toBe(true);
  });

  it('queues live events that arrive during replay and flushes after ready', () => {
    const f = makeMockSocketFactory();
    const events: unknown[] = [];

    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => events.push(e));

    f.lastSocket().fireOpen();
    f.lastSocket().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: new Date().toISOString(),
      fromSeq: 0,
      totalEvents: 0,
    });
    // A live event arrives BEFORE ReplayEnd.
    f.lastSocket().inject({
      kind: 'Event',
      matchId: 'm1',
      ts: new Date().toISOString(),
      event: { id: 'live-1', sequence: 0 },
    });
    expect(events.length).toBe(0);
    f.lastSocket().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: new Date().toISOString(),
      toSeq: 0,
    });
    expect(events.length).toBe(1);
  });

  it('schedules a reconnect on close (exponential backoff)', () => {
    const f = makeMockSocketFactory();
    const reconnectAttempts: { attempt: number; delayMs: number }[] = [];

    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: true },
    );
    client.on('reconnect', (info) =>
      reconnectAttempts.push(info as { attempt: number; delayMs: number }),
    );

    f.lastSocket().fireOpen();
    f.lastSocket().fireClose();

    expect(reconnectAttempts.length).toBe(1);
    expect(reconnectAttempts[0].attempt).toBe(1);
    expect(reconnectAttempts[0].delayMs).toBeGreaterThanOrEqual(500);

    // Advance the timer to trigger reconnect.
    jest.advanceTimersByTime(reconnectAttempts[0].delayMs);
    expect(f.socketsCreated).toBe(2);

    // Caller-initiated close should NOT schedule another reconnect.
    client.close();
    expect(reconnectAttempts.length).toBe(1);
  });

  it('does not reconnect when reconnect option is false', () => {
    const f = makeMockSocketFactory();
    const reconnectAttempts: unknown[] = [];

    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('reconnect', (info) => reconnectAttempts.push(info));

    f.lastSocket().fireOpen();
    f.lastSocket().fireClose();
    expect(reconnectAttempts.length).toBe(0);
  });
});
