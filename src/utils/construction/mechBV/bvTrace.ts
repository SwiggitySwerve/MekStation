import type { ValidationResult } from '../../../../scripts/validate-bv-types';

import { ammoPoolTerms, weaponMountTerms } from '../bvTraceTerms';

/** MekStation location -> Mek.getLocationAbbr (Mek, QuadMek, TripodMek at 48fcb2f6). */
const JAVA_LOCATION: Readonly<Record<string, string>> = {
  HEAD: 'HD',
  CENTER_TORSO: 'CT',
  LEFT_TORSO: 'LT',
  RIGHT_TORSO: 'RT',
  LEFT_ARM: 'LA',
  RIGHT_ARM: 'RA',
  LEFT_LEG: 'LL',
  RIGHT_LEG: 'RL',
  CENTER_LEG: 'CL',
  FRONT_LEFT_LEG: 'FLL',
  FRONT_RIGHT_LEG: 'FRL',
  REAR_LEFT_LEG: 'RLL',
  REAR_RIGHT_LEG: 'RRL',
};

/** A split mount reports its first location, as Java does. */
function mechLocationAbbr(location: string): string {
  const raw = location
    .split(',')[0]
    .toUpperCase()
    .replace(/_\(R\)$/, '');
  return JAVA_LOCATION[raw] ?? raw;
}

/** Read-only native-stage names; rules remain in the existing Mech BV owner.
 * HarJel belongs to armor; gyro to structure; armored components to equipment.
 */
export function mechBVTerms(
  b: NonNullable<ValidationResult['breakdown']>,
): Omit<NonNullable<ValidationResult['breakdown']>, 'explosivePenalty'> & {
  explosivePenalty: number | undefined;
  defensiveEquipmentBV: number;
  offensiveEquipmentBV: number;
  weightBV: number;
  typeModifier: number;
  adjustment: number;
} {
  return {
    ...b,
    ...weaponMountTerms(b.weaponMountBV, mechLocationAbbr),
    ...ammoPoolTerms(b.ammoPools),
    armorBV: b.armorBV + b.harjelBonus,
    structureBV: b.structureBV + b.gyroBV,
    defensiveEquipmentBV: b.defEquipBV + b.armoredComponentBV,
    explosivePenalty: b.totalExplosivePenalty,
    offensiveEquipmentBV: b.offEquipBV + b.physicalWeaponBV,
    weightBV: b.weightBonus,
    // Mek inherits BVCalculator's empty defensive type stage (48fcb2f6).
    typeModifier: 1,
    adjustment: 0,
  };
}
