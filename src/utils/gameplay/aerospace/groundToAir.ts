import type { IToHitModifierDetail, IUnitGameState } from '@/types/gameplay';

import { isAirborneGameUnit } from '../groundToGround';

export type AerospaceAltitudeTier = 'low' | 'medium' | 'high';

const GROUND_TO_AIR_ALTITUDE_MODIFIERS: Readonly<
  Record<AerospaceAltitudeTier, number>
> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * OpenSpec `aerospace-deployment` defines tactical-map altitude tiers as
 * 1-3 low, 4-6 medium, and 7-10 high. Values above 10 are out of scope for
 * legal tactical play, but classify as high so a bad/imported state still has
 * deterministic combat metadata.
 */
export function getAerospaceAltitudeTier(
  altitude: number,
): AerospaceAltitudeTier | null {
  if (altitude <= 0) return null;
  if (altitude <= 3) return 'low';
  if (altitude <= 6) return 'medium';
  return 'high';
}

export function calculateGroundToAirAltitudeModifier(
  attacker: Pick<IUnitGameState, 'combatState'>,
  target: Pick<IUnitGameState, 'combatState'>,
): IToHitModifierDetail | null {
  if (isAirborneGameUnit(attacker) || !isAirborneGameUnit(target)) {
    return null;
  }
  if (target.combatState?.kind !== 'aero') return null;

  const altitude = target.combatState.state.altitude;
  const tier = getAerospaceAltitudeTier(altitude);
  if (tier === null) return null;

  const value = GROUND_TO_AIR_ALTITUDE_MODIFIERS[tier];
  return {
    name: 'Ground-to-air altitude',
    value,
    source: 'other',
    description: `Airborne aerospace target at altitude ${altitude} (${tier} tier): +${value}`,
  };
}
