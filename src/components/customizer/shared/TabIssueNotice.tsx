/**
 * Tab issue notice
 *
 * One compact line above a section's content that says what the tab's badge
 * counts and how to fix it ("1 warning: Runs hot \u2014 add heat sinks in
 * Cooling"), with a link that opens the build status panel for everything.
 * Wording comes from `getTabIssueNotice`; the editor renders it once for the
 * active tab, so no tab shows its own copy.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import type { TabIssueNotice as TabIssueNoticeData } from './tabIssueTitles';

import {
  BUILD_STATUS_KIND_TEXT_CLASS,
  BuildStateIcon,
} from './BuildStatusLabel';

interface TabIssueNoticeProps {
  readonly notice: TabIssueNoticeData;
  /** Opens the build status panel. */
  readonly onShowAll: () => void;
  readonly className?: string;
}

export function TabIssueNotice({
  notice,
  onShowAll,
  className = '',
}: TabIssueNoticeProps): React.ReactElement {
  return (
    <section
      aria-label="Issues on this tab"
      data-testid="tab-issue-notice"
      data-severity={notice.severity}
      className={`bg-surface-base border-border-theme-subtle flex shrink-0 flex-wrap items-center gap-x-3 border-b py-1 pr-1 pl-3 sm:pl-4 ${className}`}
    >
      <p className="flex min-w-0 flex-1 basis-60 items-start gap-2 text-sm leading-5">
        <span className="mt-0.5 flex shrink-0">
          <BuildStateIcon state={notice.severity} />
        </span>
        <span className="min-w-0">
          <span
            className={`${BUILD_STATUS_KIND_TEXT_CLASS[notice.severity]} font-medium`}
            data-testid="tab-issue-notice-summary"
          >
            {notice.summary}
          </span>
          {notice.hint && (
            <span
              className="text-text-theme-secondary"
              data-testid="tab-issue-notice-hint"
            >
              {' \u2014 '}
              {notice.hint}
            </span>
          )}
        </span>
      </p>
      <button
        type="button"
        onClick={onShowAll}
        className="text-text-theme-primary hover:border-border-theme hover:bg-surface-raised focus-visible:ring-accent inline-flex min-h-11 shrink-0 items-center rounded border border-transparent bg-transparent !px-2 text-sm font-medium underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Show all issues
      </button>
    </section>
  );
}
