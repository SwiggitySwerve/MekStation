import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';

export function canUnitAct(unit: IUnitGameState): boolean {
  return (
    !unit.destroyed &&
    !unit.shutdown &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    unit.pilotConscious
  );
}

export function canUnitBeTargeted(unit: IUnitGameState): boolean {
  return !unit.destroyed && !unit.hasRetreated && !unit.hasEjected;
}
