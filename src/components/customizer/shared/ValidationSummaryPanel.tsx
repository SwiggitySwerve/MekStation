import React from 'react';
import { createPortal } from 'react-dom';

import { type BuildStatusSummary } from './buildStatusSummary';
import { type StatusPanelLayout } from './statusPanelLayout';
import {
  ValidationGroupHeading,
  ValidationIssueRow,
  ValidationNoteRow,
  ValidationPanelHeader,
  ValidationSummaryLine,
  type FixDestination,
  type ValidationIssue,
  type ValidationNote,
} from './ValidationSummaryRows';

/** Rule results with their own panel group; infos are listed as notes. */
const RULE_GROUPS = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
] as const;
/** Readout items (running hot) are listed in this group. */
const READOUT_GROUP = 'warning';

interface ValidationSummaryPanelProps {
  id: string;
  panelRef: React.RefObject<HTMLDivElement | null>;
  layout: StatusPanelLayout;
  summary: BuildStatusSummary;
  unitName: string;
  notes: readonly ValidationNote[];
  /** Issues currently listed (all of them, or the first `maxItems`). */
  shown: readonly ValidationIssue[];
  totalIssues: number;
  showAll: boolean;
  details?: React.ReactNode;
  onShowAll: () => void;
  /** Closes the panel without moving focus (scrim press, fix action). */
  onDismiss: () => void;
  /** Closes the panel and returns focus to the trigger (close button). */
  onCloseButton: () => void;
  issueDestinations: (issue: ValidationIssue) => FixDestination[];
  noteDestinations: (note: ValidationNote) => FixDestination[];
}

/**
 * The open build-status panel: scrim plus the popover, drawer or phone sheet,
 * portalled to the document body.
 */
export function ValidationSummaryPanel({
  id,
  panelRef,
  layout,
  summary,
  unitName,
  notes,
  shown,
  totalIssues,
  showAll,
  details,
  onShowAll,
  onDismiss,
  onCloseButton,
  issueDestinations,
  noteDestinations,
}: ValidationSummaryPanelProps): React.ReactElement {
  const noteIssues = shown.filter((item) => item.severity === 'info');
  return createPortal(
    <>
      {/* Dims the page behind a sheet or popover; a press closes it.
                The drawer leaves the tab content visible (a press outside
                still closes it). */}
      {layout.mode !== 'drawer' && (
        <div
          aria-hidden="true"
          data-validation-scrim
          className={`fixed inset-0 z-[69] ${layout.mode === 'sheet' ? 'bg-black/60' : 'bg-black/50'}`}
          onPointerDown={(event) => {
            event.preventDefault();
            onDismiss();
          }}
        />
      )}
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-labelledby={`${id}-title ${id}-summary`}
        data-panel-layout={layout.mode}
        className={`bg-surface-base border-border-theme text-text-theme-primary fixed z-[70] flex flex-col overflow-hidden border shadow-xl ${
          layout.mode === 'sheet'
            ? 'inset-x-0 bottom-0 max-h-[80dvh] rounded-t-xl border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]'
            : layout.mode === 'drawer'
              ? 'border-y-0 border-r-0'
              : 'rounded-lg'
        }`}
        style={
          layout.mode === 'sheet'
            ? undefined
            : {
                left: layout.left,
                top: layout.top,
                width: layout.width,
                height: layout.height,
                maxHeight: layout.maxHeight,
              }
        }
      >
        {layout.mode === 'sheet' && (
          <span
            aria-hidden="true"
            data-validation-sheet-handle
            className="bg-border-theme-strong mx-auto mt-2 mb-0.5 h-1 w-10 shrink-0 rounded-full"
          />
        )}
        <ValidationPanelHeader
          titleId={`${id}-title`}
          unitName={unitName}
          onClose={onCloseButton}
        />
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <ValidationSummaryLine id={`${id}-summary`} summary={summary} />
          {RULE_GROUPS.map(({ severity, title }) => {
            const group = shown.filter((item) => item.severity === severity);
            const readouts = severity === READOUT_GROUP ? notes : [];
            if (group.length === 0 && readouts.length === 0) return null;
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
                  {readouts.map((note) => (
                    <ValidationNoteRow
                      key={note.id}
                      note={note}
                      headingId={`${id}-readout-${note.id}`}
                      destinations={noteDestinations(note)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          {!showAll && totalIssues > shown.length && (
            <button
              type="button"
              onClick={() => onShowAll()}
              className="border-border-theme text-text-theme-primary hover:bg-surface-raised min-h-11 w-full border-b px-4 text-left text-sm"
            >
              +{totalIssues - shown.length} more issues {'\u00b7'} Show all
            </button>
          )}
          {noteIssues.length > 0 && (
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
  );
}
