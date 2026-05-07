/**
 * Side derivation from a runner unit id.
 *
 * Per `denormalize-event-envelope-and-close-emission-contract-gaps`: the
 * canonical source for an event's side is now `IGameEventBase.side`,
 * populated by `createGameEvent` at emission time. This helper is the
 * legacy fallback for replaying NDJSON event streams written before the
 * envelope-denormalization landed and for consumers that only have a raw
 * `unitId` (e.g., a `payload.sourceUnitId` describing the attacker, where
 * the event's `actorId` may describe the target).
 *
 * Returns `null` for ids that don't follow the canonical
 * `player-` / `opponent-` prefix (e.g., test fixtures with synthetic ids).
 *
 * Extracted to a dedicated module so consumers in
 * `src/simulation/core/` (e.g., `EventLogQuery`) can reuse the lookup
 * without importing the heavier `MetricsCollector` module — keeps the
 * core directory free of metrics-layer dependencies and sidesteps any
 * future circular-import risk between query / metrics surfaces.
 *
 * `MetricsCollector` re-exports this function as a named export so the
 * documented `MetricsCollector.sideFromUnitId` surface stays stable for
 * downstream consumers (specs, scenario tests, future UI replays).
 */
export function sideFromUnitId(unitId: string): 'player' | 'opponent' | null {
  if (unitId.startsWith('player-')) return 'player';
  if (unitId.startsWith('opponent-')) return 'opponent';
  return null;
}
