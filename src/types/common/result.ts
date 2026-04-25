/**
 * Result Type — shared discriminated union for fallible operations.
 *
 * This file owns the canonical `ResultType<T, E>` and `AsyncResult<T, E>`
 * type definitions. Runtime helpers (the `Result` static-factory class)
 * live alongside other service infrastructure in
 * `@/services/core/types/BaseTypes` and re-export `ResultType` from here.
 *
 * Repatriated from `@/services/core/types/BaseTypes` so that `src/types/`
 * no longer imports from `src/services/`. Modules in `src/types/` that need
 * a Result shape import from this file directly.
 *
 * @example
 * ```typescript
 * import type { ResultType } from '@/types/common/result';
 *
 * function parse(input: string): ResultType<number, string> {
 *   const n = Number(input);
 *   return Number.isNaN(n)
 *     ? { success: false, error: 'not a number' }
 *     : { success: true, data: n };
 * }
 * ```
 */

/**
 * Result type for operations that can fail.
 *
 * Discriminated union representing either:
 * - A successful result with `data`
 * - A failed result with an `error`
 */
export type ResultType<T, E = string> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

/**
 * Async result type for operations that return promises.
 */
export type AsyncResult<T, E = string> = Promise<ResultType<T, E>>;
