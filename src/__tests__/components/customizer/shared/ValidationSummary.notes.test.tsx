import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  CAUTION_TEXT_CLASS,
  getHeatNote,
} from '@/components/customizer/shared/unitStatStatus';
import { ValidationSummary } from '@/components/customizer/shared/ValidationSummary';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationResult,
  UnitCategory,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

const valid: UnitValidationState = {
  status: 'valid',
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  isValid: true,
  hasCriticalErrors: false,
  result: null,
  isLoading: false,
  isValidating: false,
};

const heatNote = getHeatNote(33, 22)!;

function withOneError(): UnitValidationState {
  const result: IUnitValidationResult = {
    isValid: false,
    hasCriticalErrors: false,
    results: [
      {
        ruleId: 'weight',
        ruleName: 'Weight',
        passed: false,
        errors: [
          {
            ruleId: 'weight',
            ruleName: 'Weight',
            severity: UnitValidationSeverity.ERROR,
            category: ValidationCategory.WEIGHT,
            message: 'Overweight',
          },
        ],
        warnings: [],
        infos: [],
        executionTime: 0,
      },
    ],
    criticalErrorCount: 0,
    errorCount: 1,
    warningCount: 0,
    infoCount: 0,
    totalExecutionTime: 0,
    validatedAt: new Date().toISOString(),
    unitType: UnitType.BATTLEMECH,
    unitCategory: UnitCategory.MECH,
    truncated: false,
  };
  return { ...valid, isValid: false, status: 'error', errorCount: 1, result };
}

describe('ValidationSummary notes', () => {
  it('derives the heat note only when running hot, in plain language', () => {
    expect(getHeatNote(22, 22)).toBeNull();
    expect(heatNote).toMatchObject({
      label: 'Runs hot',
      amount: '+11',
      message: 'Heat 33 at full fire vs 22 dissipation: 11 over.',
      suggestion:
        'Legal; add heat sinks in Structure to run cool, or fire fewer weapons each turn.',
      tabId: 'structure',
    });
  });

  it('reads as the caution itself, not as "Valid", and links it to the tab that addresses it', () => {
    const onNavigate = jest.fn();
    render(
      <ValidationSummary
        validation={valid}
        unitName="Atlas"
        notes={[heatNote]}
        onNavigate={onNavigate}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Atlas: no rule issues, 1 caution (Runs hot +11), show checks',
    });
    expect(trigger).toHaveTextContent(/^Runs hot\s*\+11$/);
    expect(trigger).not.toHaveTextContent('Valid');
    expect(trigger.querySelector('[data-icon-name="warning"]')).toHaveClass(
      CAUTION_TEXT_CLASS,
    );
    expect(trigger.querySelector('[data-icon-name="check"]')).toBeNull();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: /Atlas.*Checks/ });
    expect(dialog).toHaveTextContent('All construction rules pass.');
    const note = screen.getByText(heatNote.message).closest('button')!;
    expect(note).toHaveFocus();
    expect(note).toHaveTextContent('Legal; add heat sinks');
    expect(note).toHaveTextContent('Go to Structure');
    fireEvent.click(note);
    expect(onNavigate).toHaveBeenCalledWith('structure');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leads with the worst severity in one control and keeps notes out of the counts', () => {
    render(
      <ValidationSummary
        validation={withOneError()}
        unitName="Atlas"
        notes={[heatNote]}
      />,
    );
    const error = screen.getByRole('button', {
      name: 'Atlas: 1 error, show issues',
    });
    expect(error).toHaveTextContent('1 error');
    expect(error.parentElement).toHaveAttribute('data-build-status', 'error');
    expect(
      screen.queryByRole('button', { name: /warnings?, show issues/ }),
    ).not.toBeInTheDocument();
    const caution = screen.getByRole('button', {
      name: 'Atlas: 1 caution (Runs hot +11), show cautions',
    });
    expect(caution.parentElement).toBe(error.parentElement);
    fireEvent.click(caution);
    const dialog = screen.getByRole('dialog', { name: /Atlas.*Cautions/ });
    expect(dialog).toHaveTextContent(heatNote.message);
    expect(dialog).not.toHaveTextContent('All construction rules pass.');
    expect(dialog).not.toHaveTextContent('Overweight');
  });

  it('folds cautions into the issue lists on phone instead of a separate part', () => {
    render(
      <ValidationSummary
        validation={withOneError()}
        unitName="Atlas"
        compact
        notes={[heatNote]}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /show cautions/ }),
    ).not.toBeInTheDocument();
    const error = screen.getByRole('button', {
      name: 'Atlas: 1 error, show issues',
    });
    expect(error).toHaveTextContent('1 error');
    fireEvent.click(error);
    const dialog = screen.getByRole('dialog', { name: /Atlas.*Errors/ });
    expect(dialog).toHaveTextContent('Overweight');
    expect(dialog).toHaveTextContent(heatNote.message);
  });

  it('keeps the same caution wording on phone and shows details in the panel', () => {
    render(
      <ValidationSummary
        validation={valid}
        unitName="Atlas"
        compact
        notes={[heatNote]}
        details={<span>Draft saved in this browser</span>}
      />,
    );
    const trigger = screen.getByRole('button', { name: /show checks/ });
    expect(trigger).toHaveTextContent(/Runs hot\s*\+11/);
    expect(trigger).not.toHaveTextContent('note');
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Draft saved in this browser',
    );
  });

  it('reads "Ready" with a green check and neutral text when there is nothing to list', () => {
    render(<ValidationSummary validation={valid} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/^Ready$/);
    expect(status).toHaveClass('text-text-theme-primary');
    expect(status.querySelector('[data-icon-name="check"]')).toHaveClass(
      'text-green-400',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the checks panel from "Ready" when the panel has details to show', () => {
    render(
      <ValidationSummary
        validation={valid}
        unitName="Atlas"
        compact
        details={<span>Not saved to library</span>}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Atlas: ready, show checks',
    });
    expect(trigger).toHaveTextContent('Ready');
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Not saved to library',
    );
  });
});
