/**
 * Validation Navigation Utilities
 *
 * Maps validation categories to customizer tabs and provides navigation helpers.
 * Enables users to click on validation errors and navigate directly to the
 * tab that can resolve the issue.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import type { IUnitValidationResult } from '@/types/validation/UnitValidationInterfaces';

import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { UnitValidationSeverity } from '@/types/validation/UnitValidationInterfaces';

/**
 * Maps validation categories to the customizer tab that can resolve issues.
 *
 * Mapping rationale:
 * - WEIGHT: Structure tab controls tonnage and heavy components
 * - SLOTS: Criticals tab handles slot allocation
 * - TECH_BASE: Overview tab sets the unit tech base
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
  [ValidationCategory.TECH_BASE]: 'overview',
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

export function getTabForCategory(
  category: ValidationCategory,
): CustomizerTabId {
  return CATEGORY_TAB_MAP[category] ?? 'structure';
}

export function getTabLabel(tabId: CustomizerTabId): string {
  return TAB_LABELS[tabId] ?? tabId;
}

/**
 * Tabs offered as fixes for an issue, most direct first. Weight is set by
 * what the unit carries, so weight issues point at the equipment and armor
 * that make up the difference; every other category offers its owning tab.
 * Tab badges count an issue on its first fix tab (`getPrimaryFixTab`).
 */
export const CATEGORY_FIX_TABS: Partial<
  Record<ValidationCategory, readonly CustomizerTabId[]>
> = {
  [ValidationCategory.WEIGHT]: ['equipment', 'armor'],
};

export function getFixTabsForCategory(
  category: ValidationCategory,
): readonly CustomizerTabId[] {
  return CATEGORY_FIX_TABS[category] ?? [getTabForCategory(category)];
}

export interface TabValidationCounts {
  errors: number;
  warnings: number;
  infos: number;
}

export type ValidationCountsByTab = Record<
  CustomizerTabId,
  TabValidationCounts
>;

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

/**
 * Tab whose badge counts an issue: the first tab that fixes it, so the dot
 * sits where the user acts (an overweight unit marks Equipment, not
 * Structure).
 */
export function getPrimaryFixTab(
  category: ValidationCategory,
): CustomizerTabId {
  return getFixTabsForCategory(category)[0] ?? getTabForCategory(category);
}

/**
 * Per-tab badge counts for a validation result. Errors count critical and
 * regular errors; each issue counts once, on its badge tab.
 */
export function countValidationIssuesByTab(
  result: Pick<IUnitValidationResult, 'results'> | null | undefined,
): ValidationCountsByTab {
  const counts = createEmptyValidationCounts();
  if (!result) return counts;
  for (const ruleResult of result.results) {
    for (const error of ruleResult.errors) {
      if (
        error.severity === UnitValidationSeverity.CRITICAL_ERROR ||
        error.severity === UnitValidationSeverity.ERROR
      ) {
        counts[getPrimaryFixTab(error.category)].errors++;
      }
    }
    for (const warning of ruleResult.warnings) {
      counts[getPrimaryFixTab(warning.category)].warnings++;
    }
    for (const info of ruleResult.infos) {
      counts[getPrimaryFixTab(info.category)].infos++;
    }
  }
  return counts;
}
