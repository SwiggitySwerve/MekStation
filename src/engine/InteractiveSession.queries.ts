import type { IWeapon } from '@/simulation/ai/types';
import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';

import { getUnitOperability } from '@/utils/gameplay/unitOperability';

import type { IAvailableActions } from './types';

export function getAvailableActionsForState(
  state: IGameState,
  unitId: string,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
): IAvailableActions {
  const unit = state.units[unitId];
  if (!unit || !getUnitOperability(unit).canAct) {
    return { validMoves: [], validTargets: [] };
  }

  const weapons = weaponsByUnit.get(unitId) ?? [];
  const validTargets: { unitId: string; weapons: string[] }[] = [];

  for (const [uid, candidate] of Object.entries(state.units)) {
    if (candidate.side !== unit.side && getUnitOperability(candidate).onField) {
      validTargets.push({
        unitId: uid,
        weapons: weapons.filter((weapon) => !weapon.destroyed).map((w) => w.id),
      });
    }
  }

  return { validMoves: [], validTargets };
}
