/**
 * In-battle morale shift rules.
 *
 * Pure functions that map a combat event to a per-side `MoraleLevel`
 * delta. Because the shift is derived solely from the event log and
 * the pre-event state, replaying the log reconstructs morale exactly
 * (per `add-combat-morale-and-withdrawal` design D2).
 *
 * This module writes NOTHING to campaign-layer morale
 * (`src/lib/campaign/scenario/morale.ts`) — the two systems are
 * deliberately separate (D3).
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirement: Morale Shift Rules
 */

import {
  GameEventType,
  GameSide,
  MORALE_LEVELS,
  type IComponentDestroyedPayload,
  type ICriticalHitResolvedPayload,
  type IGameEvent,
  type IGameState,
  type IUnitDestroyedPayload,
  type IUnitGameState,
  type MoraleLevel,
} from '@/types/gameplay';

/**
 * Per design D2 (Open Questions — proposed starting magnitudes; tunable
 * after playtest):
 *   - enemy unit destroyed → observing side `+1`
 *   - own unit destroyed   → side `-1`
 *   - own vital crit       → side `-1` (counted once per unit)
 *   - heaviest own unit lost → side `-2` (composes with the `-1` for
 *     the unit destruction itself, so losing the heaviest unit is a
 *     net `-3`)
 */
export const MORALE_DELTAS = {
  enemyUnitDestroyed: 1,
  ownUnitDestroyed: -1,
  ownVitalCrit: -1,
  heaviestOwnUnitLost: -2,
} as const;

/**
 * Component types that count as a "vital-component critical" for the
 * morale-shift downshift. Mirrors the crippled-unit definition used by
 * the Forced Withdrawal rule.
 */
const VITAL_COMPONENT_TYPES: ReadonlySet<string> = new Set([
  'engine',
  'gyro',
  'cockpit',
]);

/** The opposite side — small helper so callers stay readable. */
export function opposingSide(side: GameSide): GameSide {
  return side === GameSide.Player ? GameSide.Opponent : GameSide.Player;
}

/**
 * Clamp an ordinal index into the valid `MORALE_LEVELS` range.
 */
function clampOrdinal(ordinal: number): number {
  if (ordinal < 0) return 0;
  if (ordinal > MORALE_LEVELS.length - 1) return MORALE_LEVELS.length - 1;
  return ordinal;
}

/**
 * Shift a `MoraleLevel` by `delta` ordinal steps, clamping at `ROUTED`
 * and `OVERWHELMING` (the extremes). A positive delta raises morale, a
 * negative delta lowers it.
 */
export function shiftMoraleLevel(
  level: MoraleLevel,
  delta: number,
): MoraleLevel {
  const ordinal = MORALE_LEVELS.indexOf(level);
  const next = clampOrdinal(ordinal + delta);
  return MORALE_LEVELS[next];
}

/**
 * Total starting internal structure for a unit — the deterministic
 * "heaviness" proxy used to identify a side's heaviest unit. Tonnage
 * is not carried on `IUnitGameState`, but starting internal structure
 * scales monotonically with tonnage and is already on the state, so it
 * is a sound, replay-stable stand-in.
 */
function unitHeaviness(unit: IUnitGameState): number {
  const sis = unit.startingInternalStructure ?? {};
  let total = 0;
  for (const value of Object.values(sis)) {
    total += value;
  }
  return total;
}

/**
 * Identify the heaviest unit on `side` from the pre-event state. Ties
 * resolve by unit id (lexicographic) so the result is deterministic.
 * Returns `null` when the side has no units with measurable heaviness.
 */
export function heaviestUnitIdForSide(
  state: IGameState,
  side: GameSide,
): string | null {
  let bestId: string | null = null;
  let bestHeaviness = -1;
  for (const unit of Object.values(state.units)) {
    if (unit.side !== side) continue;
    const heaviness = unitHeaviness(unit);
    if (
      heaviness > bestHeaviness ||
      (heaviness === bestHeaviness && bestId !== null && unit.id < bestId)
    ) {
      bestHeaviness = heaviness;
      bestId = unit.id;
    }
  }
  return bestHeaviness > 0 ? bestId : null;
}

/**
 * A morale shift derived from a single event — a delta applied to one
 * side, with a short human-readable cause. `delta` may be zero (the
 * event did not move morale); callers skip zero-delta shifts.
 */
export interface IMoraleShift {
  readonly side: GameSide;
  readonly delta: number;
  readonly cause: string;
}

/**
 * Whether a `ComponentDestroyed` / `CriticalHitResolved` event names a
 * vital component (engine / gyro / cockpit).
 */
function isVitalComponentEvent(event: IGameEvent): boolean {
  if (event.type === GameEventType.ComponentDestroyed) {
    const payload = event.payload as IComponentDestroyedPayload;
    return VITAL_COMPONENT_TYPES.has(payload.componentType);
  }
  if (event.type === GameEventType.CriticalHitResolved) {
    const payload = event.payload as ICriticalHitResolvedPayload;
    return (
      payload.destroyed && VITAL_COMPONENT_TYPES.has(payload.componentType)
    );
  }
  return false;
}

/**
 * Compute the morale shifts produced by a single combat `event`,
 * evaluated against the `state` that exists BEFORE the event's own
 * reducer is applied.
 *
 * `vitalCritCountedUnits` is the set of unit ids that have already had
 * a vital-crit morale downshift counted — the spec caps the vital-crit
 * shift to once per unit, so a second crit on the same unit produces no
 * further shift.
 *
 * Returns an array because a single destruction event can produce up
 * to two shifts: one for the owning side losing the unit and a
 * separate `+1` for the enemy side that destroyed it. Heaviest-unit
 * loss adds an extra downshift on the owning side.
 */
export function computeMoraleShifts(
  state: IGameState,
  event: IGameEvent,
  vitalCritCountedUnits: ReadonlySet<string>,
): readonly IMoraleShift[] {
  if (event.type === GameEventType.UnitDestroyed) {
    const payload = event.payload as IUnitDestroyedPayload;
    const unit = state.units[payload.unitId];
    if (!unit) return [];
    const owningSide = unit.side;
    const shifts: IMoraleShift[] = [
      {
        side: owningSide,
        delta: MORALE_DELTAS.ownUnitDestroyed,
        cause: 'own unit destroyed',
      },
      {
        side: opposingSide(owningSide),
        delta: MORALE_DELTAS.enemyUnitDestroyed,
        cause: 'enemy unit destroyed',
      },
    ];
    // Loss of the side's heaviest unit is an extra downshift.
    const heaviestId = heaviestUnitIdForSide(state, owningSide);
    if (heaviestId !== null && heaviestId === payload.unitId) {
      shifts.push({
        side: owningSide,
        delta: MORALE_DELTAS.heaviestOwnUnitLost,
        cause: 'heaviest unit lost',
      });
    }
    return shifts;
  }

  if (isVitalComponentEvent(event)) {
    const payload = event.payload as
      | IComponentDestroyedPayload
      | ICriticalHitResolvedPayload;
    const unit = state.units[payload.unitId];
    if (!unit) return [];
    // The spec caps the vital-crit shift to once per unit.
    if (vitalCritCountedUnits.has(payload.unitId)) return [];
    return [
      {
        side: unit.side,
        delta: MORALE_DELTAS.ownVitalCrit,
        cause: 'vital component critical',
      },
    ];
  }

  return [];
}

/**
 * Whether an event is one a vital-crit cap should track — i.e. it
 * named a vital component for some unit. Callers use this to grow the
 * `vitalCritCountedUnits` set as they fold over the log.
 */
export function vitalCritUnitId(event: IGameEvent): string | null {
  if (!isVitalComponentEvent(event)) return null;
  const payload = event.payload as
    | IComponentDestroyedPayload
    | ICriticalHitResolvedPayload;
  return payload.unitId;
}
