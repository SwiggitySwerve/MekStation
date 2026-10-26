import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { IUnitValidationError } from '@/types/validation/UnitValidationInterfaces';
import {
  getTabForCategory,
  getTabLabel,
} from '@/utils/validation/validationNavigation';

import {
  ValidationIssueIcon,
  validationIconColors,
  type ValidationIconSeverity,
} from './ValidationIssueIcon';
import {
  flattenErrors,
  noteText,
  plural,
  severityCountText,
  ValidationIssueRow,
  ValidationPanelHeader,
  ValidationNoteRow,
  validationNoteColor,
  type ValidationNote,
} from './ValidationSummaryRows';

export type { ValidationNote } from './ValidationSummaryRows';

interface ValidationSummaryProps {
  validation: UnitValidationState;
  onNavigate?: (tabId: CustomizerTabId) => void;
  onIssueNavigate?: (issue: IUnitValidationError) => void;
  maxItems?: number;
  className?: string;
  unitName?: string;
  section?: CustomizerTabId;
  /**
   * Cautions listed with the checks (e.g. running hot). With no rule issues
   * the trigger reads as the caution itself, e.g. "Runs hot +11".
   */
  notes?: readonly ValidationNote[];
  /** Extra status shown at the foot of every issue list (e.g. save state). */
  details?: React.ReactNode;
  /** Short trigger labels for narrow bands. */
  compact?: boolean;
}

type ValidationPanel = ValidationIconSeverity | 'checks';

const NO_NOTES: readonly ValidationNote[] = [];

const chipClass =
  'focus-visible:outline-accent hover:bg-surface-raised flex min-h-11 items-center justify-center gap-1 font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px]';
/** Section-tab chips: icon and count only. */
const sectionChipClass = 'min-w-11 rounded px-1.5 text-xs';
/** Parts of the build-status control: a sentence-sized label. */
const statusPartClass = 'px-2 text-[13px] whitespace-nowrap';
/**
 * Phone: the same wording, tighter, truncating within the readout row.
 * Important overrides beat the global unlayered `button` padding and size.
 */
const compactPartClass = 'max-w-[7.5rem] !px-1.5 !text-xs whitespace-nowrap';

export function ValidationSummary({
  validation,
  onNavigate,
  onIssueNavigate,
  maxItems = 5,
  className = '',
  unitName = 'Unit',
  section,
  notes = NO_NOTES,
  details,
  compact = false,
}: ValidationSummaryProps): React.ReactElement | null {
  const [open, setOpen] = useState<ValidationPanel | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 400 });
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const all = useMemo(
    () =>
      flattenErrors(validation.result).filter(
        (item) =>
          !section || getTabForCategory(item.error.category) === section,
      ),
    [validation.result, section],
  );
  const counts = section
    ? {
        error: all.filter((item) => item.severity === 'error').length,
        warning: all.filter((item) => item.severity === 'warning').length,
        info: all.filter((item) => item.severity === 'info').length,
      }
    : {
        error: validation.errorCount,
        warning: validation.warningCount,
        info: validation.infoCount,
      };
  const issues =
    open && open !== 'checks'
      ? all.filter((item) => item.severity === open)
      : [];
  const shown = showAll ? issues : issues.slice(0, maxItems);
  const shownNotes = section ? NO_NOTES : notes;

  useEffect(() => {
    if (!open) return;
    const updatePosition = (): void => {
      if (!trigger.current) return;
      const box = trigger.current.getBoundingClientRect();
      const top = Math.max(
        8,
        Math.min(box.bottom + 4, window.innerHeight - 180),
      );
      setPosition({
        left: Math.max(8, Math.min(box.left, window.innerWidth - 344)),
        top,
        maxHeight: window.innerHeight - top - 8,
      });
    };
    updatePosition();
    // First listed item, else the close button (an all-clear checks panel).
    (
      panel.current?.querySelector<HTMLButtonElement>(
        '[data-validation-issue], [data-validation-note]',
      ) ??
      panel.current?.querySelector<HTMLButtonElement>('[data-validation-close]')
    )?.focus({ preventScroll: true });
    const outside = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.current?.contains(target))
        setOpen(null);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(null);
        trigger.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const hasIssues = counts.error + counts.warning + counts.info > 0;
  const busy = validation.isLoading || validation.isValidating;
  if (!hasIssues) {
    if (section) return null;
    if (
      busy ||
      !validation.isValid ||
      (shownNotes.length === 0 && details === undefined)
    ) {
      return (
        <span
          className={`inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-[13px] font-semibold whitespace-nowrap ${busy || !validation.isValid ? 'text-text-theme-secondary' : 'text-text-theme-primary'} ${className}`}
          role="status"
        >
          {busy ? (
            'Checking\u2026'
          ) : validation.isValid ? (
            <>
              <AppIcon
                name="check"
                size="inline"
                aria-hidden="true"
                className="text-green-400"
              />{' '}
              Ready
            </>
          ) : (
            'Validation pending'
          )}
        </span>
      );
    }
  }

  const toggle =
    (kind: ValidationPanel) =>
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      trigger.current = event.currentTarget;
      setShowAll(false);
      setOpen(open === kind ? null : kind);
    };
  const noteNames = shownNotes.map(noteText).join(', ');
  const noteSummary = shownNotes.length
    ? `${plural(shownNotes.length, 'caution')} (${noteNames})`
    : '';
  // One caution reads as itself ("Runs hot +11"); several read as a count.
  // The label truncates first so the amount stays visible.
  const visibleNote =
    shownNotes.length === 1 ? (
      <>
        <span className="min-w-0 truncate">{shownNotes[0].label}</span>
        {shownNotes[0].amount && (
          <span className="shrink-0">{shownNotes[0].amount}</span>
        )}
      </>
    ) : (
      <span className="min-w-0 truncate">
        {plural(shownNotes.length, 'caution')}
      </span>
    );
  const chevron = (
    <AppIcon
      name="chevron-down"
      size="inline"
      aria-hidden="true"
      className="text-text-theme-secondary shrink-0"
    />
  );
  const panelTitle =
    open === 'error'
      ? 'Errors'
      : open === 'warning'
        ? 'Warnings'
        : open === 'info'
          ? 'Information'
          : hasIssues
            ? 'Cautions'
            : 'Checks';
  const severities = (['error', 'warning', 'info'] as const).filter(
    (severity) => counts[severity] > 0,
  );
  return (
    <div
      ref={root}
      role="group"
      className={`flex min-w-0 shrink-0 items-center ${section ? 'gap-1' : ''} ${className}`}
      aria-label={
        section ? `${getTabLabel(section)} validation` : 'Unit validation'
      }
      aria-busy={validation.isValidating}
    >
      {!hasIssues && (
        <button
          type="button"
          data-build-status={shownNotes.length > 0 ? 'caution' : 'ready'}
          aria-label={
            shownNotes.length > 0
              ? `${unitName}: no rule issues, ${noteSummary}, show checks`
              : `${unitName}: ready, show checks`
          }
          title={shownNotes.length > 0 ? noteNames : undefined}
          aria-expanded={open === 'checks'}
          aria-haspopup="dialog"
          aria-controls={open === 'checks' ? id : undefined}
          onClick={toggle('checks')}
          className={`${chipClass} min-w-0 rounded ${compact ? compactPartClass : statusPartClass}`}
        >
          {shownNotes.length > 0 ? (
            <>
              <AppIcon
                name="warning"
                size="inline"
                aria-hidden="true"
                className={`shrink-0 ${validationNoteColor}`}
              />
              <span className={`contents ${validationNoteColor}`}>
                {visibleNote}
              </span>
            </>
          ) : (
            <>
              <AppIcon
                name="check"
                size="inline"
                aria-hidden="true"
                className="shrink-0 text-green-400"
              />
              <span className="text-text-theme-primary">Ready</span>
            </>
          )}
          {/* Phone: the readouts toggle beside it already shows a chevron. */}
          {!compact && chevron}
        </button>
      )}
      {hasIssues && (
        // One bordered statement ("2 errors | 1 warning | Runs hot +11");
        // each part opens its own list.
        <div
          className={
            section
              ? 'flex items-center gap-1'
              : 'border-border-theme bg-surface-base divide-border-theme flex min-w-0 items-stretch divide-x overflow-hidden rounded border'
          }
          data-build-status={section ? undefined : severities[0]}
        >
          {severities.map((severity, index) => (
            <button
              key={severity}
              type="button"
              aria-label={`${unitName}: ${counts[severity]} ${severity}${counts[severity] === 1 ? '' : 's'}${section ? ` in ${getTabLabel(section)}` : ''}, show issues`}
              aria-expanded={open === severity}
              aria-haspopup="dialog"
              aria-controls={open === severity ? id : undefined}
              onClick={toggle(severity)}
              className={`${chipClass} min-w-11 shrink-0 ${section ? sectionChipClass : compact ? compactPartClass : statusPartClass} ${validationIconColors[severity]}`}
            >
              <ValidationIssueIcon severity={severity} />
              {severityCountText(
                severity,
                counts[severity],
                // The worst severity leads in words; phones keep the rest as counts.
                !section && (!compact || index === 0),
              )}
              {!section && !compact && chevron}
            </button>
          ))}
          {!section && !compact && shownNotes.length > 0 && (
            <button
              type="button"
              aria-label={`${unitName}: ${noteSummary}, show cautions`}
              title={noteNames}
              aria-expanded={open === 'checks'}
              aria-haspopup="dialog"
              aria-controls={open === 'checks' ? id : undefined}
              onClick={toggle('checks')}
              className={`${chipClass} ${statusPartClass} min-w-0 ${validationNoteColor}`}
            >
              <AppIcon
                name="warning"
                size="inline"
                aria-hidden="true"
                className="shrink-0"
              />
              <span className="contents">{visibleNote}</span>
              {chevron}
            </button>
          )}
        </div>
      )}
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-labelledby={`${id}-title`}
            className="bg-surface-base border-border-theme text-text-theme-primary fixed z-[70] flex w-[336px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-lg border shadow-xl"
            style={{
              left: position.left,
              top: position.top,
              maxHeight: position.maxHeight,
            }}
          >
            <ValidationPanelHeader
              titleId={`${id}-title`}
              title={`${unitName} \u00b7 ${panelTitle}${section ? ` \u00b7 ${getTabLabel(section)}` : ''}`}
              onClose={() => {
                setOpen(null);
                trigger.current?.focus();
              }}
            />
            <div className="min-h-0 overflow-y-auto">
              {open === 'checks' && !hasIssues && (
                <p className="border-border-theme flex items-center gap-2 border-b p-3 text-xs font-medium text-green-400">
                  <AppIcon name="check" size="inline" aria-hidden="true" />
                  All construction rules pass.
                </p>
              )}
              {shown.map((item, index) => (
                <ValidationIssueRow
                  key={`${item.error.ruleId}-${item.error.field ?? ''}-${index}`}
                  issue={item}
                  onSelect={() => {
                    if (!onNavigate && !onIssueNavigate) return;
                    setOpen(null);
                    if (onIssueNavigate) onIssueNavigate(item.error);
                    else onNavigate?.(getTabForCategory(item.error.category));
                  }}
                />
              ))}
              {open !== 'checks' && shown.length === 0 && (
                <p className="text-text-theme-secondary p-3 text-xs">
                  No remaining issues in this group.
                </p>
              )}
              {!showAll && issues.length > shown.length && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-text-theme-primary hover:bg-surface-raised min-h-11 w-full px-3 text-left text-xs"
                >
                  +{issues.length - shown.length} more issues {'\u00b7'} Show
                  all
                </button>
              )}
              {/* Phone folds cautions into every list instead of a separate part. */}
              {(open === 'checks' || compact) &&
                shownNotes.map((note) => (
                  <ValidationNoteRow
                    key={note.id}
                    note={note}
                    onSelect={() => {
                      setOpen(null);
                      onNavigate?.(note.tabId);
                    }}
                  />
                ))}
            </div>
            {details !== undefined && (
              <div className="border-border-theme bg-surface-deep/40 shrink-0 border-t px-3 py-2">
                {details}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
