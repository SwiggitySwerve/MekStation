/**
 * Aerospace Damage Resolver
 *
 * Armor-arc → SI damage chain. Unlike mech damage, aerospace damage never
 * transfers between arcs — excess damage converts to SI damage at 10% efficiency
 * (`floor(excess / 10)`), and SI destruction destroys the whole unit.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';
import { type D6Roller, defaultD6Roller } from '../diceTypes';
import {
  rollAerospaceControlCheck,
  type IAerospaceControlRollResult,
} from './controlRoll';
import {
  resolveAerospaceCriticalHit,
  type IAerospaceCriticalResult,
} from './criticalHits';
import {
  AerospaceEventType,
  type AerospaceEvent,
  type IComponentDestroyedEvent,
  type IControlRollEvent,
  type ISIReducedEvent,
  type IUnitDestroyedEvent,
} from './events';
import { getArcArmor, setArcArmor, type IAerospaceCombatState } from './state';

// ============================================================================
// Public result shape
// ============================================================================

export interface IAerospaceDamageResult {
  /** The updated combat state (armor / SI / flags). */
  readonly state: IAerospaceCombatState;
  /** How much damage was absorbed by arc armor. */
  readonly armorAbsorbed: number;
  /** How many SI points were removed. */
  readonly siLost: number;
  /** True when this damage event caused SI to reach 0. */
  readonly destroyedThisHit: boolean;
  /** True when the inbound damage exceeded the SI control-roll threshold. */
  readonly controlRollTriggered: boolean;
  /** Resolved control-roll result, if one was performed. */
  readonly controlRoll?: IAerospaceControlRollResult;
  /** Resolved crit result, if TAC / SI-exposing damage triggered one. */
  readonly critical?: IAerospaceCriticalResult;
  /** All events emitted by this damage event, in order. */
  readonly events: readonly AerospaceEvent[];
}

// ============================================================================
// Configuration for a damage call
// ============================================================================

export interface IAerospaceResolveDamageParams {
  /** Unit-id string used in events. */
  readonly unitId: string;
  /** Current combat state. */
  readonly state: IAerospaceCombatState;
  /** Arc the damage landed against (post-hit-location resolution). */
  readonly arc: AerospaceArc;
  /** Incoming raw damage (before armor / SI distribution). */
  readonly damage: number;
  /**
   * True when the hit was a `TAC` (hit-location roll of 2 or 12).
   * TAC ALWAYS triggers a critical-hit check.
   */
  readonly isTAC?: boolean;
  /** Pilot skill (used by the control roll). Defaults to 4. */
  readonly pilotSkill?: number;
  /** Injectable d6 roller for control-roll and crit dice. */
  readonly diceRoller?: D6Roller;
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * Apply aerospace damage to arc armor then SI. Returns a new combat state plus
 * a collected list of aerospace events. Damage does NOT transfer between arcs.
 */
export function aerospaceResolveDamage(
  params: IAerospaceResolveDamageParams,
): IAerospaceDamageResult {
  const { unitId, arc, damage } = params;
  const roller = params.diceRoller ?? defaultD6Roller;
  const events: AerospaceEvent[] = [];

  if (damage <= 0) {
    return {
      state: params.state,
      armorAbsorbed: 0,
      siLost: 0,
      destroyedThisHit: false,
      controlRollTriggered: false,
      events,
    };
  }

  let state = params.state;

  // ---- 1. Absorb against arc armor ----
  const currentArmor = getArcArmor(state, arc);
  const armorAbsorbed = Math.min(currentArmor, damage);
  const excess = damage - armorAbsorbed;

  if (armorAbsorbed > 0) {
    state = {
      ...state,
      armorByArc: setArcArmor(
        state.armorByArc,
        arc,
        currentArmor - armorAbsorbed,
      ),
    };
  }

  // ---- 2. Convert excess to SI ----
  let siLost = 0;
  if (excess > 0) {
    siLost = Math.floor(excess / 10);
    if (siLost > 0) {
      const previousSI = state.currentSI;
      const newSI = Math.max(0, previousSI - siLost);
      state = { ...state, currentSI: newSI };
      const siEvent: ISIReducedEvent = {
        type: AerospaceEventType.SI_REDUCED,
        unitId,
        previousSI,
        newSI,
        damageApplied: siLost,
      };
      events.push(siEvent);
    }
  }

  // ---- 3. Control-roll trigger (damage > 0.1 × current SI) ----
  // Evaluated against the SI _before_ this hit reduced it, which is the
  // meaningful threshold from the pilot's perspective.
  const preHitSI = params.state.currentSI;
  const controlTriggered = preHitSI > 0 && damage > 0.1 * preHitSI;
  let controlRoll: IAerospaceControlRollResult | undefined;
  if (controlTriggered) {
    controlRoll = rollAerospaceControlCheck({
      unitId,
      pilotSkill: params.pilotSkill ?? 4,
      damageApplied: damage,
      diceRoller: roller,
    });
    const ev: IControlRollEvent = {
      type: AerospaceEventType.CONTROL_ROLL,
      unitId,
      targetNumber: controlRoll.targetNumber,
      rollTotal: controlRoll.rollTotal,
      dice: controlRoll.dice,
      passed: controlRoll.passed,
      modifier: controlRoll.modifier,
    };
    events.push(ev);

    if (!controlRoll.passed) {
      // Failure: +1 SI damage and -1 thrust on next movement phase.
      const prevSI = state.currentSI;
      const newSI = Math.max(0, prevSI - 1);
      state = {
        ...state,
        currentSI: newSI,
        thrustPenalty: state.thrustPenalty + 1,
        controlRollsFailed: state.controlRollsFailed + 1,
      };
      siLost += 1;
      if (newSI < prevSI) {
        const ev2: ISIReducedEvent = {
          type: AerospaceEventType.SI_REDUCED,
          unitId,
          previousSI: prevSI,
          newSI,
          damageApplied: 1,
        };
        events.push(ev2);
      }
    }
  }

  // ---- 4. Critical-hit check on TAC or SI-exposing damage ----
  let critical: IAerospaceCriticalResult | undefined;
  const siWasExposed = excess > 0; // armor was gone and damage bled into SI
  if (params.isTAC || siWasExposed) {
    critical = resolveAerospaceCriticalHit({
      unitId,
      arc,
      state,
      diceRoller: roller,
    });
    state = critical.state;
    for (const evt of critical.events) {
      events.push(evt);
    }
  }

  // ---- 5. Destruction check ----
  let destroyedThisHit = false;
  if (!state.destroyed && state.currentSI <= 0) {
    state = { ...state, currentSI: 0, destroyed: true };
    destroyedThisHit = true;
    const ev: IUnitDestroyedEvent = {
      type: AerospaceEventType.UNIT_DESTROYED,
      unitId,
      cause: 'si_zero',
    };
    events.push(ev);
  } else if (state.destroyed && critical) {
    // The crit pipeline may have set `destroyed` via catastrophic.
    destroyedThisHit = true;
  }

  return {
    state,
    armorAbsorbed,
    siLost,
    destroyedThisHit,
    controlRollTriggered: controlTriggered,
    controlRoll,
    critical,
    events,
  };
}

// Re-export so consumers can import from one module.
export type { IComponentDestroyedEvent };
