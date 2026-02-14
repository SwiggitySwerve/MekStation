import {
  FATAL_LOCATION_DESTRUCTION,
  PILOT_DEATH_WOUND_THRESHOLD,
} from './constants';
import { isLocationDestroyed } from './helpers';
import { IDestructionCheckResult, IUnitDamageState } from './types';

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

  if (
    FATAL_LOCATION_DESTRUCTION.some((location) =>
      isLocationDestroyed(state, location),
    )
  ) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: 'damage',
    };
    return { state: newState, destroyed: true, cause: 'damage' };
  }

  if (state.pilotWounds >= PILOT_DEATH_WOUND_THRESHOLD) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: 'pilot_death',
    };
    return { state: newState, destroyed: true, cause: 'pilot_death' };
  }

  return { state, destroyed: false };
}
