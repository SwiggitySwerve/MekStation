/**
 * Unified Equipment Item Interface
 *
 * Represents any equipment item in a normalized form for listing,
 * browsing, filtering, and lookup purposes.
 *
 * @spec openspec/specs/equipment-database/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';
import { EquipmentCategory } from './EquipmentCategory';

/**
 * Unified equipment item (for listing/browsing)
 */
export interface IEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly category: EquipmentCategory;
  /**
   * Additional categories this equipment should appear under.
   * Used for dual-purpose equipment like AMS (weapon + defensive).
   */
  readonly additionalCategories?: readonly EquipmentCategory[];
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
  /**
   * Variable equipment formula ID for equipment with variable properties.
   * If present, weight and criticalSlots should be calculated dynamically
   * using the EquipmentCalculatorService with the appropriate context.
   *
   * Examples: 'targeting-computer-is', 'masc-is', 'hatchet'
   */
  readonly variableEquipmentId?: string;
}
