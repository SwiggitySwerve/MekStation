import type {
  IToHitModifierDetail,
  IUnitGameState,
  WeaponFireMode,
} from '@/types/gameplay';

import { isAirborneGameUnit } from '../groundToGround';
import { isIndirectFireCapable } from '../indirectFire';

export type AerospaceAltitudeTier = 'low' | 'medium' | 'high';

export const INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION =
  'Indirect-fire weapons cannot engage airborne targets';

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

export function isGroundToAirAerospaceAttack(
  attacker: Pick<IUnitGameState, 'combatState'>,
  target: Pick<IUnitGameState, 'combatState'>,
): boolean {
  return !isAirborneGameUnit(attacker) && isAirborneGameUnit(target);
}

export function calculateGroundToAirAltitudeModifier(
  attacker: Pick<IUnitGameState, 'combatState'>,
  target: Pick<IUnitGameState, 'combatState'>,
): IToHitModifierDetail | null {
  if (!isGroundToAirAerospaceAttack(attacker, target)) return null;
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

export function groundToAirIndirectWeaponBlockedReason(
  attacker: Pick<IUnitGameState, 'combatState'>,
  target: Pick<IUnitGameState, 'combatState'>,
  weapon: {
    readonly id?: string;
    readonly weaponId?: string;
    readonly mode?: WeaponFireMode;
  },
): string | undefined {
  const weaponId = weapon.id ?? weapon.weaponId;
  if (
    !weaponId ||
    weapon.mode !== 'Indirect' ||
    !isIndirectFireCapable(weaponId) ||
    !isGroundToAirAerospaceAttack(attacker, target)
  ) {
    return undefined;
  }

  return INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION;
}
