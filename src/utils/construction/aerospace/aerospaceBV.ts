/**
 * Aerospace Battle Value Calculator
 *
 * Computes BV 2.0 for aerospace units (Aerospace Fighters, Conventional Fighters,
 * and Small Craft) per TechManual pp. 302-304.
 *
 * Defensive BV uses Structural Integrity (SI) in place of the mech gyro term.
 * Offensive BV combines forward and rear weapon groups; the weaker group
 * contributes at 50%, with Fuselage mounts included in the forward group.
 * Speed factor uses the average of Safe and Max Thrust rather than ground MP.
 *
 * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-aerospace-battle-value/specs/aerospace-unit-system/spec.md
 */

/** Public compatibility facade; implementations are split by responsibility. */
export { resolveDropShipMountBV } from './dropShipMountBV';
export type { IDropShipMountBV } from './dropShipMountBV';
export { calculateLargeAerospaceFirePool } from './largeAerospaceFirePool';
export type {
  ILargeAerospaceArcBV,
  ILargeAerospaceFirePool,
  ILargeAerospaceFirePoolInput,
} from './largeAerospaceFirePool';
export {
  getMainArcsForSubType,
  normalizeArcLocation,
  calculateAerospaceArcContributions,
} from './aerospaceBVArcs';
export {
  calculateAerospaceDefensiveBV,
  calculateAerospaceSpeedFactor,
  calculateAerospaceOffensiveBV,
  getAerospaceSubTypeMultiplier,
  calculateAerospaceBV,
  getAerospacePilotMultiplier,
  sumAerospaceWeaponBV,
} from './aerospaceBVCalculator';
export type { AerospaceBVDispatchInput } from './aerospaceBVUnitAdapter';
export {
  buildAerospaceBVInputFromUnit,
  calculateAerospaceBVFromUnit,
  isAerospaceUnitType,
} from './aerospaceBVUnitAdapter';
export type {
  IAerospaceArcContribution,
  IAerospaceBVAmmo,
  IAerospaceBVBreakdown,
  IAerospaceBVEquipment,
  IAerospaceBVInput,
} from './aerospaceBVTypes';
