import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { ServerMatchBroadcaster } from '../ServerMatchBroadcaster';
import { ServerMatchSocketLifecycle } from '../ServerMatchSocketLifecycle';

interface IRecordedSend {
  payload: string;
  parsed: IServerMessage;
}

function makeMockSocket(): IMatchSocket & {
  sent: IRecordedSend[];
  closeCount: number;
} {
  const sent: IRecordedSend[] = [];
  let closeCount = 0;

  return {
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
