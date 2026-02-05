/**
 * ValidationSummary Component Tests
 *
 * Tests rendering of validation errors, warnings, and info messages.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { UnitValidationState } from '@/hooks/useUnitValidation';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitValidationSeverity,
  UnitCategory,
} from '@/types/validation/UnitValidationInterfaces';

import { ValidationSummary } from '../ValidationSummary';

// =============================================================================
// Test Helpers
// =============================================================================

function createValidationState(
  overrides: Partial<UnitValidationState> = {},
): UnitValidationState {
  return {
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
  };
}

function createValidationResult(
  errors: Array<{ message: string; severity?: UnitValidationSeverity }> = [],
  warnings: Array<{ message: string }> = [],
  infos: Array<{ message: string }> = [],
) {
  return {
    isValid: errors.length === 0,
    hasCriticalErrors: errors.some(
      (e) => e.severity === UnitValidationSeverity.CRITICAL_ERROR,
    ),
    results: [
      {
        ruleId: 'TEST-001',
        ruleName: 'Test Rule',
        passed: errors.length === 0,
        errors: errors.map((e, i) => ({
          ruleId: `TEST-ERR-${i}`,
          ruleName: 'Test Error Rule',
          severity: e.severity ?? UnitValidationSeverity.ERROR,
          category: ValidationCategory.WEIGHT,
          message: e.message,
        })),
        warnings: warnings.map((w, i) => ({
          ruleId: `TEST-WARN-${i}`,
          ruleName: 'Test Warning Rule',
          severity: UnitValidationSeverity.WARNING,
          category: ValidationCategory.WEIGHT,
          message: w.message,
        })),
        infos: infos.map((info, i) => ({
          ruleId: `TEST-INFO-${i}`,
          ruleName: 'Test Info Rule',
          severity: UnitValidationSeverity.INFO,
          category: ValidationCategory.WEIGHT,
          message: info.message,
        })),
        executionTime: 1,
      },
    ],
    criticalErrorCount: errors.filter(
      (e) => e.severity === UnitValidationSeverity.CRITICAL_ERROR,
    ).length,
    errorCount: errors.filter(
      (e) => e.severity !== UnitValidationSeverity.CRITICAL_ERROR,
    ).length,
    warningCount: warnings.length,
    infoCount: infos.length,
    totalExecutionTime: 1,
    validatedAt: new Date().toISOString(),
    unitType: UnitType.BATTLEMECH,
    unitCategory: UnitCategory.MECH,
    truncated: false,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ValidationSummary', () => {
  describe('valid state', () => {
    it('should show Valid badge when no issues', () => {
      const validation = createValidationState({
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      });

      render(<ValidationSummary validation={validation} />);

      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error count badge', () => {
      const validation = createValidationState({
        status: 'error',
        isValid: false,
        errorCount: 3,
        result: createValidationResult([
          { message: 'Error 1' },
          { message: 'Error 2' },
          { message: 'Error 3' },
        ]),
      });

      render(<ValidationSummary validation={validation} />);

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should expand to show error details on click', () => {
      const validation = createValidationState({
        status: 'error',
        isValid: false,
        errorCount: 1,
        result: createValidationResult([{ message: 'Weight exceeds maximum' }]),
      });

      render(<ValidationSummary validation={validation} />);

      // Click to expand
      const badge = screen.getByRole('button');
      fireEvent.click(badge);

      // Should show the error message
      expect(screen.getByText('Weight exceeds maximum')).toBeInTheDocument();
      expect(screen.getByText('Validation Issues')).toBeInTheDocument();
    });
  });

  describe('warning state', () => {
    it('should show warning count badge', () => {
      const validation = createValidationState({
        status: 'warning',
        isValid: true,
        warningCount: 2,
        result: createValidationResult(
          [],
          [{ message: 'Warning 1' }, { message: 'Warning 2' }],
        ),
      });

      render(<ValidationSummary validation={validation} />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should expand to show warning details', () => {
      const validation = createValidationState({
        status: 'warning',
        isValid: true,
        warningCount: 1,
        result: createValidationResult(
          [],
          [{ message: 'Consider adding more armor' }],
        ),
      });

      render(<ValidationSummary validation={validation} />);

      fireEvent.click(screen.getByRole('button'));

      expect(
        screen.getByText('Consider adding more armor'),
      ).toBeInTheDocument();
    });
  });

  describe('info state', () => {
    it('should show info count badge', () => {
      const validation = createValidationState({
        status: 'info',
        isValid: true,
        infoCount: 1,
        result: createValidationResult(
          [],
          [],
          [{ message: 'Optional improvement available' }],
        ),
      });

      render(<ValidationSummary validation={validation} />);

      expect(screen.getByText('ℹ️')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('mixed issues', () => {
    it('should show all issue types', () => {
      const validation = createValidationState({
        status: 'error',
        isValid: false,
        errorCount: 1,
        warningCount: 2,
        infoCount: 1,
        result: createValidationResult(
          [{ message: 'Critical error' }],
          [{ message: 'Warning 1' }, { message: 'Warning 2' }],
          [{ message: 'Info message' }],
        ),
      });

      render(<ValidationSummary validation={validation} />);

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('ℹ️')).toBeInTheDocument();
    });

    it('should sort by severity (errors first)', () => {
      const validation = createValidationState({
        status: 'error',
        isValid: false,
        errorCount: 1,
        warningCount: 1,
        result: createValidationResult(
          [{ message: 'This is an error' }],
          [{ message: 'This is a warning' }],
        ),
      });

      render(<ValidationSummary validation={validation} />);
      fireEvent.click(screen.getByRole('button'));

      // Error should appear before warning in the list
      const errorElement = screen.getByText('This is an error');
      const warningElement = screen.getByText('This is a warning');

      expect(
        errorElement.compareDocumentPosition(warningElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should call onNavigate when clicking an error', () => {
      const onNavigate = jest.fn();
      const validation = createValidationState({
        status: 'error',
        isValid: false,
        errorCount: 1,
        result: createValidationResult([{ message: 'Test error' }]),
      });

      render(
        <ValidationSummary validation={validation} onNavigate={onNavigate} />,
      );

      // Expand
      fireEvent.click(screen.getByRole('button'));

      // Click on error item
      const errorButton = screen.getByText('Test error').closest('button');
      if (errorButton) {
        fireEvent.click(errorButton);
      }

      expect(onNavigate).toHaveBeenCalled();
    });
  });

  describe('maxItems limit', () => {
    it('should respect maxItems prop', () => {
      const validation = createValidationState({
        status: 'error',
        isValid: false,
        errorCount: 5,
        result: createValidationResult([
          { message: 'Error 1' },
          { message: 'Error 2' },
          { message: 'Error 3' },
          { message: 'Error 4' },
          { message: 'Error 5' },
        ]),
      });

      render(<ValidationSummary validation={validation} maxItems={3} />);
      fireEvent.click(screen.getByRole('button'));

      // Should show "more issues" message
      expect(screen.getByText(/\+2 more issue/)).toBeInTheDocument();
    });
  });
});
