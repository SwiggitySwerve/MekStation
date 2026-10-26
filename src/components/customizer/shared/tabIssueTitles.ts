/**
 * Tab badge issue titles
 *
 * Names the issues behind each section tab's badge count, so the badge can
 * say what it counts ("1 warning: Runs hot") without opening the status
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

import {
  buildStatusCountText,
  type ValidationNote,
} from './buildStatusSummary';
import { describeIssue, flattenErrors } from './ValidationSummaryRows';

/** Issue titles behind one tab's badge counts, worst severity first. */
export interface TabIssueTitles {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
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
  const byTab: Record<string, { errors: string[]; warnings: string[] }> = {};
  const slot = (tabId: string) =>
    (byTab[tabId] ??= { errors: [], warnings: [] });
  for (const issue of flattenErrors(result)) {
    if (issue.severity === 'info') continue;
    const tab = slot(getPrimaryFixTab(issue.error.category));
    const title = describeIssue(issue.error).heading;
    (issue.severity === 'error' ? tab.errors : tab.warnings).push(title);
  }
  for (const note of notes) slot(note.tabId).warnings.push(note.label);
  return byTab;
}

/** Most titles a tooltip lists before it summarizes the rest. */
const MAX_LISTED_TITLES = 4;

/** "Runs hot", "A; B; C; D; +2 more": one line of titles for a severity. */
function listTitles(titles: readonly string[]): string {
  if (titles.length <= MAX_LISTED_TITLES) return titles.join('; ');
  const listed = titles.slice(0, MAX_LISTED_TITLES).join('; ');
  return `${listed}; +${titles.length - MAX_LISTED_TITLES} more`;
}

/**
 * Tooltip lines for a tab's badge, one per severity present, e.g.
 * "1 warning: Runs hot". The count words come from the badge's own counts so
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
