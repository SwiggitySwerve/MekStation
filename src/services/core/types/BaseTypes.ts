/**
 * Base Types for Services
 *
 * Core interfaces and types used across all service implementations,
 * including both web services and desktop (Electron) services.
 *
 * @module services/core/types
 */

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Base interface for all services
 *
 * Services implementing this interface must provide:
 * - initialize(): Setup and prepare the service
 * - cleanup(): Release resources and cleanup
 */
export interface IService {
  /**
   * Initialize the service
   * Called once when the service is first created or the application starts
   */
  initialize(): Promise<void>;

  /**
   * Cleanup service resources
   * Called when the service is being shut down or the application is closing
   */
  cleanup(): Promise<void>;
}

// ============================================================================
// RESULT TYPE
// ============================================================================

/**
 * Result type for operations that can fail
 *
 * This is a discriminated union type that represents either:
 * - A successful result with data
 * - A failed result with an error
 *
 * @example
 * ```typescript
 * const result = await service.doSomething();
 * if (result.success) {
 *   logger.debug(result.data);
 * } else {
 *   logger.error(result.error);
 * }
 * ```
 */
export type ResultType<T, E = string> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

/**
 * Result class with static factory methods
 *
 * Provides a fluent API for creating and working with Results
 *
 * @example
 * ```typescript
 * // Creating results
 * const successResult = Result.success(data);
 * const errorResult = Result.error('Something went wrong');
 *
 * // Using results
 * if (result.success) {
 *   doSomething(result.data);
 * }
 * ```
 */
export class Result {
  /**
   * Create a successful result
   * @param data The data to wrap in a success result
   */
  static success<T>(data: T): ResultType<T, never> {
    return { success: true, data };
  }

  /**
   * Create a failed result
   * @param error The error message or object
   */
  static error<E = string>(error: E): ResultType<never, E> {
    return { success: false, error };
  }

  /**
   * Check if a result is successful
   * @param result The result to check
   */
  static isSuccess<T, E>(
    result: ResultType<T, E>,
  ): result is { success: true; data: T } {
    return result.success === true;
  }

  /**
   * Check if a result is an error
   * @param result The result to check
   */
  static isError<T, E>(
    result: ResultType<T, E>,
  ): result is { success: false; error: E } {
    return result.success === false;
  }

  /**
   * Unwrap a result, throwing if it's an error
   * @param result The result to unwrap
   * @throws Error if the result is an error
   */
  static unwrap<T, E>(result: ResultType<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw new Error(String(result.error));
  }

  /**
   * Get the data from a result, or a default value if it's an error
   * @param result The result to get data from
   * @param defaultValue The default value to return if the result is an error
   */
  static unwrapOr<T, E>(result: ResultType<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  }

  /**
   * Map a successful result to a new result
   * @param result The result to map
   * @param fn The function to apply to the data
   */
  static map<T, U, E>(
    result: ResultType<T, E>,
    fn: (data: T) => U,
  ): ResultType<U, E> {
    if (result.success) {
      return Result.success(fn(result.data));
    }
    return result as ResultType<U, E>;
  }

  /**
   * Chain result operations (flatMap)
   * @param result The result to chain
   * @param fn The function that returns a new result
   */
  static flatMap<T, U, E>(
    result: ResultType<T, E>,
    fn: (data: T) => ResultType<U, E>,
  ): ResultType<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result as ResultType<U, E>;
  }
}

// ============================================================================
// ASYNC RESULT TYPE
// ============================================================================

/**
 * Async result type for operations that return promises
 */
export type AsyncResult<T, E = string> = Promise<ResultType<T, E>>;

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

/**
 * Base configuration interface for services
 */
export interface IServiceConfig {
  readonly [key: string]: unknown;
}

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

/**
 * Service identifier type
 */
export type ServiceId = string | symbol;

/**
 * Service factory type
 */
export type ServiceFactory<T extends IService> = () => T | Promise<T>;

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Service event types
 */
export enum ServiceEvent {
  Initialized = 'initialized',
  Cleanup = 'cleanup',
  Error = 'error',
}

/**
 * Service event handler
 */
export type ServiceEventHandler = (event: ServiceEvent, data?: unknown) => void;

// ============================================================================
// EXPORTS
// ============================================================================

const CoreTypes = {
  Result,
  ServiceEvent,
};

export default CoreTypes;
