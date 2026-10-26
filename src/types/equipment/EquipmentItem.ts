import type { ITemporalEntity } from '@/types/core/ITemporalEntity';
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
export interface IEquipmentItem extends Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
> {
  readonly id: string;
  readonly name: string;
  readonly category: EquipmentCategory;
  /**
   * Additional categories this equipment should appear under.
   * Used for dual-purpose equipment like AMS (weapon + defensive).
   */
  readonly additionalCategories?: readonly EquipmentCategory[];
  /** Declared compatible weapon IDs for ammunition; imports may omit them. */
  readonly compatibleWeaponIds?: readonly string[];
  /** External ammunition capacity and behavior metadata for weapon validation. */
  readonly ammoPerTon?: number;
  readonly flags?: readonly string[];
  readonly special?: readonly string[];
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  /**
   * Variable equipment formula ID for equipment with variable properties.
   * If present, weight and criticalSlots should be calculated dynamically
   * using the EquipmentCalculatorService with the appropriate context.
   *
   * Examples: 'targeting-computer-is', 'masc-is', 'hatchet'
   */
  readonly variableEquipmentId?: string;
}
