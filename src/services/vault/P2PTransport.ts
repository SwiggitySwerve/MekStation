/**
 * P2P Transport
 *
 * Handles peer-to-peer communication for vault sync.
 * Provides message framing protocol and connection management.
 *
 * Note: This is a simplified implementation. Full WebRTC with STUN/TURN
 * would be added in a production release.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  P2PConnectionState,
  P2PMessageType,
  IP2PMessage,
  IP2PConnection,
  IHandshakePayload,
  ISyncRequestPayload,
  ISyncResponsePayload,
  IChangePayload,
  ISignalingMessage,
  IChangeLogEntry,
} from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

/**
 * Message handler function type
 */
export type MessageHandler = (
  peerId: string,
  message: IP2PMessage
) => void | Promise<void>;

/**
 * Connection state change handler
 */
export type ConnectionStateHandler = (
  peerId: string,
  state: P2PConnectionState
) => void;

/**
 * Signaling handler for sending signaling messages
 */
export type SignalingHandler = (message: ISignalingMessage) => Promise<void>;

// =============================================================================
// Protocol Constants
// =============================================================================

/** Current protocol version */
export const PROTOCOL_VERSION = '1.0.0';

/** Supported features */
export const SUPPORTED_FEATURES = ['sync', 'changes', 'conflicts'];

/** Ping interval in milliseconds */
const PING_INTERVAL = 30000;

// =============================================================================
// Message Builders
// =============================================================================

/**
 * Create a base message with common fields
 */
function createMessage(
  type: P2PMessageType,
  senderId: string,
  payload: unknown
): IP2PMessage {
  return {
    type,
    messageId: `msg-${crypto.randomUUID()}`,
    senderId,
    timestamp: new Date().toISOString(),
    payload,
  };
}

/**
 * Create a handshake message
 */
export function createHandshake(
  senderId: string,
  publicKey: string,
  displayName: string,
  lastSyncVersion: number
): IP2PMessage {
  const payload: IHandshakePayload = {
    protocolVersion: PROTOCOL_VERSION,
    publicKey,
    displayName,
    features: SUPPORTED_FEATURES,
    lastSyncVersion,
  };
  return createMessage('handshake', senderId, payload);
}

/**
 * Create a handshake acknowledgment
 */
export function createHandshakeAck(
  senderId: string,
  publicKey: string,
  displayName: string,
  lastSyncVersion: number
): IP2PMessage {
  const payload: IHandshakePayload = {
    protocolVersion: PROTOCOL_VERSION,
    publicKey,
    displayName,
    features: SUPPORTED_FEATURES,
    lastSyncVersion,
  };
  return createMessage('handshake_ack', senderId, payload);
}

/**
 * Create a sync request
 */
export function createSyncRequest(
  senderId: string,
  fromVersion: number,
  limit = 100
): IP2PMessage {
  const payload: ISyncRequestPayload = {
    fromVersion,
    limit,
    contentTypes: null,
  };
  return createMessage('sync_request', senderId, payload);
}

/**
 * Create a sync response
 */
export function createSyncResponse(
  senderId: string,
  changes: IChangeLogEntry[],
  hasMore: boolean,
  currentVersion: number
): IP2PMessage {
  const payload: ISyncResponsePayload = {
    changes,
    hasMore,
    currentVersion,
  };
  return createMessage('sync_response', senderId, payload);
}

/**
 * Create a change notification
 */
export function createChange(
  senderId: string,
  change: IChangeLogEntry,
  content?: string
): IP2PMessage {
  const payload: IChangePayload = {
    change,
    content,
  };
  return createMessage('change', senderId, payload);
}

/**
 * Create a change acknowledgment
 */
export function createChangeAck(
  senderId: string,
  changeId: string
): IP2PMessage {
  return createMessage('change_ack', senderId, { changeId });
}

/**
 * Create a ping message
 */
export function createPing(senderId: string): IP2PMessage {
  return createMessage('ping', senderId, { timestamp: Date.now() });
}

/**
 * Create a pong message
 */
export function createPong(senderId: string, pingTimestamp: number): IP2PMessage {
  return createMessage('pong', senderId, {
    pingTimestamp,
    pongTimestamp: Date.now(),
  });
}

/**
 * Create an error message
 */
export function createError(
  senderId: string,
  code: string,
  message: string
): IP2PMessage {
  return createMessage('error', senderId, { code, message });
}

// =============================================================================
// P2P Transport Service
// =============================================================================

/**
 * P2P Transport Service
 *
 * Manages connections to peers and message routing.
 */
export class P2PTransport {
  private myId: string;
  private connections: Map<string, IP2PConnection> = new Map();
  private messageHandlers: Map<P2PMessageType, MessageHandler[]> = new Map();
  private connectionStateHandler?: ConnectionStateHandler;
  private signalingHandler?: SignalingHandler;
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(myId: string) {
    this.myId = myId;
  }

  /**
   * Get my peer ID
   */
  getMyId(): string {
    return this.myId;
  }

  /**
   * Set signaling handler for WebRTC signaling
   */
  setSignalingHandler(handler: SignalingHandler): void {
    this.signalingHandler = handler;
  }

  /**
   * Set connection state change handler
   */
  onConnectionStateChange(handler: ConnectionStateHandler): void {
    this.connectionStateHandler = handler;
  }

  /**
   * Register a message handler for a specific message type
   */
  onMessage(type: P2PMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  /**
   * Remove a message handler
   */
  offMessage(type: P2PMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Initiate connection to a peer
   */
  async connect(peerId: string): Promise<boolean> {
    if (this.connections.has(peerId)) {
      return true; // Already connected or connecting
    }

    // Create connection record
    const connection: IP2PConnection = {
      peerId,
      state: 'connecting',
      connectedAt: null,
      dataChannelState: 'connecting',
      rtt: null,
      bytesSent: 0,
      bytesReceived: 0,
    };
    this.connections.set(peerId, connection);
    this.notifyConnectionState(peerId, 'connecting');

    // In a full implementation, this would:
    // 1. Create RTCPeerConnection
    // 2. Create data channel
    // 3. Create and send offer via signaling
    // 4. Wait for answer
    // 5. Exchange ICE candidates

    // For now, simulate successful connection
    return new Promise((resolve) => {
      setTimeout(() => {
        const conn = this.connections.get(peerId);
        if (conn) {
          conn.state = 'connected';
          conn.connectedAt = new Date().toISOString();
          conn.dataChannelState = 'open';
          this.notifyConnectionState(peerId, 'connected');
          this.startPingInterval(peerId);
        }
        resolve(true);
      }, 100);
    });
  }

  /**
   * Disconnect from a peer
   */
  disconnect(peerId: string): void {
    this.stopPingInterval(peerId);

    const connection = this.connections.get(peerId);
    if (connection) {
      connection.state = 'disconnected';
      connection.dataChannelState = 'closed';
      this.notifyConnectionState(peerId, 'disconnected');
    }

    this.connections.delete(peerId);
  }

  /**
   * Disconnect from all peers
   */
  disconnectAll(): void {
    const peerIds = Array.from(this.connections.keys());
    for (const peerId of peerIds) {
      this.disconnect(peerId);
    }
  }

  /**
   * Get connection state for a peer
   */
  getConnection(peerId: string): IP2PConnection | undefined {
    return this.connections.get(peerId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): IP2PConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Check if connected to a peer
   */
  isConnected(peerId: string): boolean {
    const conn = this.connections.get(peerId);
    return conn?.state === 'connected' && conn?.dataChannelState === 'open';
  }

  // ===========================================================================
  // Message Sending
  // ===========================================================================

  /**
   * Send a message to a peer
   */
  async send(peerId: string, message: IP2PMessage): Promise<boolean> {
    const connection = this.connections.get(peerId);
    if (!connection || connection.state !== 'connected') {
      return false;
    }

    // Serialize message
    const data = JSON.stringify(message);
    const bytes = new TextEncoder().encode(data).length;

    // Update stats
    connection.bytesSent += bytes;

    // In a full implementation, this would send via RTCDataChannel
    // For now, simulate delivery
    return true;
  }

  /**
   * Broadcast a message to all connected peers
   */
  async broadcast(message: IP2PMessage): Promise<number> {
    let sent = 0;
    const peerIds = Array.from(this.connections.keys());
    for (const peerId of peerIds) {
      if (await this.send(peerId, message)) {
        sent++;
      }
    }
    return sent;
  }

  // ===========================================================================
  // Message Receiving
  // ===========================================================================

  /**
   * Handle a received message (called from data channel)
   */
  async handleMessage(peerId: string, data: string): Promise<void> {
    try {
      const message = JSON.parse(data) as IP2PMessage;

      // Update connection stats
      const connection = this.connections.get(peerId);
      if (connection) {
        connection.bytesReceived += new TextEncoder().encode(data).length;
      }

      // Handle built-in message types
      switch (message.type) {
        case 'ping':
          await this.handlePing(peerId, message);
          return;
        case 'pong':
          this.handlePong(peerId, message);
          return;
      }

      // Dispatch to registered handlers
      const handlers = this.messageHandlers.get(message.type) || [];
      for (const handler of handlers) {
        await handler(peerId, message);
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  /**
   * Handle signaling message (for WebRTC setup)
   */
  async handleSignaling(message: ISignalingMessage): Promise<void> {
    // In a full implementation, this would:
    // - Handle offers by creating answers
    // - Handle answers by setting remote description
    // - Handle ICE candidates by adding them

    // For now, just log
    console.log('Received signaling:', message.type, 'from', message.sourceId);
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  /**
   * Handle ping message
   */
  private async handlePing(peerId: string, message: IP2PMessage): Promise<void> {
    const payload = message.payload as { timestamp: number };
    const pong = createPong(this.myId, payload.timestamp);
    await this.send(peerId, pong);
  }

  /**
   * Handle pong message
   */
  private handlePong(peerId: string, message: IP2PMessage): void {
    const payload = message.payload as {
      pingTimestamp: number;
      pongTimestamp: number;
    };
    const rtt = Date.now() - payload.pingTimestamp;

    const connection = this.connections.get(peerId);
    if (connection) {
      connection.rtt = rtt;
    }
  }

  /**
   * Start ping interval for a peer
   */
  private startPingInterval(peerId: string): void {
    this.stopPingInterval(peerId);

    const interval = setInterval(async () => {
      if (this.isConnected(peerId)) {
        const ping = createPing(this.myId);
        await this.send(peerId, ping);
      }
    }, PING_INTERVAL);

    this.pingIntervals.set(peerId, interval);
  }

  /**
   * Stop ping interval for a peer
   */
  private stopPingInterval(peerId: string): void {
    const interval = this.pingIntervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(peerId);
    }
  }

  /**
   * Notify connection state change
   */
  private notifyConnectionState(
    peerId: string,
    state: P2PConnectionState
  ): void {
    if (this.connectionStateHandler) {
      this.connectionStateHandler(peerId, state);
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let p2pTransport: P2PTransport | null = null;

export function getP2PTransport(myId?: string): P2PTransport {
  if (!p2pTransport) {
    if (!myId) {
      throw new Error('P2P Transport requires myId for first initialization');
    }
    p2pTransport = new P2PTransport(myId);
  } else if (myId && myId !== p2pTransport.getMyId()) {
    console.warn(
      `getP2PTransport called with different myId (${myId}) than initialized (${p2pTransport.getMyId()}). ` +
        'Using existing instance. Call resetP2PTransport() first if you need to reinitialize.'
    );
  }
  return p2pTransport;
}

/**
 * Reset the singleton (for testing)
 */
export function resetP2PTransport(): void {
  if (p2pTransport) {
    p2pTransport.disconnectAll();
  }
  p2pTransport = null;
}
