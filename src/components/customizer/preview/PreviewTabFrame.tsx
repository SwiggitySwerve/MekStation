import React from 'react';

import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PAPER_SHORT_LABEL } from './paperSizeLabels';
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

  return (
    <div
      className={`preview-tab bg-surface-base flex h-full min-h-0 flex-col ${className}`}
      data-testid={testId}
    >
      <PreviewToolbar
        {...toolbarActions}
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

      <div className="border-border-theme-subtle bg-surface-base text-text-theme-muted flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 border-t px-4 py-1 text-xs">
        <p data-testid="preview-sheet-caption">
          {PAPER_SHORT_LABEL[toolbarActions.paperSize]} {'\u00b7'} 1 page
        </p>
        {/* Phones only: a fitted sheet is too small to read, so say how to
            read it. The toolbar above shows the zoom percentage. */}
        {zoomState.zoom < RECORD_SHEET_PREVIEW_READABLE_ZOOM ? (
          <p className="sm:hidden" data-testid="preview-sheet-hint">
            Zoom in or pinch to read details
          </p>
        ) : null}
      </div>
    </div>
  );
}
