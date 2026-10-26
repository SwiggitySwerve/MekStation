import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

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
  BUILD_STATUS_KIND_TEXT_CLASS,
  BuildStatusLabel,
  SeverityIcon,
} from './BuildStatusLabel';
import {
  getBuildStatusSummary,
  noteText,
  type BuildState,
} from './buildStatusSummary';
import {
  measureStatusPanelLayout,
  type StatusPanelLayout,
} from './statusPanelLayout';
import { ValidationSummaryPanel } from './ValidationSummaryPanel';
import {
  flattenErrors,
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
   * Readout warnings (e.g. running hot), listed after the rule warnings.
   * With nothing else to report the button reads as the item itself, e.g.
   * "Runs hot +11".
   */
  notes?: readonly ValidationNote[];
  /** Extra status shown at the foot of the panel (e.g. save state). */
  details?: React.ReactNode;
  /** Full-width phone status row, with a severity icon for each group. */
  compact?: boolean;
  /**
   * Raise to open the panel from elsewhere (the tab issue notice's "Show all
   * issues"); the panel opens on every change, never on first render.
   */
  openRequest?: number;
}

const NO_NOTES: readonly ValidationNote[] = [];

const buttonClass =
  'focus-visible:outline-accent hover:bg-surface-raised flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px]';
const sizeClass = 'px-3 text-[13px]';
/**
 * Phone: one full-width row under the readouts, with every group spelled out.
 * Important overrides beat the global unlayered `button` padding and size.
 */
const compactSizeClass = 'h-11 w-full !px-2 !py-0 !text-sm';

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
  openRequest = 0,
}: ValidationSummaryProps): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [layout, setLayout] = useState<StatusPanelLayout>({
    mode: 'popover',
    left: 0,
    top: 0,
    width: 384,
    maxHeight: 400,
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
  const handledOpenRequest = useRef(openRequest);
  useEffect(() => {
    if (openRequest === handledOpenRequest.current) return;
    handledOpenRequest.current = openRequest;
    setShowAll(false);
    setOpen(true);
  }, [openRequest]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = (): void => {
      if (trigger.current) setLayout(measureStatusPanelLayout(trigger.current));
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
        className={`inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-[13px] font-semibold whitespace-nowrap ${compact ? 'w-full justify-center !text-sm' : ''} ${busy || !validation.isValid ? 'text-text-theme-secondary' : 'text-text-theme-primary'} ${className}`}
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
  // The full summary, the readout warnings by name when the headline only
  // counts them, and what the button opens.
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
            : compact
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
        {compact && !summary.headlineNote && state !== 'ready' ? (
          summary.parts.map((part, index) => (
            <React.Fragment key={part.kind}>
              {index > 0 && (
                <span aria-hidden="true" className="text-text-theme-secondary">
                  {'\u00b7'}
                </span>
              )}
              <span
                data-build-status-part={part.kind}
                className={`inline-flex items-center gap-1 ${BUILD_STATUS_KIND_TEXT_CLASS[part.kind]}`}
              >
                <SeverityIcon kind={part.kind} />
                {part.text}
              </span>
            </React.Fragment>
          ))
        ) : (
          <BuildStatusLabel summary={summary} compact={false} />
        )}
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
      {open && (
        <ValidationSummaryPanel
          id={id}
          panelRef={panel}
          layout={layout}
          state={state}
          summary={summary}
          unitName={unitName}
          notes={notes}
          shown={shown}
          totalIssues={issues.length}
          showAll={showAll}
          details={details}
          onShowAll={() => setShowAll(true)}
          onDismiss={close}
          onCloseButton={() => {
            close();
            trigger.current?.focus();
          }}
          issueDestinations={issueDestinations}
          noteDestinations={noteDestinations}
        />
      )}
    </div>
  );
}
