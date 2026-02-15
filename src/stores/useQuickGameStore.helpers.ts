import type { IAdaptedUnit } from '@/engine/types';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameSide } from '@/types/gameplay';

export async function adaptUnits(
  units: readonly IQuickGameUnit[],
  side: GameSide,
): Promise<IAdaptedUnit[]> {
  const adapted: IAdaptedUnit[] = [];
  for (const unit of units) {
    const result = await adaptUnit(unit.sourceUnitId, {
      side,
      gunnery: unit.gunnery,
      piloting: unit.piloting,
    });
    if (result) {
      adapted.push(result);
    }
  }
  return adapted;
}
