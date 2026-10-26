import React from 'react';

import { SvgIcon } from '@/components/ui/SvgIcon';

import type { RecordSheetPreviewZoomMode } from './recordSheetPreviewZoom';

import {
  PREVIEW_CONTROL_CLASS,
  PREVIEW_SEGMENT_CLASS,
  PREVIEW_SEGMENT_GROUP_CLASS,
} from './previewToolbarStyles';
import { formatZoomPercent } from './recordSheetPreviewZoom';

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

/** Square 44px stepper button (zoom out / zoom in). */
const STEP_BUTTON_CLASS = `${PREVIEW_CONTROL_CLASS} inline-flex w-11 min-w-11 shrink-0 items-center justify-center px-0!`;

/**
 * Zoom stepper (- Zoom 150% +) beside a segmented Fit page / Fit width / 100%
 * control. The readout is plain tabular text between the two step buttons
 * ("Zoom" is spelled out from the sm breakpoint up; phones show the percentage);
 * only the pressed fit segment is highlighted. Stepping the zoom leaves all
 * three segments unpressed (manual zoom). Every control keeps its visible
 * text label on phones.
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
      className={`flex w-full min-w-0 items-center gap-2 sm:w-auto ${className}`}
      role="group"
      aria-label="Record sheet zoom controls"
    >
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className={STEP_BUTTON_CLASS}
        >
          <SvgIcon size="inline" aria-hidden="true">
            <circle cx="10" cy="10" r="7" />
            <path d="m15 15 7 7M7 10h6" />
          </SvgIcon>
        </button>
        {/* Plain text, not a control: the pressed segment names the mode,
            and "Zoom" (desktop) keeps the percentage from reading as a
            mode. */}
        <output
          className="text-text-theme-primary inline-flex min-w-12 items-center justify-center text-center text-[13px] font-medium whitespace-nowrap tabular-nums sm:min-w-[4.5rem]"
          aria-live="polite"
          aria-label="Current zoom"
        >
          <span className="text-text-theme-secondary mr-1 hidden sm:inline">
            Zoom{' '}
          </span>
          {formatZoomPercent(zoom)}
        </output>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className={STEP_BUTTON_CLASS}
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
          title={'Actual size \u2014 scroll to read the full sheet'}
          className={`${PREVIEW_SEGMENT_CLASS} flex-1 whitespace-nowrap`}
        >
          100%
        </button>
      </div>
    </div>
  );
}
