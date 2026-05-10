import { formatRoomCode } from '@/lib/p2p/roomCodes';
import { ConnectionState } from '@/lib/p2p/types';

export interface TestItem {
  id: string;
  name: string;
  value: number;
  updatedAt: number;
}

interface RetryState {
  attempts: number;
  isRetrying: boolean;
  maxAttempts: number;
}

export function NotAvailable(): React.ReactElement {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Not Available</h1>
      <p>This page is only available in development/test environments.</p>
    </div>
  );
}

interface ConnectionSectionProps {
  connectionState: ConnectionState;
  error: string | null;
  localPeerId: string | null;
  peerCount: number;
  retryState: RetryState;
  roomCode: string;
}

export function ConnectionSection({
  connectionState,
  error,
  localPeerId,
  peerCount,
  retryState,
  roomCode,
}: ConnectionSectionProps): React.ReactElement {
  return (
    <section
      style={{
        marginBottom: 20,
        padding: 15,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <h2>Connection</h2>
      <div
        style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8 }}
      >
        <span>State:</span>
        <span data-testid="connection-state">{connectionState}</span>

        <span>Room Code:</span>
        <span data-testid="room-code">
          {roomCode ? formatRoomCode(roomCode) : 'N/A'}
        </span>

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
          style={{
            marginTop: 10,
            padding: 10,
            background: '#fee',
            color: '#c00',
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}

interface RoomControlsSectionProps {
  connectionState: ConnectionState;
  inputRoomCode: string;
  onCreateRoom: () => void;
  onInputRoomCodeChange: (value: string) => void;
  onJoinRoom: () => void;
  onLeaveRoom: () => void;
}

export function RoomControlsSection({
  connectionState,
  inputRoomCode,
  onCreateRoom,
  onInputRoomCodeChange,
  onJoinRoom,
  onLeaveRoom,
}: RoomControlsSectionProps): React.ReactElement {
  const isDisconnected = connectionState === ConnectionState.Disconnected;

  return (
    <section
      style={{
        marginBottom: 20,
        padding: 15,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <h2>Room Controls</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          data-testid="create-room-btn"
          onClick={onCreateRoom}
          disabled={!isDisconnected}
          style={{ padding: '8px 16px' }}
        >
          Create Room
        </button>

        <input
          data-testid="room-code-input"
          type="text"
          placeholder="Enter room code"
          value={inputRoomCode}
          onChange={(e) => onInputRoomCodeChange(e.target.value)}
          style={{ padding: 8, width: 150 }}
        />
        <button
          data-testid="join-room-btn"
          onClick={onJoinRoom}
          disabled={!isDisconnected || !inputRoomCode.trim()}
          style={{ padding: '8px 16px' }}
        >
          Join Room
        </button>

        <button
          data-testid="leave-room-btn"
          onClick={onLeaveRoom}
          disabled={isDisconnected}
          style={{ padding: '8px 16px' }}
        >
          Leave Room
        </button>
      </div>
    </section>
  );
}

interface SyncedItemsSectionProps {
  connectionState: ConnectionState;
  items: Record<string, TestItem>;
  newItemName: string;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onNewItemNameChange: (value: string) => void;
  onUpdateItem: (id: string) => void;
}

export function SyncedItemsSection({
  connectionState,
  items,
  newItemName,
  onAddItem,
  onDeleteItem,
  onNewItemNameChange,
  onUpdateItem,
}: SyncedItemsSectionProps): React.ReactElement {
  const itemValues = Object.values(items);
  const itemCount = itemValues.length;

  return (
    <section
      style={{
        marginBottom: 20,
        padding: 15,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <h2>Synced Items</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
        <input
          data-testid="new-item-input"
          type="text"
          placeholder="Item name"
          value={newItemName}
          onChange={(e) => onNewItemNameChange(e.target.value)}
          style={{ padding: 8, flex: 1 }}
        />
        <button
          data-testid="add-item-btn"
          onClick={onAddItem}
          disabled={
            connectionState !== ConnectionState.Connected || !newItemName.trim()
          }
          style={{ padding: '8px 16px' }}
        >
          Add Item
        </button>
      </div>

      <div data-testid="items-list">
        {itemCount === 0 ? (
          <p style={{ color: '#666' }}>No items yet</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {itemValues.map((item) => (
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
                    onClick={() => onUpdateItem(item.id)}
                    style={{ padding: '4px 8px' }}
                  >
                    +1
                  </button>
                  <button
                    data-testid={`delete-${item.id}`}
                    onClick={() => onDeleteItem(item.id)}
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
        Total items: {itemCount}
      </div>
    </section>
  );
}

interface EventLogSectionProps {
  events: string[];
}

export function EventLogSection({
  events,
}: EventLogSectionProps): React.ReactElement {
  return (
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
          events.map((event, i) => <div key={`${event}-${i}`}>{event}</div>)
        )}
      </div>
    </section>
  );
}
