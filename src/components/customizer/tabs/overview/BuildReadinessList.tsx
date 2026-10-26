import React from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import {
  BUILD_STATUS_KIND_TEXT_CLASS,
  BuildStateIcon,
} from '@/components/customizer/shared/BuildStatusLabel';
import {
  BUILD_STATUS_GROUPS,
  BUILD_STATUS_SEPARATOR,
  type BuildStatusSummary,
} from '@/components/customizer/shared/buildStatusSummary';
import { AppIcon } from '@/components/ui/AppIcon';
import { getTabLabel } from '@/utils/validation/validationNavigation';

import type { ReadinessRow, ReadinessSeverity } from './buildReadiness';

import { customizerStyles as cs } from '../../styles';

/** Word read before each row, the same item words the status panel uses. */
const SEVERITY_WORD: Record<ReadinessSeverity, string> = {
  ok: 'OK',
  ...(Object.fromEntries(
    BUILD_STATUS_GROUPS.map((group) => [group.kind, group.itemLabel]),
  ) as Record<Exclude<ReadinessSeverity, 'ok'>, string>),
};

interface BuildReadinessListProps {
  readonly rows: readonly ReadinessRow[];
  /** Header counts, shared with the build-status button (`getReadinessStatus`). */
  readonly status: BuildStatusSummary;
  readonly onNavigate?: (tabId: CustomizerTabId) => void;
}

/** Checklist of the unit's budgets, each with a way to the tab that fixes it. */
export function BuildReadinessList({
  rows,
  status,
  onNavigate,
}: BuildReadinessListProps): React.ReactElement {
  return (
    <section aria-labelledby="overview-readiness-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 id="overview-readiness-title" className={cs.text.subsection}>
          Build readiness
        </h4>
        <p
          className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium"
          data-testid="overview-readiness-summary"
          data-state={status.state}
        >
          <BuildStateIcon state={status.state} />
          {status.headlineNote || status.state === 'ready' ? (
            <span
              className={
                status.state === 'ready'
                  ? 'text-green-400'
                  : BUILD_STATUS_KIND_TEXT_CLASS.note
              }
            >
              {status.headline}
            </span>
          ) : (
            status.parts.map((part, index) => (
              <span
                key={part.kind}
                className={BUILD_STATUS_KIND_TEXT_CLASS[part.kind]}
              >
                {index > 0 && (
                  <span className="text-text-theme-secondary">
                    {BUILD_STATUS_SEPARATOR.trimStart()}
                  </span>
                )}
                {part.text}
              </span>
            ))
          )}
        </p>
      </div>
      <ul className="divide-border-theme-subtle mt-1 divide-y">
        {rows.map((row) => {
          const tabLabel = getTabLabel(row.tabId);
          const needsAction = row.severity !== 'ok';
          return (
            <li
              key={row.id}
              className="flex items-center gap-3 py-2"
              data-testid={`overview-readiness-${row.id}`}
              data-status={row.status}
              data-severity={row.severity}
            >
              <span className="mt-1 flex shrink-0 self-start">
                <BuildStateIcon
                  state={row.severity === 'ok' ? 'ready' : row.severity}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-text-theme-primary text-sm font-medium">
                  <span className="sr-only">
                    {SEVERITY_WORD[row.severity]}:{' '}
                  </span>
                  {row.label}
                </p>
                <p className="text-text-theme-secondary text-sm tabular-nums">
                  {row.sentence}
                </p>
                {row.detail && (
                  <p
                    className={`${BUILD_STATUS_KIND_TEXT_CLASS[row.detailSeverity ?? 'warning']} text-xs`}
                  >
                    {row.detail}
                  </p>
                )}
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate(row.tabId)}
                  aria-label={`${row.label}: go to ${tabLabel}`}
                  className={`focus-visible:ring-accent inline-flex min-h-11 w-36 shrink-0 items-center justify-between gap-1 rounded border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    needsAction
                      ? 'border-border-theme text-text-theme-primary hover:bg-surface-raised'
                      : 'border-border-theme-subtle text-text-theme-secondary hover:bg-surface-raised hover:text-text-theme-primary'
                  }`}
                >
                  {tabLabel}
                  <AppIcon
                    name="chevron-right"
                    size="inline"
                    aria-hidden="true"
                  />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
