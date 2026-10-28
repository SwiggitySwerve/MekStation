/**
 * Tab badge issue titles
 *
 * Names the issues behind each section tab's badge count, so the badge can
 * say what it counts ("1 warning: Runs Hot") without opening the status
 * panel. Titles come from the same rule results and readout notes the status
 * panel lists, on the same tab (`getPrimaryFixTab` for rule results, the
 * note's own tab for readout notes); nothing is re-derived here.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import type { UnitValidationState } from '@/hooks/useUnitValidation';

import {
  getPrimaryFixTab,
  type TabValidationCounts,
} from '@/utils/validation/validationNavigation';

import type { IssueTarget } from './tabIssueTargets';

import {
  buildStatusCountText,
  type ValidationNote,
} from './buildStatusSummary';
import { describeIssue, flattenErrors } from './ValidationSummaryRows';

/** Issue titles behind one tab's badge counts, worst severity first. */
export interface TabIssueTitles {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  /**
   * The fix for the tab's only issue ("add heat sinks in Cooling"), from the
   * note's action or the rule's own suggestion. Absent when the tab has
   * several issues, because one fix would not describe them.
   */
  readonly hint?: string;
  /** Section the single issue's fix points at, when its note names one. */
  readonly hintTarget?: IssueTarget;
}

export type TabIssueTitlesByTab = Partial<Record<string, TabIssueTitles>>;

/**
 * Titles for every tab that has an error or warning, matching the counts
 * `countValidationIssuesByTab` and `addStatusNotesToTabCounts` put on the
 * badges. Info-level results are not badged and so are not listed.
 */
export function getTabIssueTitles(
  result: UnitValidationState['result'],
  notes: readonly ValidationNote[],
): TabIssueTitlesByTab {
  const byTab: Record<
    string,
    {
      errors: string[];
      warnings: string[];
      hints: (string | undefined)[];
      targets: (IssueTarget | undefined)[];
    }
  > = {};
  const slot = (tabId: string) =>
    (byTab[tabId] ??= { errors: [], warnings: [], hints: [], targets: [] });
  for (const issue of flattenErrors(result)) {
    if (issue.severity === 'info') continue;
    const tab = slot(getPrimaryFixTab(issue.error.category));
    const title = describeIssue(issue.error).heading;
    (issue.severity === 'error' ? tab.errors : tab.warnings).push(title);
    tab.hints.push(cleanHint(issue.error.suggestion));
    tab.targets.push(undefined);
  }
  for (const note of notes) {
    const tab = slot(note.tabId);
    tab.warnings.push(note.label);
    tab.hints.push(cleanHint(note.action));
    tab.targets.push(note.actionTarget);
  }
  return Object.fromEntries(
    Object.entries(byTab).map(
      ([tabId, { errors, warnings, hints, targets }]) => [
        tabId,
        {
          errors,
          warnings,
          ...(hints.length === 1 && hints[0] ? { hint: hints[0] } : {}),
          ...(hints.length === 1 && hints[0] && targets[0]
            ? { hintTarget: targets[0] }
            : {}),
        },
      ],
    ),
  );
}

/** A fix phrase without its closing period, or undefined when empty. */
function cleanHint(text: string | undefined): string | undefined {
  const hint = text?.trim().replace(/\.$/, '');
  return hint ? hint : undefined;
}

/** Most titles a tooltip lists before it summarizes the rest. */
const MAX_LISTED_TITLES = 4;

/** "Runs Hot", "A; B; C; D; +2 more": one line of titles for a severity. */
function listTitles(titles: readonly string[]): string {
  if (titles.length <= MAX_LISTED_TITLES) return titles.join('; ');
  const listed = titles.slice(0, MAX_LISTED_TITLES).join('; ');
  return `${listed}; +${titles.length - MAX_LISTED_TITLES} more`;
}

/**
 * Tooltip lines for a tab's badge, one per severity present, e.g.
 * "1 warning: Runs Hot". The count words come from the badge's own counts so
 * the tooltip never disagrees with the number it explains.
 */
export function describeTabIssues(
  counts: TabValidationCounts | undefined,
  titles: TabIssueTitles | undefined,
): string[] {
  if (!counts || !titles) return [];
  const lines: string[] = [];
  if (counts.errors > 0 && titles.errors.length > 0)
    lines.push(
      `${buildStatusCountText('error', counts.errors)}: ${listTitles(titles.errors)}`,
    );
  if (counts.warnings > 0 && titles.warnings.length > 0)
    lines.push(
      `${buildStatusCountText('warning', counts.warnings)}: ${listTitles(titles.warnings)}`,
    );
  return lines;
}

/** What the notice above a tab's content says about that tab's issues. */
export interface TabIssueNotice {
  /** Worst severity on the tab, for the icon. */
  readonly severity: 'error' | 'warning';
  /** "1 warning: Runs Hot", one phrase per severity present. */
  readonly summary: string;
  /** The fix in a few words, when the tab has exactly one issue. */
  readonly hint?: string;
  /** Words in `hint` that link to the section holding the fix. */
  readonly hintTarget?: IssueTarget;
}

/**
 * The one-line notice for a tab with badge issues, or null when it has none.
 * Words come from `describeTabIssues`, so the notice, the badge and its
 * tooltip always agree.
 */
export function getTabIssueNotice(
  counts: TabValidationCounts | undefined,
  titles: TabIssueTitles | undefined,
): TabIssueNotice | null {
  const lines = describeTabIssues(counts, titles);
  if (!counts || lines.length === 0) return null;
  return {
    severity: counts.errors > 0 ? 'error' : 'warning',
    summary: lines.join(' \u00b7 '),
    hint: titles?.hint,
    hintTarget: titles?.hintTarget,
  };
}
