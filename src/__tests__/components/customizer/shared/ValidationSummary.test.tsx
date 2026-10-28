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

      render(
        <ValidationSummary validation={validation} onNavigate={jest.fn()} />,
      );

      fireEvent.click(screen.getByRole('button'));

      expect(
        screen.getByRole('button', { name: 'Go to Armor' }),
      ).toBeInTheDocument();
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

      fireEvent.click(screen.getByRole('button', { name: /Go to Armor/ }));

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

      fireEvent.click(screen.getByRole('button', { name: /Go to Armor/ }));

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

      const items = Array.from(
        document.querySelectorAll('[data-validation-issue]'),
      ).map((item) => item.textContent ?? '');
      expect(items).toHaveLength(2);
      expect(items[0]).toContain('Critical error');
      expect(items[1]).toContain('Regular error');
    });
  });
  it('preserves an unplaced-equipment error, guidance and issue identity when navigating', () => {
    const result = createMockResult([
      {
        message: 'ER PPC needs a location',
        category: ValidationCategory.SLOTS,
      },
    ]);
    const issue = {
      ...result.results[0].errors[0],
      field: 'criticalSlots.ppc-1',
      suggestion: 'Choose a location with 3 free critical slots.',
    };
    const detailedResult = {
      ...result,
      results: [{ ...result.results[0], errors: [issue] }],
    };
    const onIssueNavigate = jest.fn();
    render(
      <ValidationSummary
        validation={createMockValidationState({
          isValid: false,
          errorCount: 1,
          result: detailedResult,
        })}
        unitName="Atlas"
        onIssueNavigate={onIssueNavigate}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Atlas: Not Legal · 1 error, show issues',
    });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      /Atlas.*Build Status.*Not Legal · 1 error/,
    );
    // A short message is its own heading; the suggestion explains the fix.
    expect(
      screen.getByRole('heading', { name: 'Error: ER PPC needs a location' }),
    ).toBeInTheDocument();
    expect(screen.getByText(issue.suggestion)).toBeInTheDocument();
    const fix = screen.getByRole('button', { name: /Go to Critical Slots/ });
    expect(fix).toHaveFocus();
    expect(fix).toHaveAccessibleDescription('Error: ER PPC needs a location');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole('button', { name: /Go to Critical Slots/ }),
    );
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
    fireEvent.click(screen.getByRole('button', { name: /Show All/ }));
    expect(screen.getByText('Issue 5')).toBeInTheDocument();
    rerender(
      <ValidationSummary
        validation={createMockValidationState({ isLoading: true })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Checking');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('names the cause and offers the readiness fix sentence and link for overweight', () => {
    const onNavigate = jest.fn();
    const onIssueNavigate = jest.fn();
    render(
      <ValidationSummary
        validation={createMockValidationState({
          isValid: false,
          errorCount: 2,
          result: createMockResult([
            {
              message:
                'Unit exceeds maximum tonnage by 3.0 tons (103.0/100 tons)',
              category: ValidationCategory.WEIGHT,
              severity: UnitValidationSeverity.CRITICAL_ERROR,
            },
            {
              message: 'ER PPC needs a location',
              category: ValidationCategory.SLOTS,
            },
          ]),
        })}
        unitName="Atlas"
        onNavigate={onNavigate}
        onIssueNavigate={onIssueNavigate}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Atlas: Not Legal · 2 errors, show issues',
    });
    expect(trigger).toHaveAttribute('data-build-status', 'error');
    expect(trigger).toHaveTextContent('2 errors');
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/Not Legal · 2 errors/);
    const groups = Array.from(dialog.querySelectorAll('h4')).map(
      (heading) => heading.textContent,
    );
    expect(groups).toEqual(['Errors \u2014 the unit is not legal until fixed']);
    const overweight = screen.getByRole('heading', {
      name: 'Critical error: Overweight by 3.0 t',
    });
    const item = overweight.closest('[data-validation-issue]') as HTMLElement;
    // The amount is said once, in the heading; the body is the one fix
    // sentence the Overview readiness row also ends with.
    expect(item).not.toHaveTextContent('exceeds maximum tonnage');
    expect(item.querySelector('p')).toHaveTextContent(
      /^Remove equipment or armor\.$/,
    );
    // One link, the same one the readiness row offers.
    const fixes = Array.from(
      item.querySelectorAll<HTMLButtonElement>('[data-validation-fix]'),
    ).map((button) => button.textContent);
    expect(fixes).toEqual(['Go to Equipment']);
    fireEvent.click(screen.getByRole('button', { name: /Go to Equipment/ }));
    expect(onNavigate).toHaveBeenCalledWith('equipment');
    expect(onIssueNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the counts in words on the icon-only phone chip, at 44px', () => {
    render(
      <ValidationSummary
        validation={createMockValidationState({
          isValid: false,
          errorCount: 2,
          warningCount: 1,
          result: createMockResult(
            [
              {
                message: 'PPC needs a location',
                category: ValidationCategory.SLOTS,
              },
              {
                message: 'AC/20 needs a location',
                category: ValidationCategory.SLOTS,
              },
            ],
            [{ message: 'Low armor', category: ValidationCategory.ARMOR }],
          ),
        })}
        unitName="Atlas"
        compact
      />,
    );
    const chip = screen.getByRole('button', {
      name: 'Atlas: Not Legal · 2 errors · 1 warning, show issues',
    });
    // The chip shows icons and counts only; the words live in its name.
    expect(chip).not.toHaveTextContent(/errors?|warnings?/);
    expect(chip).toHaveClass('h-11', 'w-full');
  });
});
