/**
 * Type-safe payload extraction utility for game events.
 *
 * Provides a centralized, type-safe way to extract typed payloads from IGameEvent objects.
 * Uses a single type assertion (as T) instead of the unsafe double-cast pattern (as unknown as T).
 *
 * @example
 * ```typescript
 * const payload = getPayload<IDamageAppliedPayload>(event);
 * const unitId = payload.unitId;
 * ```
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Extracts a typed payload from a game event.
 *
 * This provides better type safety than the previous `as unknown as T` pattern.
 *
 * @template T - The expected payload type
 * @param event - The game event containing the payload
 * @returns The typed payload
 *
 * @remarks
 * This function uses a single type assertion (as T) which is safer than the previous
 * double-cast pattern (as unknown as T).
 */
export function getPayload<T>(event: IGameEvent): T {
   
  return event.payload as T;
}
