/**
 * useHexMapStateFromEvents - pure projection from typed `IGameEvent` log
 * to `<HexMapDisplay>` state.
 *
 * Per `add-replay-viewer-from-ndjson` (combat-analytics delta -
 * "Replay State-From-Events Reducer Contract"): walks `events` in
 * monotonic `sequence` order up to and including the highest event with
 * `event.sequence <= currentSequence`, applying the covered on-map event
 * families. All other event types pass through silently.
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

import {
  GameEventType,
  GameSide,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';
import { logger } from '@/utils/logger';

import type { UnitAccumulator } from './useHexMapStateFromEvents.tokens';

import {
  accumulatorToToken,
  applyComponentDestroyedToPips,
  seedAccumulator,
} from './useHexMapStateFromEvents.tokens';

export interface ReplayHexMapState {
  readonly tokens: readonly IUnitToken[];
  readonly hexTerrain: readonly IHexTerrain[];
  readonly mapRadius: number;
}

interface ReplayProjectionContext {
  readonly accumulators: Map<string, UnitAccumulator>;
  readonly terrainByHex: Map<string, IHexTerrain>;
  mapRadius: number;
}

type ReplayEventHandler = (
  event: IGameEvent,
  context: ReplayProjectionContext,
) => void;

const REPLAY_EVENT_HANDLERS: Readonly<
  Partial<Record<GameEventType, ReplayEventHandler>>
> = {
  [GameEventType.GameCreated]: applyGameCreatedEvent,
  [GameEventType.TerrainChanged]: applyTerrainChangedEvent,
  [GameEventType.MovementDeclared]: applyMovementDeclaredEvent,
  [GameEventType.DamageApplied]: applyDamageAppliedEvent,
  [GameEventType.LocationDestroyed]: applyLocationDestroyedEvent,
  [GameEventType.TransferDamage]: applyTransferDamageEvent,
  [GameEventType.UnitDestroyed]: applyUnitDestroyedEvent,
  [GameEventType.UnitFell]: applyUnitFellEvent,
  [GameEventType.UnitStood]: applyUnitStoodEvent,
  [GameEventType.HeatGenerated]: applyHeatEvent,
  [GameEventType.HeatDissipated]: applyHeatEvent,
  [GameEventType.PilotHit]: applyPilotHitEvent,
  [GameEventType.ComponentDestroyed]: applyComponentDestroyedEvent,
  [GameEventType.CriticalHitResolved]: applyCriticalHitResolvedEvent,
};

function createReplayProjectionContext(): ReplayProjectionContext {
  return {
    accumulators: new Map<string, UnitAccumulator>(),
    terrainByHex: new Map<string, IHexTerrain>(),
    mapRadius: 0,
  };
}

function proneAfterMovementDeclared(
  currentProne: boolean,
  payload: IMovementDeclaredPayload,
): boolean {
  const wentProne =
    payload.steps?.some((step) => step.kind === 'goProne') ?? false;
  if (payload.hullDownEntryAttempt === true) return false;
  if (payload.goProneAttempt === true || wentProne) return true;
  if (payload.standUpAttempt === true) return payload.standUpSucceeded !== true;
  if (currentProne && payload.movementType !== MovementType.Stationary) {
    return false;
  }
  return currentProne;
}

function hasGameCreatedEvent(events: readonly IGameEvent[]): boolean {
  return events.some((event) => event.type === GameEventType.GameCreated);
}

function legacyUnitIdsFromEvent(event: IGameEvent): readonly string[] {
  const ids: string[] = [];
  if (event.actorId !== undefined) ids.push(event.actorId);

  const payloadUnitId = (event.payload as { unitId?: string }).unitId;
  if (payloadUnitId !== undefined) ids.push(payloadUnitId);

  return ids;
}

function syntheticUnitForId(id: string): IGameUnit {
  const side = id.startsWith('opponent-') ? GameSide.Opponent : GameSide.Player;
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `synthetic-${id}`,
    gunnery: 4,
    piloting: 5,
  };
}

function discoverLegacyUnits(
  events: readonly IGameEvent[],
  currentSequence: number,
): Map<string, IGameUnit> {
  const discoveredUnits = new Map<string, IGameUnit>();

  for (const event of events) {
    if (event.sequence > currentSequence) break;
    for (const id of legacyUnitIdsFromEvent(event)) {
      if (!discoveredUnits.has(id)) {
        discoveredUnits.set(id, syntheticUnitForId(id));
      }
    }
  }

  return discoveredUnits;
}

function seedLegacyAccumulators(
  events: readonly IGameEvent[],
  currentSequence: number,
  context: ReplayProjectionContext,
): void {
  if (events.length === 0 || hasGameCreatedEvent(events)) return;

  const discoveredUnits = discoverLegacyUnits(events, currentSequence);
  discoveredUnits.forEach((unit) => {
    context.accumulators.set(unit.id, seedAccumulator(unit));
  });
  context.mapRadius = 17;

  if (discoveredUnits.size === 0) return;
  logger.warn(
    `[useHexMapStateFromEvents] No GameCreated event found; ` +
      `synthesized ${discoveredUnits.size} Mech-default tokens from ` +
      `actorIds. Re-run the swarm post-#542 for full token fidelity.`,
  );
}

function applyReplayEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  REPLAY_EVENT_HANDLERS[event.type]?.(event, context);
}

function applyGameCreatedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IGameCreatedPayload;
  context.mapRadius = payload.config.mapRadius;
  context.accumulators.clear();
  context.terrainByHex.clear();

  for (const terrain of payload.hexTerrain ?? []) {
    context.terrainByHex.set(coordToKey(terrain.coordinate), terrain);
  }
  for (const unit of payload.units) {
    context.accumulators.set(unit.id, seedAccumulator(unit));
  }
}

function applyTerrainChangedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as ITerrainChangedPayload;
  const key = coordToKey(payload.hex);
  const existing = context.terrainByHex.get(key);
  context.terrainByHex.set(key, {
    coordinate: payload.hex,
    elevation: payload.elevation ?? existing?.elevation ?? 0,
    features: terrainFeaturesFromString(payload.terrain),
  });
}

function applyMovementDeclaredEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IMovementDeclaredPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (!acc) return;

  acc.position = payload.to;
  acc.facing = payload.facing;
  acc.prone = proneAfterMovementDeclared(acc.prone, payload);
}

function markDamagedLocation(acc: UnitAccumulator, location: string): void {
  const next = new Set(acc.damagedLocations);
  next.add(location);
  acc.damagedLocations = next;
}

function markDestroyedLocation(acc: UnitAccumulator, location: string): void {
  markDamagedLocation(acc, location);
  if (location === 'CT') {
    acc.isDestroyed = true;
  }
}

function applyDamageAppliedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IDamageAppliedPayload;
  if (payload.locationDestroyed !== true) return;

  const acc = context.accumulators.get(payload.unitId);
  if (acc) markDestroyedLocation(acc, payload.location);
}

function applyLocationDestroyedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as ILocationDestroyedPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) markDestroyedLocation(acc, payload.location);
}

function applyTransferDamageEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as ITransferDamagePayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) markDamagedLocation(acc, payload.fromLocation);
}

function applyUnitDestroyedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IUnitDestroyedPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) acc.isDestroyed = true;
}

function applyUnitFellEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IUnitFellPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) acc.prone = true;
}

function applyUnitStoodEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IUnitStoodPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) acc.prone = false;
}

function applyHeatEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IHeatPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) acc.currentHeat = payload.newTotal;
}

function applyPilotHitEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  const payload = event.payload as IPilotHitPayload;
  const acc = context.accumulators.get(payload.unitId);
  if (acc) acc.pilotWounds = payload.totalWounds;
}

function applyMechPipDamage(
  payload: { unitId: string; location: string; componentType: string },
  context: ReplayProjectionContext,
): void {
  const acc = context.accumulators.get(payload.unitId);
  if (!acc || acc.unitType !== TokenUnitType.Mech) return;

  const locationAlreadyDestroyed = acc.damagedLocations.has(payload.location);
  acc.armorPipState = applyComponentDestroyedToPips(
    acc.armorPipState,
    payload.location,
    payload.componentType,
    locationAlreadyDestroyed,
  );
}

function applyComponentDestroyedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  applyMechPipDamage(event.payload as IComponentDestroyedPayload, context);
}

function applyCriticalHitResolvedEvent(
  event: IGameEvent,
  context: ReplayProjectionContext,
): void {
  applyMechPipDamage(event.payload as ICriticalHitResolvedPayload, context);
}

export function deriveHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState {
  const context = createReplayProjectionContext();

  seedLegacyAccumulators(events, currentSequence, context);

  for (const event of events) {
    if (event.sequence > currentSequence) break;
    applyReplayEvent(event, context);
  }

  return {
    tokens: Array.from(context.accumulators.values()).map(accumulatorToToken),
    hexTerrain: Array.from(context.terrainByHex.values()),
    mapRadius: context.mapRadius,
  };
}

export function useHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState {
  return useMemo(
    () => deriveHexMapStateFromEvents(events, currentSequence),
    [events, currentSequence],
  );
}
