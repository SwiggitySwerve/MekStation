import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { IUnitValidationError } from '@/types/validation/UnitValidationInterfaces';
import {
  getFixTabsForCategory,
  getTabForCategory,
} from '@/utils/validation/validationNavigation';

import {
  BUILD_STATE_TINT_CLASS,
  BuildStateIcon,
  BuildStatusLabel,
} from './BuildStatusLabel';
import {
  getBuildStatusSummary,
  noteText,
  type BuildState,
} from './buildStatusSummary';
import {
  flattenErrors,
  ValidationGroupHeading,
  ValidationIssueRow,
  ValidationPanelHeader,
  ValidationNoteRow,
  type FixDestination,
  type ValidationIssue,
  type ValidationNote,
} from './ValidationSummaryRows';

export type { ValidationNote } from './ValidationSummaryRows';

interface ValidationSummaryProps {
  validation: UnitValidationState;
  /** Plain tab change, used for notes and alternative fix tabs. */
  onNavigate?: (tabId: CustomizerTabId) => void;
  /** Issue-aware navigation to the issue's own tab (focuses what it names). */
  onIssueNavigate?: (issue: IUnitValidationError) => void;
  maxItems?: number;
  className?: string;
  unitName?: string;
  /**
   * Notes listed after the rule results (e.g. running hot). With no rule
   * issues the button reads as the note itself, e.g. "Runs hot +11".
   */
  notes?: readonly ValidationNote[];
  /** Extra status shown at the foot of the panel (e.g. save state). */
  details?: React.ReactNode;
  /** Short button wording for narrow bands. */
  compact?: boolean;
}

const NO_NOTES: readonly ValidationNote[] = [];
/** Rule results with their own panel group; infos are listed as notes. */
const RULE_GROUPS = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
] as const;
const PANEL_WIDTH = 384;
/** Below this width the panel opens as a bottom sheet. */
const SHEET_MAX_WIDTH = 639;

const buttonClass =
  'focus-visible:outline-accent hover:bg-surface-raised flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px]';
const sizeClass = 'px-3 text-[13px]';
/**
 * Phone: the same wording, tighter, truncating within the readout row.
 * Important overrides beat the global unlayered `button` padding and size.
 */
const compactSizeClass = 'max-w-[7.5rem] !px-1.5 !text-xs';

/**
 * Focus the section a fix button opened once it renders, so keyboard users
 * land where the fix is (issue-aware navigation does this itself).
 */
function focusTabPanel(tabId: CustomizerTabId): void {
  let tries = 0;
  const attempt = (): void => {
    const panel = document.getElementById(`tabpanel-${tabId}`);
    if (panel && panel.getClientRects().length > 0) {
      panel.focus({ preventScroll: true });
      return;
    }
    if (++tries < 30) window.requestAnimationFrame(attempt);
  };
  window.requestAnimationFrame(attempt);
}

export function ValidationSummary({
  validation,
  onNavigate,
  onIssueNavigate,
  maxItems = 5,
  className = '',
  unitName = 'Unit',
  notes = NO_NOTES,
  details,
  compact = false,
}: ValidationSummaryProps): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    maxHeight: 400,
    sheet: false,
  });
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const issues = useMemo(
    () => flattenErrors(validation.result),
    [validation.result],
  );
  const summary = useMemo(
    () =>
      getBuildStatusSummary(
        {
          errorCount: validation.errorCount,
          warningCount: validation.warningCount,
          infoCount: validation.infoCount,
        },
        notes,
      ),
    [
      validation.errorCount,
      validation.warningCount,
      validation.infoCount,
      notes,
    ],
  );
  const shown = showAll ? issues : issues.slice(0, maxItems);

  useEffect(() => {
    if (!open) return;
    const updatePosition = (): void => {
      if (!trigger.current) return;
      if (window.innerWidth <= SHEET_MAX_WIDTH) {
        setPosition({ left: 0, top: 0, maxHeight: 0, sheet: true });
        return;
      }
      const box = trigger.current.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
      const top = Math.max(
        8,
        Math.min(box.bottom + 4, window.innerHeight - 180),
      );
      setPosition({
        // Right-aligned under the button, kept on screen.
        left: Math.max(
          8,
          Math.min(box.right - width, window.innerWidth - width - 8),
        ),
        top,
        maxHeight: window.innerHeight - top - 8,
        sheet: false,
      });
    };
    updatePosition();
    // First fix action, else the close button (nothing to fix).
    (
      panel.current?.querySelector<HTMLButtonElement>(
        '[data-validation-fix]',
      ) ??
      panel.current?.querySelector<HTMLButtonElement>('[data-validation-close]')
    )?.focus({ preventScroll: true });
    const outside = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.current?.contains(target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
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

  const hasIssues =
    validation.errorCount + validation.warningCount + validation.infoCount > 0;
  const busy = validation.isLoading || validation.isValidating;
  if (
    !hasIssues &&
    (busy ||
      !validation.isValid ||
      (notes.length === 0 && details === undefined))
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

  const state: BuildState = summary.state;
  const noteNames = notes.map(noteText).join(', ');
  // The full summary, the notes by name when the headline only counts
  // them, and what the button opens.
  const ariaLabel = `${unitName}: ${summary.panelHeading}${
    noteNames && !summary.headlineNote ? ` (${noteNames})` : ''
  }, ${summary.state === 'error' || summary.state === 'warning' ? 'show issues' : 'show checks'}`;

  const close = (): void => setOpen(false);
  const issueDestinations = (issue: ValidationIssue): FixDestination[] => {
    if (!onNavigate && !onIssueNavigate) return [];
    const ownTab = getTabForCategory(issue.error.category);
    return getFixTabsForCategory(issue.error.category).map((tabId) => ({
      tabId,
      onSelect: () => {
        close();
        if (onIssueNavigate && (tabId === ownTab || !onNavigate)) {
          onIssueNavigate(issue.error);
        } else {
          onNavigate?.(tabId);
          focusTabPanel(tabId);
        }
      },
    }));
  };
  const noteDestinations = (note: ValidationNote): FixDestination[] =>
    onNavigate
      ? [
          {
            tabId: note.tabId,
            onSelect: () => {
              close();
              onNavigate(note.tabId);
              focusTabPanel(note.tabId);
            },
          },
        ]
      : [];

  const noteIssues = shown.filter((item) => item.severity === 'info');
  return (
    <div
      ref={root}
      role="group"
      className={`flex min-w-0 shrink-0 items-center ${className}`}
      aria-label="Unit validation"
      aria-busy={validation.isValidating}
    >
      <button
        ref={trigger}
        type="button"
        data-build-status={state}
        aria-label={ariaLabel}
        title={
          summary.headlineNote
            ? noteNames
            : compact && summary.short.more
              ? summary.headline
              : undefined
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? id : undefined}
        onClick={() => {
          setShowAll(false);
          setOpen((value) => !value);
        }}
        className={`${buttonClass} ${BUILD_STATE_TINT_CLASS[state]} ${compact ? compactSizeClass : sizeClass}`}
      >
        <BuildStatusLabel summary={summary} compact={compact} />
        {/* Phone: the readouts toggle beside it already shows a chevron. */}
        {!compact && (
          <AppIcon
            name="chevron-down"
            size="inline"
            aria-hidden="true"
            className="text-text-theme-secondary shrink-0"
          />
        )}
      </button>
      {open &&
        createPortal(
          <>
            {/* Dims the workspace behind the panel; a press closes it. */}
            <div
              aria-hidden="true"
              data-validation-scrim
              className="fixed inset-0 z-[69] bg-black/50"
              onPointerDown={(event) => {
                event.preventDefault();
                close();
              }}
            />
            <div
              ref={panel}
              id={id}
              role="dialog"
              aria-labelledby={`${id}-title ${id}-summary`}
              data-panel-layout={position.sheet ? 'sheet' : 'popover'}
              className={`bg-surface-base border-border-theme text-text-theme-primary fixed z-[70] flex flex-col overflow-hidden border shadow-xl ${
                position.sheet
                  ? 'inset-x-0 bottom-0 max-h-[80dvh] rounded-t-xl border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]'
                  : 'rounded-lg'
              }`}
              style={
                position.sheet
                  ? undefined
                  : {
                      left: position.left,
                      top: position.top,
                      width: `min(${PANEL_WIDTH}px, calc(100vw - 1rem))`,
                      maxHeight: position.maxHeight,
                    }
              }
            >
              <ValidationPanelHeader
                titleId={`${id}-title`}
                title={`${unitName} \u00b7 Build status`}
                onClose={() => {
                  close();
                  trigger.current?.focus();
                }}
              />
              <div className="min-h-0 overflow-y-auto overscroll-contain">
                <p
                  id={`${id}-summary`}
                  className="border-border-theme flex items-center gap-2 border-b px-4 py-3 text-base leading-6 font-semibold"
                >
                  <BuildStateIcon state={state} />
                  {summary.panelHeading}
                </p>
                {RULE_GROUPS.map(({ severity, title }) => {
                  const group = shown.filter(
                    (item) => item.severity === severity,
                  );
                  if (group.length === 0) return null;
                  return (
                    <section key={severity} aria-label={title}>
                      <ValidationGroupHeading kind={severity} />
                      <ul>
                        {group.map((item, index) => (
                          <ValidationIssueRow
                            key={`${item.error.ruleId}-${item.error.field ?? ''}-${index}`}
                            issue={item}
                            headingId={`${id}-${severity}-${index}`}
                            destinations={issueDestinations(item)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
                {!showAll && issues.length > shown.length && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="border-border-theme text-text-theme-primary hover:bg-surface-raised min-h-11 w-full border-b px-4 text-left text-sm"
                  >
                    +{issues.length - shown.length} more issues {'\u00b7'} Show
                    all
                  </button>
                )}
                {(noteIssues.length > 0 || notes.length > 0) && (
                  <section aria-label="Notes">
                    <ValidationGroupHeading kind="note" />
                    <ul>
                      {noteIssues.map((item, index) => (
                        <ValidationIssueRow
                          key={`${item.error.ruleId}-${item.error.field ?? ''}-${index}`}
                          issue={item}
                          headingId={`${id}-info-${index}`}
                          destinations={issueDestinations(item)}
                        />
                      ))}
                      {notes.map((note) => (
                        <ValidationNoteRow
                          key={note.id}
                          note={note}
                          headingId={`${id}-note-${note.id}`}
                          destinations={noteDestinations(note)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
                {details !== undefined && (
                  <div className="border-border-theme bg-surface-deep/40 border-t px-4 py-2">
                    {details}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
