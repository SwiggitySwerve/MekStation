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

import type {
  IAerospace,
  IConventionalFighter,
  ISmallCraft,
} from '@/types/unit/AerospaceInterfaces';
import type { IAerospaceUnit } from '@/types/unit/BaseUnitInterfaces';
import type { IBattleArmor, IInfantry } from '@/types/unit/PersonnelInterfaces';
import type { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';
import type { IVehicleUnit } from '@/types/unit/VehicleInterfaces';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isVehicleUnitShape } from '@/types/unit/VehicleInterfaces';

import type { IBABreakdown } from './battlearmor/battleArmorBV';
import type { IInfantryBVBreakdown } from './infantry/infantryBV';
import type { IVehicleBVBreakdown } from './vehicle/vehicleBV';

import {
  calculateAerospaceBVFromUnit as _calculateAerospaceBVFromUnit,
  isAerospaceUnitType as _isAerospaceUnitType,
  type IAerospaceBVBreakdown,
} from './aerospace/aerospaceBV';
import { isCapitalShipBVType } from './aerospace/aerospaceBVTypes';
import { type ICapitalShipBVUnit } from './aerospace/capitalShipBV';
import { type IDropShipBVUnit } from './aerospace/dropShipBV';
import {
  calculateDropShipBV,
  calculateLargeAerospaceBV,
  type IDropShipBVBreakdown,
  type ILargeAerospaceBVBreakdown,
} from './aerospace/dropShipComplete';
import { calculateBattleArmorBVFromUnit } from './battlearmor/battleArmorBVAdapter';
import { calculateInfantryBVFromUnit as _calculateInfantryBVFromUnit } from './infantry/infantryBVAdapter';
import {
  calculateProtoMechBV as _calculateProtoMechBV,
  type IProtoMechBVBreakdown,
  type IProtoMechBVOptions,
} from './protomech/protoMechBV';
import { calculateVehicleBVFromUnit as _calculateVehicleBVFromUnit } from './vehicle/vehicleBVAdapter';

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
export {
  calculateVehicleBVFromUnit,
  toVehicleBVInputFromUnit,
  computeVehicleBVFromState,
  toVehicleBVInput,
} from './vehicle/vehicleBVAdapter';
export type {
  VehicleBVStateSubset,
  VehicleBVUnitOptions,
} from './vehicle/vehicleBVAdapter';

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

// Aerospace BV — separate calculator for ASF / Conventional Fighter / Small
// Craft. Re-exported so the unified per-unit dispatcher and downstream tools
// (status bar, parity harness) can import from the same barrel as the mech
// BV utilities.
// @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
export {
  calculateAerospaceBV,
  calculateAerospaceBVFromUnit,
  calculateAerospaceDefensiveBV,
  calculateAerospaceOffensiveBV,
  calculateAerospaceSpeedFactor,
  calculateAerospaceArcContributions,
  buildAerospaceBVInputFromUnit,
  getAerospaceSubTypeMultiplier,
  getAerospacePilotMultiplier,
  isAerospaceUnitType,
} from './aerospace/aerospaceBV';
export { calculateDropShipDefensiveBV } from './aerospace/dropShipBV';
export { calculateCapitalShipDefensiveBV } from './aerospace/capitalShipBV';
export type {
  ICapitalShipBVUnit,
  ICapitalShipDefensiveBVBreakdown,
} from './aerospace/capitalShipBV';
export type {
  IDropShipBVUnit,
  IDropShipDefensiveBVBreakdown,
} from './aerospace/dropShipBV';
export type {
  IAerospaceBVBreakdown,
  IAerospaceBVInput,
  IAerospaceBVEquipment,
  IAerospaceBVAmmo,
  IAerospaceArcContribution,
  AerospaceBVDispatchInput,
} from './aerospace/aerospaceBV';

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
 * narrow on the payload. Currently implemented for ProtoMech, Infantry,
 * Vehicle (combat / VTOL / support), and Aerospace (ASF / Conventional
 * Fighter / Small Craft), plus defensive-only large aerospace; BattleMech units go through the
 * existing `CalculationService` path.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Vehicle BV Dispatch
 * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Aerospace BV Dispatch
 */
export type UnitBVResult =
  | { readonly kind: 'battlearmor'; readonly breakdown: IBABreakdown }
  | {
      readonly kind: 'capital-ship';
      readonly breakdown: ILargeAerospaceBVBreakdown;
    }
  | {
      readonly kind: 'dropship';
      readonly breakdown: IDropShipBVBreakdown;
    }
  | {
      readonly kind: 'protomech';
      readonly breakdown: IProtoMechBVBreakdown;
    }
  | {
      readonly kind: 'infantry';
      readonly breakdown: IInfantryBVBreakdown;
    }
  | {
      readonly kind: 'vehicle';
      readonly breakdown: IVehicleBVBreakdown;
    }
  | {
      readonly kind: 'aerospace';
      readonly breakdown: IAerospaceBVBreakdown;
    };

/**
 * Aerospace dispatch input — accepts the three concrete subtypes plus the
 * generic `IAerospaceUnit` shape so dispatchers and harnesses that build a
 * minimal aerospace-shaped value can flow through this entry point.
 */
type AerospaceDispatchUnit =
  | IAerospace
  | IConventionalFighter
  | ISmallCraft
  | IAerospaceUnit;

/**
 * Route a unit to its per-type BV calculator. Currently implemented for
 * ProtoMech, Infantry, Vehicle, and Aerospace (ASF / Conventional Fighter /
 * Small Craft), plus defensive-only large aerospace; other types return `undefined` so the caller
 * can keep using its existing mech path unchanged.
 *
 * @param unit  A discriminated unit value (`IProtoMechUnit`, `IInfantry`,
 *              `IVehicleUnit`, or an aerospace shape).
 * @param options Optional per-type overrides (skill, etc.).
 */
export function calculateBattleValueForUnit(
  unit: ICapitalShipBVUnit,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: IDropShipBVUnit,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: IProtoMechUnit,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: IInfantry,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: IVehicleUnit,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: AerospaceDispatchUnit,
  options?: IUnitBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit:
    | { readonly unitType?: UnitType | string }
    | IProtoMechUnit
    | IInfantry
    | IVehicleUnit
    | ICapitalShipBVUnit
    | IDropShipBVUnit
    | AerospaceDispatchUnit,
  options?: IUnitBVOptions,
): UnitBVResult | undefined;
export function calculateBattleValueForUnit(
  unit:
    | { readonly unitType?: UnitType | string }
    | IProtoMechUnit
    | IInfantry
    | IVehicleUnit
    | ICapitalShipBVUnit
    | IDropShipBVUnit
    | AerospaceDispatchUnit,
  options?: IUnitBVOptions,
): UnitBVResult | undefined {
  if (unit?.unitType === UnitType.BATTLE_ARMOR) {
    return {
      kind: 'battlearmor',
      breakdown: calculateBattleArmorBVFromUnit(unit as IBattleArmor, options),
    };
  }
  if (isCapitalShipBVType(unit?.unitType)) {
    return {
      kind: 'capital-ship',
      breakdown: calculateLargeAerospaceBV(unit as ICapitalShipBVUnit, options),
    };
  }
  // Complete DropShip BV requires resolved mounts and represented stage facts.
  if (unit?.unitType === UnitType.DROPSHIP) {
    return {
      kind: 'dropship',
      breakdown: calculateDropShipBV(unit as IDropShipBVUnit, options),
    };
  }
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
  // Vehicle dispatch — covers VEHICLE, VTOL, and SUPPORT_VEHICLE via the
  // shared IVehicleUnit shape. The narrowing guard ensures we only pass
  // vehicle-class unit shapes to the vehicle BV calculator.
  if (
    unit &&
    typeof (unit as { unitType?: UnitType }).unitType !== 'undefined' &&
    isVehicleUnitShape(unit as { unitType: UnitType })
  ) {
    const breakdown = _calculateVehicleBVFromUnit(unit as IVehicleUnit, {
      gunnery: options?.gunnery,
      piloting: options?.piloting,
    });
    return { kind: 'vehicle', breakdown };
  }
  // Aerospace dispatch: routes ASF / Conventional Fighter / Small Craft into
  // the aerospace BV path. The guard uses the discriminant on `unitType` so
  // we never accidentally treat a mech-shaped value as aerospace.
  // @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
  //       — Requirement: Aerospace BV Dispatch
  if (_isAerospaceUnitType(unit)) {
    const breakdown = _calculateAerospaceBVFromUnit(
      unit as AerospaceDispatchUnit,
      {
        gunnery: options?.gunnery,
        piloting: options?.piloting,
      },
    );
    return { kind: 'aerospace', breakdown };
  }
  return undefined;
}
