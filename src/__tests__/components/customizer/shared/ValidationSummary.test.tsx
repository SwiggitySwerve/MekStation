import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { ValidationSummary } from '@/components/customizer/shared/ValidationSummary';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitValidationSeverity,
  IUnitValidationResult,
} from '@/types/validation/UnitValidationInterfaces';
import { UnitCategory } from '@/types/validation/UnitValidationInterfaces';

const createMockValidationState = (
  overrides: Partial<UnitValidationState> = {},
): UnitValidationState => ({
  status: 'valid',
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  isValid: true,
  hasCriticalErrors: false,
  result: null,
  isLoading: false,
  isValidating: false,
  ...overrides,
});

const createMockResult = (
  errors: Array<{
    message: string;
    category: ValidationCategory;
    severity?: UnitValidationSeverity;
  }> = [],
  warnings: Array<{ message: string; category: ValidationCategory }> = [],
): IUnitValidationResult => ({
  isValid: errors.length === 0,
  hasCriticalErrors: errors.some(
    (e) => e.severity === UnitValidationSeverity.CRITICAL_ERROR,
  ),
  results: [
    {
      ruleId: 'test-rule',
      ruleName: 'Test Rule',
      passed: errors.length === 0,
      errors: errors.map((e, i) => ({
        ruleId: `error-${i}`,
        ruleName: 'Test Error',
        severity: e.severity || UnitValidationSeverity.ERROR,
        category: e.category,
        message: e.message,
      })),
      warnings: warnings.map((w, i) => ({
        ruleId: `warning-${i}`,
        ruleName: 'Test Warning',
        severity: UnitValidationSeverity.WARNING,
        category: w.category,
        message: w.message,
      })),
      infos: [],
      executionTime: 0,
    },
  ],
  criticalErrorCount: errors.filter(
    (e) => e.severity === UnitValidationSeverity.CRITICAL_ERROR,
  ).length,
  errorCount: errors.length,
  warningCount: warnings.length,
  infoCount: 0,
  totalExecutionTime: 0,
  validatedAt: new Date().toISOString(),
  unitType: UnitType.BATTLEMECH,
  unitCategory: UnitCategory.MECH,
  truncated: false,
});

describe('ValidationSummary', () => {
  describe('when valid', () => {
    it('should show green valid badge', () => {
      const validation = createMockValidationState({ isValid: true });
      render(<ValidationSummary validation={validation} />);

      expect(screen.getByRole('status')).toHaveTextContent('Ready');
      expect(
        screen.getByRole('status').querySelector('[data-icon-name="check"]'),
      ).toBeInTheDocument();
    });
  });

  describe('when has errors', () => {
    it('should show error count badge', () => {
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 3,
        warningCount: 0,
        result: createMockResult([
          { message: 'Error 1', category: ValidationCategory.ARMOR },
          { message: 'Error 2', category: ValidationCategory.WEIGHT },
          { message: 'Error 3', category: ValidationCategory.SLOTS },
        ]),
      });

      render(<ValidationSummary validation={validation} />);

      expect(
        screen.getByRole('button', { name: /\d+ errors?, show issues/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /3 errors, show issues/ }),
      ).toHaveTextContent('3 errors');
    });

    it('should show dropdown when clicked', () => {
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 1,
        result: createMockResult([
          { message: 'Test error message', category: ValidationCategory.ARMOR },
        ]),
      });

      render(<ValidationSummary validation={validation} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should show target tab hint', () => {
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 1,
        result: createMockResult([
          { message: 'Armor issue', category: ValidationCategory.ARMOR },
        ]),
      });

      render(<ValidationSummary validation={validation} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText(/Go to Armor/)).toBeInTheDocument();
    });
  });

  describe('when has warnings only', () => {
    it('should show warning badge with count when there are warnings but no errors', () => {
      const validation = createMockValidationState({
        isValid: true,
        errorCount: 0,
        warningCount: 2,
        result: createMockResult(
          [],
          [
            { message: 'Warning 1', category: ValidationCategory.ARMOR },
            { message: 'Warning 2', category: ValidationCategory.EQUIPMENT },
          ],
        ),
      });

      render(<ValidationSummary validation={validation} />);

      // Should show warning icon and count, not "Valid"
      expect(
        screen.getByRole('button', { name: /\d+ warnings?, show issues/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /2 warnings, show issues/ }),
      ).toHaveTextContent('2 warnings');
      expect(screen.queryByText('Valid')).not.toBeInTheDocument();
    });

    it('should show dropdown with warnings when clicked', () => {
      const validation = createMockValidationState({
        isValid: true,
        errorCount: 0,
        warningCount: 1,
        result: createMockResult(
          [],
          [{ message: 'Warning message', category: ValidationCategory.ARMOR }],
        ),
      });

      render(<ValidationSummary validation={validation} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should call onNavigate when error item is clicked', () => {
      const onNavigate = jest.fn();
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 1,
        result: createMockResult([
          { message: 'Armor error', category: ValidationCategory.ARMOR },
        ]),
      });

      render(
        <ValidationSummary validation={validation} onNavigate={onNavigate} />,
      );

      fireEvent.click(screen.getByRole('button'));

      const errorItem = screen.getByText('Armor error').closest('button');
      fireEvent.click(errorItem!);

      expect(onNavigate).toHaveBeenCalledWith('armor');
    });

    it('should close dropdown after navigation', () => {
      const onNavigate = jest.fn();
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 1,
        result: createMockResult([
          { message: 'Armor error', category: ValidationCategory.ARMOR },
        ]),
      });

      render(
        <ValidationSummary validation={validation} onNavigate={onNavigate} />,
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const errorItem = screen.getByText('Armor error').closest('button');
      fireEvent.click(errorItem!);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('maxItems prop', () => {
    it('should limit displayed items', () => {
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 10,
        result: createMockResult([
          { message: 'Error 1', category: ValidationCategory.ARMOR },
          { message: 'Error 2', category: ValidationCategory.ARMOR },
          { message: 'Error 3', category: ValidationCategory.ARMOR },
          { message: 'Error 4', category: ValidationCategory.ARMOR },
          { message: 'Error 5', category: ValidationCategory.ARMOR },
          { message: 'Error 6', category: ValidationCategory.ARMOR },
          { message: 'Error 7', category: ValidationCategory.ARMOR },
          { message: 'Error 8', category: ValidationCategory.ARMOR },
          { message: 'Error 9', category: ValidationCategory.ARMOR },
          { message: 'Error 10', category: ValidationCategory.ARMOR },
        ]),
      });

      render(<ValidationSummary validation={validation} maxItems={3} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
      expect(screen.queryByText('Error 4')).not.toBeInTheDocument();
      expect(screen.getByText(/\+7 more issue/)).toBeInTheDocument();
    });
  });

  describe('severity ordering', () => {
    it('should show critical errors first', () => {
      const validation = createMockValidationState({
        isValid: false,
        errorCount: 2,
        result: createMockResult([
          {
            message: 'Regular error',
            category: ValidationCategory.ARMOR,
            severity: UnitValidationSeverity.ERROR,
          },
          {
            message: 'Critical error',
            category: ValidationCategory.WEIGHT,
            severity: UnitValidationSeverity.CRITICAL_ERROR,
          },
        ]),
      });

      render(<ValidationSummary validation={validation} />);

      fireEvent.click(screen.getByRole('button'));

      const items = screen
        .getAllByRole('button')
        .filter((b) => b.textContent?.includes('error'));
      const criticalIndex = items.findIndex((i) =>
        i.textContent?.includes('Critical'),
      );
      const regularIndex = items.findIndex((i) =>
        i.textContent?.includes('Regular'),
      );

      expect(criticalIndex).toBeLessThan(regularIndex);
    });
  });
  it('preserves a warning location, guidance and issue identity when navigating', () => {
    const result = createMockResult(
      [],
      [
        {
          message: 'ER PPC needs a location',
          category: ValidationCategory.SLOTS,
        },
      ],
    );
    const issue = {
      ...result.results[0].warnings[0],
      field: 'criticalSlots.ppc-1',
      suggestion: 'Choose a location with 3 free critical slots.',
    };
    const detailedResult = {
      ...result,
      results: [{ ...result.results[0], warnings: [issue] }],
    };
    const onIssueNavigate = jest.fn();
    render(
      <ValidationSummary
        validation={createMockValidationState({
          warningCount: 1,
          result: detailedResult,
        })}
        unitName="Atlas"
        section="criticals"
        onIssueNavigate={onIssueNavigate}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: /Atlas: 1 warning in Critical Slots/,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      /Atlas.*Warnings.*Critical Slots/,
    );
    expect(screen.getByText(issue.suggestion)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText(issue.message));
    expect(onIssueNavigate).toHaveBeenCalledWith(issue);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows every issue after expansion and keeps loading distinct from valid', () => {
    const result = createMockResult(
      Array.from({ length: 6 }, (_, i) => ({
        message: `Issue ${i}`,
        category: ValidationCategory.WEIGHT,
      })),
    );
    const { rerender } = render(
      <ValidationSummary
        validation={createMockValidationState({ errorCount: 6, result })}
        maxItems={2}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /6 errors, show issues/ }),
    );
    expect(screen.queryByText('Issue 5')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show all/ }));
    expect(screen.getByText('Issue 5')).toBeInTheDocument();
    rerender(
      <ValidationSummary
        validation={createMockValidationState({ isLoading: true })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Checking');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
