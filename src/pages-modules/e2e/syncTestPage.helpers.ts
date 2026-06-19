import type { TestItem } from '@/components/pages/e2e/SyncTestPage.components';

import {
  cancelMockReconnect,
  createMockSyncRoom,
  getMockActiveRoom,
  getMockConnectedPeerCount,
  getMockConnectionState,
  getMockLocalPeerId,
  getMockRetryState,
  getMockYMap,
  joinMockSyncRoom,
  leaveMockCurrentRoom,
  onMockSyncEvent,
} from '@/lib/p2p/MockSyncProvider';
import {
  cancelReconnect,
  createSyncRoom,
  getActiveRoom,
  getConnectedPeerCount,
  getConnectionState,
  getLocalPeerId,
  getRetryState,
  getYMap,
  joinSyncRoom,
  leaveCurrentRoom,
  onSyncEvent,
} from '@/lib/p2p/SyncProvider';

type SyncProviders = {
  readonly createRoom: typeof createSyncRoom;
  readonly joinRoom: typeof joinSyncRoom;
  readonly leaveRoom: typeof leaveCurrentRoom;
  readonly getState: typeof getConnectionState;
  readonly getPeerCount: typeof getConnectedPeerCount;
  readonly getRoom: typeof getActiveRoom;
  readonly onEvent: typeof onSyncEvent;
  readonly getPeerId: typeof getLocalPeerId;
  readonly getMap: typeof getYMap;
  readonly cancelRetry: typeof cancelReconnect;
  readonly getRetry: typeof getRetryState;
};

export function createSyncTestProviders(useMock: boolean): SyncProviders {
  if (!useMock) {
    return {
      createRoom: createSyncRoom,
      joinRoom: joinSyncRoom,
      leaveRoom: leaveCurrentRoom,
      getState: getConnectionState,
      getPeerCount: getConnectedPeerCount,
      getRoom: getActiveRoom,
      onEvent: onSyncEvent,
      getPeerId: getLocalPeerId,
      getMap: getYMap,
      cancelRetry: cancelReconnect,
      getRetry: getRetryState,
    };
  }

  return {
    createRoom: createMockSyncRoom,
    joinRoom: joinMockSyncRoom,
    leaveRoom: leaveMockCurrentRoom,
    getState: getMockConnectionState,
    getPeerCount: getMockConnectedPeerCount,
    getRoom: getMockActiveRoom,
    onEvent: onMockSyncEvent,
    getPeerId: getMockLocalPeerId,
    getMap: getMockYMap,
    cancelRetry: cancelMockReconnect,
    getRetry: getMockRetryState,
  };
}

export function readSyncedTestItems(yMap: {
  forEach(callback: (value: TestItem, key: string) => void): void;
}): Record<string, TestItem> {
  const items: Record<string, TestItem> = {};
  yMap.forEach((value, key) => {
    items[key] = value;
  });
  return items;
}
