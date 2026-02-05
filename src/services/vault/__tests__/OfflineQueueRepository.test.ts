/**
 * Offline Queue Repository Tests
 *
 * Comprehensive tests for the OfflineQueueRepository class covering
 * message queuing, status management, and statistics operations.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IStoredQueuedMessage,
  QueuedMessageStatus,
  P2PMessageType,
} from '@/types/vault';

import {
  OfflineQueueRepository,
  getOfflineQueueRepository,
  resetOfflineQueueRepository,
} from '../OfflineQueueRepository';

// =============================================================================
// Mock Setup
// =============================================================================

interface MockStatement {
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
}

const createMockStatement = (
  returnValue?: unknown,
  changes = 0,
): MockStatement => ({
  run: jest.fn().mockReturnValue({ changes }),
  get: jest.fn().mockReturnValue(returnValue),
  all: jest.fn().mockReturnValue(returnValue ?? []),
});

const mockDb = {
  exec: jest.fn(),
  prepare: jest.fn(),
};

const mockSQLiteService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDb),
};

jest.mock('@/services/persistence', () => ({
  getSQLiteService: () => mockSQLiteService,
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234';
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: jest.fn().mockReturnValue(mockUUID),
  },
});

// =============================================================================
// Test Data Helpers
// =============================================================================

const createMockStoredMessage = (
  overrides: Partial<IStoredQueuedMessage> = {},
): IStoredQueuedMessage => ({
  id: 'msg-test-123',
  target_peer_id: 'PEER-ABCD-1234',
  message_type: 'change' as P2PMessageType,
  payload: '{"type":"change","data":{}}',
  queued_at: '2024-01-01T00:00:00.000Z',
  expires_at: '2024-01-08T00:00:00.000Z',
  attempts: 0,
  last_attempt_at: null,
  status: 'pending' as QueuedMessageStatus,
  priority: 0,
  size_bytes: 50,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('OfflineQueueRepository', () => {
  let repository: OfflineQueueRepository;
  let mockStatement: MockStatement;

  beforeEach(() => {
    jest.clearAllMocks();
    resetOfflineQueueRepository();
    repository = new OfflineQueueRepository();

    mockStatement = createMockStatement();
    mockDb.prepare.mockReturnValue(mockStatement);
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialize', () => {
    it('should create offline_queue table on first call', async () => {
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS offline_queue'),
      );
    });

    it('should create required columns', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('id TEXT PRIMARY KEY'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('target_peer_id TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('message_type TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('payload TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('queued_at TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('expires_at TEXT NOT NULL'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('attempts INTEGER NOT NULL DEFAULT 0'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('last_attempt_at TEXT'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining("status TEXT NOT NULL DEFAULT 'pending'"),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('priority INTEGER NOT NULL DEFAULT 0'),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('size_bytes INTEGER NOT NULL'),
      );
    });

    it('should create required indexes', async () => {
      await repository.initialize();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_offline_queue_peer',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_offline_queue_status',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_offline_queue_expires',
        ),
      );
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_offline_queue_priority',
        ),
      );
    });

    it('should only initialize once', async () => {
      await repository.initialize();
      await repository.initialize();
      await repository.initialize();

      expect(mockSQLiteService.initialize).toHaveBeenCalledTimes(1);
      expect(mockDb.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Enqueue
  // ===========================================================================

  describe('enqueue', () => {
    it('should enqueue a message with default options', async () => {
      const result = await repository.enqueue(
        'PEER-1234',
        'change',
        '{"data":"test"}',
      );

      expect(result.id).toBe(`msg-${mockUUID}`);
      expect(result.targetPeerId).toBe('PEER-1234');
      expect(result.messageType).toBe('change');
      expect(result.payload).toBe('{"data":"test"}');
      expect(result.attempts).toBe(0);
      expect(result.lastAttemptAt).toBeNull();
      expect(result.status).toBe('pending');
      expect(result.priority).toBe(0);
      expect(result.sizeBytes).toBe(
        new TextEncoder().encode('{"data":"test"}').length,
      );
    });

    it('should enqueue with custom expiry time', async () => {
      const customExpiryMs = 24 * 60 * 60 * 1000; // 1 day

      const result = await repository.enqueue('PEER-1234', 'change', '{}', {
        expiryMs: customExpiryMs,
      });

      // Verify expiresAt is approximately 1 day from now
      const queuedAt = new Date(result.queuedAt).getTime();
      const expiresAt = new Date(result.expiresAt).getTime();
      const diff = expiresAt - queuedAt;

      expect(diff).toBeCloseTo(customExpiryMs, -3); // Allow 1 second tolerance
    });

    it('should enqueue with custom priority', async () => {
      const result = await repository.enqueue('PEER-1234', 'change', '{}', {
        priority: 10,
      });

      expect(result.priority).toBe(10);
    });

    it('should calculate size in bytes correctly for unicode', async () => {
      const unicodePayload = '{"name":"?????????","emoji":"????????????"}';

      const result = await repository.enqueue(
        'PEER-1234',
        'change',
        unicodePayload,
      );

      expect(result.sizeBytes).toBe(
        new TextEncoder().encode(unicodePayload).length,
      );
    });

    it('should insert message into database', async () => {
      await repository.enqueue('PEER-1234', 'sync_request', '{"from":0}');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offline_queue'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        `msg-${mockUUID}`,
        'PEER-1234',
        'sync_request',
        '{"from":0}',
        expect.any(String), // queuedAt
        expect.any(String), // expiresAt
        0, // attempts
        null, // lastAttemptAt
        'pending', // status
        0, // priority
        expect.any(Number), // sizeBytes
      );
    });

    it('should handle all P2P message types', async () => {
      const messageTypes: P2PMessageType[] = [
        'handshake',
        'handshake_ack',
        'sync_request',
        'sync_response',
        'change',
        'change_ack',
        'ping',
        'pong',
        'error',
      ];

      for (const messageType of messageTypes) {
        const result = await repository.enqueue('PEER-1234', messageType, '{}');
        expect(result.messageType).toBe(messageType);
      }
    });
  });

  // ===========================================================================
  // Get Pending For Peer
  // ===========================================================================

  describe('getPendingForPeer', () => {
    it('should return pending messages for peer', async () => {
      const messages = [
        createMockStoredMessage({ id: 'msg-1', priority: 10 }),
        createMockStoredMessage({ id: 'msg-2', priority: 5 }),
      ];
      mockStatement.all.mockReturnValue(messages);

      const result = await repository.getPendingForPeer('PEER-1234');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE target_peer_id = ? AND status = 'pending'",
        ),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY priority DESC, queued_at ASC'),
      );
      expect(mockStatement.all).toHaveBeenCalledWith('PEER-1234', 50);
      expect(result).toHaveLength(2);
    });

    it('should respect custom limit', async () => {
      mockStatement.all.mockReturnValue([]);

      await repository.getPendingForPeer('PEER-1234', 10);

      expect(mockStatement.all).toHaveBeenCalledWith('PEER-1234', 10);
    });

    it('should use default limit of 50', async () => {
      mockStatement.all.mockReturnValue([]);

      await repository.getPendingForPeer('PEER-1234');

      expect(mockStatement.all).toHaveBeenCalledWith('PEER-1234', 50);
    });

    it('should return empty array when no pending messages', async () => {
      mockStatement.all.mockReturnValue([]);

      const result = await repository.getPendingForPeer('PEER-1234');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // Get All Pending
  // ===========================================================================

  describe('getAllPending', () => {
    it('should return all pending messages', async () => {
      const messages = [
        createMockStoredMessage({ id: 'msg-1', target_peer_id: 'PEER-A' }),
        createMockStoredMessage({ id: 'msg-2', target_peer_id: 'PEER-B' }),
      ];
      mockStatement.all.mockReturnValue(messages);

      const result = await repository.getAllPending();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'pending'"),
      );
      expect(mockStatement.all).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(2);
    });

    it('should respect custom limit', async () => {
      mockStatement.all.mockReturnValue([]);

      await repository.getAllPending(25);

      expect(mockStatement.all).toHaveBeenCalledWith(25);
    });
  });

  // ===========================================================================
  // Get By ID
  // ===========================================================================

  describe('getById', () => {
    it('should return message when found', async () => {
      const storedMessage = createMockStoredMessage();
      mockStatement.get.mockReturnValue(storedMessage);

      const result = await repository.getById('msg-test-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM offline_queue WHERE id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('msg-test-123');
      expect(result?.id).toBe('msg-test-123');
    });

    it('should return null when message not found', async () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // Mark Sending
  // ===========================================================================

  describe('markSending', () => {
    it('should update status to sending and increment attempts', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.markSending('msg-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "SET status = 'sending', attempts = attempts + 1",
        ),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE id = ? AND status IN ('pending', 'failed')",
        ),
      );
      expect(result).toBe(true);
    });

    it('should set last_attempt_at to current time', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      await repository.markSending('msg-123');

      expect(mockStatement.run).toHaveBeenCalledWith(
        expect.any(String), // current ISO timestamp
        'msg-123',
      );
    });

    it('should return false when message not found or not in valid state', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.markSending('msg-123');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Mark Sent
  // ===========================================================================

  describe('markSent', () => {
    it('should update status to sent', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.markSent('msg-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "UPDATE offline_queue SET status = 'sent' WHERE id = ?",
      );
      expect(mockStatement.run).toHaveBeenCalledWith('msg-123');
      expect(result).toBe(true);
    });

    it('should return false when message not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.markSent('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Mark Failed
  // ===========================================================================

  describe('markFailed', () => {
    it('should set status to pending when under max attempts', async () => {
      const messageWithFewAttempts = createMockStoredMessage({ attempts: 2 });

      // First call: getById
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) {
          return {
            get: jest.fn().mockReturnValue(messageWithFewAttempts),
            run: jest.fn().mockReturnValue({ changes: 1 }),
            all: jest.fn().mockReturnValue([]),
          };
        }
        return {
          get: jest.fn(),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn(),
        };
      });

      const result = await repository.markFailed('msg-123');

      expect(result).toBe(true);
    });

    it('should set status to failed when max attempts exceeded', async () => {
      const messageAtMaxAttempts = createMockStoredMessage({ attempts: 5 });

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) {
          return {
            get: jest.fn().mockReturnValue(messageAtMaxAttempts),
            run: jest.fn().mockReturnValue({ changes: 1 }),
            all: jest.fn().mockReturnValue([]),
          };
        }
        return {
          get: jest.fn(),
          run: jest.fn().mockReturnValue({ changes: 1 }),
          all: jest.fn(),
        };
      });

      await repository.markFailed('msg-123');

      // Verify the final status update was called
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE offline_queue SET status = ? WHERE id = ?',
      );
    });

    it('should return false when message not found', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
        run: jest.fn().mockReturnValue({ changes: 0 }),
        all: jest.fn(),
      });

      const result = await repository.markFailed('non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Mark Expired
  // ===========================================================================

  describe('markExpired', () => {
    it('should mark expired messages', async () => {
      mockStatement.run.mockReturnValue({ changes: 5 });

      const result = await repository.markExpired();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'expired'"),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE status IN ('pending', 'failed') AND expires_at < ?",
        ),
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no expired messages', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.markExpired();

      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // Delete Operations
  // ===========================================================================

  describe('delete', () => {
    it('should delete message by ID', async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = await repository.delete('msg-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM offline_queue WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('msg-123');
      expect(result).toBe(true);
    });

    it('should return false when message not found', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('deleteSent', () => {
    it('should delete all sent messages', async () => {
      mockStatement.run.mockReturnValue({ changes: 10 });

      const result = await repository.deleteSent();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "DELETE FROM offline_queue WHERE status = 'sent'",
      );
      expect(result).toBe(10);
    });

    it('should return 0 when no sent messages', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.deleteSent();

      expect(result).toBe(0);
    });
  });

  describe('deleteExpired', () => {
    it('should delete all expired messages', async () => {
      mockStatement.run.mockReturnValue({ changes: 7 });

      const result = await repository.deleteExpired();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "DELETE FROM offline_queue WHERE status = 'expired'",
      );
      expect(result).toBe(7);
    });
  });

  describe('deleteForPeer', () => {
    it('should delete all messages for a peer', async () => {
      mockStatement.run.mockReturnValue({ changes: 15 });

      const result = await repository.deleteForPeer('PEER-1234');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM offline_queue WHERE target_peer_id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('PEER-1234');
      expect(result).toBe(15);
    });

    it('should return 0 when no messages for peer', async () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await repository.deleteForPeer('PEER-EMPTY');

      expect(result).toBe(0);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete messages older than specified date', async () => {
      mockStatement.run.mockReturnValue({ changes: 20 });
      const cutoffDate = '2024-01-01T00:00:00.000Z';

      const result = await repository.deleteOlderThan(cutoffDate);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM offline_queue WHERE queued_at < ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(cutoffDate);
      expect(result).toBe(20);
    });
  });

  // ===========================================================================
  // Get Peer Summary
  // ===========================================================================

  describe('getPeerSummary', () => {
    it('should return summary for peer with pending messages', async () => {
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("status = 'pending'") && sql.includes('COUNT')) {
          return {
            get: jest.fn().mockReturnValue({
              count: 5,
              size: 1500,
              oldest: '2024-01-01T00:00:00.000Z',
            }),
            run: jest.fn(),
            all: jest.fn(),
          };
        }
        if (sql.includes("status = 'failed'")) {
          return {
            get: jest.fn().mockReturnValue({ count: 2 }),
            run: jest.fn(),
            all: jest.fn(),
          };
        }
        if (sql.includes("status = 'sent'")) {
          return {
            get: jest
              .fn()
              .mockReturnValue({ last: '2024-01-10T12:00:00.000Z' }),
            run: jest.fn(),
            all: jest.fn(),
          };
        }
        return createMockStatement();
      });

      const result = await repository.getPeerSummary('PEER-1234');

      expect(result.peerId).toBe('PEER-1234');
      expect(result.pendingCount).toBe(5);
      expect(result.pendingSizeBytes).toBe(1500);
      expect(result.oldestPending).toBe('2024-01-01T00:00:00.000Z');
      expect(result.failedCount).toBe(2);
      expect(result.lastSuccessAt).toBe('2024-01-10T12:00:00.000Z');
    });

    it('should handle peer with no messages', async () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest
          .fn()
          .mockReturnValue({ count: 0, size: null, oldest: null, last: null }),
        run: jest.fn(),
        all: jest.fn(),
      }));

      const result = await repository.getPeerSummary('PEER-EMPTY');

      expect(result.pendingCount).toBe(0);
      expect(result.pendingSizeBytes).toBe(0);
      expect(result.oldestPending).toBeNull();
      expect(result.failedCount).toBe(0);
      expect(result.lastSuccessAt).toBeNull();
    });
  });

  // ===========================================================================
  // Get Stats
  // ===========================================================================

  describe('getStats', () => {
    it('should return overall queue statistics', async () => {
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)') && sql.includes('SUM(size_bytes)')) {
          return {
            get: jest.fn().mockReturnValue({ count: 100, size: 50000 }),
            run: jest.fn(),
            all: jest.fn(),
          };
        }
        if (sql.includes('GROUP BY status')) {
          return {
            get: jest.fn(),
            run: jest.fn(),
            all: jest.fn().mockReturnValue([
              { status: 'pending', count: 60 },
              { status: 'sending', count: 5 },
              { status: 'sent', count: 20 },
              { status: 'failed', count: 10 },
              { status: 'expired', count: 5 },
            ]),
          };
        }
        if (sql.includes('COUNT(DISTINCT target_peer_id)')) {
          return {
            get: jest.fn().mockReturnValue({ count: 15 }),
            run: jest.fn(),
            all: jest.fn(),
          };
        }
        if (sql.includes('expires_at <')) {
          return {
            get: jest.fn().mockReturnValue({ count: 3 }),
            run: jest.fn(),
            all: jest.fn(),
          };
        }
        return createMockStatement();
      });

      const result = await repository.getStats();

      expect(result.totalMessages).toBe(100);
      expect(result.totalSizeBytes).toBe(50000);
      expect(result.targetPeerCount).toBe(15);
      expect(result.expiringSoon).toBe(3);
      expect(result.byStatus.pending).toBe(60);
      expect(result.byStatus.sending).toBe(5);
      expect(result.byStatus.sent).toBe(20);
      expect(result.byStatus.failed).toBe(10);
      expect(result.byStatus.expired).toBe(5);
    });

    it('should handle empty queue', async () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn().mockReturnValue({ count: 0, size: null }),
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
      }));

      const result = await repository.getStats();

      expect(result.totalMessages).toBe(0);
      expect(result.totalSizeBytes).toBe(0);
      expect(result.targetPeerCount).toBe(0);
      expect(result.expiringSoon).toBe(0);
      expect(result.byStatus.pending).toBe(0);
      expect(result.byStatus.sending).toBe(0);
      expect(result.byStatus.sent).toBe(0);
      expect(result.byStatus.failed).toBe(0);
      expect(result.byStatus.expired).toBe(0);
    });
  });

  // ===========================================================================
  // Singleton Functions
  // ===========================================================================

  describe('Singleton Functions', () => {
    beforeEach(() => {
      resetOfflineQueueRepository();
    });

    it('getOfflineQueueRepository should return singleton instance', () => {
      const instance1 = getOfflineQueueRepository();
      const instance2 = getOfflineQueueRepository();

      expect(instance1).toBe(instance2);
    });

    it('resetOfflineQueueRepository should clear singleton', () => {
      const instance1 = getOfflineQueueRepository();
      resetOfflineQueueRepository();
      const instance2 = getOfflineQueueRepository();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // Row Conversion
  // ===========================================================================

  describe('rowToMessage conversion', () => {
    it('should correctly map all stored fields', async () => {
      const storedMessage: IStoredQueuedMessage = {
        id: 'msg-full',
        target_peer_id: 'PEER-FULL',
        message_type: 'sync_response',
        payload: '{"changes":[]}',
        queued_at: '2024-06-15T10:00:00.000Z',
        expires_at: '2024-06-22T10:00:00.000Z',
        attempts: 3,
        last_attempt_at: '2024-06-16T08:00:00.000Z',
        status: 'failed',
        priority: 5,
        size_bytes: 100,
      };
      mockStatement.get.mockReturnValue(storedMessage);

      const result = await repository.getById('msg-full');

      expect(result).toEqual({
        id: 'msg-full',
        targetPeerId: 'PEER-FULL',
        messageType: 'sync_response',
        payload: '{"changes":[]}',
        queuedAt: '2024-06-15T10:00:00.000Z',
        expiresAt: '2024-06-22T10:00:00.000Z',
        attempts: 3,
        lastAttemptAt: '2024-06-16T08:00:00.000Z',
        status: 'failed',
        priority: 5,
        sizeBytes: 100,
      });
    });

    it('should handle null last_attempt_at', async () => {
      const storedMessage = createMockStoredMessage({ last_attempt_at: null });
      mockStatement.get.mockReturnValue(storedMessage);

      const result = await repository.getById('msg-test');

      expect(result?.lastAttemptAt).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle very large payload', async () => {
      const largePayload = '{"data":"' + 'x'.repeat(100000) + '"}';

      const result = await repository.enqueue(
        'PEER-1234',
        'change',
        largePayload,
      );

      expect(result.sizeBytes).toBe(
        new TextEncoder().encode(largePayload).length,
      );
    });

    it('should handle empty payload', async () => {
      const result = await repository.enqueue('PEER-1234', 'ping', '');

      expect(result.payload).toBe('');
      expect(result.sizeBytes).toBe(0);
    });

    it('should handle high priority values', async () => {
      const result = await repository.enqueue('PEER-1234', 'change', '{}', {
        priority: 999999,
      });

      expect(result.priority).toBe(999999);
    });

    it('should handle negative priority values', async () => {
      const result = await repository.enqueue('PEER-1234', 'change', '{}', {
        priority: -10,
      });

      expect(result.priority).toBe(-10);
    });

    it('should handle special characters in peer ID', async () => {
      const specialPeerId = 'PEER-!@#$%^&*()_+-=';

      const result = await repository.enqueue(specialPeerId, 'ping', '{}');

      expect(result.targetPeerId).toBe(specialPeerId);
    });

    it('should handle all queue statuses', async () => {
      const statuses: QueuedMessageStatus[] = [
        'pending',
        'sending',
        'sent',
        'failed',
        'expired',
      ];

      for (const status of statuses) {
        const storedMessage = createMockStoredMessage({ status });
        mockStatement.get.mockReturnValue(storedMessage);

        const result = await repository.getById('msg-test');
        expect(result?.status).toBe(status);
      }
    });
  });
});
