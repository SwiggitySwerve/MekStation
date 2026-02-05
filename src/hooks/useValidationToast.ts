/**
 * Validation Toast Hook
 *
 * Shows toast notifications when new critical/error validation issues appear.
 * Provides action buttons to navigate to the relevant tab.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useEffect, useRef } from 'react';

import { useToast } from '@/components/shared/Toast';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import {
  getTabForCategory,
  getTabLabel,
} from '@/utils/validation/validationNavigation';

interface UseValidationToastOptions {
  onNavigate?: (tabId: CustomizerTabId) => void;
  enabled?: boolean;
}

export function useValidationToast(
  validation: UnitValidationState,
  options: UseValidationToastOptions = {},
): void {
  const { onNavigate, enabled = true } = options;
  const { showToast } = useToast();
  const prevCriticalCountRef = useRef<number>(0);
  const prevErrorCountRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !validation.result) return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevCriticalCountRef.current = validation.result.criticalErrorCount;
      prevErrorCountRef.current = validation.errorCount;
      return;
    }

    const currentCriticalCount = validation.result.criticalErrorCount;
    const currentErrorCount = validation.errorCount;
    const prevCriticalCount = prevCriticalCountRef.current;
    const prevErrorCount = prevErrorCountRef.current;

    if (currentCriticalCount > prevCriticalCount) {
      const newCriticalError = findFirstErrorBySeverity(
        validation.result,
        UnitValidationSeverity.CRITICAL_ERROR,
      );
      if (newCriticalError) {
        const tabId = getTabForCategory(newCriticalError.category);
        const tabLabel = getTabLabel(tabId);

        showToast({
          message: newCriticalError.message,
          variant: 'error',
          duration: 6000,
          action: onNavigate
            ? {
                label: `Go to ${tabLabel}`,
                onClick: () => onNavigate(tabId),
              }
            : undefined,
        });
      }
    } else if (
      currentErrorCount > prevErrorCount &&
      currentCriticalCount === prevCriticalCount
    ) {
      const newError = findFirstErrorBySeverity(
        validation.result,
        UnitValidationSeverity.ERROR,
      );
      if (newError) {
        const tabId = getTabForCategory(newError.category);
        const tabLabel = getTabLabel(tabId);

        showToast({
          message: newError.message,
          variant: 'warning',
          duration: 4000,
          action: onNavigate
            ? {
                label: `Go to ${tabLabel}`,
                onClick: () => onNavigate(tabId),
              }
            : undefined,
        });
      }
    }

    prevCriticalCountRef.current = currentCriticalCount;
    prevErrorCountRef.current = currentErrorCount;
  }, [
    validation.result,
    validation.errorCount,
    enabled,
    showToast,
    onNavigate,
  ]);
}

function findFirstErrorBySeverity(
  result: UnitValidationState['result'],
  targetSeverity: UnitValidationSeverity,
): IUnitValidationError | null {
  if (!result) return null;

  for (const ruleResult of result.results) {
    for (const error of ruleResult.errors) {
      if (error.severity === targetSeverity) {
        return error;
      }
    }
  }
  return null;
}
