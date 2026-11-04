import type { ValidationResult } from '../../../../scripts/validate-bv-types';

/** Read-only native-stage names; rules remain in the existing Mech BV owner.
 * HarJel belongs to armor; gyro to structure; armored components to equipment.
 * Mount identities and ammo groups are deliberately left absent.
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
