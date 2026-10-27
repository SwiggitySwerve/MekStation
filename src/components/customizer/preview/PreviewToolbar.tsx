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
    <div
      className={`preview-toolbar border-border-theme-subtle bg-surface-base grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1.5 gap-y-1 border-b px-2 py-1.5 sm:flex sm:flex-wrap sm:gap-3 sm:px-4 sm:py-3 ${className}`}
    >
      {/* Paper Size Select. Phones show a labelled 44px "Paper: Letter"
          control over the native select; desktop shows the label and select. */}
      <div className="max-sm:has-[select:focus-visible]:ring-accent relative flex min-w-0 items-center gap-2 max-sm:rounded-md max-sm:has-[select:disabled]:opacity-70 max-sm:has-[select:focus-visible]:ring-2 sm:shrink-0">
        <label
          htmlFor="paper-size"
          className="text-text-theme-secondary sr-only text-[13px] font-medium whitespace-nowrap sm:not-sr-only"
        >
          Paper Size:
        </label>
        <span
          aria-hidden="true"
          data-testid="paper-size-phone-label"
          className={`${PREVIEW_CONTROL_CLASS} flex w-full min-w-0 items-center justify-between gap-1.5 whitespace-nowrap sm:hidden`}
        >
          <span className="truncate">
            <span className="text-text-theme-secondary">Paper: </span>
            {PAPER_SHORT_LABEL[paperSize]}
          </span>
          <AppIcon name="chevron-down" size="inline" />
        </span>
        <select
          id="paper-size"
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

      {/* Zoom: the first row on phones, between paper size and actions on
          desktop. */}
      {zoomControls ? (
        <div className="max-sm:order-first max-sm:col-span-3">
          {zoomControls}
        </div>
      ) : null}

      {/* Print + Download PDF: grid cells on phones (second row, icon and
          text), one trailing group on desktop. */}
      <div className="contents sm:ml-auto sm:flex sm:shrink-0 sm:items-center sm:gap-2">
        {/* Print Button */}
        <button
          type="button"
          className={`${PREVIEW_CONTROL_CLASS} inline-flex items-center justify-center gap-1.5 whitespace-nowrap max-sm:px-2.5 sm:px-4`}
          onClick={() => {
            void runAction('print');
          }}
          disabled={isBusy}
          aria-busy={isPrinting}
        >
          <PrintIcon />
          <span>{isPrinting ? 'Printing...' : 'Print'}</span>
        </button>

        {/* Download PDF Button */}
        <button
          type="button"
          onClick={() => {
            void runAction('export');
          }}
          disabled={isBusy}
          aria-busy={isExporting}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] leading-none font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset max-sm:px-2.5 sm:px-4 ${
            isBusy
              ? 'border-border-theme bg-surface-raised text-text-theme-primary cursor-not-allowed opacity-70'
              : 'bg-accent text-on-accent hover:bg-accent-hover focus-visible:ring-on-accent border-transparent'
          }`}
        >
          <DownloadIcon />
          <span>{isExporting ? 'Exporting...' : 'Download PDF'}</span>
        </button>
      </div>
      {actionError ? (
        <div
          role="alert"
          className="max-sm:col-span-3"
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
