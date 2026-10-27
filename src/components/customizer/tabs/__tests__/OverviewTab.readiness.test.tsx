import { render, screen } from '@testing-library/react';

import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  getReadinessRows,
  getReadinessStatus,
  type ReadinessInput,
} from '../overview/buildReadiness';
import { BuildReadinessList } from '../overview/BuildReadinessList';
import { getTonnageBreakdown } from '../overview/tonnageBreakdown';

const balanced: ReadinessInput = {
  tonnage: 100,
  weightUsed: 96,
  weightRemaining: 4,
  criticalSlotsUsed: 62,
  criticalSlotsTotal: 78,
  armorPoints: 304,
  maxArmorPoints: 307,
  heatGenerated: 20,
  heatDissipation: 20,
  equipmentCount: 18,
  unplacedInstanceIds: [],
};

function issue(
  category: ValidationCategory,
  severity: UnitValidationSeverity,
  message: string,
  field?: string,
): IUnitValidationError {
  return { ruleId: 'r', ruleName: 'r', category, severity, message, field };
}

function resultOf(
  errors: IUnitValidationError[],
  warnings: IUnitValidationError[] = [],
): UnitValidationState['result'] {
  return {
    results: [
      {
        ruleId: 'r',
        ruleName: 'r',
        passed: errors.length === 0,
        errors,
        warnings,
        infos: [],
        executionTime: 0,
      },
    ],
  } as unknown as UnitValidationState['result'];
}

function byId(rows: ReturnType<typeof getReadinessRows>) {
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

const unplacedResult = resultOf([
  issue(
    ValidationCategory.SLOTS,
    UnitValidationSeverity.ERROR,
    'PPC needs a location.',
    'criticalSlots.ppc-1',
  ),
]);

describe('Overview build readiness', () => {
  it('orders errors before warnings and passing rows on every readiness list', () => {
    const rows = getReadinessRows(
      {
        ...balanced,
        weightUsed: 107,
        weightRemaining: -7,
        heatGenerated: 33,
        unplacedInstanceIds: ['ppc-1'],
        unplacedItemNames: ['ER PPC'],
      },
      unplacedResult,
    );
    expect(rows.map(({ id }) => id)).toEqual([
      'weight',
      'unplaced',
      'heat',
      'slots',
      'armor',
    ]);
    expect(rows.map(({ severity }) => severity)).toEqual([
      'error',
      'error',
      'warning',
      'ok',
      'ok',
    ]);
  });

  it('keeps compact issue actions with their text and preserves full reasons', () => {
    const rows = getReadinessRows(
      { ...balanced, weightUsed: 107, weightRemaining: -7 },
      null,
    );
    const onNavigate = jest.fn();
    render(
      <BuildReadinessList
        rows={rows.filter(({ severity }) => severity !== 'ok')}
        status={getReadinessStatus(
          { errorCount: 1, warningCount: 0, infoCount: 0 },
          20,
          20,
        )}
        compact
        onNavigate={onNavigate}
      />,
    );
    const row = screen.getByTestId('overview-readiness-weight');
    expect(row).toHaveClass('flex');
    expect(
      screen.getByText(
        '7.0 t over the 100.0 t limit. Remove equipment or armor.',
      ),
    ).toHaveAttribute(
      'title',
      '7.0 t over the 100.0 t limit. Remove equipment or armor.',
    );
    const action = screen.getByRole('button', {
      name: 'Weight: go to Equipment',
    });
    expect(action).toHaveTextContent('Go to Equipment');
    expect(action).toHaveClass('min-h-11');
    action.click();
    expect(onNavigate).toHaveBeenCalledWith('equipment');
  });

  it('passes every row for a balanced build', () => {
    const rows = byId(getReadinessRows(balanced, null));
    expect(Object.values(rows).map((row) => row.status)).toEqual([
      'normal',
      'normal',
      'normal',
      'normal',
      'normal',
    ]);
    expect(Object.values(rows).every((row) => row.severity === 'ok')).toBe(
      true,
    );
    expect(rows.weight.sentence).toBe('4.0 t free of 100.0 t.');
    expect(rows.armor.sentence).toBe(
      '304 of 307 armor points allocated (99%).',
    );
    expect(rows.unplaced.sentence).toBe(
      'All 18 items placed in critical slots.',
    );
  });

  it('counts placed slots and leaves the error to the unplaced row', () => {
    const rows = byId(
      getReadinessRows(
        {
          ...balanced,
          criticalSlotsUsed: 69,
          criticalSlotsPlaced: 66,
          criticalSlotsPending: 3,
          unplacedInstanceIds: ['ppc-1'],
          unplacedItemNames: ['PPC'],
        },
        unplacedResult,
      ),
    );
    // The Slots row explains placement without repeating the error.
    expect(rows.slots.sentence).toBe(
      '66 of 78 slots filled · PPC (3 slots) not placed.',
    );
    expect(rows.slots.status).toBe('normal');
    expect(rows.slots.severity).toBe('ok');
    expect(rows.slots.pending).toBe(true);
    expect(rows.unplaced.severity).toBe('error');
    expect(rows.unplaced.sentence).toBe(
      'PPC (3 slots) not placed — not legal until placed.',
    );
  });

  it('shows the placement error and heat warning once each', () => {
    const input = {
      ...balanced,
      criticalSlotsUsed: 69,
      criticalSlotsPlaced: 66,
      criticalSlotsPending: 3,
      unplacedInstanceIds: ['ppc-1'],
      unplacedItemNames: ['PPC'],
      heatGenerated: 31,
    };
    const rows = getReadinessRows(input, unplacedResult);
    const status = getReadinessStatus(
      { errorCount: 1, warningCount: 0, infoCount: 0 },
      input.heatGenerated,
      input.heatDissipation,
    );
    expect(status.legal).toBe(false);
    expect(
      rows.filter((row) => row.severity === 'error').map((row) => row.id),
    ).toEqual(['unplaced']);
    const warningRows = rows.filter((row) => row.severity === 'warning');
    expect(warningRows.map((row) => row.id)).toEqual(['heat']);
    expect(status.parts.find((part) => part.kind === 'warning')?.count).toBe(
      warningRows.length,
    );
  });

  it('names several unplaced items without repeating the slot warning', () => {
    const rows = byId(
      getReadinessRows(
        {
          ...balanced,
          criticalSlotsUsed: 71,
          criticalSlotsPlaced: 66,
          criticalSlotsPending: 5,
          unplacedInstanceIds: ['a', 'b'],
          unplacedItemNames: ['PPC', 'Medium Laser'],
        },
        null,
      ),
    );
    expect(rows.unplaced.sentence).toBe(
      'PPC and Medium Laser (5 slots) not placed — not legal until placed.',
    );
  });

  it('says how many slots are free when nothing is unplaced', () => {
    const rows = byId(getReadinessRows(balanced, null));
    expect(rows.slots.sentence).toBe('62 of 78 slots filled, 16 free.');
    expect(rows.slots.severity).toBe('ok');
    expect(rows.slots.pending).toBe(false);
  });

  it('uses a neutral pending icon until placement completes without adding warnings', () => {
    const input = {
      ...balanced,
      criticalSlotsUsed: 69,
      criticalSlotsPlaced: 66,
      criticalSlotsPending: 3,
      unplacedInstanceIds: ['ppc-1'],
    };
    const view = render(
      <BuildReadinessList
        rows={getReadinessRows(input, unplacedResult)}
        status={getReadinessStatus(
          { errorCount: 1, warningCount: 0, infoCount: 0 },
          20,
          20,
        )}
      />,
    );
    const slots = screen.getByTestId('overview-readiness-slots');
    expect(slots).toHaveTextContent('Pending:');
    expect(screen.getByRole('img', { name: 'Pending' })).toBeInTheDocument();
    expect(slots.querySelector('[data-readiness-icon="pending"]')).toHaveClass(
      'text-text-theme-muted',
    );
    expect(slots.querySelector('.text-green-400')).toBeNull();
    expect(
      view.container.querySelectorAll('li[data-severity="error"]'),
    ).toHaveLength(1);
    expect(screen.getByTestId('overview-readiness-summary')).toHaveTextContent(
      '1 error',
    );

    view.rerender(
      <BuildReadinessList
        rows={getReadinessRows(balanced, null)}
        status={getReadinessStatus(
          { errorCount: 0, warningCount: 0, infoCount: 0 },
          20,
          20,
        )}
      />,
    );
    expect(slots).toHaveTextContent('OK:');
    expect(slots.querySelector('[data-readiness-icon="pending"]')).toBeNull();
    expect(slots.querySelector('.text-green-400')).not.toBeNull();
  });

  it('keeps an over-capacity slot row an error even with unplaced items', () => {
    const rows = byId(
      getReadinessRows(
        {
          ...balanced,
          criticalSlotsUsed: 80,
          criticalSlotsPlaced: 77,
          criticalSlotsPending: 3,
          unplacedInstanceIds: ['ppc-1'],
        },
        null,
      ),
    );
    expect(rows.slots.status).toBe('error');
    expect(rows.slots.sentence).toBe('2 slots over capacity (80 of 78).');
  });

  it('uses the shared readout thresholds for weight, slots, armor and heat', () => {
    const rows = byId(
      getReadinessRows(
        {
          ...balanced,
          weightUsed: 107,
          weightRemaining: -7,
          criticalSlotsUsed: 80,
          heatGenerated: 31,
        },
        null,
      ),
    );
    expect(rows.weight.status).toBe('error');
    expect(rows.weight.sentence).toBe(
      '7.0 t over the 100.0 t limit. Remove equipment or armor.',
    );
    expect(rows.slots.status).toBe('error');
    expect(rows.heat.status).toBe('warning');
    // Same severities as the status panel: over a cap is an error, running
    // hot is a legal warning.
    expect(rows.weight.severity).toBe('error');
    expect(rows.slots.severity).toBe('error');
    expect(rows.heat.severity).toBe('warning');
    // The Heat readout shows the numbers; the row only says what to do.
    expect(rows.heat.sentence).not.toMatch(/\d/);
    expect(rows.heat.sentence).toMatch(/add heat sinks/i);
  });

  it('raises a row for rule results in its category and shows the message once', () => {
    const rows = byId(
      getReadinessRows(
        balanced,
        resultOf([
          issue(
            ValidationCategory.ARMOR,
            UnitValidationSeverity.ERROR,
            'Head armor exceeds 9 points',
          ),
        ]),
      ),
    );
    expect(rows.armor.status).toBe('error');
    expect(rows.armor.detail).toBe('Head armor exceeds 9 points');
    expect(rows.armor.severity).toBe('error');
    expect(rows.armor.detailSeverity).toBe('error');
    expect(rows.weight.status).toBe('normal');
  });

  it('routes slot results about unplaced items to the unplaced row', () => {
    const rows = byId(
      getReadinessRows(
        { ...balanced, unplacedInstanceIds: ['ppc-1'] },
        resultOf([
          issue(
            ValidationCategory.SLOTS,
            UnitValidationSeverity.ERROR,
            'ER PPC needs a location.',
            'criticalSlots.ppc-1',
          ),
        ]),
      ),
    );
    expect(rows.slots.status).toBe('normal');
    expect(rows.slots.detail).toBeUndefined();
    expect(rows.unplaced.status).toBe('error');
    expect(rows.unplaced.severity).toBe('error');
    expect(rows.unplaced.sentence).toBe(
      '1 item not placed — not legal until placed.',
    );
  });
});

describe('Overview tonnage breakdown', () => {
  it('keeps non-zero segments and reports overweight tonnage', () => {
    const breakdown = getTonnageBreakdown(
      {
        structureWeight: 10,
        engineWeight: 19,
        gyroWeight: 3,
        cockpitWeight: 3,
        heatSinkWeight: 0,
        jumpJetWeight: 0,
        armorWeight: 19,
      },
      53,
      { used: 107, max: 100, remaining: -7 },
    );
    expect(breakdown.segments.map((segment) => segment.id)).toEqual([
      'structure',
      'engine',
      'gyro',
      'cockpit',
      'armor',
      'equipment',
    ]);
    expect(breakdown.free).toBe(0);
    expect(breakdown.over).toBe(7);
  });
});
