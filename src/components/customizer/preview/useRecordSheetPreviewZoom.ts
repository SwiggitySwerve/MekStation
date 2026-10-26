import React from 'react';

import {
  clampRecordSheetPreviewZoom,
  computeZoomForMode,
  RECORD_SHEET_PREVIEW_ZOOM_STEP,
  type RecordSheetPreviewZoomMode,
} from './recordSheetPreviewZoom';

export interface RecordSheetPreviewZoom {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly zoom: number;
  readonly mode: RecordSheetPreviewZoomMode;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly fitToWidth: () => void;
  readonly fitToPage: () => void;
}

export function useRecordSheetPreviewZoom(
  pageWidth: number,
  pageHeight: number,
): RecordSheetPreviewZoom {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mode, setMode] =
    React.useState<RecordSheetPreviewZoomMode>('fit-page');
  const [zoom, setZoom] = React.useState(1);
  const modeRef = React.useRef(mode);
  modeRef.current = mode;

  // Pick the phone presentation after mount so server and client markup agree.
  // Subsequent resizing preserves the user's chosen fit mode or manual zoom.
  React.useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) {
      setMode('fit-width');
    }
  }, []);

  const applyFit = React.useCallback(
    (selected: RecordSheetPreviewZoomMode) => {
      const container = containerRef.current;
      if (!container) return;
      const nextZoom = computeZoomForMode(
        selected,
        container.clientWidth,
        container.clientHeight,
        pageWidth,
        pageHeight,
      );
      if (nextZoom === null) return;
      setZoom(nextZoom);
    },
    [pageHeight, pageWidth],
  );

  React.useEffect(() => {
    if (mode === 'manual') return;
    applyFit(mode);
  }, [applyFit, mode]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      const selected = modeRef.current;
      if (selected === 'manual') return;
      applyFit(selected);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [applyFit]);

  const zoomIn = React.useCallback(() => {
    setMode('manual');
    setZoom((value) =>
      clampRecordSheetPreviewZoom(value + RECORD_SHEET_PREVIEW_ZOOM_STEP),
    );
  }, []);

  const zoomOut = React.useCallback(() => {
    setMode('manual');
    setZoom((value) =>
      clampRecordSheetPreviewZoom(value - RECORD_SHEET_PREVIEW_ZOOM_STEP),
    );
  }, []);

  const fitToWidth = React.useCallback(() => {
    setMode('fit-width');
    applyFit('fit-width');
  }, [applyFit]);

  const fitToPage = React.useCallback(() => {
    setMode('fit-page');
    applyFit('fit-page');
  }, [applyFit]);

  return {
    containerRef,
    zoom,
    mode,
    zoomIn,
    zoomOut,
    fitToWidth,
    fitToPage,
  };
}
