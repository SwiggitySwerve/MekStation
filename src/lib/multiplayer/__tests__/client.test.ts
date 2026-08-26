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

import { HEARTBEAT_TIMEOUT_MS } from '@/types/multiplayer/Protocol';

import { connect, type IClientWebSocket } from '../client';
import { credentialProtocols } from '../socketCredentialProtocol';

// Stand-in for `setTimeout` we can drive deterministically.
jest.useFakeTimers();

interface IMockSocket extends IClientWebSocket {
  inject(message: unknown): void;
  fireOpen(): void;
  fireClose(): void;
  sentRaw: string[];
}

function makeMockSocketFactory(): {
  factory: (url: string, protocols?: string[]) => IClientWebSocket;
  lastSocket: () => IMockSocket;
  socketsCreated: number;
  readonly urls: string[];
  readonly offered: (string[] | undefined)[];
} {
  const sockets: IMockSocket[] = [];
  const urls: string[] = [];
  const offered: (string[] | undefined)[] = [];

  const factory = (_url: string, protocols?: string[]): IClientWebSocket => {
    urls.push(_url);
    offered.push(protocols);
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
    urls,
    offered,
    lastSocket: () => sockets[sockets.length - 1],
    get socketsCreated() {
      return sockets.length;
    },
  };
}

function liveEvent(
  f: { lastSocket: () => { inject: (m: unknown) => void } },
  sequence: number,
): void {
  f.lastSocket().inject({
    kind: 'Event',
    matchId: 'm1',
    ts: new Date().toISOString(),
    event: { sequence, type: 'phase_changed' },
  });
}

function seqOf(events: readonly unknown[]): number[] {
  return events.map((e) => (e as { sequence: number }).sequence);
}

describe('multiplayer client', () => {
  it('keeps the credential out of the socket URL', () => {
    // A query string is the worst place for a bearer token: it lands in
    // access logs, proxy logs, and crash reports, none of which expect
    // to hold secrets. The subprotocol header is a real header.
    const f = makeMockSocketFactory();
    connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );

    expect(f.urls[0]).toContain('matchId=m1');
    expect(f.urls[0]).not.toContain('token=');
    expect(f.urls[0]).not.toContain('tok');
    expect(f.offered[0]).toEqual(credentialProtocols('tok'));
  });

  it('keeps a quiet session alive by sending heartbeats', () => {
    // The server reaps a socket after HEARTBEAT_TIMEOUT_MS of silence,
    // and `lastInboundAt` only moves on INBOUND traffic. A player who
    // is watching rather than acting - a spectator, or anyone waiting
    // out an opponent's turn - sends nothing, so a healthy connection
    // was being closed for being quiet.
    const f = makeMockSocketFactory();
    connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();
    f.lastSocket().sentRaw.length = 0;

    jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS);

    const kinds = f
      .lastSocket()
      .sentRaw.map((raw) => (JSON.parse(raw) as { kind: string }).kind);
    expect(kinds).toContain('Heartbeat');
    // At the server's own interval, comfortably inside its timeout.
    expect(kinds.filter((kind) => kind === 'Heartbeat').length).toBeGreaterThan(
      1,
    );
  });

  it('stops heartbeating once the caller closes the client', () => {
    // A timer that outlives the socket keeps the process alive and
    // writes to a closed socket forever.
    const f = makeMockSocketFactory();
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();
    client.close();
    f.lastSocket().sentRaw.length = 0;

    jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS);

    expect(f.lastSocket().sentRaw).toHaveLength(0);
  });

  it('does not apply a live event that leaves a gap', async () => {
    // The client applied whatever arrived and moved its cursor to the
    // highest sequence it had seen. A dropped frame therefore did not
    // just delay an event, it LOST it: the cursor had already advanced
    // past the missing sequence, so the reconnect replay resumed after
    // it and nobody ever noticed.
    const f = makeMockSocketFactory();
    const applied: unknown[] = [];
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => applied.push(e));
    f.lastSocket().fireOpen();
    f.lastSocket().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: new Date().toISOString(),
      fromSeq: 0,
      totalEvents: 0,
    });
    f.lastSocket().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: new Date().toISOString(),
      toSeq: 0,
    });
    applied.length = 0;

    liveEvent(f, 0);
    liveEvent(f, 1);
    // 2 never arrives.
    liveEvent(f, 3);

    expect(seqOf(applied)).toEqual([0, 1]);
    // The cursor must NOT have jumped the gap - it is what a reconnect
    // resumes from, and resuming at 3 would skip 2 permanently.
    expect(client.lastSeq()).toBe(1);
  });

  it('applies a buffered event once the gap is filled', async () => {
    // Holding it rather than dropping it: the missing frame usually
    // arrives moments later, and re-fetching the whole tail for a
    // momentary reorder would be a heavy answer to a light problem.
    const f = makeMockSocketFactory();
    const applied: unknown[] = [];
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => applied.push(e));
    f.lastSocket().fireOpen();
    f.lastSocket().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: new Date().toISOString(),
      fromSeq: 0,
      totalEvents: 0,
    });
    f.lastSocket().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: new Date().toISOString(),
      toSeq: 0,
    });
    applied.length = 0;

    liveEvent(f, 0);
    liveEvent(f, 2);
    liveEvent(f, 1);

    // In SEQUENCE order, not arrival order.
    expect(seqOf(applied)).toEqual([0, 1, 2]);
    expect(client.lastSeq()).toBe(2);
  });

  it('ignores a live event the client has already applied', async () => {
    // At-least-once delivery means a duplicate is normal traffic, not
    // an error. Applying it twice is what a contiguity check is
    // supposed to prevent.
    const f = makeMockSocketFactory();
    const applied: unknown[] = [];
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => applied.push(e));
    f.lastSocket().fireOpen();
    f.lastSocket().inject({
      kind: 'ReplayStart',
      matchId: 'm1',
      ts: new Date().toISOString(),
      fromSeq: 0,
      totalEvents: 0,
    });
    f.lastSocket().inject({
      kind: 'ReplayEnd',
      matchId: 'm1',
      ts: new Date().toISOString(),
      toSeq: 0,
    });
    applied.length = 0;

    liveEvent(f, 0);
    liveEvent(f, 0);
    liveEvent(f, 1);

    expect(seqOf(applied)).toEqual([0, 1]);
  });

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

  it('treats a server Close envelope as terminal and does not reconnect', () => {
    const f = makeMockSocketFactory();
    const reconnectAttempts: unknown[] = [];
    const closeEvents: unknown[] = [];

    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: true },
    );
    client.on('reconnect', (info) => reconnectAttempts.push(info));
    client.on('close', (info) => closeEvents.push(info));

    f.lastSocket().fireOpen();
    f.lastSocket().inject({
      kind: 'Close',
      matchId: 'm1',
      ts: new Date().toISOString(),
      code: 'INTERNAL_ERROR',
      reason: 'runtime-unavailable',
    });

    expect(closeEvents).toEqual([
      {
        code: 'INTERNAL_ERROR',
        reason: 'runtime-unavailable',
      },
    ]);
    expect(reconnectAttempts).toHaveLength(0);
    expect(f.socketsCreated).toBe(1);
    client.close();
  });

  it('emits a terminal close when reconnect attempts exceed the configured bound', () => {
    const f = makeMockSocketFactory();
    const reconnectAttempts: unknown[] = [];
    const closeEvents: unknown[] = [];

    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      {
        socketFactory: f.factory,
        reconnect: true,
        maxReconnectAttempts: 1,
      },
    );
    client.on('reconnect', (info) => reconnectAttempts.push(info));
    client.on('close', (info) => closeEvents.push(info));

    f.lastSocket().fireClose();
    expect(reconnectAttempts).toHaveLength(1);
    jest.advanceTimersByTime(
      (reconnectAttempts[0] as { delayMs: number }).delayMs,
    );
    f.lastSocket().fireClose();

    expect(closeEvents).toContainEqual({
      code: 'RECONNECT_LIMIT',
      reason: 'Unable to reconnect to multiplayer session',
    });
  });
});
