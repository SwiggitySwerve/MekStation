/**
 * Type-safe payload extraction utility for game events.
 *
 * Audit 2026-06-09 G (W5.1b): the previous `getPayload<T>(event)` form was
 * an unconstrained cast — callers could name any payload shape and read
 * fields no emitter ever set (the `attackerFacing` vs `attackerArc`
 * rear-arc-hit bug). `IGameEvent` is not a discriminated union (its
 * `payload` is a flat union, uncorrelated with `type` at the type level),
 * so the constraint is supplied here: a compile-time lookup map from the
 * `GameEventType` discriminant to its canonical payload interface, plus a
 * runtime discriminant check that throws on mismatch.
 *
 * @example
 * ```typescript
 * const payload = getPayload(event, GameEventType.DamageApplied);
 * const unitId = payload.unitId; // typed as IDamageAppliedPayload
 * ```
 */

import type {
  IAmmoExplosionPayload,
  IAttackResolvedPayload,
  ICriticalHitPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IHeatEffectAppliedPayload,
  IHeatPayload,
  IMovementDeclaredPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Compile-time map from event-type discriminant to its canonical payload
 * interface. Covers the event families the simulation detectors consume;
 * extend with further `GameEventType` rows as detectors grow. Every row
 * must point at the canonical payload from `@/types/gameplay` — never a
 * detector-local duplicate (those drift; see audit 2026-06-09 G).
 */
export interface DetectorEventPayloadMap {
  [GameEventType.MovementDeclared]: IMovementDeclaredPayload;
  [GameEventType.DamageApplied]: IDamageAppliedPayload;
  [GameEventType.HeatGenerated]: IHeatPayload;
  [GameEventType.HeatDissipated]: IHeatPayload;
  [GameEventType.UnitDestroyed]: IUnitDestroyedPayload;
  [GameEventType.AttackResolved]: IAttackResolvedPayload;
  [GameEventType.CriticalHit]: ICriticalHitPayload;
  [GameEventType.AmmoExplosion]: IAmmoExplosionPayload;
  [GameEventType.HeatEffectApplied]: IHeatEffectAppliedPayload;
  [GameEventType.PilotHit]: IPilotHitPayload;
}

/**
 * Extracts the payload of `event`, typed by the requested event-type
 * discriminant.
 *
 * The single remaining cast is sound because emitters maintain the
 * `type` ↔ payload correspondence encoded in `DetectorEventPayloadMap`,
 * and the runtime check rejects any call where the caller's expectation
 * disagrees with the event's actual discriminant — a detector can no
 * longer silently read a payload of the wrong event family.
 *
 * @param event - The game event containing the payload
 * @param type  - The event type the caller expects; must match `event.type`
 * @returns The payload narrowed to the canonical interface for `type`
 * @throws Error when `event.type !== type`
 */
export function getPayload<K extends keyof DetectorEventPayloadMap>(
  event: IGameEvent,
  type: K,
): DetectorEventPayloadMap[K] {
  if (event.type !== type) {
    throw new Error(
      `getPayload: expected event.type '${type}' but received '${event.type}' (event id ${event.id})`,
    );
  }
  return event.payload as DetectorEventPayloadMap[K];
}
