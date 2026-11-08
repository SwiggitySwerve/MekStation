/**
 * SyncProvider retry behavior against the REAL y-webrtc provider
 * (`signalingServers: []` keeps it off the network). Only y-indexeddb is
 * stubbed: persistence is not the subject and fake-indexeddb leaks handles.
 *
 * y-webrtc 10.3.0 emits `status {connected:false}` only from an explicit
 * `disconnect()` call (see yWebrtcContract.test.ts), so the retry's only
 * triggers are (a) our own teardown and (b) an external `disconnect()`.
 */

import type { SyncEvent } from '../types';

import {
  cancelReconnect,
  createSyncRoom,
  getActiveRoom,
  getRetryState,
  leaveCurrentRoom,
  onSyncEvent,
} from '../SyncProvider';
import { P2P_CONFIG } from '../types';

jest.mock('y-indexeddb', () => ({
  IndexeddbPersistence: class {
    destroy(): void {}
  },
}));

const MAX_RETRY_DELAY_MS = 40_000;

function collectEvents(): { events: SyncEvent[]; stop: () => void } {
  const events: SyncEvent[] = [];
  const stop = onSyncEvent((event) => events.push(event));
  return { events, stop };
}

async function openRoom(roomCode: string) {
  const room = createSyncRoom({ roomCode, signalingServers: [] });
  // The provider opens its room after an async key derivation; status
  // events only flow once it has.
  await jest.advanceTimersByTimeAsync(0);
  return room;
}

describe('SyncProvider retry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    leaveCurrentRoom();
    cancelReconnect();
    jest.useRealTimers();
  });

  it('does not schedule or run a retry when the user leaves the room', async () => {
    const { events, stop } = collectEvents();
    await openRoom('LEAVE1');

    leaveCurrentRoom();
    await jest.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS * 2);
    stop();

    expect(getRetryState().isRetrying).toBe(false);
    expect(getActiveRoom()).toBeNull();
    expect(
      events.filter((e) => e.type === 'error' || e.type === 'reconnecting'),
    ).toEqual([]);
  });

  it('cancels a pending retry when the user leaves while it is waiting', async () => {
    const room = await openRoom('PENDL1');
    room.webrtcProvider.disconnect();
    expect(getRetryState().isRetrying).toBe(true);
    const { events, stop } = collectEvents();

    leaveCurrentRoom();
    expect(getRetryState().isRetrying).toBe(false);
    await jest.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS * 2);
    stop();

    expect(getActiveRoom()).toBeNull();
    expect(events.map((e) => e.type)).toEqual(['disconnected']);
  });

  it('does not revive a previous room after switching to another room', async () => {
    const { events, stop } = collectEvents();
    await openRoom('OLDRM1');
    const next = await openRoom('NEWRM1');

    await jest.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS * 2);
    stop();

    expect(getActiveRoom()).toBe(next);
    expect(getActiveRoom()?.roomCode).toBe('NEWRM1');
    expect(
      events.filter((e) => e.type === 'error' || e.type === 'reconnecting'),
    ).toEqual([]);
  });

  it('reconnects the same room object on retry without a disconnected event', async () => {
    const room = await openRoom('REUSE1');
    const { events, stop } = collectEvents();

    // External drop: the only way y-webrtc reports status false.
    room.webrtcProvider.disconnect();
    expect(getRetryState()).toMatchObject({ isRetrying: true, attempts: 1 });
    await jest.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS);
    stop();

    expect(getActiveRoom()).toBe(room);
    expect(room.webrtcProvider.connected).toBe(true);
    expect(getRetryState().isRetrying).toBe(false);
    expect(events.map((e) => e.type)).not.toContain('disconnected');
  });

  it('reports a retry as reconnecting, not as an error', async () => {
    const room = await openRoom('RECON1');
    const { events, stop } = collectEvents();

    room.webrtcProvider.disconnect();
    stop();

    expect(events).toEqual([
      expect.objectContaining({
        type: 'reconnecting',
        attempt: 1,
        maxAttempts: P2P_CONFIG.maxReconnectAttempts,
      }),
    ]);
  });

  it('emits an error and resets the retry state once attempts are exhausted', async () => {
    const room = await openRoom('EXHST1');
    const { events, stop } = collectEvents();

    for (let i = 0; i < P2P_CONFIG.maxReconnectAttempts; i++) {
      room.webrtcProvider.disconnect();
      await jest.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS);
    }
    room.webrtcProvider.disconnect();
    stop();

    const errors = events.filter((e) => e.type === 'error');
    expect(errors).toHaveLength(1);
    expect(getRetryState()).toMatchObject({ isRetrying: false, attempts: 0 });
  });

  it('abandons a pending retry when the room is replaced before the timer fires', async () => {
    const first = await openRoom('STALE1');
    first.webrtcProvider.disconnect();
    expect(getRetryState().isRetrying).toBe(true);

    const second = await openRoom('STALE2');
    // Cancelled at replacement time, not merely ignored when the timer fires.
    expect(getRetryState().isRetrying).toBe(false);
    await jest.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS);

    expect(getRetryState().isRetrying).toBe(false);
    expect(getActiveRoom()).toBe(second);
    expect(first.webrtcProvider.connected).toBe(false);
  });
});
