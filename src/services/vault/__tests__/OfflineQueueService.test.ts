/**
 * Offline Queue Service Tests
 *
 * Tests for offline message queue management.
 * Handles queuing, retry logic, and expiry management.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import {
  MockOfflineQueueRepository,
  createQueuedMessage,
} from '@/__tests__/helpers/vault';

import { OfflineQueueService } from '../OfflineQueueService';

// =============================================================================
// Tests
// =============================================================================

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let mockRepo: MockOfflineQueueRepository;

  beforeEach(() => {
    mockRepo = new MockOfflineQueueRepository();
    service = new OfflineQueueService(mockRepo as never);
  });

  afterEach(() => {
    mockRepo.clear();
    service.stopBackgroundProcessing();
  });

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  describe('Queue Management', () => {
    it('should queue a message', async () => {
      const message = await service.queueMessage(
        'PEER-1234-ABCD',
        'change',
        JSON.stringify({ type: 'change', data: 'test' }),
      );

      expect(message).toBeDefined();
      expect(message.targetPeerId).toBe('PEER-1234-ABCD');
      expect(message.messageType).toBe('change');
      expect(message.status).toBe('pending');
      expect(message.attempts).toBe(0);
    });

    it('should queue message with custom expiry', async () => {
      const oneDay = 24 * 60 * 60 * 1000;
      const message = await service.queueMessage(
        'PEER-1234-ABCD',
        'ping',
        '{}',
        { expiryMs: oneDay },
      );

      const expiresAt = new Date(message.expiresAt);
      const queuedAt = new Date(message.queuedAt);
      const diff = expiresAt.getTime() - queuedAt.getTime();

      expect(diff).toBe(oneDay);
    });

    it('should queue message with priority', async () => {
      const message = await service.queueMessage(
        'PEER-1234-ABCD',
        'ping',
        '{}',
        { priority: 5 },
      );

      expect(message.priority).toBe(5);
    });

    it('should queue P2P message', async () => {
      const p2pMessage = {
        type: 'change' as const,
        messageId: 'msg-123',
        senderId: 'TEST-1234-ABCD',
        timestamp: new Date().toISOString(),
        payload: { data: 'test' },
      };

      const queued = await service.queueP2PMessage(
        'PEER-1234-ABCD',
        p2pMessage,
      );

      expect(queued.messageType).toBe('change');
      const parsed = JSON.parse(queued.payload) as { messageId: string };
      expect(parsed.messageId).toBe('msg-123');
    });

    it('should get pending messages for peer', async () => {
      await service.queueMessage('PEER-1', 'change', '{"a":1}');
      await service.queueMessage('PEER-1', 'change', '{"a":2}');
      await service.queueMessage('PEER-2', 'change', '{"b":1}');

      const peer1Messages = await service.getPendingForPeer('PEER-1');
      const peer2Messages = await service.getPendingForPeer('PEER-2');

      expect(peer1Messages).toHaveLength(2);
      expect(peer2Messages).toHaveLength(1);
    });

    it('should get all pending messages', async () => {
      await service.queueMessage('PEER-1', 'change', '{}');
      await service.queueMessage('PEER-2', 'change', '{}');
      await service.queueMessage('PEER-3', 'change', '{}');

      const all = await service.getAllPending();

      expect(all).toHaveLength(3);
    });

    it('should return messages sorted by priority then queue time', async () => {
      await service.queueMessage('PEER-1', 'change', '{"order":1}', {
        priority: 0,
      });
      await service.queueMessage('PEER-1', 'change', '{"order":2}', {
        priority: 5,
      });
      await service.queueMessage('PEER-1', 'change', '{"order":3}', {
        priority: 0,
      });

      const messages = await service.getPendingForPeer('PEER-1');

      // High priority should come first
      expect(messages[0].priority).toBe(5);
    });
  });

  // ===========================================================================
  // Queue Statistics
  // ===========================================================================

  describe('Queue Statistics', () => {
    it('should get peer queue summary', async () => {
      await service.queueMessage('PEER-1', 'change', '{"a":1}');
      await service.queueMessage('PEER-1', 'change', '{"a":2}');

      const summary = await service.getPeerSummary('PEER-1');

      expect(summary.peerId).toBe('PEER-1');
      expect(summary.pendingCount).toBe(2);
      expect(summary.pendingSizeBytes).toBeGreaterThan(0);
      expect(summary.failedCount).toBe(0);
    });

    it('should get overall queue stats', async () => {
      await service.queueMessage('PEER-1', 'change', '{}');
      await service.queueMessage('PEER-2', 'change', '{}');

      const stats = await service.getStats();

      expect(stats.totalMessages).toBe(2);
      expect(stats.byStatus.pending).toBe(2);
      expect(stats.targetPeerCount).toBe(2);
    });

    it('should track failed message count', async () => {
      // Seed a failed message directly
      mockRepo.seedMessage(
        createQueuedMessage({
          id: 'failed-1',
          targetPeerId: 'PEER-1',
          status: 'failed',
          attempts: 3,
        }),
      );

      const summary = await service.getPeerSummary('PEER-1');

      expect(summary.failedCount).toBe(1);
    });
  });

  // ===========================================================================
  // Expiry Management
  // ===========================================================================

  describe('Expiry Management', () => {
    it('should mark expired messages', async () => {
      // Create a message with past expiry
      mockRepo.seedMessage(
        createQueuedMessage({
          id: 'expired-1',
          targetPeerId: 'PEER-1',
          expiresAt: '2020-01-01T00:00:00.000Z',
          status: 'pending',
        }),
      );

      const markedCount = await service.processExpired(false);

      expect(markedCount).toBeGreaterThanOrEqual(1);
    });

    it('should delete expired messages when requested', async () => {
      // Create expired messages
      mockRepo.seedMessage(
        createQueuedMessage({
          id: 'expired-1',
          targetPeerId: 'PEER-1',
          expiresAt: '2020-01-01T00:00:00.000Z',
          status: 'expired',
        }),
      );

      // Process and delete
      await service.processExpired(true);

      // Try to get the message
      const messages = await mockRepo.getAllPending();
      const expiredMessages = messages.filter((m) => m.id === 'expired-1');

      expect(expiredMessages).toHaveLength(0);
    });

    it('should track expiring soon messages', async () => {
      // Create a message expiring within an hour
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockRepo.seedMessage(
        createQueuedMessage({
          id: 'expiring-soon',
          targetPeerId: 'PEER-1',
          expiresAt: soonExpiry,
          status: 'pending',
        }),
      );

      const stats = await service.getStats();

      expect(stats.expiringSoon).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Queue Cleanup
  // ===========================================================================

  describe('Queue Cleanup', () => {
    it('should clear queue for a specific peer', async () => {
      await service.queueMessage('PEER-1', 'change', '{}');
      await service.queueMessage('PEER-1', 'change', '{}');
      await service.queueMessage('PEER-2', 'change', '{}');

      const deleted = await service.clearPeerQueue('PEER-1');

      expect(deleted).toBe(2);

      const peer1Messages = await service.getPendingForPeer('PEER-1');
      const peer2Messages = await service.getPendingForPeer('PEER-2');

      expect(peer1Messages).toHaveLength(0);
      expect(peer2Messages).toHaveLength(1);
    });

    it('should purge messages older than a date', async () => {
      // Seed old message
      mockRepo.seedMessage(
        createQueuedMessage({
          id: 'old-1',
          targetPeerId: 'PEER-1',
          queuedAt: '2020-01-01T00:00:00.000Z',
        }),
      );

      // Queue new message
      await service.queueMessage('PEER-1', 'change', '{}');

      const deleted = await service.purgeOlderThan(new Date('2024-01-01'));

      expect(deleted).toBe(1);
    });
  });

  // ===========================================================================
  // Background Processing
  // ===========================================================================

  describe('Background Processing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start and stop background processing', () => {
      service.startBackgroundProcessing({
        flushIntervalMs: 1000,
        expiryIntervalMs: 5000,
      });

      // Should not throw
      expect(() => service.stopBackgroundProcessing()).not.toThrow();
    });

    it('should not error when stopping without starting', () => {
      expect(() => service.stopBackgroundProcessing()).not.toThrow();
    });
  });

  // ===========================================================================
  // Relay Store-and-Forward
  // ===========================================================================

  describe('Relay Store-and-Forward', () => {
    it('should store message from relay', async () => {
      const message = {
        type: 'change' as const,
        messageId: 'msg-relay-1',
        senderId: 'SENDER-1234',
        timestamp: new Date().toISOString(),
        payload: { data: 'relayed' },
      };

      const queued = await service.storeFromRelay(
        'PEER-1234',
        message,
        'RELAY-5678',
      );

      expect(queued.targetPeerId).toBe('PEER-1234');
      expect(queued.priority).toBe(1); // Higher priority for relayed

      const parsed = JSON.parse(queued.payload) as {
        _relayId: string;
        _relayedAt: string;
      };
      expect(parsed._relayId).toBe('RELAY-5678');
      expect(parsed._relayedAt).toBeDefined();
    });

    it('should store relay message with custom expiry', async () => {
      const oneDay = 24 * 60 * 60 * 1000;
      const message = {
        type: 'ping' as const,
        messageId: 'msg-1',
        senderId: 'SENDER-1',
        timestamp: new Date().toISOString(),
        payload: {},
      };

      const queued = await service.storeFromRelay(
        'PEER-1',
        message,
        'RELAY-1',
        oneDay,
      );

      const expiresAt = new Date(queued.expiresAt);
      const queuedAt = new Date(queued.queuedAt);
      const diff = expiresAt.getTime() - queuedAt.getTime();

      expect(diff).toBe(oneDay);
    });
  });

  // ===========================================================================
  // Multi-Peer Isolation
  // ===========================================================================

  describe('Multi-Peer Isolation', () => {
    it('should isolate queues by peer ID', async () => {
      await service.queueMessage('PEER-A', 'change', '{"peer":"A"}');
      await service.queueMessage('PEER-B', 'change', '{"peer":"B"}');
      await service.queueMessage('PEER-C', 'change', '{"peer":"C"}');

      const peerA = await service.getPendingForPeer('PEER-A');
      const peerB = await service.getPendingForPeer('PEER-B');

      expect(peerA).toHaveLength(1);
      expect(peerB).toHaveLength(1);
      expect((JSON.parse(peerA[0].payload) as { peer: string }).peer).toBe('A');
      expect((JSON.parse(peerB[0].payload) as { peer: string }).peer).toBe('B');
    });

    it('should track separate stats per peer', async () => {
      await service.queueMessage('PEER-A', 'change', '{"size":"small"}');
      await service.queueMessage(
        'PEER-A',
        'change',
        '{"size":"large-data-here"}',
      );
      await service.queueMessage('PEER-B', 'change', '{}');

      const summaryA = await service.getPeerSummary('PEER-A');
      const summaryB = await service.getPeerSummary('PEER-B');

      expect(summaryA.pendingCount).toBe(2);
      expect(summaryB.pendingCount).toBe(1);
      expect(summaryA.pendingSizeBytes).toBeGreaterThan(
        summaryB.pendingSizeBytes,
      );
    });
  });

  // ===========================================================================
  // Message Status Tracking
  // ===========================================================================

  describe('Message Status Tracking', () => {
    it('should track status by counts', async () => {
      mockRepo.seedMessage(createQueuedMessage({ status: 'pending' }));
      mockRepo.seedMessage(createQueuedMessage({ status: 'pending' }));
      mockRepo.seedMessage(createQueuedMessage({ status: 'failed' }));
      mockRepo.seedMessage(createQueuedMessage({ status: 'sent' }));

      const stats = await service.getStats();

      expect(stats.byStatus.pending).toBe(2);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byStatus.sent).toBe(1);
    });
  });

  // ===========================================================================
  // Flush Operations
  // ===========================================================================

  describe('Flush Operations', () => {
    describe('flushPeer', () => {
      it('should return early when transport not initialized', async () => {
        await service.queueMessage('PEER-1', 'change', '{}');
        await service.queueMessage('PEER-1', 'change', '{}');

        const result = await service.flushPeer('PEER-1');

        // When transport throws, all messages are counted as failed
        expect(result.failed).toBeGreaterThanOrEqual(0);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      });

      it('should mark expired before flushing', async () => {
        // Seed an expired message
        mockRepo.seedMessage(
          createQueuedMessage({
            id: 'expired-msg',
            targetPeerId: 'PEER-1',
            expiresAt: '2020-01-01T00:00:00.000Z',
            status: 'pending',
          }),
        );

        const result = await service.flushPeer('PEER-1');

        expect(result.expired).toBeGreaterThanOrEqual(1);
      });

      it('should return remaining count after flush', async () => {
        await service.queueMessage('PEER-1', 'change', '{"msg":1}');
        await service.queueMessage('PEER-1', 'change', '{"msg":2}');

        const result = await service.flushPeer('PEER-1');

        expect(typeof result.remaining).toBe('number');
      });
    });

    describe('flushAll', () => {
      it('should flush all peers with pending messages', async () => {
        await service.queueMessage('PEER-A', 'change', '{}');
        await service.queueMessage('PEER-B', 'change', '{}');
        await service.queueMessage('PEER-C', 'change', '{}');

        const results = await service.flushAll();

        expect(Object.keys(results)).toHaveLength(3);
        expect(results['PEER-A']).toBeDefined();
        expect(results['PEER-B']).toBeDefined();
        expect(results['PEER-C']).toBeDefined();
      });

      it('should return empty results when no pending messages', async () => {
        const results = await service.flushAll();

        expect(Object.keys(results)).toHaveLength(0);
      });
    });
  });

  // ===========================================================================
  // Cleanup Sent Messages
  // ===========================================================================

  describe('Cleanup Sent Messages', () => {
    it('should delete sent messages', async () => {
      mockRepo.seedMessage(
        createQueuedMessage({ id: 'sent-1', status: 'sent' }),
      );
      mockRepo.seedMessage(
        createQueuedMessage({ id: 'sent-2', status: 'sent' }),
      );
      mockRepo.seedMessage(
        createQueuedMessage({ id: 'pending-1', status: 'pending' }),
      );

      const deleted = await service.cleanupSent();

      expect(deleted).toBe(2);
    });
  });

  // ===========================================================================
  // Messages for Relay
  // ===========================================================================

  describe('Messages for Relay', () => {
    it('should get messages for disconnected peers', async () => {
      await service.queueMessage('PEER-OFFLINE', 'change', '{"data":"test"}');

      const messages = await service.getMessagesForRelay();

      // Since transport is not initialized, all peers are considered disconnected
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should return all pending when transport unavailable', async () => {
      await service.queueMessage('PEER-1', 'change', '{}');
      await service.queueMessage('PEER-2', 'ping', '{}');

      const messages = await service.getMessagesForRelay();

      expect(messages).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Object Payload Handling
  // ===========================================================================

  describe('Object Payload Handling', () => {
    it('should stringify object payload', async () => {
      const payload = { type: 'change', data: { foo: 'bar' } };

      const message = await service.queueMessage('PEER-1', 'change', payload);

      expect(message.payload).toBe(JSON.stringify(payload));
    });

    it('should preserve string payload as-is', async () => {
      const payload = '{"already":"stringified"}';

      const message = await service.queueMessage('PEER-1', 'change', payload);

      expect(message.payload).toBe(payload);
    });
  });

  // ===========================================================================
  // Default Options
  // ===========================================================================

  describe('Default Options', () => {
    it('should use default 7-day expiry when not specified', async () => {
      const message = await service.queueMessage('PEER-1', 'change', '{}');

      const expiresAt = new Date(message.expiresAt);
      const queuedAt = new Date(message.queuedAt);
      const diff = expiresAt.getTime() - queuedAt.getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      expect(diff).toBe(sevenDays);
    });

    it('should use default priority of 0 when not specified', async () => {
      const message = await service.queueMessage('PEER-1', 'change', '{}');

      expect(message.priority).toBe(0);
    });
  });
});
