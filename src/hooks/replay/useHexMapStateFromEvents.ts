/**
 * useHexMapStateFromEvents — pure projection from typed `IGameEvent` log
 * to `<HexMapDisplay>` state.
 *
 * Per `add-replay-viewer-from-ndjson` (combat-analytics delta —
 * "Replay State-From-Events Reducer Contract"): walks `events` in
 * monotonic `sequence` order up to and including the highest event with
 * `event.sequence <= currentSequence`, applying the covered
 * on-map event families (`GameCreated`, `MovementDeclared`,
 * `TerrainChanged`, `DamageApplied`, `LocationDestroyed`, `TransferDamage`,
 * `UnitDestroyed`, `UnitFell` / `UnitStood`, `HeatGenerated` /
 * `HeatDissipated`, `PilotHit`). All other event types pass through
 * silently.
 *
 * The reducer is a pure function — no I/O, no side effects, no React
 * refs. Memoized on `[events, currentSequence]` so re-renders that do
 * not change the cursor reuse the prior projection.
 *
 * Token construction reads `IGameUnit.unitType` and dispatches to the
 * matching `IUnitToken` variant constructor. Defaults are chosen so a
 * pre-`MovementDeclared` token still renders cleanly (origin position,
 * `Facing.North`, no sprite props → fallback medium-humanoid silhouette
 * for mechs).
 *
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/combat-analytics/spec.md
 */

import { useMemo } from 'react';

import type {
  IComponentDestroyedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  IHeatPayload,
  IHexTerrain,
  ILocationDestroyedPayload,
  IMovementDeclaredPayload,
  IPilotHitPayload,
  ITerrainChangedPayload,
  ITransferDamagePayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitStoodPayload,
  IUnitToken,
} from '@/types/gameplay';

import { GameEventType, GameSide, TokenUnitType } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';
import { logger } from '@/utils/logger';

import type { UnitAccumulator } from './useHexMapStateFromEvents.tokens';

import {
  accumulatorToToken,
  applyComponentDestroyedToPips,
  seedAccumulator,
} from './useHexMapStateFromEvents.tokens';

// =============================================================================
// Public types
// =============================================================================

/**
 * Output shape of the reducer — matches the props `<HexMapDisplay>`
 * consumes directly. Page wiring forwards the three fields onto the
 * map without further projection.
 */
export interface ReplayHexMapState {
  readonly tokens: readonly IUnitToken[];
  readonly hexTerrain: readonly IHexTerrain[];
  readonly mapRadius: number;
}

// =============================================================================
// Reducer walk
// =============================================================================

/**
 * Walk events in sequence order up to `currentSequence` and project
 * the result into `ReplayHexMapState`. Pure function — see
 * `useHexMapStateFromEvents` for the React-memoized wrapper.
 *
 * Exported separately from the hook for direct use in unit tests so
 * test runs can assert on the projection without rendering a React
 * tree.
 */
export function deriveHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState {
  // Per-unit accumulator keyed on `unitId`. Map preserves insertion
  // order so the projected `tokens` array order matches the unit list
  // ordering from `GameCreated.payload.units`.
  const accumulators = new Map<string, UnitAccumulator>();
  const terrainByHex = new Map<string, IHexTerrain>();
  let mapRadius = 0;

  // ---------------------------------------------------------------------------
  // Lossy fallback for legacy NDJSON files predating
  // `emit-game-created-from-runner` (PR #542). Per the OMO Council
  // synthesis: the headless `SimulationRunner` did not historically emit
  // `GameCreated`, so existing `simulation-reports/games/<ts>/*.jsonl`
  // archives have no seed event for the reducer to consume. Without
  // this fallback, the reducer's `tokens` array stays empty and the
  // hex map renders nothing for those legacy files.
  //
  // Strategy: if no `GameCreated` event is present in the input, walk
  // the visible-up-to-cursor slice and synthesize Mech-default
  // accumulators for every unique `actorId` / `payload.unitId` we
  // encounter. Names default to the id; side is derived from the id
  // prefix (`player-` / `opponent-`); position defaults to origin and
  // gets corrected by the first `MovementDeclared` for that unit. This
  // is intentionally lossy — full visual fidelity comes from re-running
  // the swarm post-#542. The fallback exists so the smoke-test fixture
  // and any pre-fix archive remain usable.
  // ---------------------------------------------------------------------------
  const hasGameCreated = events.some(
    (e) => e.type === GameEventType.GameCreated,
  );
  if (!hasGameCreated && events.length > 0) {
    const discoveredUnits = new Map<string, IGameUnit>();
    // Walk only the events at or before the cursor so backward seek
    // doesn't manufacture units that haven't appeared yet.
    for (const event of events) {
      if (event.sequence > currentSequence) break;
      const ids: string[] = [];
      if (event.actorId !== undefined) ids.push(event.actorId);
      const payloadUnitId = (event.payload as { unitId?: string }).unitId;
      if (payloadUnitId !== undefined) ids.push(payloadUnitId);
      for (const id of ids) {
        if (discoveredUnits.has(id)) continue;
        // Derive side from the runner's slot-id convention. Unknown
        // prefixes (test fixtures with synthetic ids) default to
        // Player to keep rendering deterministic.
        const side = id.startsWith('opponent-')
          ? GameSide.Opponent
          : GameSide.Player;
        discoveredUnits.set(id, {
          id,
          name: id,
          side,
          unitRef: id,
          pilotRef: `synthetic-${id}`,
          gunnery: 4,
          piloting: 5,
        });
      }
    }
    // Iterate via forEach to dodge `MapIterator` downlevelIteration
    // requirement on the project's ES5 target.
    discoveredUnits.forEach((unit) => {
      accumulators.set(unit.id, seedAccumulator(unit));
    });
    // Map radius is unrecoverable from events alone — fall back to a
    // generous default so the map still renders. The page can override
    // via prop if it knows the radius from another source.
    mapRadius = 17;
    if (discoveredUnits.size > 0) {
      // Single warning signals that this code path activated, so
      // future regressions where #542 stops emitting GameCreated don't
      // get masked by the fallback.
      logger.warn(
        `[useHexMapStateFromEvents] No GameCreated event found; ` +
          `synthesized ${discoveredUnits.size} Mech-default tokens from ` +
          `actorIds. Re-run the swarm post-#542 for full token fidelity.`,
      );
    }
  }

  for (const event of events) {
    if (event.sequence > currentSequence) {
      break;
    }

    switch (event.type) {
      case GameEventType.GameCreated: {
        const payload = event.payload as IGameCreatedPayload;
        mapRadius = payload.config.mapRadius;
        accumulators.clear();
        terrainByHex.clear();
        for (const terrain of payload.hexTerrain ?? []) {
          terrainByHex.set(coordToKey(terrain.coordinate), terrain);
        }
        for (const unit of payload.units) {
          accumulators.set(unit.id, seedAccumulator(unit));
        }
        break;
      }
      case GameEventType.TerrainChanged: {
        const payload = event.payload as ITerrainChangedPayload;
        const key = coordToKey(payload.hex);
        const existing = terrainByHex.get(key);
        terrainByHex.set(key, {
          coordinate: payload.hex,
          elevation: payload.elevation ?? existing?.elevation ?? 0,
          features: terrainFeaturesFromString(payload.terrain),
        });
        break;
      }
      case GameEventType.MovementDeclared: {
        const payload = event.payload as IMovementDeclaredPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.position = payload.to;
          acc.facing = payload.facing;
        }
        break;
      }
      case GameEventType.DamageApplied: {
        const payload = event.payload as IDamageAppliedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          if (payload.locationDestroyed === true) {
            const next = new Set(acc.damagedLocations);
            next.add(payload.location);
            acc.damagedLocations = next;
            if (payload.location === 'CT') {
              acc.isDestroyed = true;
            }
          }
        }
        break;
      }
      case GameEventType.LocationDestroyed: {
        const payload = event.payload as ILocationDestroyedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          const next = new Set(acc.damagedLocations);
          next.add(payload.location);
          acc.damagedLocations = next;
          if (payload.location === 'CT') {
            acc.isDestroyed = true;
          }
        }
        break;
      }
      case GameEventType.TransferDamage: {
        const payload = event.payload as ITransferDamagePayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          const next = new Set(acc.damagedLocations);
          next.add(payload.fromLocation);
          acc.damagedLocations = next;
        }
        break;
      }
      case GameEventType.UnitDestroyed: {
        const payload = event.payload as IUnitDestroyedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.isDestroyed = true;
        }
        break;
      }
      case GameEventType.UnitFell: {
        const payload = event.payload as IUnitFellPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.prone = true;
        }
        break;
      }
      case GameEventType.UnitStood: {
        const payload = event.payload as IUnitStoodPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.prone = false;
        }
        break;
      }
      case GameEventType.HeatGenerated:
      case GameEventType.HeatDissipated: {
        const payload = event.payload as IHeatPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.currentHeat = payload.newTotal;
        }
        break;
      }
      case GameEventType.PilotHit: {
        const payload = event.payload as IPilotHitPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.pilotWounds = payload.totalWounds;
        }
        break;
      }
      case GameEventType.ComponentDestroyed: {
        const payload = event.payload as IComponentDestroyedPayload;
        const acc = accumulators.get(payload.unitId);
        // armorPipState is Mech-only — non-Mech units pass through
        // silently per the spec contract.
        if (acc !== undefined && acc.unitType === TokenUnitType.Mech) {
          const locationAlreadyDestroyed = acc.damagedLocations.has(
            payload.location,
          );
          acc.armorPipState = applyComponentDestroyedToPips(
            acc.armorPipState,
            payload.location,
            payload.componentType,
            locationAlreadyDestroyed,
          );
        }
        break;
      }
      case GameEventType.CriticalHitResolved: {
        const payload = event.payload as ICriticalHitResolvedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined && acc.unitType === TokenUnitType.Mech) {
          const locationAlreadyDestroyed = acc.damagedLocations.has(
            payload.location,
          );
          acc.armorPipState = applyComponentDestroyedToPips(
            acc.armorPipState,
            payload.location,
            payload.componentType,
            locationAlreadyDestroyed,
          );
        }
        break;
      }
      default:
        // Out-of-band event types pass through silently. The timeline
        // scrubber still sees them; the reducer simply does not mutate
        // the map state on them. Per the spec scope, only the covered
        // families above can change `tokens` / `hexTerrain` /
        // `mapRadius`.
        break;
    }
  }

  // Project accumulators to the public `IUnitToken` shape. The map's
  // insertion order is preserved by `Array.from(map.values())`, which
  // matches the `GameCreated.payload.units` ordering.
  const tokens: IUnitToken[] = Array.from(accumulators.values()).map(
    accumulatorToToken,
  );

  return {
    tokens,
    hexTerrain: Array.from(terrainByHex.values()),
    mapRadius,
  };
}

// =============================================================================
// React hook wrapper
// =============================================================================

/**
 * React hook wrapper around `deriveHexMapStateFromEvents`. Memoizes on
 * `[events, currentSequence]` so re-renders that do not change the
 * cursor reuse the prior projection.
 *
 * @example
 * ```tsx
 * const { tokens, hexTerrain, mapRadius } = useHexMapStateFromEvents(
 *   events,
 *   replay.currentSequence,
 * );
 * return (
 *   <HexMapDisplay
 *     tokens={tokens}
 *     hexTerrain={hexTerrain}
 *     radius={mapRadius}
 *     selectedHex={null}
 *     events={events}
 *   />
 * );
 * ```
 */
export function useHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState {
  return useMemo(
    () => deriveHexMapStateFromEvents(events, currentSequence),
    [events, currentSequence],
  );
}
