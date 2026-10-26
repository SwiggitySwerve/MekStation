import React from 'react';

import type { UnitValidationState } from '@/hooks/useUnitValidation';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import {
  getTabForCategory,
  getTabLabel,
} from '@/utils/validation/validationNavigation';

import { CAUTION_TEXT_CLASS } from './unitStatStatus';
import {
  ValidationIssueIcon,
  validationIconColors,
  type ValidationIconSeverity,
} from './ValidationIssueIcon';

/**
 * A caution derived from readouts already on screen (e.g. running hot).
 * Notes are presentational: they never change what counts as an error or
 * warning, and they never make a unit invalid.
 */
export interface ValidationNote {
  id: string;
  /** Short visible phrase that can stand alone, e.g. "Runs hot". */
  label: string;
  /** Amount shown after the label and kept when it truncates, e.g. "+11". */
  amount?: string;
  message: string;
  suggestion?: string;
  /** Tab where the user can address the note. */
  tabId: CustomizerTabId;
  icon?: AppIconName;
}

export interface ValidationIssue {
  error: IUnitValidationError;
  severity: ValidationIconSeverity;
  critical?: boolean;
}

/**
 * Notes read as cautions: the shared caution hue, never the red or yellow of
 * rule results or the amber of the selection accent.
 */
export const validationNoteColor = CAUTION_TEXT_CLASS;

/** A note's short visible text, e.g. "Runs hot +11". */
export function noteText(note: ValidationNote): string {
  return note.amount ? `${note.label} ${note.amount}` : note.label;
}

/** "3", or with words "3 errors" / "1 info". */
export function severityCountText(
  severity: ValidationIconSeverity,
  count: number,
  words: boolean,
): string {
  const shown = count > 99 ? '99+' : String(count);
  if (!words) return shown;
  return `${shown} ${severity}${count === 1 || severity === 'info' ? '' : 's'}`;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Every rule result as one list, critical errors first. */
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
    .sort((a, b) => Number(Boolean(b.critical)) - Number(Boolean(a.critical)));
}

const rowClass =
  'border-border-theme hover:bg-surface-raised focus-visible:outline-accent flex min-h-11 w-full items-start gap-2 border-b p-3 text-left last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px]';

function GoTo({
  prefix,
  tabId,
}: {
  prefix: string;
  tabId: CustomizerTabId;
}): React.ReactElement {
  return (
    <span className="text-text-theme-secondary mt-2 block text-xs">
      {prefix} {'\u2022'} Go to {getTabLabel(tabId)}{' '}
      <AppIcon name="arrow-right" size="inline" aria-hidden="true" />
    </span>
  );
}

export function ValidationPanelHeader({
  titleId,
  title,
  onClose,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme flex min-h-11 shrink-0 items-center justify-between gap-2 border-b pl-3">
      <h3 id={titleId} className="min-w-0 text-xs font-semibold">
        {title}
      </h3>
      <button
        type="button"
        data-validation-close
        aria-label="Close validation issues"
        onClick={onClose}
        className="focus-visible:outline-accent hover:bg-surface-raised min-h-11 min-w-11 rounded text-lg focus-visible:outline-2"
      >
        <AppIcon name="close" size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ValidationNoteRow({
  note,
  onSelect,
}: {
  note: ValidationNote;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      data-validation-note
      onClick={onSelect}
      className={rowClass}
    >
      <span className={`pt-0.5 ${validationNoteColor}`}>
        <AppIcon name={note.icon ?? 'info'} size="inline" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-medium ${validationNoteColor}`}>
          {note.message}
        </span>
        {note.suggestion && (
          <span className="text-text-theme-secondary mt-1 block text-xs">
            {note.suggestion}
          </span>
        )}
        <GoTo prefix="Caution" tabId={note.tabId} />
      </span>
    </button>
  );
}

export function ValidationIssueRow({
  issue,
  onSelect,
}: {
  issue: ValidationIssue;
  onSelect: () => void;
}): React.ReactElement {
  const color = validationIconColors[issue.severity];
  return (
    <button
      type="button"
      data-validation-issue
      onClick={onSelect}
      className={rowClass}
    >
      <span className={`pt-0.5 ${color}`}>
        <ValidationIssueIcon severity={issue.severity} />
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-medium ${color}`}>
          {issue.error.message}
        </span>
        {issue.error.suggestion && (
          <span className="text-text-theme-secondary mt-1 block text-xs">
            {issue.error.suggestion}
          </span>
        )}
        <GoTo
          prefix={issue.critical ? 'Critical error' : issue.error.severity}
          tabId={getTabForCategory(issue.error.category)}
        />
      </span>
    </button>
  );
}
