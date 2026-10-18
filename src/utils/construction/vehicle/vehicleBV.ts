/**
 * Vehicle Battle Value Calculator (BV 2.0)
 *
 * Implements Battle Value computation for combat vehicles, VTOLs, and
 * support vehicles per the TechManual / MegaMek rules. Mirrors the
 * structure of the mech BV calculator in `battleValueCalculations.ts`
 * but substitutes vehicle-specific rules:
 *
 *  - Defensive BV uses armor × 2.5 × armorMult + structure × 1.5 × structureMult
 *    + defensive equipment BV − explosive penalty, then multiplied by a
 *    defensive factor derived from the motion-type TMM.
 *  - Offensive BV sums weapon BV (with turret / sponson / rear-arc modifiers),
 *    ammo BV (capped per weapon family), and offensive equipment BV, then
 *    multiplied by the vehicle speed factor.
 *  - Final BV = (defensive + offensive) × pilot-skill multiplier.
 *  - Support vehicles with BAR < 10 scale armor BV by BAR / 10.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 */

/** Public compatibility facade; implementations are split by responsibility. */
export type {
  VehicleTurretKind,
  VehicleWeaponMount,
  VehicleAmmoMount,
  VehicleDefensiveEquipmentMount,
  VehicleOffensiveEquipmentMount,
  VehicleBVTurret,
  VehicleBVInput,
  IVehicleBVBreakdown,
  VehicleDefensiveBVBreakdown,
  VehicleOffensiveBVBreakdown,
} from './vehicleBVTypes';
export {
  getVehicleEffectiveMP,
  calculateVehicleTMM,
  calculateVehicleSpeedFactor,
} from './vehicleBVMovement';
export { calculateVehicleDefensiveBV } from './vehicleBVDefensive';
export { calculateVehicleOffensiveBV } from './vehicleBVOffensive';
export { calculateVehicleBV } from './vehicleBVCalculator';
