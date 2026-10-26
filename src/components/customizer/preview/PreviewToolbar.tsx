/**
 * Preview Toolbar Component
 *
 * Toolbar with Download PDF and Print buttons for the record sheet preview.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, { useCallback, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { PaperSize } from '@/types/printing';
import { logger } from '@/utils/logger';

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
        logger.error(
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
      className={`preview-toolbar shrink-0 p-2 sm:px-4 sm:py-3 ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        backgroundColor: 'var(--surface-base)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Paper Size Select */}
      <div
        className="min-w-0 flex-1 sm:flex-none"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <label
          htmlFor="paper-size"
          className="sr-only sm:not-sr-only"
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          Paper Size:
        </label>
        <select
          id="paper-size"
          className="min-h-11 w-full min-w-0 sm:w-auto"
          value={paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
          disabled={isBusy}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          <option value={PaperSize.LETTER}>
            Letter (8.5&quot; × 11&quot;)
          </option>
          <option value={PaperSize.A4}>A4 (210mm × 297mm)</option>
        </select>
      </div>

      {/* Spacer */}
      <div className="hidden sm:block" style={{ flex: 1 }} />

      {/* Print Button */}
      <button
        type="button"
        className="shrink-0 px-3 sm:px-4"
        onClick={() => {
          void runAction('print');
        }}
        disabled={isBusy}
        aria-busy={isPrinting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingTop: '8px',
          paddingBottom: '8px',
          minHeight: 44,
          whiteSpace: 'nowrap',
          borderRadius: '6px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-raised)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isBusy ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: isBusy ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isBusy) {
            e.currentTarget.style.backgroundColor = 'var(--surface-base)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--surface-raised)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
      >
        <PrintIcon />
        <span className="sr-only sm:not-sr-only">
          {isPrinting ? 'Printing...' : 'Print'}
        </span>
      </button>

      {/* Download PDF Button */}
      <button
        type="button"
        onClick={() => {
          void runAction('export');
        }}
        disabled={isBusy}
        aria-busy={isExporting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          minHeight: 44,
          whiteSpace: 'nowrap',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: isBusy
            ? 'var(--surface-raised)'
            : 'var(--accent-primary)',
          color: isBusy ? 'var(--text-primary)' : 'var(--color-on-accent)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isBusy ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: isBusy ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isBusy) {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isBusy) {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
          }
        }}
      >
        <DownloadIcon />
        {isExporting ? 'Exporting...' : 'Download PDF'}
      </button>

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
