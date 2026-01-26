/**
 * Generic Singleton Factory
 *
 * Creates a lazy-initialized singleton instance with optional cleanup callback.
 * Follows the module-level lazy initialization pattern used throughout the codebase.
 *
 * @example
 * ```typescript
 * const vaultFactory = createSingleton(
 *   () => new VaultService(),
 *   (instance) => instance.cleanup()
 * );
 *
 * export function getVaultService(): VaultService {
 *   return vaultFactory.get();
 * }
 *
 * export function resetVaultService(): void {
 *   vaultFactory.reset();
 * }
 * ```
 */

/**
 * Factory interface returned by createSingleton
 */
export interface SingletonFactory<T> {
  /**
   * Get the singleton instance, creating it if necessary
   */
  get(): T;

  /**
   * Reset the singleton instance, invoking cleanup if provided
   */
  reset(): void;
}

/**
 * Creates a lazy-initialized singleton factory
 *
 * @param factory - Function that creates the singleton instance
 * @param cleanup - Optional cleanup function called when reset() is invoked
 * @returns Factory with get() and reset() methods
 *
 * @typeParam T - The type of the singleton instance
 */
export function createSingleton<T>(
  factory: () => T,
  cleanup?: (instance: T) => void
): SingletonFactory<T> {
  let instance: T | null = null;

  return {
    get(): T {
      if (instance === null) {
        instance = factory();
      }
      return instance;
    },

    reset(): void {
      if (instance !== null) {
        cleanup?.(instance);
        instance = null;
      }
    },
  };
}
