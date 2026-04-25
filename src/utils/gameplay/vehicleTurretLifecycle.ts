/**
 * Vehicle Turret Lifecycle Helpers
 *
 * Pure-state helpers for the per-turn `turretPivotedThisTurn` flag on
 * `IVehicleCombatState`. The flag drives the `+1` chin-turret pivot to-hit
 * penalty (see `calculateChinTurretPivotModifier` in
 * `toHit/vehicleModifiers.ts`). Per the firing-arc-calculation spec
 * ("Vehicle Chin Turret Pivot Penalty"), callers SHALL set the flag when
 * the turret rotates from its previous facing and SHALL clear it at
 * turn-start alongside other per-turn flags.
 *
 * **Wave 4 limitation — SET path is not yet wired into a vehicle facing /
 * rotation reducer.** The vehicle combat state currently lives outside
 * the main `IGameState` reducer (separate `IVehicleCombatState` shape
 * routed through `damageDispatch`), and no `VehicleTurretRotated` event
 * is authored yet. `markTurretPivoted` is shipped as the canonical entry
 * point so the future facing-change reducer can call it without
 * re-deriving the immutable-update pattern. The CLEAR path
 * (`clearTurretPivotedFlag`, `clearAllTurretPivotedFlags`) IS production-
 * ready: any vehicle turn-start handler can call it today to reset the
 * flag at the canonical boundary.
 *
 * @spec openspec/specs/firing-arc-calculation/spec.md
 *   Requirement: Vehicle Chin Turret Pivot Penalty
 */

import { IVehicleCombatState } from '@/types/gameplay';

/**
 * Set `turretPivotedThisTurn = true` on a vehicle combat state. Called when
 * the vehicle's primary turret rotates from its previous facing during the
 * current turn. Idempotent — calling it on a state that is already
 * pivoted is a no-op (returns the same reference where possible to keep
 * downstream selector identity stable).
 *
 * The flag is cleared at the next turn-start boundary by
 * `clearTurretPivotedFlag`. While set, the chin-turret weapon attacks
 * routed through `calculateToHit` will pick up the +1 modifier via
 * `calculateChinTurretPivotModifier`.
 *
 * **Caller note:** the rotation event handler is not yet authored in
 * production (per the architecture comment above). Once a future change
 * authors the facing-change reducer, it should call this helper as part
 * of the rotation effect.
 */
export function markTurretPivoted(
  state: IVehicleCombatState,
): IVehicleCombatState {
  if (state.turretPivotedThisTurn === true) return state;
  return { ...state, turretPivotedThisTurn: true };
}

/**
 * Clear `turretPivotedThisTurn` on a single vehicle combat state. Idempotent.
 * Per the spec, the flag SHALL be cleared at the start of each turn so the
 * next turn's pivot tracking starts from a clean slate.
 *
 * Returns the same reference when the flag is already absent / false to
 * preserve selector identity.
 */
export function clearTurretPivotedFlag(
  state: IVehicleCombatState,
): IVehicleCombatState {
  if (!state.turretPivotedThisTurn) return state;
  return { ...state, turretPivotedThisTurn: false };
}

/**
 * Clear `turretPivotedThisTurn` across a batch of vehicle combat states —
 * the canonical end-of-turn / start-of-turn reset for the per-turn flag.
 *
 * Returns the same input map reference when no state needs updating, so
 * unchanged turns don't trigger downstream re-renders.
 *
 * @param states - Map keyed by `unitId` (matches the existing
 *   `IVehicleCombatState.unitId` convention).
 */
export function clearAllTurretPivotedFlags(
  states: Readonly<Record<string, IVehicleCombatState>>,
): Readonly<Record<string, IVehicleCombatState>> {
  let mutated = false;
  const next: Record<string, IVehicleCombatState> = {};
  for (const [unitId, state] of Object.entries(states)) {
    const cleared = clearTurretPivotedFlag(state);
    if (cleared !== state) mutated = true;
    next[unitId] = cleared;
  }
  return mutated ? next : states;
}
