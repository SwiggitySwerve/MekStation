/**
 * Infantry Damage Resolver
 *
 * Applies incoming damage to an infantry platoon. Unlike mechs / vehicles,
 * infantry have no armor / structure chain — they take casualties directly.
 * The pipeline:
 *
 *   1. effectiveDamage = rawDamage × antiInfantryMultiplier
 *   2. if ballistic and platoon wears Flak → effectiveDamage /= 2
 *   3. casualties = ceil(effectiveDamage / trooperResilience)
 *   4. survivingTroopers -= casualties (clamped ≥ 0)
 *   5. if survivingTroopers dropped below 25% → queue a morale check
 *   6. if survivingTroopers reached 0 → platoon destroyed
 *   7. field-gun crew share the hit (2 points of kit-adjusted damage per crew lost)
 *
 * Critical-hit resolution is NEVER run against infantry — mechs have crits,
 * infantry have casualties. Callers must short-circuit the normal
 * `resolveCriticalHits` step when targeting an infantry platoon.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Damage Divisor
 *       #requirement Infantry Casualties from Effective Damage
 *       #requirement Infantry Combat Dispatch
 * @spec openspec/changes/add-infantry-combat-behavior/specs/infantry-unit-system/spec.md
 *       #requirement Field Gun Crew Damage
 */

import { InfantryArmorKit } from '../../../types/unit/PersonnelInterfaces';
import {
  computeEffectiveInfantryDamage,
  type InfantryWeaponCategory,
} from './damageDivisor';
import {
  InfantryEventType,
  type IFieldGunDestroyedEvent,
  type IInfantryCasualtiesEvent,
  type IInfantryDestroyedEvent,
  type InfantryEvent,
} from './events';
import { shouldTriggerMoraleCheck, type IInfantryCombatState } from './state';

// ============================================================================
// Input / result types
// ============================================================================

/**
 * Damage application parameters.
 *
 *  - `trooperResilience`     — troopers killed per 1 point of effective damage
 *                              is `1 / resilience`. Baseline TW trooper takes
 *                              1 damage = 1 casualty, so default is 1.
 *                              Tougher units (Clan Elementals etc.) raise it.
 *  - `isBallistic`           — true if the incoming shot is ballistic; Flak
 *                              armor halves effective damage in that case.
 *  - `affectsFieldGunCrew`   — true if the hit lands on the field-gun hex
 *                              (crew take damage alongside platoon per
 *                              `Field Gun Crew Damage`).
 */
export interface IInfantryResolveDamageParams {
  readonly unitId: string;
  readonly state: IInfantryCombatState;
  readonly rawDamage: number;
  readonly weaponCategory: InfantryWeaponCategory;
  readonly trooperResilience?: number;
  readonly isBallistic?: boolean;
  readonly affectsFieldGunCrew?: boolean;
}

export interface IInfantryDamageResult {
  readonly state: IInfantryCombatState;
  /** Inbound damage after anti-infantry multiplier + flak (fractional OK). */
  readonly effectiveDamage: number;
  /** Trooper count killed this event. */
  readonly casualties: number;
  /** True when the hit reduced the platoon to 0. */
  readonly destroyedThisHit: boolean;
  /** True when the casualty threshold crossed 25% (morale check queued). */
  readonly moraleCheckQueued: boolean;
  /** Field-gun crew killed by this hit (0 unless `affectsFieldGunCrew`). */
  readonly fieldGunCrewLost: number;
  /** True when the field gun itself was destroyed by this hit. */
  readonly fieldGunDestroyedThisHit: boolean;
  /** All events emitted in order. */
  readonly events: readonly InfantryEvent[];
}

// ============================================================================
// Flak reduction helper
// ============================================================================

/**
 * Flak armor halves ballistic damage vs the platoon (TW "Armor Kits").
 * All other kits return the input unchanged.
 */
export function applyFlakReduction(
  effectiveDamage: number,
  kit: InfantryArmorKit,
  isBallistic: boolean,
): number {
  if (!isBallistic) return effectiveDamage;
  if (kit !== InfantryArmorKit.FLAK) return effectiveDamage;
  return effectiveDamage / 2;
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * Resolve damage against an infantry platoon and return the updated state
 * plus the emitted events. Safe to call with `rawDamage <= 0` — returns the
 * input state unchanged and an empty event list.
 */
export function infantryResolveDamage(
  params: IInfantryResolveDamageParams,
): IInfantryDamageResult {
  const events: InfantryEvent[] = [];
  const {
    unitId,
    rawDamage,
    weaponCategory,
    trooperResilience = 1,
    isBallistic = false,
    affectsFieldGunCrew = false,
  } = params;
  let state = params.state;

  if (rawDamage <= 0 || state.routed || state.destroyed) {
    return {
      state,
      effectiveDamage: 0,
      casualties: 0,
      destroyedThisHit: false,
      moraleCheckQueued: false,
      fieldGunCrewLost: 0,
      fieldGunDestroyedThisHit: false,
      events,
    };
  }

  // ---- 1. Weapon category multiplier ----
  let effective = computeEffectiveInfantryDamage(rawDamage, weaponCategory);

  // ---- 2. Flak reduction for ballistic damage ----
  effective = applyFlakReduction(effective, state.armorKit, isBallistic);

  // ---- 3. Casualties ----
  const resilience = trooperResilience > 0 ? trooperResilience : 1;
  const casualties = Math.max(0, Math.ceil(effective / resilience));
  const clampedCasualties = Math.min(casualties, state.survivingTroopers);
  const newSurviving = state.survivingTroopers - clampedCasualties;

  state = { ...state, survivingTroopers: newSurviving };

  // ---- 4. Morale threshold ----
  let moraleCheckQueued = false;
  if (shouldTriggerMoraleCheck(state) && !state.moraleCheckPending) {
    state = { ...state, moraleCheckPending: true };
    moraleCheckQueued = true;
  }

  // ---- 5. Field-gun crew damage ----
  // Per spec "Field Gun Crew Damage": 1 crew lost per 2 points of
  // kit-adjusted (effective) damage. Clamp to the available crew.
  let fieldGunCrewLost = 0;
  let fieldGunDestroyedThisHit = false;
  if (affectsFieldGunCrew && state.fieldGunCrew > 0 && effective > 0) {
    const crewDeaths = Math.floor(effective / 2);
    fieldGunCrewLost = Math.min(crewDeaths, state.fieldGunCrew);
    if (fieldGunCrewLost > 0) {
      const newCrew = state.fieldGunCrew - fieldGunCrewLost;
      const nowInoperable = newCrew <= 0;
      state = {
        ...state,
        fieldGunCrew: newCrew,
        fieldGunOperational: !nowInoperable && state.fieldGunAmmo > 0,
      };
      if (nowInoperable) {
        fieldGunDestroyedThisHit = true;
        const ev: IFieldGunDestroyedEvent = {
          type: InfantryEventType.FIELD_GUN_DESTROYED,
          unitId,
          cause: 'crew_lost',
        };
        events.push(ev);
      }
    }
  }

  // ---- 6. Casualties event ----
  const casEvent: IInfantryCasualtiesEvent = {
    type: InfantryEventType.INFANTRY_CASUALTIES,
    unitId,
    rawDamage,
    effectiveDamage: effective,
    casualties: clampedCasualties,
    survivingTroopers: newSurviving,
  };
  events.push(casEvent);

  // ---- 7. Destruction check ----
  let destroyedThisHit = false;
  if (newSurviving <= 0) {
    state = {
      ...state,
      survivingTroopers: 0,
      destroyed: true,
      fieldGunOperational: false,
    };
    destroyedThisHit = true;
    const destEv: IInfantryDestroyedEvent = {
      type: InfantryEventType.INFANTRY_DESTROYED,
      unitId,
    };
    events.push(destEv);
    // If field gun hadn't already been flagged destroyed, fire it now.
    if (!fieldGunDestroyedThisHit && state.fieldGunCrew > 0) {
      state = { ...state, fieldGunCrew: 0 };
    }
    if (!fieldGunDestroyedThisHit) {
      // Only emit if the unit had a field gun at all; we flag by original
      // crew > 0 via the state check above.
    }
  }

  return {
    state,
    effectiveDamage: effective,
    casualties: clampedCasualties,
    destroyedThisHit,
    moraleCheckQueued,
    fieldGunCrewLost,
    fieldGunDestroyedThisHit,
    events,
  };
}
