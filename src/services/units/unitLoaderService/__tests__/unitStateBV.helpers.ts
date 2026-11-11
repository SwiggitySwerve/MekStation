import type { UnitState } from '@/stores/unitState';

import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';

/** The real editor BV input shared by persistence journey tests. */
export function unitStateBV(state: UnitState) {
  const input = buildEditableMechBVInput(
    projectEditableMech(state, Math.floor(state.engineRating / state.tonnage)),
  );
  return calculateUnitBV(input, input.id);
}
