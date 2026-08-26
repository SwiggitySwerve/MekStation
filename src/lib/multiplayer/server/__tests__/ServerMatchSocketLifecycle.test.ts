import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import {
  MAX_BUFFERED_BYTES,
  ServerMatchBroadcaster,
} from '../ServerMatchBroadcaster';
import { ServerMatchSocketLifecycle } from '../ServerMatchSocketLifecycle';

interface IRecordedSend {
  payload: string;
  parsed: IServerMessage;
}

function makeMockSocket(bufferedAmount = 0): IMatchSocket & {
  sent: IRecordedSend[];
  closeCount: number;
} {
  const sent: IRecordedSend[] = [];
  let closeCount = 0;

  return {
    // Saturated by default in the backpressure row below, healthy
    // everywhere else. Absent would read as "no signal", which is a
    // different case and is covered in the broadcaster's own suite.
    bufferedAmount,
    send(data: string) {
      sent.push({
        payload: data,
        parsed: JSON.parse(data) as IServerMessage,
      });
    },
    close() {
      closeCount += 1;
    },
    get readyState() {
      return closeCount > 0 ? 3 : 1;
    },
    sent,
    get closeCount() {
      return closeCount;
    },
  };
}

function makeLifecycle(onLastSocketDropped = jest.fn()): {
  broadcaster: ServerMatchBroadcaster;
  lifecycle: ServerMatchSocketLifecycle;
  onLastSocketDropped: jest.Mock;
} {
  const broadcaster = new ServerMatchBroadcaster();
  return {
    broadcaster,
    lifecycle: new ServerMatchSocketLifecycle({
      matchId: 'match-lifecycle',
      broadcaster,
      onLastSocketDropped,
    }),
    onLastSocketDropped,
  };
}

describe('ServerMatchSocketLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('attaches sockets, registers them for broadcast, and reattach does not leak heartbeat timers', () => {
    const { broadcaster, lifecycle } = makeLifecycle();
    const socket = makeMockSocket();

    lifecycle.attach(socket, 'p1');
    lifecycle.attach(socket, 'p1');

    expect(lifecycle.count()).toBe(1);
    broadcaster.broadcast({
      kind: 'MatchResumed',
      matchId: 'match-lifecycle',
      ts: '2026-04-29T00:00:00.000Z',
    });

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

    expect(socket.sent.map((send) => send.parsed.kind)).toEqual([
      'MatchResumed',
      'Heartbeat',
    ]);
  });

  it('detaches idempotently and removes the socket from broadcaster fan-out', () => {
    const { broadcaster, lifecycle, onLastSocketDropped } = makeLifecycle();
    const socket = makeMockSocket();

    lifecycle.attach(socket, 'p1');
    lifecycle.detach(socket);
    lifecycle.detach(socket);

    broadcaster.broadcast({
      kind: 'MatchResumed',
      matchId: 'match-lifecycle',
      ts: '2026-04-29T00:00:00.000Z',
    });

    expect(lifecycle.count()).toBe(0);
    expect(socket.closeCount).toBe(1);
    expect(socket.sent).toHaveLength(0);
    expect(onLastSocketDropped).toHaveBeenCalledTimes(1);
    expect(onLastSocketDropped).toHaveBeenCalledWith('p1');
  });

  it('fires the drop callback only when the last socket for a player detaches', () => {
    const { lifecycle, onLastSocketDropped } = makeLifecycle();
    const first = makeMockSocket();
    const second = makeMockSocket();

    lifecycle.attach(first, 'p1');
    lifecycle.attach(second, 'p1');

    lifecycle.detach(first);
    expect(onLastSocketDropped).not.toHaveBeenCalled();
    expect(lifecycle.count()).toBe(1);

    lifecycle.detach(second);
    expect(onLastSocketDropped).toHaveBeenCalledTimes(1);
    expect(onLastSocketDropped).toHaveBeenCalledWith('p1');
    expect(lifecycle.count()).toBe(0);
  });

  it('detaches idle sockets after the heartbeat timeout window', () => {
    const { lifecycle, onLastSocketDropped } = makeLifecycle();
    const socket = makeMockSocket();

    lifecycle.attach(socket, 'p1');

    jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS + HEARTBEAT_INTERVAL_MS + 1);

    expect(lifecycle.count()).toBe(0);
    expect(socket.closeCount).toBe(1);
    expect(onLastSocketDropped).toHaveBeenCalledWith('p1');
  });

  it('reaps a connection the broadcaster gave up on', () => {
    // A behind connection has been receiving nothing since it went
    // behind. Leaving it attached is the worst of both worlds - it
    // holds a seat and hears nothing - so the tick that reaps dead
    // sockets reaps this one too, and the client reconnects and
    // replays from its own cursor.
    const { broadcaster, lifecycle, onLastSocketDropped } = makeLifecycle();
    const socket = makeMockSocket(MAX_BUFFERED_BYTES + 1);

    lifecycle.attach(socket, 'p1');
    // Saturate it the way production does: through a real broadcast.
    broadcaster.broadcast({
      kind: 'Event',
      matchId: 'match-lifecycle',
      ts: new Date().toISOString(),
      event: { sequence: 1 },
    } as IServerMessage);
    expect(broadcaster.isBehind(socket)).toBe(true);

    // One tick, well inside the idle timeout: this is the backpressure
    // reap, not the idle reap.
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

    expect(lifecycle.count()).toBe(0);
    expect(socket.closeCount).toBe(1);
    expect(onLastSocketDropped).toHaveBeenCalledWith('p1');
  });

  it('survives indefinitely on the client heartbeat cadence alone', () => {
    // The two halves of the contract, joined. The row above proves ONE
    // refresh keeps a socket alive; this drives the cadence the client
    // actually sends at against the reaper for several timeout windows.
    // It is what binds the two constants together - set the client
    // interval above the server timeout and this reds, while every
    // other row here stays green.
    const { lifecycle, onLastSocketDropped } = makeLifecycle();
    const socket = makeMockSocket();

    lifecycle.attach(socket, 'p1');

    // Four full timeout windows of a player who is watching, not acting.
    const ticks = Math.ceil((HEARTBEAT_TIMEOUT_MS * 4) / HEARTBEAT_INTERVAL_MS);
    for (let i = 0; i < ticks; i += 1) {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      lifecycle.noteInbound(socket);
    }

    expect(lifecycle.count()).toBe(1);
    expect(socket.closeCount).toBe(0);
    expect(onLastSocketDropped).not.toHaveBeenCalled();
  });

  it('noteInbound refreshes the idle timer so active sockets are not detached', () => {
    const { lifecycle, onLastSocketDropped } = makeLifecycle();
    const socket = makeMockSocket();

    lifecycle.attach(socket, 'p1');

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
    lifecycle.noteInbound(socket);
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

    expect(lifecycle.count()).toBe(1);
    expect(socket.closeCount).toBe(0);
    expect(onLastSocketDropped).not.toHaveBeenCalled();
  });
});
