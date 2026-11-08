import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';

import { getUnitOperability } from '@/utils/gameplay/unitOperability';

export function canUnitAct(unit: IUnitGameState): boolean {
  return getUnitOperability(unit).canAct;
}

export function canUnitBeTargeted(unit: IUnitGameState): boolean {
  return getUnitOperability(unit).onField;
}
