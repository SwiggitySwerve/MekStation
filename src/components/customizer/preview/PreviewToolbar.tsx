/**
 * Preview Toolbar Component
 *
 * Toolbar with paper size, zoom, Print and Download PDF controls for the
 * record sheet preview.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, { useCallback, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { PaperSize } from '@/types/printing';
import { logger } from '@/utils/logger';

import { PAPER_SHORT_LABEL } from './paperSizeLabels';
import { PREVIEW_CONTROL_CLASS } from './previewToolbarStyles';

// =============================================================================
// Types
// =============================================================================

type ToolbarAction = 'print' | 'export';

interface PreviewToolbarProps {
  /** Callback to export PDF */
  onExportPDF: () => Promise<void>;
  /** Callback to print */
  onPrint: () => Promise<void>;
  /** Current paper size */
  paperSize: PaperSize;
  /** Callback to change paper size */
  onPaperSizeChange: (size: PaperSize) => void;
  /** Zoom controls shown beside the paper size (owned by the preview frame). */
  zoomControls?: React.ReactNode;
  /** Page count shown after the zoom controls on wider screens, e.g. "1 page". */
  pageCount?: string;
  /**
   * Drawn width of the sheet in px. Wider screens centre the toolbar on the
   * sheet's axis at the sheet's width (at least 48rem), so the toolbar panel
   * and the sheet below share their edges.
   */
  sheetWidth?: number;
  /** CSS class name */
  className?: string;
}

interface ToolbarActionError {
  readonly action: ToolbarAction;
  readonly message: string;
}

function actionErrorMessage(action: ToolbarAction, error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return action === 'print'
    ? 'Failed to open print dialog. Please check popup blocker settings.'
    : 'Failed to export PDF. Please try again.';
}

// =============================================================================
// Component
// =============================================================================

/**
 * Preview Toolbar Component
 *
 * Provides export and print controls for the record sheet.
 */
export function PreviewToolbar({
  onExportPDF,
  onPrint,
  paperSize,
  onPaperSizeChange,
  zoomControls,
  pageCount,
  sheetWidth,
  className = '',
}: PreviewToolbarProps): React.ReactElement {
  const [pendingAction, setPendingAction] = useState<ToolbarAction | null>(
    null,
  );
  const [actionError, setActionError] = useState<ToolbarActionError | null>(
    null,
  );
  const pendingRef = React.useRef(false);

  const runAction = useCallback(
    async (action: ToolbarAction) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPendingAction(action);
      setActionError(null);
      try {
        if (action === 'print') {
          await onPrint();
        } else {
          await onExportPDF();
        }
      } catch (error) {
        // This failure is handled inline with Retry. Logging it as an error
        // opens Next's development overlay over that recovery control.
        logger.warn(
          action === 'print' ? 'Error printing:' : 'Error exporting PDF:',
          error,
        );
        setActionError({
          action,
          message: actionErrorMessage(action, error),
        });
      } finally {
        pendingRef.current = false;
        setPendingAction(null);
      }
    },
    [onExportPDF, onPrint],
  );

  const isBusy = pendingAction !== null;
  const isPrinting = pendingAction === 'print';
  const isExporting = pendingAction === 'export';

  return (
    // One row on phones (zoom, paper, then icon-only Print and a short
    // "PDF" Download).
    // Wider screens centre the panel on the sheet's axis at the sheet's width.
    <div
      className={`preview-toolbar border-border-theme-subtle bg-surface-raised/40 m-2 flex shrink-0 flex-wrap items-center gap-1 rounded-lg border px-1.5 py-1.5 sm:mx-[max(1rem,calc((100%_-_var(--preview-sheet-width))_/_2))] sm:mt-4 sm:mb-3 sm:gap-3 sm:px-4 sm:py-3 ${className}`}
      style={
        sheetWidth
          ? ({
              '--preview-sheet-width': `max(${sheetWidth}px, 48rem)`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Paper Size Select. Desktop shows the visible label "Paper" and the
          select; phones show a 44px "Letter" control over the native select,
          so the paper name never truncates and the toolbar keeps one row.
          The select keeps the accessible name "Paper Size". */}
      <div className="max-sm:has-[select:focus-visible]:ring-accent relative flex min-w-0 shrink-0 items-center gap-2 max-sm:rounded-md max-sm:has-[select:disabled]:opacity-70 max-sm:has-[select:focus-visible]:ring-2">
        <label
          htmlFor="paper-size"
          className="text-text-theme-secondary sr-only text-[13px] font-medium whitespace-nowrap sm:not-sr-only"
        >
          Paper
        </label>
        <span
          aria-hidden="true"
          data-testid="paper-size-phone-label"
          className={`${PREVIEW_CONTROL_CLASS} flex w-full min-w-0 items-center justify-between gap-1 whitespace-nowrap max-sm:px-2 sm:hidden`}
        >
          <span className="truncate">{PAPER_SHORT_LABEL[paperSize]}</span>
          <AppIcon name="chevron-down" size="inline" />
        </span>
        <select
          id="paper-size"
          aria-label="Paper Size"
          className={`${PREVIEW_CONTROL_CLASS} max-sm:absolute max-sm:inset-0 max-sm:h-full max-sm:w-full max-sm:cursor-pointer max-sm:opacity-0`}
          value={paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
          disabled={isBusy}
        >
          <option value={PaperSize.LETTER}>
            Letter (8.5&quot; &times; 11&quot;)
          </option>
          <option value={PaperSize.A4}>A4 (210mm &times; 297mm)</option>
        </select>
      </div>

      {/* Zoom: first and flexible on phones, between paper size and actions
          on desktop. */}
      {zoomControls ? (
        <div className="max-sm:order-first max-sm:min-w-0 max-sm:flex-1">
          {zoomControls}
        </div>
      ) : null}

      {/* The page count; the paper name is already in the selector. */}
      {pageCount ? (
        <p
          data-testid="preview-sheet-caption"
          className="text-text-theme-secondary m-0 hidden text-[13px] whitespace-nowrap tabular-nums sm:block"
        >
          {pageCount}
        </p>
      ) : null}

      {/* Print + Download PDF: on phones Print is a 44px icon button and
          Download keeps a short visible "PDF" beside its icon (the full text
          stays as each accessible name); one trailing text group on
          desktop. */}
      <div className="contents sm:ml-auto sm:flex sm:shrink-0 sm:items-center sm:gap-2">
        {/* Print Button */}
        <button
          type="button"
          className={`${PREVIEW_CONTROL_CLASS} inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap max-sm:w-11 max-sm:px-0 sm:px-4`}
          onClick={() => {
            void runAction('print');
          }}
          disabled={isBusy}
          aria-busy={isPrinting}
          title="Print"
        >
          <PrintIcon />
          <span className="max-sm:sr-only">
            {isPrinting ? 'Printing...' : 'Print'}
          </span>
        </button>

        {/* Download PDF: the tab's main action as a strong secondary
            (stronger border, semibold), so "Save to Library" in the header
            stays the screen's only amber primary. */}
        <button
          type="button"
          onClick={() => {
            void runAction('export');
          }}
          disabled={isBusy}
          aria-busy={isExporting}
          title="Download PDF"
          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] leading-none font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset max-sm:gap-1 max-sm:!px-2 sm:px-4 ${
            isBusy
              ? 'border-border-theme bg-surface-raised text-text-theme-primary cursor-not-allowed opacity-70'
              : 'border-border-theme-strong bg-surface-raised text-text-theme-primary hover:bg-border-theme focus-visible:ring-accent font-semibold'
          }`}
        >
          <DownloadIcon />
          <span className="max-sm:sr-only">
            {isExporting ? 'Exporting...' : 'Download PDF'}
          </span>
          <span aria-hidden="true" className="sm:hidden">
            PDF
          </span>
        </button>
      </div>
      {actionError ? (
        <div
          role="alert"
          style={{
            flexBasis: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        >
          <span>{actionError.message}</span>
          <button
            type="button"
            onClick={() => {
              void runAction(actionError.action);
            }}
            aria-label={
              actionError.action === 'print'
                ? 'Retry print'
                : 'Retry PDF export'
            }
            style={{
              padding: '8px 16px',
              minHeight: 44,
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
// =============================================================================
// Icons
// =============================================================================

function PrintIcon(): React.ReactElement {
  return (
    <SvgIcon size="inline" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </SvgIcon>
  );
}

function DownloadIcon(): React.ReactElement {
  return <AppIcon name="download" size="inline" aria-hidden="true" />;
}
