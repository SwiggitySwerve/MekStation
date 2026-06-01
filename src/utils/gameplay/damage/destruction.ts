import { PILOT_DEATH_WOUND_THRESHOLD } from './constants';
import { isLocationDestroyed } from './helpers';
import { IDestructionCheckResult, IUnitDamageState } from './types';

function getFatalLocationCause(
  state: IUnitDamageState,
): 'head_destroyed' | 'ct_destroyed' | undefined {
  if (isLocationDestroyed(state, 'head')) {
    return 'head_destroyed';
  }
  if (isLocationDestroyed(state, 'center_torso')) {
    return 'ct_destroyed';
  }
  return undefined;
}

export function checkUnitDestruction(
  state: IUnitDamageState,
): IDestructionCheckResult {
  if (state.destroyed) {
    return {
      state,
      destroyed: true,
      cause: state.destructionCause ?? 'damage',
    };
  }

  if (state.pilotWounds >= PILOT_DEATH_WOUND_THRESHOLD) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: 'pilot_death',
    };
    return { state: newState, destroyed: true, cause: 'pilot_death' };
  }

  const fatalLocationCause = getFatalLocationCause(state);
  if (fatalLocationCause !== undefined) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: fatalLocationCause,
    };
    return { state: newState, destroyed: true, cause: fatalLocationCause };
  }

  return { state, destroyed: false };
}
