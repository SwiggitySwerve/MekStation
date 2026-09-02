/**
 * Per-connection backpressure (umbrella task 7.3).
 *
 * There is no queue of the server's own to bound: `send` hands the
 * payload to `ws`, which buffers it without limit. `bufferedAmount` IS
 * the queue, so the bound is a check on it — and before this, one
 * stalled client could grow the server's memory for the length of a
 * match while everybody else waited behind its `send`.
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import {
  MAX_BUFFERED_BYTES,
  ServerMatchBroadcaster,
} from '../ServerMatchBroadcaster';

function eventFrame(sequence: number): IServerMessage {
  return {
    kind: 'Event',
    matchId: 'match-bp',
    ts: new Date().toISOString(),
    event: { sequence },
  } as IServerMessage;
}

/** A socket whose outbound buffer the test controls. */
function bufferedSocket(bufferedAmount: number): IMatchSocket & {
  sent: string[];
  buffered: number;
} {
  const socket = {
    sent: [] as string[],
    buffered: bufferedAmount,
    send(data: string) {
      socket.sent.push(data);
    },
    close() {},
    readyState: 1,
    get bufferedAmount() {
      return socket.buffered;
    },
  };
  return socket;
}

describe('ServerMatchBroadcaster backpressure', () => {
  it('skips a saturated connection and keeps delivering to healthy ones', () => {
    // The requirement in one row: one slow consumer must not delay or
    // deny anybody else.
    const broadcaster = new ServerMatchBroadcaster();
    const slow = bufferedSocket(MAX_BUFFERED_BYTES + 1);
    const healthy = bufferedSocket(0);
    broadcaster.register(slow);
    broadcaster.register(healthy);

    broadcaster.broadcast(eventFrame(7));

    expect(slow.sent).toHaveLength(0);
    expect(broadcaster.isBehind(slow)).toBe(true);
    expect(healthy.sent).toHaveLength(1);
    expect(broadcaster.isBehind(healthy)).toBe(false);
  });

  it('keeps a behind connection behind even after its buffer drains', () => {
    // Resuming mid-stream would leave a HOLE in the connection's event
    // sequence, and a hole it does not know about is worse than a gap
    // it does. It stays behind until something replays it from its
    // cursor — which is what the lifecycle's reap sets up.
    const broadcaster = new ServerMatchBroadcaster();
    const slow = bufferedSocket(MAX_BUFFERED_BYTES + 1);
    broadcaster.register(slow);

    broadcaster.broadcast(eventFrame(7));
    slow.buffered = 0;
    broadcaster.broadcast(eventFrame(8));

    expect(slow.sent).toHaveLength(0);
    expect(broadcaster.isBehind(slow)).toBe(true);
    expect(broadcaster.behindSockets()).toEqual([slow]);
  });

  it('preserves the cursor at the last event the connection received', () => {
    // What a resynchronization resumes from. It must be what ARRIVED,
    // never what was attempted — a cursor one event ahead of reality
    // silently skips that event forever.
    const broadcaster = new ServerMatchBroadcaster();
    const socket = bufferedSocket(0);
    broadcaster.register(socket);

    broadcaster.broadcast(eventFrame(4));
    broadcaster.broadcast(eventFrame(5));
    socket.buffered = MAX_BUFFERED_BYTES + 1;
    broadcaster.broadcast(eventFrame(6));

    expect(broadcaster.deliveredCursor(socket)).toBe(5);
  });

  it('does not advance the cursor on unsequenced frames', () => {
    const broadcaster = new ServerMatchBroadcaster();
    const socket = bufferedSocket(0);
    broadcaster.register(socket);

    broadcaster.broadcast(eventFrame(4));
    broadcaster.broadcast({
      kind: 'Heartbeat',
      matchId: 'match-bp',
      ts: new Date().toISOString(),
    } as IServerMessage);

    expect(broadcaster.deliveredCursor(socket)).toBe(4);
  });

  it('treats a socket with no backpressure signal as healthy', () => {
    // Every test double in the suite lacks `bufferedAmount`. Reading
    // absent as saturated would disconnect all of them; reading it as
    // zero would be a lie. It is read as "no signal", i.e. healthy.
    const broadcaster = new ServerMatchBroadcaster();
    const socket = {
      sent: [] as string[],
      send(data: string) {
        socket.sent.push(data);
      },
      close() {},
      readyState: 1,
    };
    broadcaster.register(socket);

    broadcaster.broadcast(eventFrame(1));

    expect(socket.sent).toHaveLength(1);
    expect(broadcaster.isBehind(socket)).toBe(false);
  });

  it('keeps delivering when one socket throws on send', () => {
    // The `catch` in `broadcast` was pure optimistic-path code with no
    // test behind it. A socket that throws mid-fan-out - closed
    // underneath us, or a `ws` internal error - must not take the
    // event away from everyone iterated after it.
    const broadcaster = new ServerMatchBroadcaster();
    const first = bufferedSocket(0);
    const throwing = {
      send() {
        throw new Error('socket already closed');
      },
      close() {},
      readyState: 1,
      bufferedAmount: 0,
    };
    const last = bufferedSocket(0);
    broadcaster.register(first);
    broadcaster.register(throwing);
    broadcaster.register(last);

    expect(() => broadcaster.broadcast(eventFrame(3))).not.toThrow();

    expect(first.sent).toHaveLength(1);
    expect(last.sent).toHaveLength(1);
  });

  it('does not advance a cursor for a send that threw', () => {
    // The cursor is what ARRIVED. Recording a sequence whose send threw
    // would tell a later resynchronization to resume PAST an event the
    // connection never got - it would be skipped forever.
    const broadcaster = new ServerMatchBroadcaster();
    let failNext = false;
    const socket = {
      sent: [] as string[],
      send(data: string) {
        if (failNext) throw new Error('socket already closed');
        socket.sent.push(data);
      },
      close() {},
      readyState: 1,
      bufferedAmount: 0,
    };
    broadcaster.register(socket);

    broadcaster.broadcast(eventFrame(11));
    failNext = true;
    broadcaster.broadcast(eventFrame(12));

    expect(broadcaster.deliveredCursor(socket)).toBe(11);
  });

  it('forgets a connection entirely on unregister', () => {
    // Side-tables keyed by socket identity otherwise leak one row per
    // connection for the life of the match.
    const broadcaster = new ServerMatchBroadcaster();
    const socket = bufferedSocket(MAX_BUFFERED_BYTES + 1);
    broadcaster.register(socket);
    broadcaster.broadcast(eventFrame(1));
    expect(broadcaster.isBehind(socket)).toBe(true);

    broadcaster.unregister(socket);

    expect(broadcaster.isBehind(socket)).toBe(false);
    expect(broadcaster.deliveredCursor(socket)).toBeUndefined();
    expect(broadcaster.behindSockets()).toEqual([]);
  });
});

describe('ServerMatchBroadcaster saturation boundary', () => {
  it('treats a connection exactly at the cap as healthy', () => {
    // The bound is "passed the cap", not "reached it". At the boundary
    // the connection is still inside what the server tolerates, and a
    // `>=` here would cut off a client that never exceeded anything.
    const broadcaster = new ServerMatchBroadcaster();
    const atCap = bufferedSocket(MAX_BUFFERED_BYTES);
    const pastCap = bufferedSocket(MAX_BUFFERED_BYTES + 1);
    broadcaster.register(atCap);
    broadcaster.register(pastCap);

    broadcaster.broadcast(eventFrame(1));

    expect(broadcaster.isBehind(atCap)).toBe(false);
    expect(atCap.sent).toHaveLength(1);
    expect(broadcaster.isBehind(pastCap)).toBe(true);
    expect(pastCap.sent).toHaveLength(0);
  });
});
