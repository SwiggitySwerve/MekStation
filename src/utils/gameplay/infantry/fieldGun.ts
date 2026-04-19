/**
 * Field Gun Firing
 *
 * A field gun is a mech-scale weapon crewed by platoon troopers. Per the
 * spec "Field Gun Firing":
 *
 *   - Fires once per turn at the gun's mech-scale damage.
 *   - Consumes one ammo round per shot.
 *   - Cannot fire when the platoon is pinned, routed, or destroyed.
 *   - Cannot fire when the gun is inoperable (no crew) or out of ammo.
 *
 * Damage-resolution against the gun (crew casualties) lives in `damage.ts`
 * via the `affectsFieldGunCrew` branch.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Field Gun Firing
 */

import type { IInfantryCombatState } from './state';

import {
  InfantryEventType,
  type IFieldGunFiredEvent,
  type InfantryEvent,
} from './events';

// ============================================================================
// Input / result types
// ============================================================================

export type FieldGunRangeBand = 'short' | 'medium' | 'long';

export interface IFireFieldGunParams {
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly state: IInfantryCombatState;
  /** Mech-scale damage from the field gun catalog entry. */
  readonly damage: number;
  /** Range band this shot is fired at. */
  readonly rangeBand: FieldGunRangeBand;
}

/**
 * Reason a field gun cannot fire, when `fired === false`.
 *
 *   `pinned`          — platoon is pinned this phase
 *   `routed`          — platoon has routed off-board
 *   `destroyed`       — platoon eliminated
 *   `no_crew`         — all field-gun crew lost
 *   `out_of_ammo`     — gun has 0 ammo
 *   `inoperable`      — fieldGunOperational flag false for any other reason
 *   `no_damage`       — caller passed damage ≤ 0
 */
export type FieldGunFireDenyReason =
  | 'pinned'
  | 'routed'
  | 'destroyed'
  | 'no_crew'
  | 'out_of_ammo'
  | 'inoperable'
  | 'no_damage';

export type IFieldGunFireResult =
  | {
      readonly fired: true;
      readonly state: IInfantryCombatState;
      readonly damageDealt: number;
      readonly ammoRemaining: number;
      readonly events: readonly InfantryEvent[];
    }
  | {
      readonly fired: false;
      readonly state: IInfantryCombatState;
      readonly reason: FieldGunFireDenyReason;
      readonly events: readonly InfantryEvent[];
    };

// ============================================================================
// Predicate: can the field gun fire right now?
// ============================================================================

/**
 * Return the reason the field gun may NOT fire this turn, or `null` if it can.
 * Used by callers (and by the AI) to reason about firing options before
 * actually dispatching the shot.
 */
export function fieldGunCannotFireReason(
  state: IInfantryCombatState,
): FieldGunFireDenyReason | null {
  if (state.destroyed || state.survivingTroopers <= 0) return 'destroyed';
  if (state.routed) return 'routed';
  if (state.pinned) return 'pinned';
  if (state.fieldGunCrew <= 0) return 'no_crew';
  if (state.fieldGunAmmo <= 0) return 'out_of_ammo';
  if (!state.fieldGunOperational) return 'inoperable';
  return null;
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * Attempt to fire the field gun. Returns a discriminated result: `fired: true`
 * advances ammo and emits `FieldGunFired`; `fired: false` returns the reason
 * along with the unchanged state.
 */
export function fireFieldGun(params: IFireFieldGunParams): IFieldGunFireResult {
  const { unitId, targetUnitId, damage, rangeBand } = params;
  const state = params.state;
  const events: InfantryEvent[] = [];

  if (damage <= 0) {
    return {
      fired: false,
      state,
      reason: 'no_damage',
      events,
    };
  }

  const deny = fieldGunCannotFireReason(state);
  if (deny !== null) {
    return { fired: false, state, reason: deny, events };
  }

  const newAmmo = state.fieldGunAmmo - 1;
  const nextState: IInfantryCombatState = {
    ...state,
    fieldGunAmmo: newAmmo,
    fieldGunOperational: newAmmo > 0 && state.fieldGunCrew > 0,
  };

  const firedEvent: IFieldGunFiredEvent = {
    type: InfantryEventType.FIELD_GUN_FIRED,
    unitId,
    targetUnitId,
    damage,
    rangeBand,
    ammoRemaining: newAmmo,
  };
  events.push(firedEvent);

  return {
    fired: true,
    state: nextState,
    damageDealt: damage,
    ammoRemaining: newAmmo,
    events,
  };
}
