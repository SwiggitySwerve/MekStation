import { GameSide, type IGameState } from '@/types/gameplay';

import { calculateInitiativeQuirkModifier } from './quirkModifiers';

function isActiveInitiativeUnit(
  unit: IGameState['units'][string],
  side: GameSide,
): boolean {
  return (
    unit.side === side &&
    !unit.destroyed &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    unit.pilotConscious
  );
}

export function calculateSideInitiativeModifier(
  state: IGameState,
  side: GameSide,
): number {
  const forceQuirks = Object.values(state.units)
    .filter((unit) => isActiveInitiativeUnit(unit, side))
    .map((unit) => unit.unitQuirks ?? []);

  return calculateInitiativeQuirkModifier(forceQuirks);
}
