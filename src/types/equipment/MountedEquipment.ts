/**
 * Mounted Equipment Types
 *
 * Defines equipment instances mounted on a unit.
 * Each instance represents a single piece of equipment added to the unit.
 *
 * @spec openspec/specs/equipment-database/spec.md
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';

import type { IEquipmentItem } from './index';

import { EquipmentCategory } from './EquipmentCategory';

/**
 * Mounted equipment instance on a unit
 *
 * Each instance represents a single piece of equipment added to the unit.
 * Multiple instances of the same equipment type can exist (e.g., 4 Medium Lasers).
 */
export interface IMountedEquipmentInstance {
  /** Unique instance identifier (generated when added) */
  readonly instanceId: string;
  /** Reference to equipment definition ID */
  readonly equipmentId: string;
  /** Display name of the equipment */
  readonly name: string;
  /** Equipment category for grouping */
  readonly category: EquipmentCategory;
  /** Weight in tons */
  readonly weight: number;
  /** Number of critical slots required */
  readonly criticalSlots: number;
  /** Heat generated (for weapons) */
  readonly heat: number;
  /** Tech base of the equipment */
  readonly techBase: TechBase;
  /** Location where equipment is placed (undefined = unallocated) */
  readonly location?: MechLocation;
  /** Critical slot indices in the location (undefined = unallocated) */
  readonly slots?: readonly number[];
  /** Whether mounted facing rear arc */
  readonly isRearMounted: boolean;
  /** Linked ammunition instance ID (for weapons that use ammo) */
  readonly linkedAmmoId?: string;
  /**
   * Whether this equipment can be removed via the loadout tray.
   * Configuration components (Endo Steel, Ferro-Fibrous, Jump Jets, etc.)
   * are managed via their respective tabs and cannot be removed directly.
   * Defaults to true for user-added equipment.
   */
  readonly isRemovable: boolean;
  /**
   * Whether this equipment is pod-mounted on an OmniMech.
   * Pod-mounted equipment can be swapped between configurations.
   * Fixed equipment (isOmniPodMounted: false) is part of the base chassis.
   * Only relevant when the unit's isOmni flag is true.
   */
  readonly isOmniPodMounted: boolean;
  /**
   * Actual crit entries consumed on a superheavy mech.
   * Equal to criticalSlots for standard mechs, ceil(criticalSlots / 2) for superheavy.
   * Only set when the unit is a superheavy mech.
   *
   * @spec openspec/specs/superheavy-mech-system/spec.md
   */
  readonly critEntries?: number;
}

/**
 * Create a mounted equipment instance from an equipment item
 * @param item The equipment definition
 * @param instanceId Unique instance identifier
 * @param isRemovable Whether the equipment can be removed via the loadout tray (default: true)
 * @param isOmniPodMounted Whether the equipment is pod-mounted on an OmniMech (default: false)
 */
export function createMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  isRemovable: boolean = true,
  isOmniPodMounted: boolean = false,
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: item.id,
    name: item.name,
    category: item.category,
    weight: item.weight,
    criticalSlots: item.criticalSlots,
    heat: 'heat' in item ? (item as { heat: number }).heat : 0,
    techBase: item.techBase,
    location: undefined,
    slots: undefined,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable,
    isOmniPodMounted,
  };
}

/**
 * Calculate total equipment weight
 */
export function getTotalEquipmentWeight(
  equipment: readonly IMountedEquipmentInstance[],
): number {
  return equipment.reduce((total, item) => total + item.weight, 0);
}

/**
 * Calculate total equipment critical slots
 */
export function getTotalEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
): number {
  return equipment.reduce((total, item) => total + item.criticalSlots, 0);
}

/**
 * Get equipment count by category
 */
export function getEquipmentByCategory(
  equipment: readonly IMountedEquipmentInstance[],
): Record<EquipmentCategory, IMountedEquipmentInstance[]> {
  const result = {} as Record<EquipmentCategory, IMountedEquipmentInstance[]>;

  // Initialize all categories with empty arrays
  for (const category of Object.values(EquipmentCategory)) {
    result[category] = [];
  }

  // Group equipment by category
  for (const item of equipment) {
    result[item.category].push(item);
  }

  return result;
}
