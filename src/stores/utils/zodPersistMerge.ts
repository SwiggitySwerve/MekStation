/**
 * Zod-validated `persist` merge helper.
 *
 * Zustand's `persist` middleware rehydrates a `localStorage` payload straight
 * into store state with no schema check. A stale or hand-edited payload becomes
 * live application state — an app-wide corruption vector that is hard to
 * diagnose because the failure surfaces deep inside domain code, not at the
 * boundary.
 *
 * `localStorage` is an I/O boundary: per the `validation-patterns` spec
 * (Zod Schema Validation at I/O Boundaries) the rehydrated payload SHALL be
 * validated against a Zod schema. The failure mode for this boundary is
 * fall-back-to-default — a user must never be locked out by a stale payload,
 * so on a `safeParse` failure the payload is discarded and the store keeps its
 * default state. The failure is logged, never thrown.
 *
 * Usage — pass the result as the `persist` config's `merge` option:
 *
 * ```typescript
 * import { z } from 'zod';
 * import { createZodPersistMerge } from '@/stores/utils/zodPersistMerge';
 *
 * const PersistedSchema = z.object({ theme: z.enum(['light', 'dark']) });
 *
 * persist(creator, {
 *   name: 'theme-preference',
 *   merge: createZodPersistMerge(PersistedSchema, 'theme-preference'),
 * });
 * ```
 *
 * The boundary type is `z.infer` of the schema (per project convention) so the
 * persisted shape and its TypeScript type cannot drift.
 *
 * @see openspec/specs/validation-patterns/spec.md
 */

import type { z } from 'zod';

import { logger } from '@/utils/logger';

/**
 * `merge` function signature expected by Zustand's `persist` middleware.
 * `persistedState` is `unknown` — it is whatever JSON was in `localStorage`,
 * which is exactly why it must be validated before it is trusted.
 */
type PersistMerge<S> = (persistedState: unknown, currentState: S) => S;

/**
 * Build a `persist` `merge` function that validates the rehydrated payload
 * against `schema` before it is merged into the live store.
 *
 * Behaviour:
 *  - On a successful `safeParse`, the validated fields are shallow-merged over
 *    `currentState` (the default state produced by the store creator). This
 *    matches Zustand's default `merge` semantics for a flat persisted shape.
 *  - On a `safeParse` failure (or a non-object payload), the payload is
 *    discarded and `currentState` is returned unchanged — the store keeps its
 *    default state. The failure is logged with the offending field paths.
 *
 * The merge never throws: hydration must not be able to crash the app.
 *
 * @typeParam S      The full store state type (state + actions).
 * @param schema     Zod schema describing the persisted (partialized) shape.
 * @param storeName  The `persist` config `name` — used only in the log line so
 *                   a corrupt-payload event is traceable to a specific store.
 */
export function createZodPersistMerge<S extends object>(
  schema: z.ZodType<Partial<S>>,
  storeName: string,
): PersistMerge<S> {
  return (persistedState: unknown, currentState: S): S => {
    // A fresh install has no payload — `persist` calls `merge` with `undefined`.
    // That is the default-state path, not a corruption event; stay quiet.
    if (persistedState === undefined || persistedState === null) {
      return currentState;
    }

    const result = schema.safeParse(persistedState);
    if (!result.success) {
      // Discard the payload and fall back to default state. Log (never throw)
      // so the corruption is diagnosable without locking the user out.
      logger.warn(
        `[zodPersistMerge] discarding invalid persisted payload for "${storeName}"; falling back to default state`,
        {
          issues: result.error.issues.slice(0, 5).map((issue) => ({
            path: issue.path.join('.') || '<root>',
            message: issue.message,
          })),
        },
      );
      return currentState;
    }

    // Shallow-merge the validated payload over the default state — actions on
    // `currentState` are preserved, persisted fields are overlaid.
    return { ...currentState, ...result.data };
  };
}
