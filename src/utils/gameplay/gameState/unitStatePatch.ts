import type { IGameState } from '@/types/gameplay';

type UnitState = NonNullable<IGameState['units'][string]>;

export function updateUnitState(
  state: IGameState,
  unitId: string,
  update: (unit: UnitState) => UnitState | undefined,
): IGameState {
  const unit = state.units[unitId];
  if (!unit) {
    return state;
  }

  const nextUnit = update(unit);
  if (!nextUnit || nextUnit === unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: nextUnit,
    },
  };
}
