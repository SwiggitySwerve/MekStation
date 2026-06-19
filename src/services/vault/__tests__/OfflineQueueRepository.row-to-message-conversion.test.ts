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
