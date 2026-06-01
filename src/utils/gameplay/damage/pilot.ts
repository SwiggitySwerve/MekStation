import type { D6Roller } from '../diceTypes';

import { roll2d6 } from '../hitLocation';
import { getConsciousnessCheckModifier } from '../spaModifiers';
import { PILOT_DEATH_WOUND_THRESHOLD } from './constants';
import {
  IPilotDamageResultWithState,
  IUnitDamageState,
  PilotDamageSource,
} from './types';

export interface IPilotConsciousnessCheckResult {
  readonly consciousnessCheckRequired: boolean;
  readonly consciousnessRoll?: ReturnType<typeof roll2d6>;
  readonly consciousnessTarget?: number;
  readonly conscious?: boolean;
}

export function resolvePilotConsciousnessCheck(
  totalWounds: number,
  woundsInflicted: number,
  pilotAbilities: readonly string[] = [],
  roller?: D6Roller,
  pilotToughness = 0,
): IPilotConsciousnessCheckResult {
  const consciousnessCheckRequired =
    woundsInflicted > 0 && totalWounds < PILOT_DEATH_WOUND_THRESHOLD;
  if (!consciousnessCheckRequired) {
    return { consciousnessCheckRequired };
  }

  const toughnessModifier = Math.max(0, Math.trunc(pilotToughness));
  const consciousnessTarget =
    3 +
    totalWounds +
    getConsciousnessCheckModifier(pilotAbilities) -
    toughnessModifier;
  const consciousnessRoll = roll2d6(roller);

  return {
    consciousnessCheckRequired,
    consciousnessRoll,
    consciousnessTarget,
    conscious: consciousnessRoll.total >= consciousnessTarget,
  };
}

/**
 * Apply pilot wounds and resolve the consciousness check.
 *
 * The optional `roller` threads a deterministic `D6Roller` through the
 * consciousness roll. It MUST be supplied by any caller running inside the
 * seeded simulation engine — omitting it falls back to `defaultD6Roller`
 * (`Math.random`), which makes two same-seed runs diverge whenever a head hit
 * triggers a consciousness check. When omitted (legacy production callsites)
 * behaviour is unchanged.
 */
export function applyPilotDamage(
  state: IUnitDamageState,
  wounds: number,
  source: PilotDamageSource,
  roller?: D6Roller,
): IPilotDamageResultWithState {
  const newPilotWounds = state.pilotWounds + wounds;
  const dead = newPilotWounds >= PILOT_DEATH_WOUND_THRESHOLD;

  const consciousnessCheck = resolvePilotConsciousnessCheck(
    newPilotWounds,
    wounds,
    state.pilotAbilities ?? [],
    roller,
    state.pilotToughness,
  );
  let newPilotConscious = state.pilotConscious;
  let newDestroyed = state.destroyed;
  let newDestructionCause = state.destructionCause;

  if (consciousnessCheck.consciousnessCheckRequired) {
    if (!consciousnessCheck.conscious) {
      newPilotConscious = false;
    }
  }

  if (dead) {
    newPilotConscious = false;
    newDestroyed = true;
    newDestructionCause = 'pilot_death';
  }

  const newState: IUnitDamageState = {
    ...state,
    pilotWounds: newPilotWounds,
    pilotConscious: newPilotConscious,
    destroyed: newDestroyed,
    destructionCause: newDestructionCause,
  };

  return {
    state: newState,
    result: {
      source,
      woundsInflicted: wounds,
      totalWounds: newPilotWounds,
      consciousnessCheckRequired: consciousnessCheck.consciousnessCheckRequired,
      consciousnessRoll: consciousnessCheck.consciousnessRoll,
      consciousnessTarget: consciousnessCheck.consciousnessTarget,
      conscious: consciousnessCheck.conscious,
      dead,
    },
  };
}
