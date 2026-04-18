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
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import { TurretType } from '@/types/unit/VehicleInterfaces';

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
