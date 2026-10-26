import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  getReadinessRows,
  type ReadinessInput,
} from '../overview/buildReadiness';
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

describe('Overview build readiness', () => {
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
    // hot is a legal note.
    expect(rows.weight.severity).toBe('error');
    expect(rows.slots.severity).toBe('error');
    expect(rows.heat.severity).toBe('note');
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
        resultOf(
          [],
          [
            issue(
              ValidationCategory.SLOTS,
              UnitValidationSeverity.WARNING,
              'ER PPC needs a location.',
              'criticalSlots.ppc-1',
            ),
          ],
        ),
      ),
    );
    expect(rows.slots.status).toBe('normal');
    expect(rows.slots.detail).toBeUndefined();
    expect(rows.unplaced.status).toBe('warning');
    // The panel lists unplaced equipment as a warning; so does the row.
    expect(rows.unplaced.severity).toBe('warning');
    expect(rows.unplaced.sentence).toBe(
      '1 of 18 items still needs a critical slot.',
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
