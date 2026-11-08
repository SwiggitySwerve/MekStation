import type { ISyncRoom, SyncEvent, SyncEventListener } from '../types';

import { ConnectionState } from '../types';
import { useSyncRoomStore } from '../useSyncRoomStore';

let listener: SyncEventListener | null = null;
const leaveCurrentRoom = jest.fn();

function makeRoom(roomCode: string): ISyncRoom {
  return {
    roomCode,
    createdAt: '2026-11-08T00:00:00.000Z',
  } as unknown as ISyncRoom;
}

jest.mock('../SyncProvider', () => ({
  createSyncRoom: jest.fn((options?: { roomCode?: string }) =>
    makeRoom(options?.roomCode ?? 'ROOM01'),
  ),
  joinSyncRoom: jest.fn((roomCode: string) => makeRoom(roomCode)),
  leaveCurrentRoom: (...args: unknown[]) => leaveCurrentRoom(...args),
  getLocalPeerId: jest.fn(() => 'peer-local'),
  setLocalAwareness: jest.fn(),
  onSyncEvent: jest.fn((next: SyncEventListener) => {
    listener = next;
    return () => undefined;
  }),
}));

function emit(event: SyncEvent): void {
  if (!listener) throw new Error('store never subscribed to sync events');
  listener(event);
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useSyncRoomStore', () => {
  beforeEach(async () => {
    leaveCurrentRoom.mockClear();
    useSyncRoomStore.setState({
      activeRoom: null,
      connectionState: ConnectionState.Disconnected,
      peers: [],
      error: null,
      localPeerId: null,
    });
    // First call subscribes to provider events and loads the module.
    await useSyncRoomStore.getState().createRoom({ roomCode: 'ROOM01' });
  });

  it('keeps the room and shows Connecting while the provider retries', () => {
    emit({ type: 'connected', roomCode: 'ROOM01' });
    expect(useSyncRoomStore.getState().connectionState).toBe(
      ConnectionState.Connected,
    );

    emit({
      type: 'reconnecting',
      attempt: 1,
      maxAttempts: 5,
      delayMs: 1000,
    });

    const state = useSyncRoomStore.getState();
    expect(state.connectionState).toBe(ConnectionState.Connecting);
    expect(state.activeRoom?.roomCode).toBe('ROOM01');
    expect(state.error).toBeNull();
  });

  it('still surfaces an exhausted retry as an error', () => {
    emit({ type: 'error', message: 'Connection failed after 5 attempts.' });

    expect(useSyncRoomStore.getState()).toMatchObject({
      connectionState: ConnectionState.Error,
      error: 'Connection failed after 5 attempts.',
    });
  });

  it('never reads Connected when there is no active room', () => {
    useSyncRoomStore.setState({
      activeRoom: null,
      connectionState: ConnectionState.Disconnected,
    });

    emit({ type: 'connected', roomCode: 'ROOM01' });

    expect(useSyncRoomStore.getState().connectionState).toBe(
      ConnectionState.Disconnected,
    );
  });

  it('ignores a connected event for a room other than the active one', () => {
    emit({ type: 'connected', roomCode: 'OTHER1' });

    expect(useSyncRoomStore.getState().connectionState).toBe(
      ConnectionState.Connecting,
    );
  });

  it('leaves the provider room even after the store lost its activeRoom', async () => {
    useSyncRoomStore.setState({ activeRoom: null });

    useSyncRoomStore.getState().leaveRoom();
    await flush();

    expect(leaveCurrentRoom).toHaveBeenCalledTimes(1);
  });

  it('leaves the provider room when the store still has it', async () => {
    useSyncRoomStore.getState().leaveRoom();
    await flush();

    expect(leaveCurrentRoom).toHaveBeenCalledTimes(1);
    expect(useSyncRoomStore.getState()).toMatchObject({
      activeRoom: null,
      connectionState: ConnectionState.Disconnected,
    });
  });
});
