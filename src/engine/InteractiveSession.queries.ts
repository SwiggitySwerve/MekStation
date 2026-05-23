import type { IWeapon } from '@/simulation/ai/types';
import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';

import type { IAvailableActions } from './types';

export function getAvailableActionsForState(
  state: IGameState,
  unitId: string,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
): IAvailableActions {
  const unit = state.units[unitId];
  if (
    !unit ||
    unit.destroyed ||
    unit.shutdown ||
    unit.hasRetreated ||
    unit.hasEjected ||
    !unit.pilotConscious
  ) {
    return { validMoves: [], validTargets: [] };
  }

  const weapons = weaponsByUnit.get(unitId) ?? [];
  const validTargets: { unitId: string; weapons: string[] }[] = [];

  for (const [uid, candidate] of Object.entries(state.units)) {
    if (
      candidate.side !== unit.side &&
      !candidate.destroyed &&
      !candidate.hasRetreated &&
      !candidate.hasEjected
    ) {
      validTargets.push({
        unitId: uid,
        weapons: weapons.filter((weapon) => !weapon.destroyed).map((w) => w.id),
      });
    }
  }

  return { validMoves: [], validTargets };
}
