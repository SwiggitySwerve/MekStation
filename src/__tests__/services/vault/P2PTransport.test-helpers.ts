/**
 * P2P Transport Tests
 *
 * Tests for the P2PTransport service:
 * - Connection management
 * - Message sending and receiving
 * - Message builders (handshake, sync, change, ping/pong)
 * - Connection state handling
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { IChangeLogEntry, P2PConnectionState } from '@/types/vault';

import {
  P2PTransport,
  getP2PTransport,
  resetP2PTransport,
  createHandshake,
  createHandshakeAck,
  createSyncRequest,
  createSyncResponse,
  createChange,
  createChangeAck,
  createPing,
  createPong,
  createError,
  PROTOCOL_VERSION,
  SUPPORTED_FEATURES,
} from '@/services/vault/P2PTransport';

// =============================================================================
// Test Data
// =============================================================================

const TEST_MY_ID = 'my-peer-id-123';
const TEST_PEER_ID = 'other-peer-456';
const TEST_PUBLIC_KEY = 'test-public-key-abc123';

const createMockChange = (
  overrides: Partial<IChangeLogEntry> = {},
): IChangeLogEntry => ({
  id: `change-${Math.random().toString(36).slice(2)}`,
  changeType: 'update',
  contentType: 'unit',
  itemId: 'unit-123',
  timestamp: new Date().toISOString(),
  version: 1,
  contentHash: 'hash-abc123',
  data: null,
  synced: false,
  sourceId: null,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('P2PTransport', () => {
  let transport: P2PTransport;

  beforeEach(() => {
    jest.clearAllMocks();
    resetP2PTransport();
    transport = new P2PTransport(TEST_MY_ID);
  });

  afterEach(() => {
    transport.disconnectAll();
  });

  // ===========================================================================
  // Singleton Tests
  // ===========================================================================

  describe('Singleton', () => {
    it('should return the same instance from getP2PTransport', () => {
      const instance1 = getP2PTransport(TEST_MY_ID);
      const instance2 = getP2PTransport();
      expect(instance1).toBe(instance2);
    });

    it('should throw if getP2PTransport called without myId on first call', () => {
      resetP2PTransport();
      expect(() => getP2PTransport()).toThrow('myId');
    });

    it('should reset the singleton when resetP2PTransport is called', () => {
      const instance1 = getP2PTransport(TEST_MY_ID);
      resetP2PTransport();
      const instance2 = getP2PTransport(TEST_MY_ID);
      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Basic Properties
  // ===========================================================================

  describe('Basic Properties', () => {
    it('should return my peer ID', () => {
      expect(transport.getMyId()).toBe(TEST_MY_ID);
    });
  });

  // ===========================================================================
  // Connection Management Tests
  // ===========================================================================

  describe('Connection Management', () => {
    it('should connect to a peer', async () => {
      const result = await transport.connect(TEST_PEER_ID);

      expect(result).toBe(true);
      expect(transport.isConnected(TEST_PEER_ID)).toBe(true);
    });

    it('should return true if already connected', async () => {
      await transport.connect(TEST_PEER_ID);
      const result = await transport.connect(TEST_PEER_ID);

      expect(result).toBe(true);
    });

    it('should track connection state', async () => {
      await transport.connect(TEST_PEER_ID);

      const connection = transport.getConnection(TEST_PEER_ID);
      expect(connection).toBeDefined();
      expect(connection?.state).toBe('connected');
      expect(connection?.dataChannelState).toBe('open');
      expect(connection?.connectedAt).toBeDefined();
    });

    it('should disconnect from a peer', async () => {
      await transport.connect(TEST_PEER_ID);
      transport.disconnect(TEST_PEER_ID);

      expect(transport.isConnected(TEST_PEER_ID)).toBe(false);
      expect(transport.getConnection(TEST_PEER_ID)).toBeUndefined();
    });

    it('should disconnect from all peers', async () => {
      await transport.connect('peer-1');
      await transport.connect('peer-2');
      await transport.connect('peer-3');

      transport.disconnectAll();

      expect(transport.getAllConnections()).toHaveLength(0);
    });

    it('should get all connections', async () => {
      await transport.connect('peer-1');
      await transport.connect('peer-2');

      const connections = transport.getAllConnections();

      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.peerId).sort()).toEqual([
        'peer-1',
        'peer-2',
      ]);
    });

    it('should notify on connection state changes', async () => {
      const stateChanges: Array<{ peerId: string; state: P2PConnectionState }> =
        [];
      transport.onConnectionStateChange((peerId, state) => {
        stateChanges.push({ peerId, state });
      });

      await transport.connect(TEST_PEER_ID);

      expect(stateChanges).toContainEqual({
        peerId: TEST_PEER_ID,
        state: 'connecting',
      });
      expect(stateChanges).toContainEqual({
        peerId: TEST_PEER_ID,
        state: 'connected',
      });
    });

    it('should notify on disconnect', async () => {
      const stateChanges: Array<{ peerId: string; state: P2PConnectionState }> =
        [];
      transport.onConnectionStateChange((peerId, state) => {
        stateChanges.push({ peerId, state });
      });

      await transport.connect(TEST_PEER_ID);
      transport.disconnect(TEST_PEER_ID);

      expect(stateChanges).toContainEqual({
        peerId: TEST_PEER_ID,
        state: 'disconnected',
      });
    });
  });

  // ===========================================================================
  // Message Sending Tests
  // ===========================================================================

  describe('Message Sending', () => {
    it('should send a message to a connected peer', async () => {
      await transport.connect(TEST_PEER_ID);
      const message = createPing(TEST_MY_ID);

      const result = await transport.send(TEST_PEER_ID, message);

      expect(result).toBe(true);
    });

    it('should fail to send to a disconnected peer', async () => {
      const message = createPing(TEST_MY_ID);

      const result = await transport.send(TEST_PEER_ID, message);

      expect(result).toBe(false);
    });

    it('should broadcast to all connected peers', async () => {
      await transport.connect('peer-1');
      await transport.connect('peer-2');
      await transport.connect('peer-3');

      const message = createPing(TEST_MY_ID);
      const sent = await transport.broadcast(message);

      expect(sent).toBe(3);
    });

    it('should track bytes sent', async () => {
      await transport.connect(TEST_PEER_ID);
      const message = createPing(TEST_MY_ID);

      await transport.send(TEST_PEER_ID, message);

      const connection = transport.getConnection(TEST_PEER_ID);
      expect(connection?.bytesSent).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Message Receiving Tests
  // ===========================================================================

  describe('Message Receiving', () => {
    it('should handle received messages', async () => {
      const receivedMessages: Array<{ peerId: string; type: string }> = [];
      transport.onMessage('handshake', (peerId, message) => {
        receivedMessages.push({ peerId, type: message.type });
      });

      await transport.connect(TEST_PEER_ID);
      const handshake = createHandshake(
        TEST_PEER_ID,
        TEST_PUBLIC_KEY,
        'Test User',
        0,
      );
      await transport.handleMessage(TEST_PEER_ID, JSON.stringify(handshake));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].type).toBe('handshake');
    });

    it('should handle multiple message handlers for same type', async () => {
      let handler1Called = false;
      let handler2Called = false;

      transport.onMessage('sync_request', () => {
        handler1Called = true;
      });
      transport.onMessage('sync_request', () => {
        handler2Called = true;
      });

      await transport.connect(TEST_PEER_ID);
      const syncRequest = createSyncRequest(TEST_PEER_ID, 0);
      await transport.handleMessage(TEST_PEER_ID, JSON.stringify(syncRequest));

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });

    it('should remove message handlers', async () => {
      let handlerCalled = false;
      const handler = () => {
        handlerCalled = true;
      };

      transport.onMessage('change', handler);
      transport.offMessage('change', handler);

      await transport.connect(TEST_PEER_ID);
      const change = createChange(TEST_PEER_ID, createMockChange());
      await transport.handleMessage(TEST_PEER_ID, JSON.stringify(change));

      expect(handlerCalled).toBe(false);
    });

    it('should track bytes received', async () => {
      await transport.connect(TEST_PEER_ID);
      // Use a non-ping message to avoid internal ping handler
      const message = createSyncRequest(TEST_PEER_ID, 0);

      await transport.handleMessage(TEST_PEER_ID, JSON.stringify(message));

      const connection = transport.getConnection(TEST_PEER_ID);
      expect(connection?.bytesReceived).toBeGreaterThan(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      await transport.connect(TEST_PEER_ID);

      // Should not throw
      await expect(
        transport.handleMessage(TEST_PEER_ID, 'not valid json'),
      ).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // Ping/Pong Tests
  // ===========================================================================

  describe('Ping/Pong', () => {
    it('should handle ping message without error', async () => {
      await transport.connect(TEST_PEER_ID);
      const ping = createPing(TEST_PEER_ID);

      // handleMessage processes ping internally and attempts to send pong
      // Since this is a simulated transport, we just verify it doesn't throw
      await expect(
        transport.handleMessage(TEST_PEER_ID, JSON.stringify(ping)),
      ).resolves.not.toThrow();
    });

    it('should update RTT when receiving pong', async () => {
      await transport.connect(TEST_PEER_ID);

      // Verify connection exists
      const initialConnection = transport.getConnection(TEST_PEER_ID);
      expect(initialConnection).toBeDefined();
      expect(initialConnection?.state).toBe('connected');

      // Process a pong message - use a timestamp from 50ms ago
      const pingTimestamp = Date.now() - 50;
      const pong = createPong(TEST_PEER_ID, pingTimestamp);

      // Debug: verify pong structure
      expect(pong.type).toBe('pong');
      const pongPayload = pong.payload as {
        pingTimestamp: number;
        pongTimestamp: number;
      };
      expect(pongPayload.pingTimestamp).toBe(pingTimestamp);

      // The pong handler should update RTT
      await transport.handleMessage(TEST_PEER_ID, JSON.stringify(pong));

      // After pong, connection should have RTT calculated
      const updatedConnection = transport.getConnection(TEST_PEER_ID);
      expect(updatedConnection).toBeDefined();
      // Note: The P2PTransport is a simplified implementation.
      // handlePong sets connection.rtt = Date.now() - payload.pingTimestamp
      // So RTT should be set after processing pong
      expect(updatedConnection?.rtt).not.toBeNull();
    });
  });
});

// =============================================================================
// Message Builder Tests
// =============================================================================

describe('Message Builders', () => {
  const SENDER_ID = 'sender-123';

  describe('createHandshake', () => {
    it('should create a valid handshake message', () => {
      const message = createHandshake(
        SENDER_ID,
        TEST_PUBLIC_KEY,
        'Test User',
        5,
      );

      expect(message.type).toBe('handshake');
      expect(message.senderId).toBe(SENDER_ID);
      expect(message.messageId).toBeDefined();
      expect(message.timestamp).toBeDefined();

      const payload = message.payload as {
        protocolVersion: string;
        publicKey: string;
        displayName: string;
        features: string[];
        lastSyncVersion: number;
      };
      expect(payload.protocolVersion).toBe(PROTOCOL_VERSION);
      expect(payload.publicKey).toBe(TEST_PUBLIC_KEY);
      expect(payload.displayName).toBe('Test User');
      expect(payload.features).toEqual(SUPPORTED_FEATURES);
      expect(payload.lastSyncVersion).toBe(5);
    });
  });

  describe('createHandshakeAck', () => {
    it('should create a valid handshake acknowledgment', () => {
      const message = createHandshakeAck(
        SENDER_ID,
        TEST_PUBLIC_KEY,
        'Receiver',
        10,
      );

      expect(message.type).toBe('handshake_ack');
      expect(message.senderId).toBe(SENDER_ID);

      const payload = message.payload as {
        protocolVersion: string;
        publicKey: string;
        displayName: string;
        lastSyncVersion: number;
      };
      expect(payload.protocolVersion).toBe(PROTOCOL_VERSION);
      expect(payload.lastSyncVersion).toBe(10);
    });
  });

  describe('createSyncRequest', () => {
    it('should create a valid sync request', () => {
      const message = createSyncRequest(SENDER_ID, 42, 50);

      expect(message.type).toBe('sync_request');

      const payload = message.payload as {
        fromVersion: number;
        limit: number;
        contentTypes: null;
      };
      expect(payload.fromVersion).toBe(42);
      expect(payload.limit).toBe(50);
      expect(payload.contentTypes).toBeNull();
    });

    it('should use default limit', () => {
      const message = createSyncRequest(SENDER_ID, 0);

      const payload = message.payload as { limit: number };
      expect(payload.limit).toBe(100);
    });
  });

  describe('createSyncResponse', () => {
    it('should create a valid sync response', () => {
      const changes = [createMockChange(), createMockChange()];
      const message = createSyncResponse(SENDER_ID, changes, true, 100);

      expect(message.type).toBe('sync_response');

      const payload = message.payload as {
        changes: IChangeLogEntry[];
        hasMore: boolean;
        currentVersion: number;
      };
      expect(payload.changes).toHaveLength(2);
      expect(payload.hasMore).toBe(true);
      expect(payload.currentVersion).toBe(100);
    });
  });

  describe('createChange', () => {
    it('should create a valid change notification', () => {
      const change = createMockChange();
      const message = createChange(SENDER_ID, change, 'content-data');

      expect(message.type).toBe('change');

      const payload = message.payload as {
        change: IChangeLogEntry;
        content?: string;
      };
      expect(payload.change).toEqual(change);
      expect(payload.content).toBe('content-data');
    });

    it('should work without content', () => {
      const change = createMockChange();
      const message = createChange(SENDER_ID, change);

      const payload = message.payload as { content?: string };
      expect(payload.content).toBeUndefined();
    });
  });

  describe('createChangeAck', () => {
    it('should create a valid change acknowledgment', () => {
      const message = createChangeAck(SENDER_ID, 'change-456');

      expect(message.type).toBe('change_ack');

      const payload = message.payload as { changeId: string };
      expect(payload.changeId).toBe('change-456');
    });
  });

  describe('createPing', () => {
    it('should create a valid ping message', () => {
      const before = Date.now();
      const message = createPing(SENDER_ID);
      const after = Date.now();

      expect(message.type).toBe('ping');

      const payload = message.payload as { timestamp: number };
      expect(payload.timestamp).toBeGreaterThanOrEqual(before);
      expect(payload.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('createPong', () => {
    it('should create a valid pong message', () => {
      const pingTimestamp = Date.now() - 100;
      const before = Date.now();
      const message = createPong(SENDER_ID, pingTimestamp);
      const after = Date.now();

      expect(message.type).toBe('pong');

      const payload = message.payload as {
        pingTimestamp: number;
        pongTimestamp: number;
      };
      expect(payload.pingTimestamp).toBe(pingTimestamp);
      expect(payload.pongTimestamp).toBeGreaterThanOrEqual(before);
      expect(payload.pongTimestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('createError', () => {
    it('should create a valid error message', () => {
      const message = createError(
        SENDER_ID,
        'SYNC_FAILED',
        'Sync operation failed',
      );

      expect(message.type).toBe('error');

      const payload = message.payload as { code: string; message: string };
      expect(payload.code).toBe('SYNC_FAILED');
      expect(payload.message).toBe('Sync operation failed');
    });
  });

  describe('Message ID uniqueness', () => {
    it('should generate unique message IDs', () => {
      const messages = [
        createPing(SENDER_ID),
        createPing(SENDER_ID),
        createPing(SENDER_ID),
      ];

      const ids = messages.map((m) => m.messageId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Timestamp format', () => {
    it('should include valid ISO timestamps', () => {
      const message = createPing(SENDER_ID);

      expect(() => new Date(message.timestamp)).not.toThrow();
      expect(new Date(message.timestamp).toISOString()).toBe(message.timestamp);
    });
  });
});
