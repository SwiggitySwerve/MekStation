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
import { SvgIcon } from '@/components/ui/SvgIcon';
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
  readonly title?: string;
  /** Prefix of the element ids and test ids, unique per list on a page. */
  readonly idPrefix?: string;
  readonly headingLevel?: 'h3' | 'h4';
  /** Phone issue card: one text block per row with its action on the line below. */
  readonly compact?: boolean;
}

/** Checklist of the unit's budgets, each with a way to the tab that fixes it. */
export function BuildReadinessList({
  rows,
  status,
  onNavigate,
  title = 'Build Readiness',
  idPrefix = 'overview-readiness',
  headingLevel = 'h4',
  compact = false,
}: BuildReadinessListProps): React.ReactElement {
  const Heading = headingLevel;
  return (
    <section aria-labelledby={`${idPrefix}-title`}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 ${compact ? 'flex-col' : ''}`}
      >
        <Heading
          id={`${idPrefix}-title`}
          className={
            headingLevel === 'h3' ? cs.text.cardTitle : cs.text.subsection
          }
        >
          {title}
        </Heading>
        <p
          className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium"
          data-testid={`${idPrefix}-summary`}
          data-state={status.state}
        >
          <BuildStateIcon state={status.state} />
          {/* Counts only ("1 warning"): the rows below say what each one is. */}
          {status.state === 'ready' ? (
            <span className="text-green-400">{status.headline}</span>
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
      {/* The phone card gives its heading block room before the first row. */}
      <ul
        className={`divide-border-theme-subtle divide-y ${compact ? 'mt-3' : 'mt-1'}`}
      >
        {rows.map((row) => {
          const tabLabel = getTabLabel(row.tabId);
          const needsAction = row.severity !== 'ok';
          return (
            <li
              key={row.id}
              className={
                compact
                  ? 'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 py-1'
                  : 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 py-2 sm:flex sm:items-center'
              }
              data-testid={`${idPrefix}-${row.id}`}
              data-status={row.status}
              data-severity={row.severity}
            >
              <span className="mt-1 flex shrink-0 self-start">
                {row.pending && row.severity === 'ok' ? (
                  <SvgIcon
                    size="inline"
                    label="Pending"
                    data-readiness-icon="pending"
                    className="text-text-theme-muted shrink-0"
                  >
                    <circle cx="12" cy="12" r="9" />
                  </SvgIcon>
                ) : (
                  <BuildStateIcon
                    state={row.severity === 'ok' ? 'ready' : row.severity}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-text-theme-primary text-sm font-medium">
                  <span className="sr-only">
                    {row.pending && row.severity === 'ok'
                      ? 'Pending'
                      : SEVERITY_WORD[row.severity]}
                    :{' '}
                  </span>
                  {row.label}
                </p>
                {/* Phone rows wrap so a reason is never cut before its fix. */}
                <p className="text-text-theme-secondary text-sm tabular-nums">
                  {compact ? (row.detail ?? row.sentence) : row.sentence}
                </p>
                {row.detail && !compact && (
                  <p
                    className={`${BUILD_STATUS_KIND_TEXT_CLASS[row.detailSeverity ?? 'warning']} text-[13px] leading-[18px]`}
                  >
                    {row.detail}
                  </p>
                )}
              </div>
              {/* Wide rows pull the button right by its padding plus the
                  chevron's inner margin, so the chevron ends on the card's
                  16px inner edge, under the header count. */}
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate(row.tabId)}
                  aria-label={`${row.label}: go to ${tabLabel}`}
                  className={`hover:border-border-theme hover:bg-surface-raised focus-visible:ring-accent inline-flex min-h-11 w-fit shrink-0 items-center gap-1 rounded border border-transparent bg-transparent !px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${compact ? 'col-start-2 -my-1.5 -ml-2 justify-self-start' : 'col-start-2 -ml-2 justify-self-start sm:-mr-3 sm:ml-0'} ${
                    needsAction
                      ? 'text-text-theme-primary'
                      : 'text-text-theme-secondary hover:text-text-theme-primary'
                  }`}
                >
                  {`Go to ${tabLabel}`}
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
