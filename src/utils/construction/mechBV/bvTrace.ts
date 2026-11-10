import type { ValidationResult } from './types';

import { projectMechAmmoBVPools } from '../battleValueAmmo';

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

/** Per-mount weapon values keyed like the Java trace's weapon.<n>.<loc>.<name>;
 * the index is MekStation's processing order, not MegaMek's equipment number.
 * A split mount reports its first location, as Java does.
 */
function weaponMountTerms(
  mounts: NonNullable<ValidationResult['breakdown']>['weaponMountBV'],
): Record<string, number> {
  const terms: Record<string, number> = {};
  (mounts ?? []).forEach(({ name, location, bv }, index) => {
    const raw = (location ?? '')
      .split(',')[0]
      .toUpperCase()
      .replace(/_\(R\)$/, '');
    terms[`weapon.${index}.${JAVA_LOCATION[raw] ?? raw}.${name}`] = bv;
  });
  return terms;
}

/** Native ammo pools keyed like the Java trace's ammo.available / ammo.cap. */
function ammoPoolTerms(
  pools: NonNullable<ValidationResult['breakdown']>['ammoPools'],
  sourceWeapons?: NonNullable<
    ValidationResult['breakdown']
  >['ammoCapProjectionWeapons'],
  sourceBins?: NonNullable<
    ValidationResult['breakdown']
  >['ammoAvailableProjectionBins'],
  diagnosticPools?: NonNullable<
    ValidationResult['breakdown']
  >['ammoDiagnosticPools'],
): Record<string, number> {
  const terms: Record<string, number> = {};
  const { available, cap } =
    diagnosticPools ?? projectMechAmmoBVPools(pools, sourceWeapons, sourceBins);
  for (const [key, bv] of Object.entries(available))
    terms[`ammo.available.${key}`] = bv;
  for (const [key, bv] of Object.entries(cap ?? {}))
    terms[`ammo.cap.${key}`] = bv;
  return terms;
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
    ...weaponMountTerms(b.weaponMountBV),
    ...ammoPoolTerms(
      b.ammoPools,
      b.ammoCapProjectionWeapons,
      b.ammoAvailableProjectionBins,
      b.ammoDiagnosticPools,
    ),
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
