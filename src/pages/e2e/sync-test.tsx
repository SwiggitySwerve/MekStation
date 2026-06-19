/**
 * E2E Test Harness for P2P Sync
 *
 * This page exposes sync functionality for automated Playwright testing.
 * Only available in development/test environments.
 *
 * Uses mock sync provider when ?mockSync=true is in URL (for reliable E2E tests).
 *
 * @internal For E2E testing only
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

import {
  ConnectionSection,
  EventLogSection,
  NotAvailable,
  RoomControlsSection,
  SyncedItemsSection,
  type TestItem,
} from '@/components/pages/e2e/SyncTestPage.components';
import { shouldUseMockSync } from '@/lib/p2p/MockSyncProvider';
import { ConnectionState, type SyncEvent } from '@/lib/p2p/types';
import {
  createSyncTestProviders,
  readSyncedTestItems,
} from '@/pages-modules/e2e/syncTestPage.helpers';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_TEST === 'true';

export default function SyncTestPage() {
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    setUseMock(shouldUseMockSync());
  }, []);

  const providers = useMemo(() => createSyncTestProviders(useMock), [useMock]);

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [localPeerId, setLocalPeerId] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryState, setRetryState] = useState({
    isRetrying: false,
    attempts: 0,
    maxAttempts: 5,
  });
  const [items, setItems] = useState<Record<string, TestItem>>({});
  const [newItemName, setNewItemName] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(providers.getState());
      setPeerCount(providers.getPeerCount());
      setLocalPeerId(providers.getPeerId());
      setRetryState(providers.getRetry());

      const yMap = providers.getMap<TestItem>('test-items');
      if (yMap) {
        setItems(readSyncedTestItems(yMap));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [providers]);

  useEffect(() => {
    const unsubscribe = providers.onEvent((event: SyncEvent) => {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
      setEvents((prev) => [...prev.slice(-19), `[${timestamp}] ${event.type}`]);

      if (event.type === 'connected') {
        setRoomCode(event.roomCode);
        setError(null);
      } else if (event.type === 'disconnected') {
        if (!providers.getRetry().isRetrying) {
          setRoomCode('');
        }
      } else if (event.type === 'error') {
        setError(event.message);
      }
    });

    return unsubscribe;
  }, [providers]);

  useEffect(() => {
    const room = providers.getRoom();
    if (!room) return;

    const yMap = room.doc.getMap<TestItem>('test-items');
    const observer = () => {
      setItems(readSyncedTestItems(yMap));
    };

    yMap.observe(observer);
    return () => yMap.unobserve(observer);
  }, [connectionState, providers]);

  const handleCreateRoom = useCallback(() => {
    try {
      setError(null);
      const room = providers.createRoom();
      setRoomCode(room.roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    }
  }, [providers]);

  const handleJoinRoom = useCallback(() => {
    if (!inputRoomCode.trim()) return;
    try {
      setError(null);
      const room = providers.joinRoom(
        inputRoomCode.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      );
      setRoomCode(room.roomCode);
      setInputRoomCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    }
  }, [inputRoomCode, providers]);

  const handleLeaveRoom = useCallback(() => {
    providers.cancelRetry();
    providers.leaveRoom();
    setRoomCode('');
    setItems({});
  }, [providers]);

  const handleAddItem = useCallback(() => {
    const yMap = providers.getMap<TestItem>('test-items');
    if (!yMap || !newItemName.trim()) return;

    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: TestItem = {
      id,
      name: newItemName.trim(),
      value: Math.floor(Math.random() * 100),
      updatedAt: Date.now(),
    };

    yMap.set(id, item);
    setNewItemName('');
  }, [newItemName, providers]);

  const handleUpdateItem = useCallback(
    (id: string) => {
      const yMap = providers.getMap<TestItem>('test-items');
      if (!yMap) return;

      const existing = yMap.get(id);
      if (existing) {
        yMap.set(id, {
          ...existing,
          value: existing.value + 1,
          updatedAt: Date.now(),
        });
      }
    },
    [providers],
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      const yMap = providers.getMap<TestItem>('test-items');
      if (!yMap) return;
      yMap.delete(id);
    },
    [providers],
  );

  if (!isTestEnv) {
    return <NotAvailable />;
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: 'monospace',
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      <h1>P2P Sync Test Harness</h1>
      {useMock && (
        <div
          data-testid="mock-mode-indicator"
          style={{
            padding: 8,
            marginBottom: 15,
            background: '#ffe0b2',
            color: '#e65100',
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          Mock Mode (BroadcastChannel)
        </div>
      )}

      <ConnectionSection
        connectionState={connectionState}
        error={error}
        localPeerId={localPeerId}
        peerCount={peerCount}
        retryState={retryState}
        roomCode={roomCode}
      />
      <RoomControlsSection
        connectionState={connectionState}
        inputRoomCode={inputRoomCode}
        onCreateRoom={handleCreateRoom}
        onInputRoomCodeChange={setInputRoomCode}
        onJoinRoom={handleJoinRoom}
        onLeaveRoom={handleLeaveRoom}
      />
      <SyncedItemsSection
        connectionState={connectionState}
        items={items}
        newItemName={newItemName}
        onAddItem={handleAddItem}
        onDeleteItem={handleDeleteItem}
        onNewItemNameChange={setNewItemName}
        onUpdateItem={handleUpdateItem}
      />
      <EventLogSection events={events} />
    </div>
  );
}
