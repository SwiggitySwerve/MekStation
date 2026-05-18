import type { D6Roller } from '../diceTypes';

import { roll2d6 } from '../hitLocation';
import { PILOT_DEATH_WOUND_THRESHOLD } from './constants';
import {
  IPilotDamageResultWithState,
  IUnitDamageState,
  PilotDamageSource,
} from './types';

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

  const consciousnessCheckRequired = wounds > 0 && !dead;
  let consciousnessRoll: ReturnType<typeof roll2d6> | undefined;
  let consciousnessTarget: number | undefined;
  let conscious: boolean | undefined;
  let newPilotConscious = state.pilotConscious;
  let newDestroyed = state.destroyed;
  let newDestructionCause = state.destructionCause;

  if (consciousnessCheckRequired) {
    consciousnessTarget = 3 + newPilotWounds;
    consciousnessRoll = roll2d6(roller);
    conscious = consciousnessRoll.total >= consciousnessTarget;

    if (!conscious) {
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
      consciousnessCheckRequired,
      consciousnessRoll,
      consciousnessTarget,
      conscious,
      dead,
    },
  };
}
