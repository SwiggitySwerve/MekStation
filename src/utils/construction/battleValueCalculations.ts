/**
 * Battle Value public barrel + unified dispatch entry point.
 *
 * Mech BV paths are re-exported from the dedicated battleValue* modules.
 * Non-mech unit paths (Vehicle, Aerospace, BattleArmor, Infantry, ProtoMech)
 * are dispatched via {@link calculateBattleValueForUnit}, which selects the
 * per-type calculator based on the unit shape.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
 */

import type { IInfantry } from '@/types/unit/PersonnelInterfaces';
import type { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { IInfantryBVBreakdown } from './infantry/infantryBV';

import { calculateInfantryBVFromUnit as _calculateInfantryBVFromUnit } from './infantry/infantryBVAdapter';
import {
  calculateProtoMechBV as _calculateProtoMechBV,
  type IProtoMechBVBreakdown,
  type IProtoMechBVOptions,
} from './protomech/protoMechBV';

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

// Infantry BV — separate calculator for conventional infantry platoons.
// Callers route IInfantryUnit (store state) through `computeInfantryBVFromState`
// in the adapter, which builds a well-typed `InfantryBVInput` and calls
// `calculateInfantryBV`. The existing `calculateTotalBV(config)` remains the
// mech/battlemech entry point.
// @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
export {
  calculateInfantryBV,
  calculateInfantryPerTrooperBV,
  calculateInfantryPrimaryBV,
  calculateInfantrySecondaryBV,
  calculateInfantryFieldGunBV,
  getInfantryMotiveMultiplier,
  getInfantryPilotMultiplier,
} from './infantry/infantryBV';
export type {
  InfantryBVInput,
  InfantryWeaponRef,
  InfantryFieldGunMount,
  IInfantryBVBreakdown,
} from './infantry/infantryBV';

// ProtoMech BV — re-exported so callers can import the proto breakdown type
// and public calculators from the same barrel as the mech BV utilities.
export {
  calculateProtoMechBV,
  calculateProtoPointBV,
  calculateProtoSpeedFactor,
  getProtoChassisMultiplier,
} from './protomech/protoMechBV';
export type {
  IProtoMechBVBreakdown,
  IProtoMechBVOptions,
} from './protomech/protoMechBV';

/**
 * Options accepted by `calculateBattleValueForUnit`.
 *
 * ProtoMech options are the existing shape. Infantry options carry gunnery /
 * piloting skill overrides — both default to 4/5 (baseline pilot) when absent.
 * The union is structurally compatible since no field name collides.
 */
export interface IUnitBVOptions extends IProtoMechBVOptions {
  /** Infantry pilot gunnery (default 4). */
  gunnery?: number;
  /** Infantry pilot piloting / anti-mech skill (default 5). */
  piloting?: number;
}

/**
 * Unified per-unit BV dispatcher result.
 *
 * `kind` identifies which calculator produced the breakdown so callers can
 * narrow on the payload. Currently implemented for ProtoMech and Infantry;
 * mech units continue to go through the existing `CalculationService` path.
 */
export type UnitBVResult =
  | {
      readonly kind: 'protomech';
      readonly breakdown: IProtoMechBVBreakdown;
    }
  | {
      readonly kind: 'infantry';
      readonly breakdown: IInfantryBVBreakdown;
    };

/**
 * Route a unit to its per-type BV calculator. Currently implemented for
 * ProtoMech and Infantry; other unit types fall through with `undefined` so
 * the caller can keep using its existing mech path unchanged.
 *
 * @param unit  A discriminated unit value (`IProtoMechUnit` or `IInfantry`).
 * @param options Optional per-type overrides (skill, etc.).
 */
export function calculateBattleValueForUnit(
  unit: IProtoMechUnit,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: IInfantry,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: { readonly unitType?: UnitType | string } | IProtoMechUnit | IInfantry,
  options?: IUnitBVOptions,
): UnitBVResult | undefined;
export function calculateBattleValueForUnit(
  unit: { readonly unitType?: UnitType | string } | IProtoMechUnit | IInfantry,
  options?: IUnitBVOptions,
): UnitBVResult | undefined {
  if (unit && (unit as IProtoMechUnit).unitType === UnitType.PROTOMECH) {
    const breakdown = _calculateProtoMechBV(
      unit as IProtoMechUnit,
      options ?? {},
    );
    return { kind: 'protomech', breakdown };
  }
  if (unit && (unit as IInfantry).unitType === UnitType.INFANTRY) {
    const breakdown = _calculateInfantryBVFromUnit(unit as IInfantry, {
      gunnery: options?.gunnery,
      piloting: options?.piloting,
    });
    return { kind: 'infantry', breakdown };
  }
  return undefined;
}
