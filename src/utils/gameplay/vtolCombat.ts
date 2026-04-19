/**
 * VTOL Combat Helpers
 *
 * Implements VTOL-specific damage consequences: rotor tracking, crash checks,
 * and fall damage scaling with altitude. Altitude state lives in
 * `IVehicleCombatState.altitude` (0 = hover, 1-5 = flight).
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-hit-location-tables (VTOL rotor)
 */

import { VTOLLocation } from '@/types/construction/UnitLocation';
import { IVehicleCombatState } from '@/types/gameplay';

// =============================================================================
// Crash Check
// =============================================================================

export interface IVTOLCrashResult {
  readonly crashed: boolean;
  readonly fallDamage: number;
  readonly altitudeAtCrash: number;
}

/**
 * Resolve a rotor-destruction crash: `fallDamage = 10 × altitude`.
 * Altitude 0 (hover) results in 0 fall damage but still marks the unit
 * crashed/disabled.
 */
export function resolveVTOLCrash(state: IVehicleCombatState): IVTOLCrashResult {
  const altitude = state.altitude ?? 0;
  const fallDamage = Math.max(0, altitude * 10);
  return {
    crashed: true,
    fallDamage,
    altitudeAtCrash: altitude,
  };
}

/**
 * True when damage to the rotor triggered a crash check (rotor structure
 * damaged OR rotor destroyed).
 */
export function rotorDamageTriggersCrashCheck(params: {
  readonly location: VTOLLocation | string;
  readonly structureDamage: number;
  readonly destroyed: boolean;
}): boolean {
  return (
    params.location === VTOLLocation.ROTOR &&
    (params.structureDamage > 0 || params.destroyed)
  );
}

/**
 * Reduce altitude by `delta` hexes, clamped to 0.
 */
export function reduceAltitude(
  state: IVehicleCombatState,
  delta: number,
): IVehicleCombatState {
  const current = state.altitude ?? 0;
  const next = Math.max(0, current - delta);
  return { ...state, altitude: next };
}
