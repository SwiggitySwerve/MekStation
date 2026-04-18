export * from './battleValueExplosivePenalties';
export * from './battleValueMovement';
export * from './battleValueDefensive';
export * from './battleValueOffensive';
export * from './battleValueTotals';
export * from './battleValuePilot';

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
} from './vehicle/vehicleBV';
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
} from './vehicle/vehicleBV';

// Battle Armor BV — per-type dispatch for BA squads.
// Callers use `calculateBattleArmorBV(input)` for BA units; the existing
// mech calculator remains the default entry point for BattleMechs.
// @spec openspec/changes/add-battlearmor-battle-value/specs/battle-value-system/spec.md
export {
  calculateBattleArmorBV,
  calculateBADefensiveBV,
  calculateBAOffensiveBV,
  getBAArmorBVMultiplier,
  getBAManipulatorMeleeBV,
  getBAMoveClassMultiplier,
} from './battlearmor/battleArmorBV';
export type {
  BAAmmoBVMount,
  BADefensiveBVBreakdown,
  BAManipulatorConfig,
  BAOffensiveBVBreakdown,
  BAPerTrooperBV,
  BAWeaponBVMount,
  IBABreakdown,
  IBattleArmorBVInput,
} from './battlearmor/battleArmorBV';
export {
  buildBattleArmorBVInput,
  calculateBattleArmorBVFromState,
  partitionBAEquipment,
} from './battlearmor/battleArmorBVAdapter';
