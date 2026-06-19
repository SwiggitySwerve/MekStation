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
});
