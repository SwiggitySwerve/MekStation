import { GameSide, type IGameState } from '@/types/gameplay';

import { calculateInitiativeQuirkModifier } from './quirkModifiers';
import { hasSPA } from './spaModifiers/canonicalize';

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
  const activeUnits = Object.values(state.units).filter((unit) =>
    isActiveInitiativeUnit(unit, side),
  );
  const forceQuirks = activeUnits.map((unit) => unit.unitQuirks ?? []);
  const quirkBonus = calculateInitiativeQuirkModifier(forceQuirks);
  const hqBonus = Math.max(
    0,
    ...activeUnits.map((unit) => unit.initiativeHQBonus ?? 0),
  );
  const commandBonus = Math.max(
    0,
    ...activeUnits.map((unit) => unit.initiativeCommandBonus ?? 0),
  );

  return Math.max(quirkBonus, hqBonus) + commandBonus;
}

export function hasSideTacticalGeniusInitiativeReroll(
  state: IGameState,
  side: GameSide,
): boolean {
  return Object.values(state.units).some(
    (unit) =>
      isActiveInitiativeUnit(unit, side) &&
      hasSPA(unit.abilities ?? [], 'tactical_genius'),
  );
}
