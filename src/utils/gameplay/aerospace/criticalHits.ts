/**
 * Aerospace Critical Hits
 *
 * Per the change proposal:
 *   2  = nothing
 *   3  = crew stunned
 *   4-5 = cargo / fuel hit
 *   6-7 = avionics (+1 to-hit on all subsequent attacks)
 *   8-9 = engine hit (+5 heat, can destroy on repeat)
 *  10-11 = control surfaces (-1 thrust)
 *   12 = catastrophic (destroyed)
 *
 * Fuel hits bleed 5 fuel points + carry an ignition chance (simplified here
 * to a deterministic "5 fuel lost" consequence).
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 5)
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';
import { defaultD6Roller, roll2d6, type D6Roller } from '../diceTypes';
import {
  AerospaceEventType,
  type AerospaceEvent,
  type IComponentDestroyedEvent,
  type IUnitDestroyedEvent,
} from './events';
import { type IAerospaceCombatState } from './state';

// ============================================================================
// Types
// ============================================================================

export type AerospaceCritCategory =
  | 'none'
  | 'crewStunned'
  | 'cargo'
  | 'fuel'
  | 'avionics'
  | 'engine'
  | 'controlSurfaces'
  | 'catastrophic';

export interface IAerospaceCriticalResult {
  readonly state: IAerospaceCombatState;
  readonly rolled: boolean;
  readonly rollTotal: number;
  readonly dice: readonly [number, number];
  readonly category: AerospaceCritCategory;
  readonly events: readonly AerospaceEvent[];
}

export interface IResolveAerospaceCriticalHitParams {
  readonly unitId: string;
  readonly arc: AerospaceArc;
  readonly state: IAerospaceCombatState;
  readonly diceRoller?: D6Roller;
}

// ============================================================================
// Roll → category
// ============================================================================

export function categoriseCritRoll(total: number): AerospaceCritCategory {
  if (total <= 2) return 'none';
  if (total === 3) return 'crewStunned';
  if (total <= 5) return Math.random() < 0.5 ? 'cargo' : 'fuel'; // unused; resolver overrides
  if (total <= 7) return 'avionics';
  if (total <= 9) return 'engine';
  if (total <= 11) return 'controlSurfaces';
  return 'catastrophic';
}

/**
 * Deterministic variant — the 4-5 slot picks `cargo` or `fuel` based on
 * `cargoOrFuel`: when `cargoOrFuel` is truthy (e.g. odd tiebreak roll), pick
 * `fuel`; otherwise `cargo`. This keeps the resolver deterministic under an
 * injected roller.
 */
export function categoriseCritRollDeterministic(
  total: number,
  cargoOrFuel: boolean,
): AerospaceCritCategory {
  if (total <= 2) return 'none';
  if (total === 3) return 'crewStunned';
  if (total <= 5) return cargoOrFuel ? 'fuel' : 'cargo';
  if (total <= 7) return 'avionics';
  if (total <= 9) return 'engine';
  if (total <= 11) return 'controlSurfaces';
  return 'catastrophic';
}

// ============================================================================
// Apply category to state
// ============================================================================

function applyCategory(
  state: IAerospaceCombatState,
  category: AerospaceCritCategory,
): IAerospaceCombatState {
  switch (category) {
    case 'none':
      return state;
    case 'crewStunned':
      return { ...state, crewStunned: true };
    case 'cargo':
      // Cargo damage is cosmetic for this 2D combat model.
      return state;
    case 'fuel':
      return {
        ...state,
        fuelRemaining: Math.max(0, state.fuelRemaining - 5),
      };
    case 'avionics':
      return { ...state, avionicsDamaged: true };
    case 'engine':
      return {
        ...state,
        heat: state.heat + 5,
      };
    case 'controlSurfaces':
      return {
        ...state,
        thrustPenalty: state.thrustPenalty + 1,
      };
    case 'catastrophic':
      return { ...state, destroyed: true, currentSI: 0 };
    default:
      return state;
  }
}

function categoryToEventComponent(
  category: AerospaceCritCategory,
): IComponentDestroyedEvent['component'] | undefined {
  switch (category) {
    case 'crewStunned':
      return 'crewStunned';
    case 'cargo':
      return 'cargo';
    case 'fuel':
      return 'fuel';
    case 'avionics':
      return 'avionics';
    case 'engine':
      return 'engine';
    case 'controlSurfaces':
      return 'controlSurfaces';
    case 'catastrophic':
      return 'catastrophic';
    default:
      return undefined;
  }
}

// ============================================================================
// Resolve
// ============================================================================

export function resolveAerospaceCriticalHit(
  params: IResolveAerospaceCriticalHitParams,
): IAerospaceCriticalResult {
  const roller: D6Roller = params.diceRoller ?? defaultD6Roller;
  const roll = roll2d6(roller);

  // For the 4-5 band we need a deterministic tiebreak. Reuse the roller.
  const tiebreak = roller();
  const cargoOrFuel = tiebreak % 2 === 1; // odd → fuel, even → cargo
  const category = categoriseCritRollDeterministic(roll.total, cargoOrFuel);

  const newState = applyCategory(params.state, category);
  const events: AerospaceEvent[] = [];

  const component = categoryToEventComponent(category);
  if (component) {
    const ev: IComponentDestroyedEvent = {
      type: AerospaceEventType.COMPONENT_DESTROYED,
      unitId: params.unitId,
      component,
      arc: params.arc,
    };
    events.push(ev);
  }

  if (category === 'catastrophic') {
    const ev: IUnitDestroyedEvent = {
      type: AerospaceEventType.UNIT_DESTROYED,
      unitId: params.unitId,
      cause: 'catastrophic_crit',
    };
    events.push(ev);
  }

  return {
    state: newState,
    rolled: true,
    rollTotal: roll.total,
    dice: [roll.dice[0], roll.dice[1]],
    category,
    events,
  };
}
