/**
 * Validation Navigation Utilities
 *
 * Maps validation categories to customizer tabs and provides navigation helpers.
 * Enables users to click on validation errors and navigate directly to the
 * tab that can resolve the issue.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';

/**
 * Maps validation categories to the customizer tab that can resolve issues.
 *
 * Mapping rationale:
 * - WEIGHT: Structure tab controls tonnage and heavy components
 * - SLOTS: Criticals tab handles slot allocation
 * - TECH_BASE: Structure tab sets tech base configuration
 * - ERA: Structure tab sets year/era
 * - CONSTRUCTION: Structure tab handles core construction rules
 * - EQUIPMENT: Equipment tab manages equipment selection
 * - MOVEMENT: Structure tab controls engine/jump jets
 * - ARMOR: Armor tab handles armor allocation
 * - HEAT: Equipment tab (heat sinks, weapons cause heat issues)
 */
export const CATEGORY_TAB_MAP: Record<ValidationCategory, CustomizerTabId> = {
  [ValidationCategory.WEIGHT]: 'structure',
  [ValidationCategory.SLOTS]: 'criticals',
  [ValidationCategory.TECH_BASE]: 'structure',
  [ValidationCategory.ERA]: 'structure',
  [ValidationCategory.CONSTRUCTION]: 'structure',
  [ValidationCategory.EQUIPMENT]: 'equipment',
  [ValidationCategory.MOVEMENT]: 'structure',
  [ValidationCategory.ARMOR]: 'armor',
  [ValidationCategory.HEAT]: 'equipment',
};

export const TAB_LABELS: Record<CustomizerTabId, string> = {
  overview: 'Overview',
  structure: 'Structure',
  armor: 'Armor',
  weapons: 'Weapons',
  equipment: 'Equipment',
  criticals: 'Critical Slots',
  fluff: 'Fluff',
  preview: 'Preview',
};

export function getTabForCategory(category: ValidationCategory): CustomizerTabId {
  return CATEGORY_TAB_MAP[category] ?? 'structure';
}

export function getTabLabel(tabId: CustomizerTabId): string {
  return TAB_LABELS[tabId] ?? tabId;
}

export interface TabValidationCounts {
  errors: number;
  warnings: number;
  infos: number;
}

export type ValidationCountsByTab = Record<CustomizerTabId, TabValidationCounts>;

export function createEmptyValidationCounts(): ValidationCountsByTab {
  return {
    overview: { errors: 0, warnings: 0, infos: 0 },
    structure: { errors: 0, warnings: 0, infos: 0 },
    armor: { errors: 0, warnings: 0, infos: 0 },
    weapons: { errors: 0, warnings: 0, infos: 0 },
    equipment: { errors: 0, warnings: 0, infos: 0 },
    criticals: { errors: 0, warnings: 0, infos: 0 },
    fluff: { errors: 0, warnings: 0, infos: 0 },
    preview: { errors: 0, warnings: 0, infos: 0 },
  };
}
