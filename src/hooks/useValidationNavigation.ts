/**
 * Validation Navigation Hook
 *
 * Provides derived validation state per tab and navigation helpers for
 * clicking on validation errors to navigate to the appropriate tab.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo, useCallback } from 'react';

import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import {
  CATEGORY_TAB_MAP,
  getTabForCategory,
  getTabLabel,
  createEmptyValidationCounts,
  ValidationCountsByTab,
  TabValidationCounts,
} from '@/utils/validation/validationNavigation';

export interface UseValidationNavigationResult {
  errorsByTab: ValidationCountsByTab;
  getTabCounts: (tabId: CustomizerTabId) => TabValidationCounts;
  navigateToError: (
    error: IUnitValidationError,
    onTabChange: (tabId: CustomizerTabId) => void,
  ) => void;
  getTargetTabForError: (error: IUnitValidationError) => CustomizerTabId;
  getTargetTabLabel: (error: IUnitValidationError) => string;
  hasErrorsOnTab: (tabId: CustomizerTabId) => boolean;
  hasWarningsOnTab: (tabId: CustomizerTabId) => boolean;
}

export function useValidationNavigation(
  validation: UnitValidationState,
): UseValidationNavigationResult {
  const errorsByTab = useMemo<ValidationCountsByTab>(() => {
    const counts = createEmptyValidationCounts();

    if (!validation.result) return counts;

    for (const ruleResult of validation.result.results) {
      for (const error of ruleResult.errors) {
        const tabId = getTabForCategory(error.category);
        if (
          error.severity === UnitValidationSeverity.CRITICAL_ERROR ||
          error.severity === UnitValidationSeverity.ERROR
        ) {
          counts[tabId].errors++;
        }
      }
      for (const warning of ruleResult.warnings) {
        const tabId = getTabForCategory(warning.category);
        counts[tabId].warnings++;
      }
      for (const info of ruleResult.infos) {
        const tabId = getTabForCategory(info.category);
        counts[tabId].infos++;
      }
    }

    return counts;
  }, [validation.result]);

  const getTabCounts = useCallback(
    (tabId: CustomizerTabId): TabValidationCounts => {
      return errorsByTab[tabId] ?? { errors: 0, warnings: 0, infos: 0 };
    },
    [errorsByTab],
  );

  const getTargetTabForError = useCallback(
    (error: IUnitValidationError): CustomizerTabId => {
      return getTabForCategory(error.category);
    },
    [],
  );

  const getTargetTabLabel = useCallback(
    (error: IUnitValidationError): string => {
      const tabId = getTabForCategory(error.category);
      return getTabLabel(tabId);
    },
    [],
  );

  const navigateToError = useCallback(
    (
      error: IUnitValidationError,
      onTabChange: (tabId: CustomizerTabId) => void,
    ) => {
      const tabId = getTabForCategory(error.category);
      onTabChange(tabId);
    },
    [],
  );

  const hasErrorsOnTab = useCallback(
    (tabId: CustomizerTabId): boolean => {
      return errorsByTab[tabId]?.errors > 0;
    },
    [errorsByTab],
  );

  const hasWarningsOnTab = useCallback(
    (tabId: CustomizerTabId): boolean => {
      return errorsByTab[tabId]?.warnings > 0;
    },
    [errorsByTab],
  );

  return {
    errorsByTab,
    getTabCounts,
    navigateToError,
    getTargetTabForError,
    getTargetTabLabel,
    hasErrorsOnTab,
    hasWarningsOnTab,
  };
}

export { CATEGORY_TAB_MAP, getTabForCategory, getTabLabel };
