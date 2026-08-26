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
