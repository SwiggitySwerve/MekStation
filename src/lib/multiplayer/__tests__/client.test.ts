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
  id = `evt-${sequence}`,
): void {
  f.lastSocket().inject({
    kind: 'Event',
    matchId: 'm1',
    ts: new Date().toISOString(),
    event: { sequence, type: 'phase_changed', id },
  });
}

/** Every `intentId` this socket has been asked to send, in order. */
function intentIdsOn(socket: { sentRaw: string[] }): (string | undefined)[] {
  return socket.sentRaw
    .map((raw) => JSON.parse(raw) as { kind: string; intentId?: string })
    .filter((frame) => frame.kind === 'Intent')
    .map((frame) => frame.intentId);
}

function nowIsoForTest(): string {
  return new Date().toISOString();
}

/** Opens and closes an empty replay window so live traffic applies. */
function finishReplay(f: {
  lastSocket: () => { inject: (m: unknown) => void };
}): void {
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

  it('retries an unanswered intent with the same identity after a reconnect', () => {
    // The scenario the identity exists for: the connection drops after
    // submission and before any receipt. The player's command must not
    // be silently lost, and the retry must carry the ORIGINAL id - a
    // fresh one would let the server apply the same command twice if
    // the first attempt did land before the socket died.
    const f = makeMockSocketFactory();
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory },
    );
    f.lastSocket().fireOpen();
    f.lastSocket().sentRaw.length = 0;
    client.send({ kind: 'AdvancePhase' } as never);
    const sentId = intentIdsOn(f.lastSocket())[0];
    expect(typeof sentId).toBe('string');

    // The socket dies before any receipt, and the client reconnects.
    f.lastSocket().fireClose();
    jest.advanceTimersByTime(60_000);
    expect(f.socketsCreated).toBe(2);
    f.lastSocket().fireOpen();
    f.lastSocket().sentRaw.length = 0;
    finishReplay(f);

    expect(intentIdsOn(f.lastSocket())).toEqual([sentId]);
  });

  it('does not retry an intent the server already answered', () => {
    // The control, and the reason clearing has to be keyed on the id:
    // re-sending a command that was already committed is exactly the
    // double-apply the identity is meant to prevent. A retry rule that
    // fired for everything would pass the row above and break this.
    const f = makeMockSocketFactory();
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory },
    );
    f.lastSocket().fireOpen();
    finishReplay(f);
    f.lastSocket().sentRaw.length = 0;
    client.send({ kind: 'AdvancePhase' } as never);
    const sentId = intentIdsOn(f.lastSocket())[0];

    // The server commits it, stamping the id onto the produced event -
    // which is how the client learns the attempt reached authority.
    f.lastSocket().inject({
      kind: 'Event',
      matchId: 'm1',
      ts: nowIsoForTest(),
      event: {
        type: 'phase_changed',
        sequence: 1,
        payload: { intentId: sentId },
      },
    });

    f.lastSocket().fireClose();
    jest.advanceTimersByTime(60_000);
    f.lastSocket().fireOpen();
    f.lastSocket().sentRaw.length = 0;
    finishReplay(f);

    expect(intentIdsOn(f.lastSocket())).toEqual([]);
  });

  it('stamps every intent with an identity the server can dedupe on', () => {
    // The server's replay-attack protection is `intentId`-shaped: it
    // keeps a bounded set of accepted ids and refuses a repeat with
    // DUPLICATE_INTENT. The field is optional on the schema for pre-M2
    // clients, and the server SKIPS the duplicate check entirely when it
    // is absent — so an unstamped intent is not merely unlabelled, it is
    // exempt from replay protection. Protocol.ts asserts "the M2 client
    // always stamps one", and that is the claim under test.
    const f = makeMockSocketFactory();
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();
    f.lastSocket().sentRaw.length = 0;

    client.send({ kind: 'AdvancePhase' } as never);

    const intents = f
      .lastSocket()
      .sentRaw.map(
        (raw) => JSON.parse(raw) as { kind: string; intentId?: string },
      )
      .filter((frame) => frame.kind === 'Intent');
    expect(intents).toHaveLength(1);
    expect(typeof intents[0]?.intentId).toBe('string');
    expect(intents[0]?.intentId ?? '').not.toHaveLength(0);
  });

  it('gives a different identity to each distinct intent', () => {
    // The control. A constant id would satisfy the row above and be
    // worse than none: the server would refuse the player's SECOND
    // command of the match as a replay.
    const f = makeMockSocketFactory();
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();
    f.lastSocket().sentRaw.length = 0;

    client.send({ kind: 'AdvancePhase' } as never);
    client.send({ kind: 'AdvancePhase' } as never);

    const ids = f
      .lastSocket()
      .sentRaw.map(
        (raw) => JSON.parse(raw) as { kind: string; intentId?: string },
      )
      .filter((frame) => frame.kind === 'Intent')
      .map((frame) => frame.intentId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('gives up on a server that has gone silent', () => {
    // The other half of the bidirectional heartbeat. The client sends
    // its own keepalives, but nothing was watching for the SERVER going
    // quiet — the inbound Heartbeat handler said in as many words that
    // clients do not need to echo, and then did nothing with it. A
    // half-open socket looks exactly like a healthy idle one from here,
    // so the client sat in a dead connection indefinitely instead of
    // reconnecting into a live one.
    const f = makeMockSocketFactory();
    connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();

    jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS + 1);

    expect(f.lastSocket().readyState).toBe(3);
  });

  it('stays connected while the server is still talking', () => {
    // The control. A liveness deadline that fires regardless of traffic
    // would pass the row above by closing every connection on a timer.
    const f = makeMockSocketFactory();
    connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();

    // Valid inbound traffic, spaced inside the deadline, well past the
    // point where silence alone would have closed the socket.
    for (let tick = 0; tick < 4; tick += 1) {
      jest.advanceTimersByTime(Math.floor(HEARTBEAT_TIMEOUT_MS / 2));
      f.lastSocket().inject({
        kind: 'Heartbeat',
        matchId: 'm1',
        ts: new Date().toISOString(),
      });
    }

    expect(f.lastSocket().readyState).toBe(1);
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

  it('applies an event that skips a sequence, because sparse is normal', () => {
    // A fog-of-war viewer's stream is LEGITIMATELY sparse - the server
    // filters each event per recipient and skips the send entirely when
    // it is not visible to them, keeping the authority sequence on
    // everything else. Treating the next arrival as a "gap" and holding
    // it would stall such a client permanently, because the sequence it
    // is waiting for is one it is never allowed to see.
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
    finishReplay(f);
    applied.length = 0;

    liveEvent(f, 0);
    liveEvent(f, 1);
    // 2 is filtered out for this viewer and never sent.
    liveEvent(f, 3);

    expect(seqOf(applied)).toEqual([0, 1, 3]);
    expect(client.lastSeq()).toBe(3);
  });

  it('does not re-apply a sequence that arrives after a later one', () => {
    // There is no reordering buffer, and there should not be: a single
    // WebSocket delivers in order, so a lower sequence arriving after a
    // higher one is a REDELIVERY rather than a reorder. Applying it
    // again would double-apply the event.
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
    finishReplay(f);
    applied.length = 0;

    liveEvent(f, 0);
    liveEvent(f, 2);
    liveEvent(f, 1);

    expect(seqOf(applied)).toEqual([0, 2]);
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

  it('blocks the stream when two different events claim one sequence', () => {
    // A repeat of a sequence is ordinary at-least-once traffic. A
    // DIFFERENT event under the same sequence is not - it means the
    // stream forked, and quietly ignoring the second would hide the
    // fork rather than report it.
    const f = makeMockSocketFactory();
    const applied: unknown[] = [];
    const errors: unknown[] = [];
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => applied.push(e));
    client.on('error', (e) => errors.push(e));
    f.lastSocket().fireOpen();
    finishReplay(f);
    applied.length = 0;

    liveEvent(f, 0, 'evt-0');
    liveEvent(f, 0, 'evt-0-forked');
    liveEvent(f, 1, 'evt-1');

    expect(errors).toContainEqual(
      expect.objectContaining({ reason: 'sequence-collision' }),
    );
    // Nothing after the collision is applied: the fork means the rest
    // of the stream cannot be trusted.
    expect(seqOf(applied)).toEqual([0]);
  });

  it('treats an identical repeat as a duplicate, not a collision', () => {
    // The control. Without it, "blocks on collision" would pass equally
    // against a client that blocked on every duplicate - which would
    // take down a healthy session on ordinary redelivery.
    const f = makeMockSocketFactory();
    const applied: unknown[] = [];
    const errors: unknown[] = [];
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    client.on('event', (e) => applied.push(e));
    client.on('error', (e) => errors.push(e));
    f.lastSocket().fireOpen();
    finishReplay(f);
    applied.length = 0;

    liveEvent(f, 0, 'evt-0');
    liveEvent(f, 0, 'evt-0');
    liveEvent(f, 1, 'evt-1');

    expect(errors).toHaveLength(0);
    expect(seqOf(applied)).toEqual([0, 1]);
  });

  it('advances through a replay chunk that skips a sequence', () => {
    // Replay is fog-filtered per viewer for the same reason live
    // traffic is, so it is sparse for the same reason and no
    // contiguity can be asserted on it either.
    const f = makeMockSocketFactory();
    const client = connect(
      'ws://localhost/x',
      'm1',
      { playerId: 'p1', token: 'tok' },
      { socketFactory: f.factory, reconnect: false },
    );
    f.lastSocket().fireOpen();
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
        { sequence: 0, type: 'phase_changed', id: 'r0' },
        { sequence: 2, type: 'phase_changed', id: 'r2' },
      ],
    });

    expect(client.lastSeq()).toBe(2);
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
