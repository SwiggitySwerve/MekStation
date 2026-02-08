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
  createSyncRoom,
  joinSyncRoom,
  leaveCurrentRoom,
  getConnectionState,
  getConnectedPeerCount,
  getActiveRoom,
  onSyncEvent,
  getLocalPeerId,
  getYMap,
  cancelReconnect,
  getRetryState,
} from '@/lib/p2p/SyncProvider';
import {
  createMockSyncRoom,
  joinMockSyncRoom,
  leaveMockCurrentRoom,
  getMockConnectionState,
  getMockConnectedPeerCount,
  getMockActiveRoom,
  onMockSyncEvent,
  getMockLocalPeerId,
  getMockYMap,
  cancelMockReconnect,
  getMockRetryState,
  shouldUseMockSync,
} from '@/lib/p2p/MockSyncProvider';
import { ConnectionState, type SyncEvent } from '@/lib/p2p/types';
import { formatRoomCode } from '@/lib/p2p/roomCodes';

// Block in production
const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_TEST === 'true';

interface TestItem {
  id: string;
  name: string;
  value: number;
  updatedAt: number;
}

export default function SyncTestPage() {
  // Determine if we should use mock sync (for E2E tests)
  // Use state + effect to handle SSR properly
  const [useMock, setUseMock] = useState(false);
  
  useEffect(() => {
    setUseMock(shouldUseMockSync());
  }, []);

  // Provider functions based on mock mode
  const providers = useMemo(() => ({
    createRoom: useMock ? createMockSyncRoom : createSyncRoom,
    joinRoom: useMock ? joinMockSyncRoom : joinSyncRoom,
    leaveRoom: useMock ? leaveMockCurrentRoom : leaveCurrentRoom,
    getState: useMock ? getMockConnectionState : getConnectionState,
    getPeerCount: useMock ? getMockConnectedPeerCount : getConnectedPeerCount,
    getRoom: useMock ? getMockActiveRoom : getActiveRoom,
    onEvent: useMock ? onMockSyncEvent : onSyncEvent,
    getPeerId: useMock ? getMockLocalPeerId : getLocalPeerId,
    getMap: useMock ? getMockYMap : getYMap,
    cancelRetry: useMock ? cancelMockReconnect : cancelReconnect,
    getRetry: useMock ? getMockRetryState : getRetryState,
  }), [useMock]);

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [localPeerId, setLocalPeerId] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryState, setRetryState] = useState({ isRetrying: false, attempts: 0, maxAttempts: 5 });

  // Synced data
  const [items, setItems] = useState<Record<string, TestItem>>({});
  const [newItemName, setNewItemName] = useState<string>('');

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(providers.getState());
      setPeerCount(providers.getPeerCount());
      setLocalPeerId(providers.getPeerId());
      setRetryState(providers.getRetry());

      // Read items from Yjs
      const yMap = providers.getMap<TestItem>('test-items');
      if (yMap) {
        const newItems: Record<string, TestItem> = {};
        yMap.forEach((value, key) => {
          newItems[key] = value;
        });
        setItems(newItems);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [providers]);

  // Subscribe to sync events
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

  // Observe Yjs changes
  useEffect(() => {
    const room = providers.getRoom();
    if (!room) return;

    const yMap = room.doc.getMap<TestItem>('test-items');
    const observer = () => {
      const newItems: Record<string, TestItem> = {};
      yMap.forEach((value, key) => {
        newItems[key] = value;
      });
      setItems(newItems);
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
      const room = providers.joinRoom(inputRoomCode.toUpperCase().replace(/[^A-Z0-9]/g, ''));
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

  const handleUpdateItem = useCallback((id: string) => {
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
  }, [providers]);

  const handleDeleteItem = useCallback((id: string) => {
    const yMap = providers.getMap<TestItem>('test-items');
    if (!yMap) return;
    yMap.delete(id);
  }, [providers]);

  if (!isTestEnv) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Not Available</h1>
        <p>This page is only available in development/test environments.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
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

      {/* Connection Status Section */}
      <section
        style={{ marginBottom: 20, padding: 15, border: '1px solid #ccc', borderRadius: 8 }}
      >
        <h2>Connection</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8 }}>
          <span>State:</span>
          <span data-testid="connection-state">{connectionState}</span>

          <span>Room Code:</span>
          <span data-testid="room-code">{roomCode ? formatRoomCode(roomCode) : 'N/A'}</span>

          <span>Peer Count:</span>
          <span data-testid="peer-count">{peerCount}</span>

          <span>Local Peer ID:</span>
          <span data-testid="local-peer-id">{localPeerId ?? 'N/A'}</span>

          <span>Retrying:</span>
          <span data-testid="retry-state">
            {retryState.isRetrying
              ? `Yes (${retryState.attempts}/${retryState.maxAttempts})`
              : 'No'}
          </span>
        </div>

        {error && (
          <div
            data-testid="error-message"
            style={{ marginTop: 10, padding: 10, background: '#fee', color: '#c00', borderRadius: 4 }}
          >
            {error}
          </div>
        )}
      </section>

      {/* Room Controls */}
      <section
        style={{ marginBottom: 20, padding: 15, border: '1px solid #ccc', borderRadius: 8 }}
      >
        <h2>Room Controls</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            data-testid="create-room-btn"
            onClick={handleCreateRoom}
            disabled={connectionState !== ConnectionState.Disconnected}
            style={{ padding: '8px 16px' }}
          >
            Create Room
          </button>

          <input
            data-testid="room-code-input"
            type="text"
            placeholder="Enter room code"
            value={inputRoomCode}
            onChange={(e) => setInputRoomCode(e.target.value)}
            style={{ padding: 8, width: 150 }}
          />
          <button
            data-testid="join-room-btn"
            onClick={handleJoinRoom}
            disabled={connectionState !== ConnectionState.Disconnected || !inputRoomCode.trim()}
            style={{ padding: '8px 16px' }}
          >
            Join Room
          </button>

          <button
            data-testid="leave-room-btn"
            onClick={handleLeaveRoom}
            disabled={connectionState === ConnectionState.Disconnected}
            style={{ padding: '8px 16px' }}
          >
            Leave Room
          </button>
        </div>
      </section>

      {/* Synced Items */}
      <section
        style={{ marginBottom: 20, padding: 15, border: '1px solid #ccc', borderRadius: 8 }}
      >
        <h2>Synced Items</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
          <input
            data-testid="new-item-input"
            type="text"
            placeholder="Item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            style={{ padding: 8, flex: 1 }}
          />
          <button
            data-testid="add-item-btn"
            onClick={handleAddItem}
            disabled={connectionState !== ConnectionState.Connected || !newItemName.trim()}
            style={{ padding: '8px 16px' }}
          >
            Add Item
          </button>
        </div>

        <div data-testid="items-list">
          {Object.keys(items).length === 0 ? (
            <p style={{ color: '#666' }}>No items yet</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {Object.values(items).map((item) => (
                <li
                  key={item.id}
                  data-testid={`item-${item.id}`}
                  data-item-id={item.id}
                  data-item-name={item.name}
                  data-item-value={item.value}
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    background: '#f5f5f5',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    <strong>{item.name}</strong> = {item.value}
                  </span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button
                      data-testid={`update-${item.id}`}
                      onClick={() => handleUpdateItem(item.id)}
                      style={{ padding: '4px 8px' }}
                    >
                      +1
                    </button>
                    <button
                      data-testid={`delete-${item.id}`}
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ padding: '4px 8px' }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div data-testid="item-count" style={{ marginTop: 10, color: '#666' }}>
          Total items: {Object.keys(items).length}
        </div>
      </section>

      {/* Event Log */}
      <section style={{ padding: 15, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2>Event Log</h2>
        <div
          data-testid="event-log"
          style={{
            height: 150,
            overflow: 'auto',
            background: '#1a1a1a',
            color: '#0f0',
            padding: 10,
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {events.length === 0 ? (
            <span style={{ color: '#666' }}>No events yet</span>
          ) : (
            events.map((event, i) => <div key={i}>{event}</div>)
          )}
        </div>
      </section>
    </div>
  );
}
