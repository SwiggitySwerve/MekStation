/**
 * Type-Safe Event Payload Extractors
 * Utility functions for extracting typed payloads from game events.
 *
 * @spec openspec/changes/add-gameplay-roadmap/proposal.md (Phase 5 prep)
 */

import {
  IGameEvent,
  GameEventType,
  IGameCreatedPayload,
  IGameStartedPayload,
  IGameEndedPayload,
  IPhaseChangedPayload,
  IInitiativeRolledPayload,
  IMovementDeclaredPayload,
  IMovementLockedPayload,
  IAttackDeclaredPayload,
  IAttacksRevealedPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IHeatPayload,
  IHexCoordinate,
  IPilotHitPayload,
  MovementAnimationMode,
  IUnitDestroyedPayload,
} from '@/types/gameplay';
import {
  movementAnimationModeForType,
  normalizeMovementEventPath,
} from '@/utils/gameplay/movement/eventPath';

export interface IMovementDeclaredPlaybackPayload extends Omit<
  IMovementDeclaredPayload,
  'mode' | 'path'
> {
  readonly mode: MovementAnimationMode | null;
  readonly path: readonly IHexCoordinate[];
  readonly instantFallback: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if event is of a specific type.
 */
export function isEventType<T extends GameEventType>(
  event: IGameEvent,
  type: T,
): boolean {
  return event.type === type;
}

// =============================================================================
// Payload Extractors
// =============================================================================

/**
 * Extract GameCreated payload.
 */
export function getGameCreatedPayload(
  event: IGameEvent,
): IGameCreatedPayload | null {
  if (event.type !== GameEventType.GameCreated) return null;
  return event.payload as IGameCreatedPayload;
}

/**
 * Extract GameStarted payload.
 */
export function getGameStartedPayload(
  event: IGameEvent,
): IGameStartedPayload | null {
  if (event.type !== GameEventType.GameStarted) return null;
  return event.payload as IGameStartedPayload;
}

/**
 * Extract GameEnded payload.
 */
export function getGameEndedPayload(
  event: IGameEvent,
): IGameEndedPayload | null {
  if (event.type !== GameEventType.GameEnded) return null;
  return event.payload as IGameEndedPayload;
}

/**
 * Extract PhaseChanged payload.
 */
export function getPhaseChangedPayload(
  event: IGameEvent,
): IPhaseChangedPayload | null {
  if (event.type !== GameEventType.PhaseChanged) return null;
  return event.payload as IPhaseChangedPayload;
}

/**
 * Extract InitiativeRolled payload.
 */
export function getInitiativeRolledPayload(
  event: IGameEvent,
): IInitiativeRolledPayload | null {
  if (event.type !== GameEventType.InitiativeRolled) return null;
  return event.payload as IInitiativeRolledPayload;
}

/**
 * Extract MovementDeclared payload.
 */
export function getMovementDeclaredPayload(
  event: IGameEvent,
): IMovementDeclaredPayload | null {
  if (event.type !== GameEventType.MovementDeclared) return null;
  return event.payload as IMovementDeclaredPayload;
}

/**
 * Extract MovementDeclared payload for animation/replay consumers.
 *
 * Legacy events did not serialize the full path. Those events are
 * normalized to a safe endpoint path and flagged so UI playback can snap
 * instantly instead of trying to reconstruct historical traversal.
 */
export function getMovementDeclaredPlaybackPayload(
  event: IGameEvent,
): IMovementDeclaredPlaybackPayload | null {
  const payload = getMovementDeclaredPayload(event);
  if (!payload) return null;

  const hasSerializedPath = Boolean(payload.path && payload.path.length > 0);
  return {
    ...payload,
    mode: payload.mode ?? movementAnimationModeForType(payload.movementType),
    path: hasSerializedPath
      ? normalizeMovementEventPath(payload.from, payload.to, payload.path)
      : normalizeMovementEventPath(payload.from, payload.to, [
          payload.from,
          payload.to,
        ]),
    instantFallback: !hasSerializedPath,
  };
}

/**
 * Extract MovementLocked payload.
 */
export function getMovementLockedPayload(
  event: IGameEvent,
): IMovementLockedPayload | null {
  if (event.type !== GameEventType.MovementLocked) return null;
  return event.payload as IMovementLockedPayload;
}

/**
 * Extract AttackDeclared payload.
 */
export function getAttackDeclaredPayload(
  event: IGameEvent,
): IAttackDeclaredPayload | null {
  if (event.type !== GameEventType.AttackDeclared) return null;
  return event.payload as IAttackDeclaredPayload;
}

/**
 * Extract AttacksRevealed payload.
 */
export function getAttacksRevealedPayload(
  event: IGameEvent,
): IAttacksRevealedPayload | null {
  if (event.type !== GameEventType.AttacksRevealed) return null;
  return event.payload as IAttacksRevealedPayload;
}

/**
 * Extract AttackResolved payload.
 */
export function getAttackResolvedPayload(
  event: IGameEvent,
): IAttackResolvedPayload | null {
  if (event.type !== GameEventType.AttackResolved) return null;
  return event.payload as IAttackResolvedPayload;
}

/**
 * Extract DamageApplied payload.
 */
export function getDamageAppliedPayload(
  event: IGameEvent,
): IDamageAppliedPayload | null {
  if (event.type !== GameEventType.DamageApplied) return null;
  return event.payload as IDamageAppliedPayload;
}

/**
 * Extract HeatGenerated payload.
 */
export function getHeatGeneratedPayload(
  event: IGameEvent,
): IHeatPayload | null {
  if (event.type !== GameEventType.HeatGenerated) return null;
  return event.payload as IHeatPayload;
}

/**
 * Extract HeatDissipated payload.
 */
export function getHeatDissipatedPayload(
  event: IGameEvent,
): IHeatPayload | null {
  if (event.type !== GameEventType.HeatDissipated) return null;
  return event.payload as IHeatPayload;
}

/**
 * Extract PilotHit payload.
 */
export function getPilotHitPayload(event: IGameEvent): IPilotHitPayload | null {
  if (event.type !== GameEventType.PilotHit) return null;
  return event.payload as IPilotHitPayload;
}

/**
 * Extract UnitDestroyed payload.
 */
export function getUnitDestroyedPayload(
  event: IGameEvent,
): IUnitDestroyedPayload | null {
  if (event.type !== GameEventType.UnitDestroyed) return null;
  return event.payload as IUnitDestroyedPayload;
}

// =============================================================================
// Utility Types for Event Filtering
// =============================================================================

/**
 * Filter events by type with proper typing.
 */
export function filterEventsByType<T extends GameEventType>(
  events: readonly IGameEvent[],
  type: T,
): IGameEvent[] {
  return events.filter((e) => e.type === type);
}

/**
 * Get the last event of a specific type.
 */
export function getLastEventOfType<T extends GameEventType>(
  events: readonly IGameEvent[],
  type: T,
): IGameEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === type) {
      return events[i];
    }
  }
  return null;
}

/**
 * Get all events for a specific unit.
 */
export function getEventsForUnit(
  events: readonly IGameEvent[],
  unitId: string,
): IGameEvent[] {
  return events.filter((e) => {
    if (e.actorId === unitId) return true;
    const payload = e.payload as Record<string, unknown>;
    return (
      payload?.unitId === unitId ||
      payload?.attackerId === unitId ||
      payload?.targetId === unitId
    );
  });
}
