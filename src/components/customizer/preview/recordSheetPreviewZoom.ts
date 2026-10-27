export type RecordSheetPreviewZoomMode =
  | 'manual'
  | 'fit-width'
  | 'fit-page'
  | 'actual';

export const MIN_RECORD_SHEET_PREVIEW_ZOOM = 0.2;
export const MAX_RECORD_SHEET_PREVIEW_ZOOM = 3;
export const RECORD_SHEET_PREVIEW_ZOOM_STEP = 0.15;
export const RECORD_SHEET_PREVIEW_VIEWPORT_PADDING = 48;
/**
 * Widest the sheet is drawn by the fit modes, so a very wide viewer shows a
 * readable sheet with gutters instead of an enormous one.
 */
export const RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH = 920;

/**
 * Below this zoom the sheet's small print is hard to read, so phones show a
 * hint to zoom in. 100% draws one CSS pixel per paper point.
 */
export const RECORD_SHEET_PREVIEW_READABLE_ZOOM = 0.9;

/** Zoom of the 100% (actual size) mode: one CSS pixel per paper point. */
export const RECORD_SHEET_PREVIEW_ACTUAL_ZOOM = 1;

/** The zoom as the readout shows it, e.g. "150%" (toolbar readout). */
export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

function fitAvailableWidth(viewportWidth: number): number {
  return Math.min(
    viewportWidth - RECORD_SHEET_PREVIEW_VIEWPORT_PADDING,
    RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH,
  );
}

export function clampRecordSheetPreviewZoom(zoom: number): number {
  return Math.min(
    MAX_RECORD_SHEET_PREVIEW_ZOOM,
    Math.max(MIN_RECORD_SHEET_PREVIEW_ZOOM, zoom),
  );
}

export function computeFitWidthZoom(
  viewportWidth: number,
  pageWidth: number,
): number | null {
  const availableWidth = fitAvailableWidth(viewportWidth);
  if (availableWidth <= 0 || pageWidth <= 0) return null;
  return clampRecordSheetPreviewZoom(availableWidth / pageWidth);
}

export function computeFitPageZoom(
  viewportWidth: number,
  viewportHeight: number,
  pageWidth: number,
  pageHeight: number,
): number | null {
  const availableWidth = fitAvailableWidth(viewportWidth);
  const availableHeight =
    viewportHeight - RECORD_SHEET_PREVIEW_VIEWPORT_PADDING;
  if (
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    pageWidth <= 0 ||
    pageHeight <= 0
  ) {
    return null;
  }
  return clampRecordSheetPreviewZoom(
    Math.min(availableWidth / pageWidth, availableHeight / pageHeight),
  );
}

export function computeZoomForMode(
  mode: RecordSheetPreviewZoomMode,
  viewportWidth: number,
  viewportHeight: number,
  pageWidth: number,
  pageHeight: number,
): number | null {
  if (mode === 'fit-width') {
    return computeFitWidthZoom(viewportWidth, pageWidth);
  }
  if (mode === 'actual') {
    return RECORD_SHEET_PREVIEW_ACTUAL_ZOOM;
  }
  if (mode === 'fit-page') {
    return computeFitPageZoom(
      viewportWidth,
      viewportHeight,
      pageWidth,
      pageHeight,
    );
  }
  return null;
}
