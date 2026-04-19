/**
 * Infantry Morale Rule
 *
 * Per TW platoon rules: when a platoon drops below 25% of its starting
 * strength, the next resolution step rolls a morale check. The roll is
 * 2d6 + leader modifier against a target number of 8. Margin determines
 * the outcome:
 *
 *   roll ≥ TN               → pass (stay in fight)
 *   roll = TN − 1            → pinned (skip firing/movement next phase)
 *   roll ≤ TN − 2            → routed (retreat off-board, no further combat)
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Morale Rule
 */

import { defaultD6Roller, type D6Roller } from '../diceTypes';
import {
  InfantryEventType,
  type IInfantryMoraleCheckEvent,
  type IInfantryPinnedEvent,
  type IInfantryRoutedEvent,
  type InfantryEvent,
} from './events';
import { InfantryMorale, type IInfantryCombatState } from './state';

// ============================================================================
// Constants
// ============================================================================

/** Base target number for the morale check. */
export const MORALE_TARGET_NUMBER = 8;

// ============================================================================
// Input / result
// ============================================================================

export interface IRollInfantryMoraleParams {
  readonly unitId: string;
  readonly state: IInfantryCombatState;
  /**
   * Leader modifier (default 0). Positive = better morale.
   * Typical range: −2 (green troops) to +2 (elite).
   */
  readonly leaderModifier?: number;
  readonly diceRoller?: D6Roller;
}

export interface IInfantryMoraleResult {
  readonly state: IInfantryCombatState;
  readonly outcome: 'pass' | 'pinned' | 'routed';
  readonly rollTotal: number;
  readonly dice: readonly [number, number];
  readonly targetNumber: number;
  readonly events: readonly InfantryEvent[];
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * Roll a morale check for a platoon that has crossed the 25% threshold.
 *
 * If `state.moraleCheckPending` is false this is a no-op (returns the input
 * state with outcome 'pass' and no events). Callers should only invoke when
 * the damage resolver flagged `moraleCheckQueued: true`.
 *
 * The resulting state always clears `moraleCheckPending`, even on pass, so a
 * single casualty event queues at most one check.
 */
export function rollInfantryMorale(
  params: IRollInfantryMoraleParams,
): IInfantryMoraleResult {
  const { unitId } = params;
  const roller = params.diceRoller ?? defaultD6Roller;
  const leaderModifier = params.leaderModifier ?? 0;
  const events: InfantryEvent[] = [];

  // No check pending — return a pass with no events.
  if (!params.state.moraleCheckPending) {
    return {
      state: params.state,
      outcome: 'pass',
      rollTotal: 0,
      dice: [0, 0],
      targetNumber: MORALE_TARGET_NUMBER,
      events,
    };
  }

  // Already routed — do not re-roll; clear the flag defensively.
  if (params.state.routed) {
    return {
      state: { ...params.state, moraleCheckPending: false },
      outcome: 'routed',
      rollTotal: 0,
      dice: [0, 0],
      targetNumber: MORALE_TARGET_NUMBER,
      events,
    };
  }

  const die1 = roller();
  const die2 = roller();
  const rollTotal = die1 + die2 + leaderModifier;
  const targetNumber = MORALE_TARGET_NUMBER;

  let outcome: 'pass' | 'pinned' | 'routed';
  let marginBelow = 0;
  if (rollTotal >= targetNumber) {
    outcome = 'pass';
  } else {
    marginBelow = targetNumber - rollTotal;
    outcome = marginBelow === 1 ? 'pinned' : 'routed';
  }

  const checkEvent: IInfantryMoraleCheckEvent = {
    type: InfantryEventType.INFANTRY_MORALE_CHECK,
    unitId,
    targetNumber,
    rollTotal,
    dice: [die1, die2],
    leaderModifier,
    outcome,
    marginBelow,
  };
  events.push(checkEvent);

  let state: IInfantryCombatState = {
    ...params.state,
    moraleCheckPending: false,
  };

  if (outcome === 'pinned') {
    state = { ...state, pinned: true, morale: InfantryMorale.PINNED };
    const pinEv: IInfantryPinnedEvent = {
      type: InfantryEventType.INFANTRY_PINNED,
      unitId,
    };
    events.push(pinEv);
  } else if (outcome === 'routed') {
    state = {
      ...state,
      routed: true,
      morale: InfantryMorale.ROUTED,
      fieldGunOperational: false,
    };
    const routEv: IInfantryRoutedEvent = {
      type: InfantryEventType.INFANTRY_ROUTED,
      unitId,
    };
    events.push(routEv);
  } else {
    // Pass — clear any transient SHAKEN marker.
    if (state.morale === InfantryMorale.SHAKEN) {
      state = { ...state, morale: InfantryMorale.NORMAL };
    }
  }

  return {
    state,
    outcome,
    rollTotal,
    dice: [die1, die2],
    targetNumber,
    events,
  };
}

/**
 * Clear the pinned flag at the start of a new phase (after one phase of
 * pinning the platoon may act normally again). Routed platoons stay routed.
 */
export function clearPinnedAtPhaseStart(
  state: IInfantryCombatState,
): IInfantryCombatState {
  if (!state.pinned) return state;
  return {
    ...state,
    pinned: false,
    morale: state.routed ? InfantryMorale.ROUTED : InfantryMorale.NORMAL,
  };
}
