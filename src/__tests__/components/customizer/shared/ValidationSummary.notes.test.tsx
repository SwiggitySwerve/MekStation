import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { BUILD_STATUS_KIND_TEXT_CLASS } from '@/components/customizer/shared/BuildStatusLabel';
import { getHeatNote } from '@/components/customizer/shared/unitStatStatus';
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

describe('ValidationSummary readout warnings', () => {
  it('derives the heat note only when running hot, in plain language', () => {
    expect(getHeatNote(22, 22)).toBeNull();
    expect(heatNote).toMatchObject({
      label: 'Runs hot',
      amount: '+11',
      heading: 'Runs 11 heat over dissipation',
      message: 'Heat 33 at full fire vs 22 dissipation: 11 over.',
      suggestion:
        'Legal; add heat sinks in Structure to run cool, or fire fewer weapons each turn.',
      tabId: 'structure',
    });
  });

  it('reads as the warning itself, not as "Valid", and links it to the tab that addresses it', () => {
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
      name: 'Atlas: Legal · Runs hot +11, show issues',
    });
    expect(trigger).toHaveTextContent(/^Runs hot\s*\+11$/);
    expect(trigger).not.toHaveTextContent('Valid');
    expect(trigger).toHaveAttribute('data-build-status', 'warning');
    expect(trigger.querySelector('[data-severity-icon="warning"]')).toHaveClass(
      BUILD_STATUS_KIND_TEXT_CLASS.warning,
    );
    expect(trigger.querySelector('[data-icon-name="check"]')).toBeNull();
    fireEvent.click(trigger);
    // A legal build says so in its heading instead of a green line above a
    // warning row.
    const dialog = screen.getByRole('dialog', {
      name: /Atlas.*Build status.*Legal · Runs hot \+11/,
    });
    expect(dialog).not.toHaveTextContent('All construction rules pass');
    const heading = screen.getByRole('heading', {
      name: 'Warning: Runs 11 heat over dissipation',
    });
    const note = heading.closest('[data-validation-note]')!;
    expect(note).toHaveTextContent(heatNote.message);
    expect(note).toHaveTextContent('Legal; add heat sinks');
    const fix = screen.getByRole('button', { name: /Go to Structure/ });
    expect(fix).toHaveFocus();
    fireEvent.click(fix);
    expect(onNavigate).toHaveBeenCalledWith('structure');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is one button led by the worst severity, listing running hot with the warnings', () => {
    render(
      <ValidationSummary
        validation={withOneError()}
        unitName="Atlas"
        notes={[heatNote]}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    const status = screen.getByRole('button', {
      name: 'Atlas: Not legal · 1 error · 1 warning (Runs hot +11), show issues',
    });
    // Every group is counted, worst first, in the shared wording.
    expect(status).toHaveTextContent(/^1 error\s*·\s*1 warning$/);
    expect(status).toHaveAttribute('data-build-status', 'error');
    fireEvent.click(status);
    const dialog = screen.getByRole('dialog', {
      name: /Atlas.*Build status.*Not legal · 1 error · 1 warning/,
    });
    // Each group heading says what the group means.
    expect(
      Array.from(dialog.querySelectorAll('h4')).map((h) => h.textContent),
    ).toEqual([
      'Errors \u2014 the unit is not legal until fixed',
      'Warnings \u2014 legal, but likely a mistake',
    ]);
    expect(dialog).toHaveTextContent('Overweight');
    expect(dialog).toHaveTextContent(heatNote.message);
  });

  it('shows every group as shape and count on phone and lists them in its panel', () => {
    render(
      <ValidationSummary
        validation={withOneError()}
        unitName="Atlas"
        compact
        notes={[heatNote]}
      />,
    );
    const error = screen.getByRole('button', {
      name: 'Atlas: Not legal · 1 error · 1 warning (Runs hot +11), show issues',
    });
    // Phones show each group with its severity shape and words on one line.
    expect(error).toHaveTextContent(/^1 error\s*\u00b7\s*1 warning$/);
    expect(
      error.querySelector('[data-build-status-part="error"]'),
    ).toHaveTextContent('1 error');
    expect(
      error.querySelector(
        '[data-build-status-part="warning"] [data-severity-icon="warning"]',
      ),
    ).toHaveClass(BUILD_STATUS_KIND_TEXT_CLASS.warning);
    expect(error).toHaveAttribute('title', '1 error · 1 warning');
    expect(error.querySelector('[data-severity-icon="error"]')).toHaveClass(
      BUILD_STATUS_KIND_TEXT_CLASS.error,
    );
    fireEvent.click(error);
    const dialog = screen.getByRole('dialog', { name: /Atlas.*Not legal/ });
    expect(dialog).toHaveTextContent('Overweight');
    expect(dialog).toHaveTextContent(heatNote.message);
  });

  describe('on a desktop workbench', () => {
    const box = (left: number, top: number, width: number, height: number) =>
      ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    let rect: jest.SpyInstance;

    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1440,
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: 900,
      });
      rect = jest
        .spyOn(Element.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: Element) {
          if (this.matches('aside[aria-label="Unit loadout"]'))
            return box(1200, 153, 240, 747);
          if (this.matches('[data-testid="customizer-workspace"]'))
            return box(0, 153, 1200, 747);
          return box(1100, 108, 160, 44);
        });
    });

    afterEach(() => {
      rect.mockRestore();
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalWidth,
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: originalHeight,
      });
    });

    it('opens a drawer over the loadout rail that leaves the tab content undimmed, and Escape returns focus', () => {
      render(
        <div>
          <div data-testid="customizer-workspace" />
          <aside aria-label="Unit loadout" />
          <ValidationSummary
            validation={withOneError()}
            unitName="Atlas"
            notes={[heatNote]}
          />
        </div>,
      );
      const trigger = screen.getByRole('button', { name: /show issues$/ });
      fireEvent.click(trigger);
      const dialog = screen.getByRole('dialog', { name: /Atlas.*Not legal/ });
      expect(dialog).toHaveAttribute('data-panel-layout', 'drawer');
      expect(dialog).toHaveStyle({
        left: '1200px',
        top: '153px',
        width: '240px',
        height: '747px',
      });
      expect(
        document.querySelector('[data-validation-scrim]'),
      ).not.toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('closes from its close button and returns focus to the status button', () => {
      render(
        <div>
          <aside aria-label="Unit loadout" />
          <ValidationSummary validation={withOneError()} unitName="Atlas" />
        </div>,
      );
      const trigger = screen.getByRole('button', { name: /show issues$/ });
      fireEvent.click(trigger);
      fireEvent.click(
        screen.getByRole('button', { name: 'Close validation issues' }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('spells out all three groups on phone', () => {
    render(
      <ValidationSummary
        validation={{ ...withOneError(), warningCount: 2, infoCount: 3 }}
        unitName="Atlas"
        compact
      />,
    );
    const button = screen.getByRole('button', { name: /show issues$/ });
    expect(button).toHaveTextContent(
      /^1 error\s*\u00b7\s*2 warnings\s*\u00b7\s*3 notes$/,
    );
    expect(button).toHaveAccessibleName(
      /Not legal \u00b7 1 error \u00b7 2 warnings \u00b7 3 notes/,
    );
  });

  it('keeps the same running-hot wording on phone and shows details in the panel', () => {
    render(
      <ValidationSummary
        validation={valid}
        unitName="Atlas"
        compact
        notes={[heatNote]}
        details={<span>Draft saved in this browser</span>}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: /Runs hot \+11, show issues/,
    });
    expect(trigger).toHaveTextContent(/Runs hot\s*\+11/);
    expect(trigger).not.toHaveTextContent('warning');
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
        details={<span>Not in library</span>}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Atlas: Legal · Ready, show checks',
    });
    expect(trigger).toHaveTextContent('Ready');
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveTextContent('Not in library');
  });

  describe('panel presentation', () => {
    const originalWidth = window.innerWidth;
    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalWidth,
      });
    });

    it('dims the workspace behind the open panel; pressing the scrim closes it', () => {
      render(
        <ValidationSummary
          validation={withOneError()}
          unitName="Atlas"
          notes={[heatNote]}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /show issues/ }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-panel-layout', 'popover');
      const scrim = document.querySelector('[data-validation-scrim]');
      expect(scrim).toHaveAttribute('aria-hidden', 'true');
      fireEvent.pointerDown(scrim!);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.querySelector('[data-validation-scrim]')).toBeNull();
    });

    it('opens as a scrolling bottom sheet on phones', () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 390,
      });
      render(
        <ValidationSummary
          validation={withOneError()}
          unitName="Atlas"
          compact
          notes={[heatNote]}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /show issues/ }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-panel-layout', 'sheet');
      expect(dialog).toHaveClass('inset-x-0', 'bottom-0', 'max-h-[80dvh]');
      expect(dialog.querySelector('.overflow-y-auto')).not.toBeNull();
      expect(document.querySelector('[data-validation-scrim]')).not.toBeNull();
    });
  });
});
