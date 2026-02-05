/**
 * Service Error Classes
 *
 * Custom error types for service layer operations.
 */

/**
 * Base service error
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Entity not found error
 */
export class NotFoundError extends ServiceError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id '${id}' not found`, 'NOT_FOUND', {
      entityType,
      id,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends ServiceError {
  constructor(
    message: string,
    public readonly validationErrors: readonly string[],
  ) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'ValidationError';
  }
}

/**
 * Storage/persistence error
 */
export class StorageError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

/**
 * File operation error
 */
export class FileError extends ServiceError {
  constructor(
    message: string,
    public readonly filename?: string,
  ) {
    super(message, 'FILE_ERROR', { filename });
    this.name = 'FileError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard to check if error is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
