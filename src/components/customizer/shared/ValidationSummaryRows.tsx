import React from 'react';

import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { AppIcon } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { getTabLabel } from '@/utils/validation/validationNavigation';

import {
  BUILD_STATE_TINT_CLASS,
  BUILD_STATUS_KIND_TEXT_CLASS,
  BuildStateIcon,
  SeverityIcon,
} from './BuildStatusLabel';
import {
  BUILD_STATUS_GROUPS,
  BUILD_STATUS_SEPARATOR,
  noteText,
  type BuildStatusKind,
  type BuildStatusSummary,
  type ValidationNote,
} from './buildStatusSummary';
import { type ValidationIconSeverity } from './ValidationIssueIcon';

export interface ValidationIssue {
  error: IUnitValidationError;
  severity: ValidationIconSeverity;
  critical?: boolean;
}

/** Info-level rule results are listed, and styled, as notes. */
export function issueKind(severity: ValidationIconSeverity): BuildStatusKind {
  return severity === 'info' ? 'note' : severity;
}

const ITEM_LABEL = Object.fromEntries(
  BUILD_STATUS_GROUPS.map((group) => [group.kind, group.itemLabel]),
) as Record<BuildStatusKind, string>;

export { noteText };
export type { ValidationNote };

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

const SEVERITY_ORDER: Record<ValidationIconSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/** Every rule result as one list: errors (critical first), warnings, infos. */
export function flattenErrors(
  result: UnitValidationState['result'],
): ValidationIssue[] {
  return (result?.results ?? [])
    .flatMap<ValidationIssue>((result) => [
      ...result.errors.map((error) => ({
        error,
        severity: 'error' as const,
        critical: error.severity === UnitValidationSeverity.CRITICAL_ERROR,
      })),
      ...result.warnings.map((error) => ({
        error,
        severity: 'warning' as const,
      })),
      ...result.infos.map((error) => ({ error, severity: 'info' as const })),
    ])
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        Number(Boolean(b.critical)) - Number(Boolean(a.critical)),
    );
}

const OVERWEIGHT_MESSAGE = /exceeds maximum tonnage by ([\d.]+) tons?/i;
/** Messages this short read well as the heading itself. */
const HEADING_MESSAGE_LENGTH = 64;

/**
 * Plain heading for a rule result plus the explanation shown beneath it.
 * Wording only: the amount comes from the rule's own message, never
 * recomputed here. Short single-sentence messages are their own heading.
 */
export function describeIssue(error: IUnitValidationError): {
  heading: string;
  explanation?: string;
} {
  const overweight = OVERWEIGHT_MESSAGE.exec(error.message);
  if (overweight)
    return {
      heading: `Overweight by ${overweight[1]} t`,
      explanation: error.message,
    };
  const message = error.message.trim();
  if (
    message.length <= HEADING_MESSAGE_LENGTH &&
    !/[.!?]\s/.test(message) &&
    message.length > 0
  )
    return { heading: message.replace(/\.$/, '') };
  return {
    heading:
      error.ruleName.replace(/\s+(Validation|Check)$/i, '').trim() ||
      error.category,
    explanation: message,
  };
}

/**
 * Panel header on two lines: the unit's name small and muted (one line,
 * ellipsis, full name in the tooltip), then the "Build status" heading. The
 * narrow docked drawer never wraps a separator onto a line of its own.
 */
export function ValidationPanelHeader({
  titleId,
  unitName,
  onClose,
}: {
  titleId: string;
  unitName: string;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme flex min-h-11 shrink-0 items-center justify-between gap-2 border-b pl-4">
      <h3 id={titleId} className="min-w-0 py-1.5">
        <span
          title={unitName}
          className="text-text-theme-muted block truncate text-xs leading-4"
        >
          {unitName}
        </span>{' '}
        <span className="text-text-theme-primary block text-sm leading-5 font-semibold">
          Build status
        </span>
      </h3>
      <button
        type="button"
        data-validation-close
        aria-label="Close validation issues"
        onClick={onClose}
        className="focus-visible:outline-accent hover:bg-surface-raised min-h-11 min-w-11 shrink-0 rounded text-lg focus-visible:outline-2"
      >
        <AppIcon name="close" size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}

/** The chips under the verdict: each count (or the lone readout) is one unit. */
function summaryChips(
  summary: BuildStatusSummary,
): { kind: BuildStatusKind | 'ready'; text: string }[] {
  if (summary.state === 'ready') return [{ kind: 'ready', text: 'Ready' }];
  if (summary.headlineNote)
    return [{ kind: summary.state as BuildStatusKind, text: summary.headline }];
  return summary.parts.map(({ kind, text }) => ({ kind, text }));
}

/**
 * The panel's verdict line: a "Not legal" / "Legal" label plus one chip per
 * count. Chips never break inside; when the panel is narrow they wrap as
 * whole units. The hidden separators keep the accessible text equal to the
 * summary heading ("Not legal \u00b7 1 error \u00b7 2 warnings").
 */
export function ValidationSummaryLine({
  id,
  summary,
}: {
  id: string;
  summary: BuildStatusSummary;
}): React.ReactElement {
  return (
    <p
      id={id}
      className="border-border-theme flex flex-wrap items-center gap-x-2 gap-y-2 border-b px-4 py-3"
    >
      <span className="flex items-center gap-2 text-base leading-6 font-semibold">
        <BuildStateIcon state={summary.state} />
        {summary.verdict}
      </span>
      {summaryChips(summary).map((chip) => (
        <React.Fragment key={chip.kind}>
          <span className="sr-only">{BUILD_STATUS_SEPARATOR}</span>
          <span
            data-build-status-part={chip.kind}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap ${BUILD_STATE_TINT_CLASS[chip.kind]} ${
              chip.kind === 'ready'
                ? 'text-text-theme-primary'
                : BUILD_STATUS_KIND_TEXT_CLASS[chip.kind]
            }`}
          >
            {chip.text}
          </span>
        </React.Fragment>
      ))}
    </p>
  );
}
/**
 * Label above each severity group in the panel: the group name in its
 * severity color, then the one-line meaning of the group.
 */
export function ValidationGroupHeading({
  kind,
}: {
  kind: BuildStatusKind;
}): React.ReactElement {
  const group = BUILD_STATUS_GROUPS.find((entry) => entry.kind === kind)!;
  return (
    <h4
      data-severity-group={kind}
      className="border-border-theme bg-surface-deep/40 flex flex-wrap items-baseline gap-x-1.5 border-b px-4 py-1.5 text-[13px] leading-[18px]"
    >
      <span
        className={`text-xs font-semibold tracking-wider uppercase ${BUILD_STATUS_KIND_TEXT_CLASS[kind]}`}
      >
        {group.title}
      </span>{' '}
      <span className="text-text-theme-secondary">
        {'\u2014'} {group.definition}
      </span>
    </h4>
  );
}

export interface FixDestination {
  tabId: CustomizerTabId;
  onSelect: () => void;
}

/**
 * Quiet 44px text button (label and arrow, no fill or outline until hover or
 * focus) that takes the user to a tab that can fix an item. It stays lighter
 * than the issue text above it.
 */
function FixButton({
  destination,
  describedBy,
}: {
  destination: FixDestination;
  describedBy: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      data-validation-fix={destination.tabId}
      aria-describedby={describedBy}
      onClick={destination.onSelect}
      className="text-text-theme-secondary hover:border-border-theme-strong hover:bg-surface-raised hover:text-text-theme-primary focus-visible:outline-accent inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-transparent !px-1 !py-0 text-sm font-normal whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Go to {getTabLabel(destination.tabId)}
      <AppIcon name="arrow-right" size="inline" aria-hidden="true" />
    </button>
  );
}

/**
 * One panel item: severity icon, plain heading, explanation, then the tabs
 * that can fix it. The item is not itself a control; its buttons are.
 */
function BuildStatusItem({
  kind,
  icon,
  severityLabel,
  heading,
  explanation,
  suggestion,
  destinations,
  headingId,
}: {
  kind: 'issue' | 'note';
  icon: React.ReactNode;
  severityLabel: string;
  heading: string;
  explanation?: string;
  suggestion?: string;
  destinations: readonly FixDestination[];
  headingId: string;
}): React.ReactElement {
  return (
    <li
      data-validation-issue={kind === 'issue' ? '' : undefined}
      data-validation-note={kind === 'note' ? '' : undefined}
      className="border-border-theme flex gap-2 border-b px-4 py-2 last:border-b-0"
    >
      <span className="flex h-6 shrink-0 items-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <h5
          id={headingId}
          className="text-text-theme-primary text-sm leading-5 font-semibold"
        >
          <span className="sr-only">{severityLabel}: </span>
          {heading}
        </h5>
        <div className="text-text-theme-secondary text-sm leading-5">
          {explanation && (
            <>
              <p className="inline">{explanation}</p>{' '}
            </>
          )}
          {suggestion && (
            <>
              <p className="inline">{suggestion}</p>{' '}
            </>
          )}
          {destinations.map((destination) => (
            <React.Fragment key={destination.tabId}>
              <FixButton
                destination={destination}
                describedBy={headingId}
              />{' '}
            </React.Fragment>
          ))}
        </div>
      </div>
    </li>
  );
}

/**
 * A readout warning (running hot): listed and styled as a warning, though
 * it is not a validation result.
 */
export function ValidationNoteRow({
  note,
  headingId,
  destinations,
}: {
  note: ValidationNote;
  headingId: string;
  destinations: readonly FixDestination[];
}): React.ReactElement {
  return (
    <BuildStatusItem
      kind="note"
      icon={<SeverityIcon kind="warning" />}
      severityLabel={ITEM_LABEL.warning}
      heading={note.heading ?? noteText(note)}
      explanation={note.message}
      suggestion={note.suggestion}
      destinations={destinations}
      headingId={headingId}
    />
  );
}

export function ValidationIssueRow({
  issue,
  headingId,
  destinations,
}: {
  issue: ValidationIssue;
  headingId: string;
  destinations: readonly FixDestination[];
}): React.ReactElement {
  const { heading, explanation } = describeIssue(issue.error);
  return (
    <BuildStatusItem
      kind="issue"
      icon={<SeverityIcon kind={issueKind(issue.severity)} />}
      severityLabel={
        issue.critical
          ? 'Critical error'
          : ITEM_LABEL[issueKind(issue.severity)]
      }
      heading={heading}
      explanation={explanation}
      suggestion={issue.error.suggestion}
      destinations={destinations}
      headingId={headingId}
    />
  );
}
