/**
 * VehicleRecordSheetPreview — on-canvas vehicle record sheet preview
 *
 * The mech `RecordSheetPreview` hard-calls `useUnitStore` and crashes inside a
 * non-mech customizer. This is the vehicle equivalent: it reads ONLY the
 * vehicle store (`useVehicleStore`), builds an `IVehicleUnitConfig`-shaped
 * object, and renders it through `RecordSheetService.extractData` →
 * `renderPreview` onto a canvas.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React from 'react';

import { PAPER_DIMENSIONS, PaperSize } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../preview/RecordSheetCanvasPreview';
import { useVehicleRecordSheetUnit } from './useVehicleRecordSheetUnit';

interface VehicleRecordSheetPreviewProps {
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Display scale factor. */
  scale?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Renders a live vehicle record sheet onto a canvas, re-rendering whenever the
 * vehicle store changes. Mounted only inside a `VehicleStoreContext`.
 */
export function VehicleRecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.75,
  className = '',
}: VehicleRecordSheetPreviewProps): React.ReactElement {
  const unitObject = useVehicleRecordSheetUnit();

  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize,
    errorMessage: 'Error rendering vehicle record sheet preview:',
  });
  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId="vehicle-record-sheet-canvas"
      width={width}
      height={height}
      scale={scale}
      className={className}
    />
  );
}
