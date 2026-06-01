import type { IUnitGameState } from '@/types/gameplay';

import { isRepresentedUnitImmobile } from './unitImmobility';

/**
 * MegaMek's Targetable immobile contract includes shutdown units and
 * unconscious crews. Keep the represented MekStation subset centralized so
 * combat previews and committed attacks agree.
 */
export function isRepresentedTargetImmobile(
  unit: IUnitGameState | undefined,
): boolean {
  return isRepresentedUnitImmobile(unit);
}
