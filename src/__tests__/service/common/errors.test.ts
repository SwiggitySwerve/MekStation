/**
 * Tests for Service Error Classes
 */

import {
  ServiceError,
  NotFoundError,
  ValidationError,
  StorageError,
  FileError,
  ConfigurationError,
  isServiceError,
} from '@/services/common/errors';

describe('Service Errors', () => {
  // ============================================================================
  // ServiceError
  // ============================================================================
  describe('ServiceError', () => {
    it('should create error with message and code', () => {
      const error = new ServiceError('Test message', 'TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ServiceError');
    });

    it('should include details when provided', () => {
      const details = { foo: 'bar', count: 42 };
      const error = new ServiceError('Test', 'TEST', details);
      expect(error.details).toEqual(details);
    });

    it('should extend Error', () => {
      const error = new ServiceError('Test', 'TEST');
      expect(error instanceof Error).toBe(true);
    });
  });

  // ============================================================================
  // NotFoundError
  // ============================================================================
  describe('NotFoundError', () => {
    it('should create error with entity type and id', () => {
      const error = new NotFoundError('Unit', 'atlas-123');
      expect(error.message).toBe("Unit with id 'atlas-123' not found");
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should include entity type and id in details', () => {
      const error = new NotFoundError('Equipment', 'medium-laser');
      expect(error.details).toEqual({
        entityType: 'Equipment',
        id: 'medium-laser',
      });
    });

    it('should extend ServiceError', () => {
      const error = new NotFoundError('Unit', 'id');
      expect(error instanceof ServiceError).toBe(true);
    });
  });

  // ============================================================================
  // ValidationError
  // ============================================================================
  describe('ValidationError', () => {
    it('should create error with validation errors', () => {
      const validationErrors = ['Field is required', 'Value out of range'];
      const error = new ValidationError('Validation failed', validationErrors);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include validation errors in details', () => {
      const validationErrors = ['Error 1', 'Error 2'];
      const error = new ValidationError('Failed', validationErrors);
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.details?.validationErrors).toEqual(validationErrors);
    });

    it('should extend ServiceError', () => {
      const error = new ValidationError('Failed', []);
      expect(error instanceof ServiceError).toBe(true);
    });
  });

  // ============================================================================
  // StorageError
  // ============================================================================
  describe('StorageError', () => {
    it('should create error with message', () => {
      const error = new StorageError('IndexedDB failed');
      expect(error.message).toBe('IndexedDB failed');
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.name).toBe('StorageError');
    });

    it('should include details when provided', () => {
      const error = new StorageError('Write failed', { operation: 'put' });
      expect(error.details).toEqual({ operation: 'put' });
    });

    it('should extend ServiceError', () => {
      const error = new StorageError('Failed');
      expect(error instanceof ServiceError).toBe(true);
    });
  });

  // ============================================================================
  // FileError
  // ============================================================================
  describe('FileError', () => {
    it('should create error with message', () => {
      const error = new FileError('File not found');
      expect(error.message).toBe('File not found');
      expect(error.code).toBe('FILE_ERROR');
      expect(error.name).toBe('FileError');
    });

    it('should include filename when provided', () => {
      const error = new FileError('Failed to read', 'data.json');
      expect(error.filename).toBe('data.json');
      expect(error.details).toEqual({ filename: 'data.json' });
    });

    it('should extend ServiceError', () => {
      const error = new FileError('Failed');
      expect(error instanceof ServiceError).toBe(true);
    });
  });

  // ============================================================================
  // ConfigurationError
  // ============================================================================
  describe('ConfigurationError', () => {
    it('should create error with message', () => {
      const error = new ConfigurationError('Missing config');
      expect(error.message).toBe('Missing config');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.name).toBe('ConfigurationError');
    });

    it('should include details when provided', () => {
      const error = new ConfigurationError('Invalid', { key: 'apiUrl' });
      expect(error.details).toEqual({ key: 'apiUrl' });
    });

    it('should extend ServiceError', () => {
      const error = new ConfigurationError('Failed');
      expect(error instanceof ServiceError).toBe(true);
    });
  });

  // ============================================================================
  // isServiceError type guard
  // ============================================================================
  describe('isServiceError', () => {
    it('should return true for ServiceError', () => {
      const error = new ServiceError('Test', 'TEST');
      expect(isServiceError(error)).toBe(true);
    });

    it('should return true for NotFoundError', () => {
      const error = new NotFoundError('Unit', 'id');
      expect(isServiceError(error)).toBe(true);
    });

    it('should return true for ValidationError', () => {
      const error = new ValidationError('Failed', []);
      expect(isServiceError(error)).toBe(true);
    });

    it('should return true for StorageError', () => {
      const error = new StorageError('Failed');
      expect(isServiceError(error)).toBe(true);
    });

    it('should return true for FileError', () => {
      const error = new FileError('Failed');
      expect(isServiceError(error)).toBe(true);
    });

    it('should return true for ConfigurationError', () => {
      const error = new ConfigurationError('Failed');
      expect(isServiceError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isServiceError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isServiceError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isServiceError(undefined)).toBe(false);
    });

    it('should return false for plain object', () => {
      expect(isServiceError({ message: 'error' })).toBe(false);
    });

    it('should return false for string', () => {
      expect(isServiceError('error')).toBe(false);
    });
  });
});
