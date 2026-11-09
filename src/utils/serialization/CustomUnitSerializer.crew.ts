import type { UnitState } from '@/stores/unitState';

import { getMechCrewType } from '@/types/pilot/MechCrewSeats';

/**
 * Saved crew seats. Only a configuration with native seats saves them; seats a
 * tonnage change hides (the Tech Officer at 100 tons or less) are kept so a
 * reopened unit still has them.
 */
export function crewSeatSaveFields(
  state: Pick<UnitState, 'configuration' | 'tonnage' | 'crewSeats'>,
): Pick<UnitState, 'crewSeats'> {
  return state.crewSeats &&
    getMechCrewType(state.configuration, state.tonnage) !== undefined
    ? { crewSeats: state.crewSeats.map((seat) => ({ ...seat })) }
    : {};
}
