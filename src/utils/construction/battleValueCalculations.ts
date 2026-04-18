export * from "./battleValueExplosivePenalties";
export * from "./battleValueMovement";
export * from "./battleValueDefensive";
export * from "./battleValueOffensive";
export * from "./battleValueTotals";
export * from "./battleValuePilot";

// Vehicle BV — separate calculator for combat vehicles, VTOLs, and support vehicles.
// Callers use `calculateVehicleBV(input)` for vehicle units; the existing
// `calculateTotalBV(config)` remains the mech/battlemech entry point.
// @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
export {
  calculateVehicleBV,
  calculateVehicleDefensiveBV,
  calculateVehicleOffensiveBV,
  calculateVehicleTMM,
  calculateVehicleSpeedFactor,
  getVehicleEffectiveMP,
} from "./vehicle/vehicleBV";
export type {
  VehicleBVInput,
  VehicleWeaponMount,
  VehicleAmmoMount,
  VehicleDefensiveEquipmentMount,
  VehicleOffensiveEquipmentMount,
  VehicleBVTurret,
  VehicleTurretKind,
  IVehicleBVBreakdown,
  VehicleDefensiveBVBreakdown,
  VehicleOffensiveBVBreakdown,
} from "./vehicle/vehicleBV";
