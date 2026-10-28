import React from 'react';

import { Button } from '@/components/ui/Button';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PreviewToolbar } from './PreviewToolbar';
import { RECORD_SHEET_PREVIEW_READABLE_ZOOM } from './recordSheetPreviewZoom';
import { RecordSheetPreviewZoomControls } from './RecordSheetPreviewZoomControls';
import {
  RecordSheetPreviewZoomContext,
  useRecordSheetPreviewZoom,
} from './useRecordSheetPreviewZoom';

export interface PreviewToolbarActions {
  onExportPDF: () => Promise<void>;
  onPrint: () => Promise<void>;
  paperSize: PaperSize;
  onPaperSizeChange: (paperSize: PaperSize) => void;
}

interface PreviewTabFrameProps {
  className?: string;
  testId?: string;
  toolbarActions: PreviewToolbarActions;
  children: React.ReactNode;
}

export function PreviewTabFrame({
  className = '',
  testId,
  toolbarActions,
  children,
}: PreviewTabFrameProps): React.ReactElement {
  // The toolbar owns the zoom controls; the sheet viewer below follows them.
  const { width, height } = PAPER_DIMENSIONS[toolbarActions.paperSize];
  const zoomState = useRecordSheetPreviewZoom(width, height);
  const pageCount = '1 page';

  return (
    <div
      className={`preview-tab bg-surface-base flex h-full min-h-0 flex-col ${className}`}
      data-testid={testId}
    >
      <PreviewToolbar
        {...toolbarActions}
        pageCount={pageCount}
        sheetWidth={Math.round(width * zoomState.zoom)}
        zoomControls={
          <RecordSheetPreviewZoomControls
            zoom={zoomState.zoom}
            mode={zoomState.mode}
            onZoomIn={zoomState.zoomIn}
            onZoomOut={zoomState.zoomOut}
            onFitToWidth={zoomState.fitToWidth}
            onFitToPage={zoomState.fitToPage}
            onActualSize={zoomState.actualSize}
          />
        }
      />

      <RecordSheetPreviewZoomContext.Provider value={zoomState}>
        <div className="min-h-0 flex-1">{children}</div>
      </RecordSheetPreviewZoomContext.Provider>

      {/* Phones only: the one-row toolbar has no room for the page count,
          so a footer in the toolbar's panel tone carries it and, while the
          fitted sheet is too small to read, says how to read it beside a
          Zoom In button that opens the sheet at 100%, kept off the sheet so
          it covers nothing. Wider screens show the page count in the
          toolbar. */}
      <div
        className="border-border-theme-subtle bg-surface-raised/40 text-text-theme-secondary flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-t px-4 py-1 text-xs sm:hidden"
        data-testid="preview-sheet-footer"
      >
        <p data-testid="preview-sheet-caption-phone">{pageCount}</p>
        {zoomState.zoom < RECORD_SHEET_PREVIEW_READABLE_ZOOM ? (
          <div className="flex items-center gap-2">
            <p data-testid="preview-sheet-hint">
              Zoom in or pinch to read details
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={zoomState.actualSize}
              aria-label="Zoom in to 100%"
              data-testid="preview-sheet-zoom-in"
              className="shrink-0 !gap-1.5 !px-3 !py-0"
            >
              {/* The toolbar's zoom-in magnifier. */}
              <SvgIcon size="inline" aria-hidden="true">
                <circle cx="10" cy="10" r="7" />
                <path d="m15 15 7 7M7 10h6M10 7v6" />
              </SvgIcon>
              Zoom In
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
