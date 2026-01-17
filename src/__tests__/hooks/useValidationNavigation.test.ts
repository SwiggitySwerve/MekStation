/**
 * Tests for useValidationNavigation hook
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { renderHook } from '@testing-library/react';
import { useValidationNavigation } from '@/hooks/useValidationNavigation';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import {
  UnitValidationSeverity,
  UnitCategory,
} from '@/types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

function createMockError(
  category: ValidationCategory,
  severity: UnitValidationSeverity = UnitValidationSeverity.ERROR
) {
  return {
    ruleId: 'TEST-001',
    ruleName: 'Test Rule',
    severity,
    category,
    message: 'Test error message',
  };
}

function createMockValidationState(
  ruleResults: Array<{
    errors?: Array<{ category: ValidationCategory; severity?: UnitValidationSeverity }>;
    warnings?: Array<{ category: ValidationCategory }>;
    infos?: Array<{ category: ValidationCategory }>;
  }>
): UnitValidationState {
  const results = ruleResults.map((r, i) => ({
    ruleId: `RULE-${i}`,
    ruleName: `Rule ${i}`,
    passed: (r.errors?.length ?? 0) === 0,
    errors: (r.errors ?? []).map((e) =>
      createMockError(e.category, e.severity ?? UnitValidationSeverity.ERROR)
    ),
    warnings: (r.warnings ?? []).map((w) => createMockError(w.category, UnitValidationSeverity.WARNING)),
    infos: (r.infos ?? []).map((inf) => createMockError(inf.category, UnitValidationSeverity.INFO)),
    executionTime: 1,
  }));

  const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
  const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'valid',
    isValid: errorCount === 0,
    hasCriticalErrors: false,
    errorCount,
    warningCount,
    infoCount: results.reduce((sum, r) => sum + r.infos.length, 0),
    isLoading: false,
    result: {
      isValid: errorCount === 0,
      hasCriticalErrors: false,
      results,
      criticalErrorCount: 0,
      errorCount,
      warningCount,
      infoCount: results.reduce((sum, r) => sum + r.infos.length, 0),
      totalExecutionTime: results.length,
      validatedAt: new Date().toISOString(),
      unitType: UnitType.BATTLEMECH,
      unitCategory: UnitCategory.MECH,
      truncated: false,
    },
  };
}

const emptyValidation: UnitValidationState = {
  status: 'valid',
  isValid: true,
  hasCriticalErrors: false,
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  isLoading: false,
  result: null,
};

describe('useValidationNavigation', () => {
  describe('errorsByTab', () => {
    it('should return empty counts when validation result is null', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));

      expect(result.current.errorsByTab.structure).toEqual({ errors: 0, warnings: 0, infos: 0 });
      expect(result.current.errorsByTab.armor).toEqual({ errors: 0, warnings: 0, infos: 0 });
      expect(result.current.errorsByTab.equipment).toEqual({ errors: 0, warnings: 0, infos: 0 });
      expect(result.current.errorsByTab.criticals).toEqual({ errors: 0, warnings: 0, infos: 0 });
    });

    it('should count errors by tab based on category', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.WEIGHT }] },
        { errors: [{ category: ValidationCategory.ARMOR }] },
        { errors: [{ category: ValidationCategory.SLOTS }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.structure.errors).toBe(1);
      expect(result.current.errorsByTab.armor.errors).toBe(1);
      expect(result.current.errorsByTab.criticals.errors).toBe(1);
      expect(result.current.errorsByTab.equipment.errors).toBe(0);
    });

    it('should count critical errors as errors', () => {
      const validation = createMockValidationState([
        {
          errors: [
            { category: ValidationCategory.WEIGHT, severity: UnitValidationSeverity.CRITICAL_ERROR },
          ],
        },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.structure.errors).toBe(1);
    });

    it('should count warnings separately', () => {
      const validation = createMockValidationState([
        {
          errors: [{ category: ValidationCategory.ARMOR }],
          warnings: [{ category: ValidationCategory.ARMOR }],
        },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.armor.errors).toBe(1);
      expect(result.current.errorsByTab.armor.warnings).toBe(1);
    });

    it('should count infos separately', () => {
      const validation = createMockValidationState([
        { infos: [{ category: ValidationCategory.EQUIPMENT }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.equipment.infos).toBe(1);
    });

    it('should map MOVEMENT category to structure tab', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.MOVEMENT }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.structure.errors).toBe(1);
    });

    it('should map HEAT category to equipment tab', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.HEAT }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.equipment.errors).toBe(1);
    });

    it('should aggregate multiple errors in same category', () => {
      const validation = createMockValidationState([
        {
          errors: [
            { category: ValidationCategory.ARMOR },
            { category: ValidationCategory.ARMOR },
            { category: ValidationCategory.ARMOR },
          ],
        },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.errorsByTab.armor.errors).toBe(3);
    });
  });

  describe('getTabCounts', () => {
    it('should return counts for specified tab', () => {
      const validation = createMockValidationState([
        {
          errors: [{ category: ValidationCategory.ARMOR }],
          warnings: [{ category: ValidationCategory.ARMOR }, { category: ValidationCategory.ARMOR }],
        },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));
      const armorCounts = result.current.getTabCounts('armor');

      expect(armorCounts.errors).toBe(1);
      expect(armorCounts.warnings).toBe(2);
      expect(armorCounts.infos).toBe(0);
    });

    it('should return zeros for tab with no issues', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.ARMOR }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));
      const equipmentCounts = result.current.getTabCounts('equipment');

      expect(equipmentCounts.errors).toBe(0);
      expect(equipmentCounts.warnings).toBe(0);
      expect(equipmentCounts.infos).toBe(0);
    });
  });

  describe('getTargetTabForError', () => {
    it('should return correct tab for WEIGHT category', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.WEIGHT);

      expect(result.current.getTargetTabForError(error)).toBe('structure');
    });

    it('should return correct tab for ARMOR category', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.ARMOR);

      expect(result.current.getTargetTabForError(error)).toBe('armor');
    });

    it('should return correct tab for SLOTS category', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.SLOTS);

      expect(result.current.getTargetTabForError(error)).toBe('criticals');
    });

    it('should return correct tab for EQUIPMENT category', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.EQUIPMENT);

      expect(result.current.getTargetTabForError(error)).toBe('equipment');
    });
  });

  describe('getTargetTabLabel', () => {
    it('should return human-readable label for structure tab', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.WEIGHT);

      expect(result.current.getTargetTabLabel(error)).toBe('Structure');
    });

    it('should return human-readable label for armor tab', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.ARMOR);

      expect(result.current.getTargetTabLabel(error)).toBe('Armor');
    });

    it('should return human-readable label for criticals tab', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.SLOTS);

      expect(result.current.getTargetTabLabel(error)).toBe('Critical Slots');
    });

    it('should return human-readable label for equipment tab', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.EQUIPMENT);

      expect(result.current.getTargetTabLabel(error)).toBe('Equipment');
    });
  });

  describe('navigateToError', () => {
    it('should call onTabChange with correct tab', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.ARMOR);
      const onTabChange = jest.fn();

      result.current.navigateToError(error, onTabChange);

      expect(onTabChange).toHaveBeenCalledWith('armor');
    });

    it('should navigate to structure for WEIGHT errors', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.WEIGHT);
      const onTabChange = jest.fn();

      result.current.navigateToError(error, onTabChange);

      expect(onTabChange).toHaveBeenCalledWith('structure');
    });

    it('should navigate to criticals for SLOTS errors', () => {
      const { result } = renderHook(() => useValidationNavigation(emptyValidation));
      const error = createMockError(ValidationCategory.SLOTS);
      const onTabChange = jest.fn();

      result.current.navigateToError(error, onTabChange);

      expect(onTabChange).toHaveBeenCalledWith('criticals');
    });
  });

  describe('hasErrorsOnTab', () => {
    it('should return true when tab has errors', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.ARMOR }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.hasErrorsOnTab('armor')).toBe(true);
    });

    it('should return false when tab has no errors', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.ARMOR }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.hasErrorsOnTab('equipment')).toBe(false);
    });

    it('should return false when tab only has warnings', () => {
      const validation = createMockValidationState([
        { warnings: [{ category: ValidationCategory.ARMOR }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.hasErrorsOnTab('armor')).toBe(false);
    });
  });

  describe('hasWarningsOnTab', () => {
    it('should return true when tab has warnings', () => {
      const validation = createMockValidationState([
        { warnings: [{ category: ValidationCategory.ARMOR }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.hasWarningsOnTab('armor')).toBe(true);
    });

    it('should return false when tab has no warnings', () => {
      const validation = createMockValidationState([
        { errors: [{ category: ValidationCategory.ARMOR }] },
      ]);

      const { result } = renderHook(() => useValidationNavigation(validation));

      expect(result.current.hasWarningsOnTab('armor')).toBe(false);
    });
  });
});
