/**
 * Vehicle BV adapter — converts the `VehicleState` store shape into the
 * `VehicleBVInput` shape consumed by `calculateVehicleBV`.
 *
 * Keeps the BV calculator free of store/React dependencies so it remains
 * easy to unit test and callable from the parity harness.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 */

import type { IVehicleArmorAllocation } from '@/stores/vehicleState';
import type { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import type {
  IVehicleMountedEquipment,
  IVehicleUnit,
  ISupportVehicle,
} from '@/types/unit/VehicleInterfaces';

import { TurretType, isSupportVehicle } from '@/types/unit/VehicleInterfaces';

import { computeVehicleStructurePoints } from './structure';
import {
  calculateVehicleBV,
  type IVehicleBVBreakdown,
  type VehicleBVInput,
  type VehicleBVTurret,
  type VehicleTurretKind,
  type VehicleWeaponMount,
} from './vehicleBV';

// -----------------------------------------------------------------------------
// Turret mapping
// -----------------------------------------------------------------------------

/**
 * Map the enum-based `TurretType` to the BV-side `VehicleBVTurret` kind.
 * Returns undefined when there is no turret.
 */
function toTurretConfig(
  type: TurretType | null | undefined,
): VehicleBVTurret | undefined {
  if (!type || type === TurretType.NONE) return undefined;
  let kind: VehicleTurretKind;
  switch (type) {
    case TurretType.SINGLE:
      kind = 'single';
      break;
    case TurretType.DUAL:
      kind = 'dual';
      break;
    case TurretType.CHIN:
      kind = 'chin';
      break;
    case TurretType.SPONSON_LEFT:
    case TurretType.SPONSON_RIGHT:
      kind = 'sponson';
      break;
    default:
      return undefined;
  }
  return { kind };
}

// -----------------------------------------------------------------------------
// Equipment → weapon / ammo / equipment partitioning
// -----------------------------------------------------------------------------

/**
 * Heuristic: decide whether an equipment entry is ammo based on its id.
 * The vehicle store does not tag ammo separately, so we fall back to the
 * same pattern used elsewhere in the codebase.
 */
function isAmmo(equipmentId: string): boolean {
  const n = equipmentId.toLowerCase();
  return n.includes('ammo') || n.startsWith('ammo-');
}

/**
 * Heuristic: decide whether an item is a weapon.
 * Anything that is not ammo and not a known "system" item counts as a weapon.
 */
function isLikelyWeapon(equipmentId: string): boolean {
  const n = equipmentId.toLowerCase();
  if (isAmmo(n)) return false;
  if (n.includes('heat-sink') || n.includes('heatsink')) return false;
  if (n.includes('jump-jet')) return false;
  if (n.includes('case')) return false;
  if (n.includes('cargo')) return false;
  if (n.includes('infantry-bay')) return false;
  return true;
}

// -----------------------------------------------------------------------------
// Armor & structure totals
// -----------------------------------------------------------------------------

/**
 * Sum every numeric field in the armor allocation record to produce total
 * armor points. Non-numeric fields (e.g. nested objects) are ignored.
 */
function sumArmorAllocation(
  allocation: IVehicleArmorAllocation | Record<string, unknown>,
): number {
  let total = 0;
  for (const value of Object.values(allocation)) {
    if (typeof value === 'number') {
      total += value;
    } else if (value && typeof value === 'object') {
      for (const inner of Object.values(value)) {
        if (typeof inner === 'number') total += inner;
      }
    }
  }
  return total;
}

/**
 * Sum structure points per location into a single total.
 */
function sumStructurePoints(tonnage: number): number {
  const sp = computeVehicleStructurePoints(tonnage);
  return sp.front + sp.left + sp.right + sp.rear + sp.turret + sp.rotor;
}

// -----------------------------------------------------------------------------
// Store-state subset for BV computation
// -----------------------------------------------------------------------------

/**
 * Minimal subset of `VehicleState` needed to compute BV. Keeping this narrow
 * avoids coupling the BV adapter to the full store schema.
 */
export interface VehicleBVStateSubset {
  motionType: GroundMotionType;
  tonnage: number;
  cruiseMP: number;
  armorType: string;
  armorAllocation: IVehicleArmorAllocation | Record<string, unknown>;
  structureType: string;
  turret: { type: TurretType } | null;
  secondaryTurret: { type: TurretType } | null;
  barRating: number | null;
  equipment: readonly IVehicleMountedEquipment[];
  gunnery?: number;
  piloting?: number;
}

/**
 * Convert a vehicle store state subset into `VehicleBVInput`.
 */
export function toVehicleBVInput(state: VehicleBVStateSubset): VehicleBVInput {
  const flankMP = Math.floor(state.cruiseMP * 1.5);
  const totalArmorPoints = sumArmorAllocation(state.armorAllocation);
  const totalStructurePoints = sumStructurePoints(state.tonnage);

  const weapons: VehicleWeaponMount[] = [];
  const ammo: VehicleBVInput['ammo'] = [];

  for (const item of state.equipment) {
    if (isAmmo(item.equipmentId)) {
      ammo.push({
        id: item.equipmentId,
        location: String(item.location),
      });
    } else if (isLikelyWeapon(item.equipmentId)) {
      weapons.push({
        id: item.equipmentId,
        location: String(item.location),
        isRearMounted: item.isRearMounted,
        isTurretMounted: item.isTurretMounted,
        isSponsonMounted: item.isSponsonMounted,
      });
    }
  }

  return {
    motionType: state.motionType,
    cruiseMP: state.cruiseMP,
    flankMP,
    jumpMP: 0,
    tonnage: state.tonnage,
    totalArmorPoints,
    totalStructurePoints,
    armorType: state.armorType,
    structureType: state.structureType,
    barRating: state.barRating,
    weapons,
    ammo,
    defensiveEquipment: [],
    offensiveEquipment: [],
    explosivePenalty: 0,
    turret: toTurretConfig(state.turret?.type),
    secondaryTurret: toTurretConfig(state.secondaryTurret?.type),
    gunnery: state.gunnery ?? 4,
    piloting: state.piloting ?? 5,
  };
}

/**
 * Compute the full vehicle BV breakdown from a store state subset.
 */
export function computeVehicleBVFromState(
  state: VehicleBVStateSubset,
): IVehicleBVBreakdown {
  return calculateVehicleBV(toVehicleBVInput(state));
}

// -----------------------------------------------------------------------------
// IVehicleUnit → VehicleBVInput
// -----------------------------------------------------------------------------

/**
 * Per-unit BV options (skill overrides). Mirrors the option bag accepted by
 * `calculateBattleValueForUnit` in the BV barrel.
 */
export interface VehicleBVUnitOptions {
  /** Crew gunnery skill (default 4). */
  gunnery?: number;
  /** Crew piloting skill (default 5). */
  piloting?: number;
}

/**
 * Sum a vehicle's per-location armor map into a single total. Falls back to
 * `totalArmorPoints` when the per-location map is empty (e.g. legacy fixtures).
 *
 * @param armorByLocation Per-location armor map keyed by location enum.
 * @param totalArmorPoints Total armor on the unit (used as a backstop).
 */
function sumUnitArmor(
  armorByLocation: Record<string, number> | undefined,
  totalArmorPoints: number,
): number {
  if (!armorByLocation) return totalArmorPoints;
  let sum = 0;
  for (const value of Object.values(armorByLocation)) {
    if (typeof value === 'number') sum += value;
  }
  return sum > 0 ? sum : totalArmorPoints;
}

/**
 * Build a `VehicleBVInput` directly from an {@link IVehicleUnit}.
 *
 * This is the unit-shape entry point used by the per-unit dispatcher
 * (`calculateBattleValueForUnit`). The full store-driven adapter remains the
 * preferred path inside the customizer; this adapter is intentionally
 * conservative (no equipment partitioning beyond the basic ammo/weapon
 * heuristic) so it can run against minimal fixtures and bare unit JSON.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Vehicle BV Dispatch
 */
export function toVehicleBVInputFromUnit(
  unit: IVehicleUnit,
  options: VehicleBVUnitOptions = {},
): VehicleBVInput {
  const cruiseMP = unit.movement.cruiseMP;
  const flankMP = unit.movement.flankMP;
  const jumpMP = unit.movement.jumpMP;

  // ISupportVehicle does not have an armorByLocation map, so fall back to the
  // base IGroundUnit `totalArmorPoints` field on the unit shape.
  const armorByLocation = (unit as { armorByLocation?: Record<string, number> })
    .armorByLocation;
  const totalArmorPoints = sumUnitArmor(armorByLocation, unit.totalArmorPoints);
  const totalStructurePoints = sumStructurePoints(unit.tonnage);

  // BAR rating is only meaningful for support vehicles. Combat vehicles and
  // VTOLs pass `null` so the calculator skips BAR scaling.
  const barRating = isSupportVehicle(unit)
    ? (unit as ISupportVehicle).barRating
    : null;

  // Equipment partitioning. We treat anything that isn't ammo as a candidate
  // weapon — the equipment BV resolver downstream is the ultimate filter.
  // Vehicles without an equipment array (legacy fixtures) get an empty list.
  const rawEquipment: ReadonlyArray<IVehicleMountedEquipment> =
    unit.equipment ?? [];
  const weapons: VehicleWeaponMount[] = [];
  const ammo: VehicleBVInput['ammo'] = [];
  for (const item of rawEquipment) {
    if (isAmmo(item.equipmentId)) {
      ammo.push({
        id: item.equipmentId,
        location: String(item.location),
      });
    } else if (isLikelyWeapon(item.equipmentId)) {
      weapons.push({
        id: item.equipmentId,
        location: String(item.location),
        isRearMounted: item.isRearMounted,
        isTurretMounted: item.isTurretMounted,
        isSponsonMounted: item.isSponsonMounted,
      });
    }
  }

  // Turret kind comes from `IVehicle.turret` — VTOLs use `chinTurret`,
  // support vehicles have no turret. We map all of these to the BV-side
  // `VehicleBVTurret` shape with a single helper.
  const primaryTurret = (unit as { turret?: { type: TurretType } }).turret;
  const chinTurret = (unit as { chinTurret?: { type: TurretType } }).chinTurret;
  const secondary = (unit as { secondaryTurret?: { type: TurretType } })
    .secondaryTurret;
  const turret =
    toTurretConfig(primaryTurret?.type) ?? toTurretConfig(chinTurret?.type);
  const secondaryTurret = toTurretConfig(secondary?.type);

  return {
    motionType: unit.motionType as GroundMotionType,
    cruiseMP,
    flankMP,
    jumpMP,
    tonnage: unit.tonnage,
    totalArmorPoints,
    totalStructurePoints,
    armorType: undefined,
    structureType: undefined,
    barRating,
    weapons,
    ammo,
    defensiveEquipment: [],
    offensiveEquipment: [],
    explosivePenalty: 0,
    turret,
    secondaryTurret,
    gunnery: options.gunnery ?? 4,
    piloting: options.piloting ?? 5,
  };
}

/**
 * Compute the full vehicle BV breakdown from an {@link IVehicleUnit}.
 *
 * Used by the per-unit dispatcher in `battleValueCalculations.ts` so that
 * `calculateBattleValueForUnit(vehicle)` returns an `IVehicleBVBreakdown`
 * without callers needing to know about the lower-level `VehicleBVInput`.
 */
export function calculateVehicleBVFromUnit(
  unit: IVehicleUnit,
  options: VehicleBVUnitOptions = {},
): IVehicleBVBreakdown {
  return calculateVehicleBV(toVehicleBVInputFromUnit(unit, options));
}
