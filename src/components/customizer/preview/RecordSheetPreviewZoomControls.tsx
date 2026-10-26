import React from 'react';

import { SvgIcon } from '@/components/ui/SvgIcon';

import type { RecordSheetPreviewZoomMode } from './recordSheetPreviewZoom';

import {
  PREVIEW_SEGMENT_CLASS,
  PREVIEW_SEGMENT_GROUP_CLASS,
} from './previewToolbarStyles';

interface RecordSheetPreviewZoomControlsProps {
  readonly zoom: number;
  readonly mode: RecordSheetPreviewZoomMode;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitToWidth: () => void;
  readonly onFitToPage: () => void;
  readonly onActualSize: () => void;
  readonly className?: string;
}

/**
 * Zoom stepper (- 100% +) beside a segmented Fit page / Fit width / 100%
 * control. The active mode is the pressed segment; stepping the zoom leaves
 * all three unpressed (manual zoom).
 */
export function RecordSheetPreviewZoomControls({
  zoom,
  mode,
  onZoomIn,
  onZoomOut,
  onFitToWidth,
  onFitToPage,
  onActualSize,
  className = '',
}: RecordSheetPreviewZoomControlsProps): React.ReactElement {
  return (
    <div
      className={`flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap ${className}`}
      role="group"
      aria-label="Record sheet zoom controls"
    >
      <div
        className={`${PREVIEW_SEGMENT_GROUP_CLASS} w-full shrink-0 sm:w-auto`}
      >
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className={PREVIEW_SEGMENT_CLASS}
        >
          <SvgIcon size="inline" aria-hidden="true">
            <circle cx="10" cy="10" r="7" />
            <path d="m15 15 7 7M7 10h6" />
          </SvgIcon>
        </button>
        <output
          className="text-text-theme-primary inline-flex min-w-14 flex-1 items-center justify-center px-3 text-center text-[13px] font-medium whitespace-nowrap tabular-nums"
          aria-live="polite"
          aria-label="Current zoom"
        >
          {mode === 'fit-width'
            ? 'Fit width · '
            : mode === 'fit-page'
              ? 'Fit page · '
              : ''}
          {Math.round(zoom * 100)}%
        </output>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className={PREVIEW_SEGMENT_CLASS}
        >
          <SvgIcon size="inline" aria-hidden="true">
            <circle cx="10" cy="10" r="7" />
            <path d="m15 15 7 7M7 10h6M10 7v6" />
          </SvgIcon>
        </button>
      </div>

      <div
        className={`${PREVIEW_SEGMENT_GROUP_CLASS} min-w-0 flex-1 sm:flex-none`}
        role="group"
        aria-label="Sheet size"
      >
        <button
          type="button"
          onClick={onFitToPage}
          aria-pressed={mode === 'fit-page'}
          className={`${PREVIEW_SEGMENT_CLASS} flex-1 whitespace-nowrap`}
        >
          Fit page
        </button>
        <button
          type="button"
          onClick={onFitToWidth}
          aria-pressed={mode === 'fit-width'}
          className={`${PREVIEW_SEGMENT_CLASS} flex-1 whitespace-nowrap`}
        >
          Fit width
        </button>
        <button
          type="button"
          onClick={onActualSize}
          aria-pressed={mode === 'actual'}
          title="Actual size — scroll to read the full sheet"
          className={`${PREVIEW_SEGMENT_CLASS} max-sm:bg-surface-base max-sm:text-text-theme-primary flex-1 whitespace-nowrap max-sm:font-semibold`}
        >
          100%
        </button>
      </div>
    </div>
  );
}
