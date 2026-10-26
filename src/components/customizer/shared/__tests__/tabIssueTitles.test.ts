import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { countValidationIssuesByTab } from '@/utils/validation/validationNavigation';

import { describeTabIssues, getTabIssueTitles } from '../tabIssueTitles';
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
    expect(titles.structure).toEqual({ errors: [], warnings: ['Runs hot'] });
    expect(
      describeTabIssues({ errors: 0, warnings: 1, infos: 0 }, titles.structure),
    ).toEqual(['1 warning: Runs hot']);
  });

  it('lists rule results on the tab that counts them', () => {
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
          ValidationCategory.SLOTS,
          UnitValidationSeverity.WARNING,
          'PPC needs a location.',
        ),
      ],
    );
    const titles = getTabIssueTitles(result, []);
    expect(titles.armor?.errors).toEqual(['Head armor exceeds 9 points']);
    expect(titles.criticals?.warnings).toEqual(['PPC needs a location']);
    // Same tabs and totals as the badge counts these titles explain.
    const counts = countValidationIssuesByTab(result);
    expect(counts.armor.errors).toBe(1);
    expect(counts.criticals.warnings).toBe(1);
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

  it('lists nothing for a tab without issues', () => {
    expect(getTabIssueTitles(null, [])).toEqual({});
    expect(describeTabIssues(undefined, undefined)).toEqual([]);
  });
});
