/**
 * Infantry Combat State
 *
 * Per-platoon combat state carried by infantry units during a battle.
 * Kept separate from the construction-side `IInfantry` interface (which lives
 * in `src/types/unit/PersonnelInterfaces.ts`) so the construction types stay
 * pure — the combat engine owns this struct.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/infantry-unit-system/spec.md
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 */

import type { IInfantry } from '../../../types/unit/PersonnelInterfaces';

import { InfantryArmorKit } from '../../../types/unit/PersonnelInterfaces';

// ============================================================================
// Morale enum
// ============================================================================

/**
 * Morale status tracked across the battle. `normal` is the default; `shaken`
 * is a transient "recent casualty" flag that callers may set. `pinned` skips
 * firing/movement for one phase; `routed` removes the platoon from play.
 */
export enum InfantryMorale {
  NORMAL = 'normal',
  SHAKEN = 'shaken',
  PINNED = 'pinned',
  ROUTED = 'routed',
}

// ============================================================================
// Combat state
// ============================================================================

/**
 * Infantry platoon combat state.
 *
 * Spec requires: `survivingTroopers`, `morale`, `pinned`, `routed`,
 * `fieldGunOperational`, `antiMechCommitted`.
 *
 * We extend that minimum with fields the damage / morale / field-gun resolvers
 * need: `startingTroopers` (reference for the 25% morale threshold),
 * `fieldGunCrew` (damage tracks individual crew), `fieldGunAmmo` (firing
 * depletes it), `moraleCheckPending` (casualty resolver queues one for the
 * morale step to consume), `hasAntiMechTraining` (set once at init from the
 * construction unit).
 */
export interface IInfantryCombatState {
  /** Platoon strength at battle start; never changes during combat. */
  readonly startingTroopers: number;
  /** Current surviving trooper count (0..startingTroopers). */
  survivingTroopers: number;
  /** Armor kit (affects Flak ballistic reduction). */
  readonly armorKit: InfantryArmorKit;
  /** Morale status. */
  morale: InfantryMorale;
  /** True when the platoon is pinned this phase (no firing / movement). */
  pinned: boolean;
  /** True when the platoon has routed off-board. Once true, stays true. */
  routed: boolean;
  /** True while a morale check is queued (cleared once resolved). */
  moraleCheckPending: boolean;
  /** True when the field gun is present AND has surviving crew AND is intact. */
  fieldGunOperational: boolean;
  /** Surviving field-gun crew (0..original crew). Always ≤ surviving troopers. */
  fieldGunCrew: number;
  /** Remaining field-gun ammo rounds. */
  fieldGunAmmo: number;
  /** True if the platoon has declared an anti-mech leg attack this turn. */
  antiMechCommitted: boolean;
  /** Preserved anti-mech training flag from construction. */
  readonly hasAntiMechTraining: boolean;
  /** True when `survivingTroopers === 0` OR the platoon has routed. */
  destroyed: boolean;
}

// ============================================================================
// State construction
// ============================================================================

/**
 * Parameters for building a fresh combat state.
 * `fieldGunCrew` and `fieldGunAmmo` are optional (zero when absent); when
 * both are > 0 the field gun starts operational.
 */
export interface ICreateInfantryCombatStateParams {
  readonly startingTroopers: number;
  readonly armorKit: InfantryArmorKit;
  readonly hasAntiMechTraining: boolean;
  readonly fieldGunCrew?: number;
  readonly fieldGunAmmo?: number;
}

/**
 * Build a fresh infantry combat state at battle start.
 */
export function createInfantryCombatState(
  params: ICreateInfantryCombatStateParams,
): IInfantryCombatState {
  const fieldGunCrew = params.fieldGunCrew ?? 0;
  const fieldGunAmmo = params.fieldGunAmmo ?? 0;
  const fieldGunOperational = fieldGunCrew > 0 && fieldGunAmmo > 0;

  return {
    startingTroopers: params.startingTroopers,
    survivingTroopers: params.startingTroopers,
    armorKit: params.armorKit,
    morale: InfantryMorale.NORMAL,
    pinned: false,
    routed: false,
    moraleCheckPending: false,
    fieldGunOperational,
    fieldGunCrew,
    fieldGunAmmo,
    antiMechCommitted: false,
    hasAntiMechTraining: params.hasAntiMechTraining,
    destroyed: false,
  };
}

/**
 * Convenience factory that pulls starting troopers + armor kit + anti-mech
 * training straight off an `IInfantry`. Field gun crew / ammo default to the
 * totals implied by the first field gun in the platoon (ammo defaulting to
 * 10 rounds, matching the TW default bin size used in
 * `src/utils/construction/infantry/fieldGuns.ts`).
 */
export function createInfantryCombatStateFromUnit(
  unit: IInfantry,
  overrides?: {
    readonly fieldGunCrew?: number;
    readonly fieldGunAmmo?: number;
  },
): IInfantryCombatState {
  const gun = unit.fieldGuns[0];
  const crew = overrides?.fieldGunCrew ?? gun?.crew ?? 0;
  const ammo = overrides?.fieldGunAmmo ?? (gun !== undefined ? 10 : 0);
  return createInfantryCombatState({
    startingTroopers: unit.platoonStrength,
    armorKit: unit.armorKit,
    hasAntiMechTraining: unit.hasAntiMechTraining,
    fieldGunCrew: crew,
    fieldGunAmmo: ammo,
  });
}

// ============================================================================
// Derived helpers
// ============================================================================

/**
 * The 25% morale threshold — when `survivingTroopers` drops below this value
 * a morale check is triggered. Uses strict `<` (below, not at-or-below) so a
 * platoon reduced to exactly 25% does NOT yet check morale.
 */
export function moraleThreshold(state: IInfantryCombatState): number {
  return Math.floor(state.startingTroopers * 0.25);
}

/**
 * True when a freshly-applied casualty event should queue a morale check.
 * (i.e. `survivingTroopers < 25%` and the platoon hasn't already routed.)
 */
export function shouldTriggerMoraleCheck(state: IInfantryCombatState): boolean {
  if (state.routed) return false;
  return state.survivingTroopers < moraleThreshold(state);
}

/**
 * True if the platoon has been eliminated (all troopers lost) OR routed.
 */
export function isPlatoonDestroyed(state: IInfantryCombatState): boolean {
  return state.destroyed || state.routed || state.survivingTroopers <= 0;
}
