import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { countValidationIssuesByTab } from '@/utils/validation/validationNavigation';

import { COOLING_CARD_ID } from '../tabIssueTargets';
import {
  describeTabIssues,
  getTabIssueNotice,
  getTabIssueTitles,
} from '../tabIssueTitles';
import { getStatusNotes } from '../unitStatStatus';

function issue(
  category: ValidationCategory,
  severity: UnitValidationSeverity,
  message: string,
): IUnitValidationError {
  return { ruleId: 'r', ruleName: 'r', category, severity, message };
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

describe('getTabIssueTitles', () => {
  it('names a readout note on its tab', () => {
    const notes = getStatusNotes(33, 22);
    const titles = getTabIssueTitles(null, notes);
    // The note carries its fix, so the tab's one issue names it.
    expect(titles.structure).toEqual({
      errors: [],
      warnings: ['Runs hot'],
      hint: 'add heat sinks in Cooling',
      // The note also names the card its fix lives in, so the notice can link.
      hintTarget: { text: 'Cooling', id: COOLING_CARD_ID },
    });
    expect(
      describeTabIssues({ errors: 0, warnings: 1, infos: 0 }, titles.structure),
    ).toEqual(['1 warning: Runs hot']);
  });

  it('lists rule results on the tab that counts them', () => {
    const result = resultOf([
      issue(
        ValidationCategory.ARMOR,
        UnitValidationSeverity.ERROR,
        'Head armor exceeds 9 points',
      ),
      issue(
        ValidationCategory.SLOTS,
        UnitValidationSeverity.ERROR,
        'PPC needs a location.',
      ),
    ]);
    const titles = getTabIssueTitles(result, []);
    expect(titles.armor?.errors).toEqual(['Head armor exceeds 9 points']);
    expect(titles.criticals?.errors).toEqual(['PPC needs a location']);
    // Same tabs and totals as the badge counts these titles explain.
    const counts = countValidationIssuesByTab(result);
    expect(counts.armor.errors).toBe(1);
    expect(counts.criticals.errors).toBe(1);
    expect(counts.criticals.warnings).toBe(0);
    expect(describeTabIssues(counts.armor, titles.armor)).toEqual([
      '1 error: Head armor exceeds 9 points',
    ]);
  });

  it('summarizes a long list instead of growing the tooltip', () => {
    const warnings = Array.from({ length: 6 }, (_, index) =>
      issue(
        ValidationCategory.ARMOR,
        UnitValidationSeverity.WARNING,
        `Armor note ${index + 1}`,
      ),
    );
    const result = resultOf([], warnings);
    const counts = countValidationIssuesByTab(result);
    const [line] = describeTabIssues(
      counts.armor,
      getTabIssueTitles(result, []).armor,
    );
    expect(line).toBe(
      '6 warnings: Armor note 1; Armor note 2; Armor note 3; Armor note 4; +2 more',
    );
  });

  it('words the notice from the badge counts, with the fix for a lone issue', () => {
    const titles = getTabIssueTitles(null, getStatusNotes(33, 22));
    const counts = { errors: 0, warnings: 1, infos: 0 };
    expect(getTabIssueNotice(counts, titles.structure)).toEqual({
      severity: 'warning',
      summary: '1 warning: Runs hot',
      hint: 'add heat sinks in Cooling',
      hintTarget: { text: 'Cooling', id: COOLING_CARD_ID },
    });
  });

  it('drops the fix when several issues share a tab and ranks errors first', () => {
    const result = resultOf(
      [
        issue(
          ValidationCategory.ARMOR,
          UnitValidationSeverity.ERROR,
          'Head armor exceeds 9 points',
        ),
      ],
      [
        issue(
          ValidationCategory.ARMOR,
          UnitValidationSeverity.WARNING,
          'Armor note',
        ),
      ],
    );
    const counts = countValidationIssuesByTab(result);
    const notice = getTabIssueNotice(
      counts.armor,
      getTabIssueTitles(result, []).armor,
    );
    expect(notice?.severity).toBe('error');
    expect(notice?.summary).toBe(
      '1 error: Head armor exceeds 9 points · 1 warning: Armor note',
    );
    expect(notice?.hint).toBeUndefined();
  });

  it('uses the rule suggestion as the fix, without its period', () => {
    const result = resultOf(
      [],
      [
        {
          ...issue(
            ValidationCategory.ARMOR,
            UnitValidationSeverity.WARNING,
            'Armor is low.',
          ),
          suggestion: 'Raise armor tonnage.',
        },
      ],
    );
    const titles = getTabIssueTitles(result, []);
    expect(titles.armor?.hint).toBe('Raise armor tonnage');
  });

  it('has no notice for a tab without issues', () => {
    expect(getTabIssueNotice(undefined, undefined)).toBeNull();
    expect(
      getTabIssueNotice({ errors: 0, warnings: 0, infos: 0 }, undefined),
    ).toBeNull();
  });

  it('lists nothing for a tab without issues', () => {
    expect(getTabIssueTitles(null, [])).toEqual({});
    expect(describeTabIssues(undefined, undefined)).toEqual([]);
  });
});
