/**
 * Offline Queue Service
 *
 * Business logic for managing offline message queue.
 * Handles queuing, retry logic, and expiry management.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IQueuedMessage,
  IPeerQueueSummary,
  IQueueStats,
  P2PMessageType,
  IP2PMessage,
} from '@/types/vault';

import { createSingleton } from '../core/createSingleton';
import {
  OfflineQueueRepository,
  getOfflineQueueRepository,
} from './OfflineQueueRepository';
import { getP2PTransport } from './P2PTransport';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for queuing a message
 */
export interface IQueueOptions {
  /** Expiry time in milliseconds (default: 7 days) */
  expiryMs?: number;
  /** Priority (higher = more important, default: 0) */
  priority?: number;
}

/**
 * Result of a flush operation
 */
export interface IFlushResult {
  sent: number;
  failed: number;
  expired: number;
  remaining: number;
}

/**
 * Callback when a message is about to be sent
 */
export type OnSendCallback = (message: IQueuedMessage) => Promise<boolean>;

// =============================================================================
// Service
// =============================================================================

/**
 * Service for managing offline message queue
 */
export class OfflineQueueService {
  private repository: OfflineQueueRepository;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private expiryInterval: ReturnType<typeof setInterval> | null = null;

  constructor(repository?: OfflineQueueRepository) {
    this.repository = repository ?? getOfflineQueueRepository();
  }

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  /**
   * Queue a message for delivery to an offline peer
   */
  async queueMessage(
    targetPeerId: string,
    messageType: P2PMessageType,
    payload: string | object,
    options?: IQueueOptions,
  ): Promise<IQueuedMessage> {
    const payloadStr =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    return this.repository.enqueue(targetPeerId, messageType, payloadStr, {
      expiryMs: options?.expiryMs,
      priority: options?.priority,
    });
  }

  /**
   * Queue a P2P message for delivery
   */
  async queueP2PMessage(
    targetPeerId: string,
    message: IP2PMessage,
    options?: IQueueOptions,
  ): Promise<IQueuedMessage> {
    return this.queueMessage(
      targetPeerId,
      message.type,
      JSON.stringify(message),
      options,
    );
  }

  /**
   * Get pending messages for a peer
   */
  async getPendingForPeer(
    peerId: string,
    limit = 50,
  ): Promise<IQueuedMessage[]> {
    return this.repository.getPendingForPeer(peerId, limit);
  }

  /**
   * Get all pending messages
   */
  async getAllPending(limit = 100): Promise<IQueuedMessage[]> {
    return this.repository.getAllPending(limit);
  }

  /**
   * Get queue summary for a peer
   */
  async getPeerSummary(peerId: string): Promise<IPeerQueueSummary> {
    return this.repository.getPeerSummary(peerId);
  }

  /**
   * Get overall queue statistics
   */
  async getStats(): Promise<IQueueStats> {
    return this.repository.getStats();
  }

  // ===========================================================================
  // Flush (Send Pending Messages)
  // ===========================================================================

  /**
   * Attempt to send all pending messages to a peer
   */
  async flushPeer(peerId: string): Promise<IFlushResult> {
    let sent = 0;
    let failed = 0;

    // First, mark any expired messages
    const expired = await this.repository.markExpired();

    // Get pending messages
    const pending = await this.repository.getPendingForPeer(peerId);

    // Try to get transport
    let transport;
    try {
      transport = getP2PTransport();
    } catch {
      // Transport not initialized, can't send
      return {
        sent: 0,
        failed: pending.length,
        expired,
        remaining: pending.length,
      };
    }

    // Check if peer is connected
    const connection = transport.getConnection(peerId);
    if (!connection || connection.state !== 'connected') {
      // Peer not connected, nothing to do
      return { sent: 0, failed: 0, expired, remaining: pending.length };
    }

    // Send each message
    for (const message of pending) {
      await this.repository.markSending(message.id);

      try {
        // Parse the stored payload back into a P2P message
        const p2pMessage = JSON.parse(message.payload) as IP2PMessage;
        const success = await transport.send(peerId, p2pMessage);
        if (success) {
          await this.repository.markSent(message.id);
          sent++;
        } else {
          await this.repository.markFailed(message.id);
          failed++;
        }
      } catch {
        await this.repository.markFailed(message.id);
        failed++;
      }
    }

    // Get remaining count
    const remaining = await this.repository.getPendingForPeer(peerId);

    return { sent, failed, expired, remaining: remaining.length };
  }

  /**
   * Attempt to send all pending messages to all connected peers
   */
  async flushAll(): Promise<Record<string, IFlushResult>> {
    const results: Record<string, IFlushResult> = {};

    // Get all pending messages
    const pending = await this.repository.getAllPending(1000);

    // Group by peer
    const peerIds = Array.from(new Set(pending.map((m) => m.targetPeerId)));

    // Flush each peer
    for (const peerId of peerIds) {
      results[peerId] = await this.flushPeer(peerId);
    }

    return results;
  }

  // ===========================================================================
  // Expiry Management
  // ===========================================================================

  /**
   * Mark expired messages and optionally delete them
   */
  async processExpired(deleteExpired = false): Promise<number> {
    const marked = await this.repository.markExpired();

    if (deleteExpired) {
      await this.repository.deleteExpired();
    }

    return marked;
  }

  /**
   * Delete sent messages (cleanup)
   */
  async cleanupSent(): Promise<number> {
    return this.repository.deleteSent();
  }

  /**
   * Delete all messages for a peer
   */
  async clearPeerQueue(peerId: string): Promise<number> {
    return this.repository.deleteForPeer(peerId);
  }

  /**
   * Delete messages older than a specific date
   */
  async purgeOlderThan(date: Date): Promise<number> {
    return this.repository.deleteOlderThan(date.toISOString());
  }

  // ===========================================================================
  // Background Processing
  // ===========================================================================

  /**
   * Start background processing (flush and expiry)
   */
  startBackgroundProcessing(options?: {
    flushIntervalMs?: number;
    expiryIntervalMs?: number;
  }): void {
    const flushInterval = options?.flushIntervalMs ?? 30000; // 30 seconds
    const expiryInterval = options?.expiryIntervalMs ?? 300000; // 5 minutes

    this.stopBackgroundProcessing();

    // Periodic flush
    this.flushInterval = setInterval(async () => {
      try {
        await this.flushAll();
      } catch (error) {
        console.error('Failed to flush offline queue:', error);
      }
    }, flushInterval);

    // Periodic expiry check
    this.expiryInterval = setInterval(async () => {
      try {
        await this.processExpired(true);
        await this.cleanupSent();
      } catch (error) {
        console.error('Failed to process expired messages:', error);
      }
    }, expiryInterval);
  }

  /**
   * Stop background processing
   */
  stopBackgroundProcessing(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    if (this.expiryInterval) {
      clearInterval(this.expiryInterval);
      this.expiryInterval = null;
    }
  }

  // ===========================================================================
  // Relay Store-and-Forward
  // ===========================================================================

  /**
   * Store a message received from a relay for a peer
   * This is used when the relay forwards a message for an offline peer
   */
  async storeFromRelay(
    targetPeerId: string,
    message: IP2PMessage,
    relayId: string,
    expiryMs?: number,
  ): Promise<IQueuedMessage> {
    // Add relay metadata to the message
    const enrichedMessage = {
      ...message,
      _relayId: relayId,
      _relayedAt: new Date().toISOString(),
    };

    return this.queueMessage(
      targetPeerId,
      message.type,
      JSON.stringify(enrichedMessage),
      { expiryMs: expiryMs ?? 7 * 24 * 60 * 60 * 1000, priority: 1 }, // Higher priority for relayed
    );
  }

  /**
   * Get messages that should be forwarded to a relay
   * Returns pending messages for peers that are not directly connected
   */
  async getMessagesForRelay(): Promise<IQueuedMessage[]> {
    const pending = await this.repository.getAllPending(100);

    // Filter to messages for disconnected peers
    let transport;
    try {
      transport = getP2PTransport();
    } catch {
      return pending; // All messages if transport not available
    }

    return pending.filter((msg) => {
      const connection = transport.getConnection(msg.targetPeerId);
      return !connection || connection.state !== 'connected';
    });
  }
}

// =============================================================================
// Singleton
// =============================================================================

const offlineQueueServiceFactory = createSingleton(
  () => new OfflineQueueService(),
  (instance) => instance.stopBackgroundProcessing(),
);

export function getOfflineQueueService(): OfflineQueueService {
  return offlineQueueServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetOfflineQueueService(): void {
  offlineQueueServiceFactory.reset();
}
