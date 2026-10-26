import React from 'react';

import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PreviewToolbar } from './PreviewToolbar';
import { formatZoomPercent } from './recordSheetPreviewZoom';
import { RecordSheetPreviewZoomControls } from './RecordSheetPreviewZoomControls';
import {
  RecordSheetPreviewZoomContext,
  useRecordSheetPreviewZoom,
} from './useRecordSheetPreviewZoom';

const PAPER_CAPTION: Record<PaperSize, string> = {
  [PaperSize.LETTER]: 'Letter',
  [PaperSize.A4]: 'A4',
};

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

      <p
        className="border-border-theme-subtle bg-surface-base text-text-theme-muted shrink-0 border-t px-4 py-1 text-xs"
        data-testid="preview-sheet-caption"
      >
        {PAPER_CAPTION[toolbarActions.paperSize]} {'\u00b7'} 1 page
        {/* Phones keep the zoom readout here so the toolbar fits one row;
            screen readers already hear the toolbar's Current zoom output. */}
        <span aria-hidden="true" className="sm:hidden">
          {' \u00b7 '}
          {formatZoomPercent(zoomState.zoom)}
        </span>
      </p>
    </div>
  );
}
