/**
 * Shared utilities for the campaign day-pipeline processors.
 *
 * Consolidates type-narrowing helpers that were previously duplicated
 * across each processor module (`healingProcessor`, `dailyCostsProcessor`,
 * `contractProcessor`) and the legacy compatibility shim in
 * `dayAdvancement.ts` (`castEventData`). Centralising the helpers here
 * removes the duplicated `(data: any)` casts and lets every processor
 * share a single, properly-typed `unknown` → narrow helper.
 */

/**
 * Narrow an unknown event-payload value to a `Record<string, unknown>`
 * for the campaign processor pipeline. The `IDayEvent.data` field is
 * intentionally typed permissively so processors can stash arbitrary
 * details on events; this helper provides the narrowing point used at
 * the boundary between processor producers (which dump structured data
 * into the event stream) and consumers that read keyed properties.
 *
 * Returns an empty record for `null`, non-object, or array inputs so
 * downstream property access never throws on bad data.
 *
 * Replaces the four inline `castToRecord(data: any)` duplicates that
 * previously lived in each processor module.
 */
export function asEventDataRecord(data: unknown): Record<string, unknown> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }
  return data as Record<string, unknown>;
}

/**
 * Narrow an unknown event-payload value to a specific shape `T`.
 *
 * Used by the legacy `convertToLegacyDayReport` adapter in
 * `dayAdvancement.ts`, which reads typed event-data shapes (e.g.
 * `HealedPersonEvent`, `DailyCostBreakdown`) back out of the generic
 * `IDayEvent.data` field. Callers are responsible for knowing the event
 * type they are reading — this helper exists purely to centralise the
 * single cast site so it can be replaced wholesale once the event-data
 * generics are tightened.
 *
 * Replaces the local `castEventData<T>(data: any): T` previously inlined
 * inside `dayAdvancement.ts`.
 */
export function asEventDataShape<T>(data: unknown): T {
  return data as T;
}
