import React from 'react';

import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { AppIcon } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { formatTons } from '@/utils/formatting';
import { getTabLabel } from '@/utils/validation/validationNavigation';

import {
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
import { formatValidationMessage } from './validationMessageFormatting';

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

const OVERWEIGHT_MESSAGE = /exceeds maximum tonnage by ([\d.]+) t\b/i;
/**
 * The one fix sentence for an overweight unit, used by the status panel (in
 * place of the rule's own suggestion) and the Overview readiness row.
 */
export const OVERWEIGHT_FIX = 'Remove equipment or armor.';
/** Messages this short read well as the heading itself. */
const HEADING_MESSAGE_LENGTH = 64;

/**
 * Plain heading for a rule result plus the explanation shown beneath it.
 * Wording only: the amount comes from the rule's own message, never
 * recomputed here. Short single-sentence messages are their own heading.
 * Overweight states its amount once, in the heading (no full stop, like the
 * other headings), so its body is only the fix (`OVERWEIGHT_FIX`, the same
 * sentence the readiness row ends with) instead of repeating the amount.
 */
export function describeIssue(error: IUnitValidationError): {
  heading: string;
  explanation?: string;
  /** Replaces the rule's own suggestion with the shared fix sentence. */
  fix?: string;
} {
  const message = formatValidationMessage(error.message.trim());
  const overweight = OVERWEIGHT_MESSAGE.exec(message);
  if (overweight)
    return {
      heading: `Overweight by ${formatTons(Number(overweight[1]))}`,
      fix: OVERWEIGHT_FIX,
    };
  if (
    message.length <= HEADING_MESSAGE_LENGTH &&
    !/[.!?]\s/.test(message) &&
    message.length > 0
  )
    return {
      heading: /\d+\.\d t\b/.test(message)
        ? message
        : message.replace(/\.$/, ''),
    };
  return {
    heading:
      error.ruleName.replace(/\s+(Validation|Check)$/i, '').trim() ||
      error.category,
    explanation: message,
  };
}

/**
 * Heading of a readout warning ("Runs 11 heat over dissipation"). With
 * `describeIssue`, the one source of issue titles for the panel and the
 * Overview readiness rows, so one issue never goes by two names.
 */
export function noteHeading(note: ValidationNote): string {
  return note.heading ?? noteText(note);
}

/**
 * Panel header on two lines: the unit's name small and muted (one line,
 * ellipsis, full name in the tooltip), then the "Build Status" heading. The
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
          Build Status
        </span>
      </h3>
      <button
        type="button"
        data-validation-close
        aria-label="Close validation issues"
        onClick={onClose}
        className="focus-visible:outline-text-theme-primary hover:bg-surface-raised min-h-11 min-w-11 shrink-0 rounded text-lg focus-visible:outline-2"
      >
        <AppIcon name="close" size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}

/** The counts after the verdict: each count (or the lone readout) is one unit. */
function summaryChips(
  summary: BuildStatusSummary,
): { kind: BuildStatusKind | 'ready'; text: string }[] {
  if (summary.state === 'ready') return [{ kind: 'ready', text: 'Ready' }];
  if (summary.headlineNote)
    return [{ kind: summary.state as BuildStatusKind, text: summary.headline }];
  return summary.parts.map(({ kind, text }) => ({ kind, text }));
}

/**
 * The panel's verdict line: a "Not Legal" / "Legal" label, then the counts in
 * the status button's own format ("2 errors \u00b7 1 warning", each in its
 * severity colour), so the button and the panel never show one count two
 * ways. Counts never break inside; when the panel is narrow they wrap as
 * whole units. The hidden separators keep the accessible text equal to the
 * summary heading ("Not Legal \u00b7 1 error \u00b7 2 warnings").
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
        <BuildStateIcon
          state={summary.verdict === 'Legal' ? 'ready' : 'error'}
        />
        {summary.verdict}
      </span>
      {summaryChips(summary).map((chip) => (
        <React.Fragment key={chip.kind}>
          <span className="sr-only">{BUILD_STATUS_SEPARATOR}</span>
          <span aria-hidden="true" className="text-text-theme-secondary">
            {BUILD_STATUS_SEPARATOR.trim()}
          </span>
          <span
            data-build-status-part={chip.kind}
            className={`text-sm leading-6 font-medium whitespace-nowrap ${
              chip.kind === 'ready'
                ? 'text-green-400'
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
      className="text-text-theme-secondary hover:border-border-theme-strong hover:bg-surface-raised hover:text-text-theme-primary focus-visible:outline-text-theme-primary inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-transparent !px-1 !py-0 text-sm font-normal whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Go to {getTabLabel(destination.tabId)}
      <AppIcon name="chevron-right" size="inline" aria-hidden="true" />
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
        {(explanation || suggestion) && (
          <p className="text-text-theme-secondary text-sm leading-5">
            {[explanation, suggestion].filter(Boolean).join(' ')}
          </p>
        )}
        {/* Every fix sits in one row under the text, never mid-sentence. */}
        {destinations.length > 0 && (
          <div className="-ml-1 flex flex-wrap gap-x-2">
            {destinations.map((destination) => (
              <FixButton
                key={destination.tabId}
                destination={destination}
                describedBy={headingId}
              />
            ))}
          </div>
        )}
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
      heading={noteHeading(note)}
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
  const { heading, explanation, fix } = describeIssue(issue.error);
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
      suggestion={
        fix ??
        (issue.error.suggestion
          ? formatValidationMessage(issue.error.suggestion)
          : undefined)
      }
      destinations={destinations}
      headingId={headingId}
    />
  );
}
