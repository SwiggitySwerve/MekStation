/**
 * Equipment Query and Calculation Types
 *
 * Domain types for equipment filtering, context, and property calculations.
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

/**
 * Equipment filter criteria for combined queries
 */
export interface IEquipmentQueryCriteria {
  readonly category?: EquipmentCategory;
  readonly techBase?: TechBase;
  readonly year?: number;
  readonly nameQuery?: string;
  readonly rulesLevel?: RulesLevel;
  readonly maxWeight?: number;
  readonly maxSlots?: number;
}

/**
 * Context for variable equipment calculations
 */
export interface IVariableEquipmentContext {
  readonly tonnage?: number;
  readonly engineRating?: number;
  readonly engineWeight?: number;
  readonly directFireWeaponTonnage?: number;
  readonly techBase?: TechBase;
}

/**
 * Calculated equipment properties
 */
export interface ICalculatedEquipmentProperties {
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  /** Damage for physical weapons (optional) */
  readonly damage?: number;
}
