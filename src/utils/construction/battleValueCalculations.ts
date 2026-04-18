export * from "./battleValueExplosivePenalties";
export * from "./battleValueMovement";
export * from "./battleValueDefensive";
export * from "./battleValueOffensive";
export * from "./battleValueTotals";
export * from "./battleValuePilot";

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
} from "./battlearmor/battleArmorBV";
export type {
  BAAmmoBVMount,
  BADefensiveBVBreakdown,
  BAManipulatorConfig,
  BAOffensiveBVBreakdown,
  BAPerTrooperBV,
  BAWeaponBVMount,
  IBABreakdown,
  IBattleArmorBVInput,
} from "./battlearmor/battleArmorBV";
export {
  buildBattleArmorBVInput,
  calculateBattleArmorBVFromState,
  partitionBAEquipment,
} from "./battlearmor/battleArmorBVAdapter";
