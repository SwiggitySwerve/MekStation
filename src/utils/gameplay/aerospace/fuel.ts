/**
 * Aerospace Fuel Tracking
 *
 * Each turn a flying unit spends fuel equal to the thrust used. When fuel
 * reaches 0, the unit must leave the board at the next movement phase and
 * cannot re-enter this scenario.
 *
 * Fuel depletion is also fired as an event so the UI / replay log can react.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md (Fuel Consumption)
 */

import {
  AerospaceEventType,
  type AerospaceEvent,
  type IFuelDepletedEvent,
} from './events';
import { type IAerospaceCombatState } from './state';

// ============================================================================
// API
// ============================================================================

export interface IBurnFuelParams {
  readonly unitId: string;
  readonly state: IAerospaceCombatState;
  readonly thrustUsed: number;
}

export interface IBurnFuelResult {
  readonly state: IAerospaceCombatState;
  readonly fuelSpent: number;
  readonly depletedThisTurn: boolean;
  readonly events: readonly AerospaceEvent[];
}

/**
 * Burn fuel equal to `thrustUsed`. Emits a `FuelDepleted` event the FIRST turn
 * the tank hits 0 — subsequent calls on an already-depleted tank do not re-emit.
 */
export function burnAerospaceFuel(params: IBurnFuelParams): IBurnFuelResult {
  const { state } = params;
  const spend = Math.max(0, params.thrustUsed);
  const newFuel = Math.max(0, state.fuelRemaining - spend);
  const events: AerospaceEvent[] = [];

  let newState: IAerospaceCombatState = { ...state, fuelRemaining: newFuel };

  const depleted =
    state.fuelRemaining > 0 && newFuel === 0 && !state.fuelDepleted;
  if (depleted) {
    newState = { ...newState, fuelDepleted: true };
    const ev: IFuelDepletedEvent = {
      type: AerospaceEventType.FUEL_DEPLETED,
      unitId: params.unitId,
    };
    events.push(ev);
  }

  return {
    state: newState,
    fuelSpent: spend,
    depletedThisTurn: depleted,
    events,
  };
}

/**
 * True when the unit must leave the board at its next movement phase.
 */
export function mustLeaveBoard(state: IAerospaceCombatState): boolean {
  return state.fuelDepleted && !state.offMap;
}
