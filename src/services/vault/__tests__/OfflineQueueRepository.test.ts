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
});
