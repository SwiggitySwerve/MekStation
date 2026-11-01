/**
 * VehiclePreviewTab — Preview tab body for the vehicle customizer
 *
 * The mech `PreviewTab` hard-calls `useUnitStore` and crashes inside the
 * vehicle customizer. This is the vehicle equivalent: it reads ONLY the
 * vehicle store, builds an `IVehicleRecordSheetUnitInput` object, and wires
 * the Download-PDF / Print toolbar actions to `RecordSheetService`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import React, { useState } from 'react';

import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
import { useVehicleRecordSheetUnit } from './useVehicleRecordSheetUnit';
import { VehicleRecordSheetPreview } from './VehicleRecordSheetPreview';

interface VehiclePreviewTabProps {
  /** Read-only mode (ignored for preview). */
  _readOnly?: boolean;
  /** CSS class name. */
  className?: string;
}

/**
 * Vehicle Preview tab — toolbar + on-canvas record sheet for the active
 * vehicle. Mounted only inside a `VehicleStoreContext`.
 */
export function VehiclePreviewTab({
  _readOnly = false,
  className = '',
}: VehiclePreviewTabProps): React.ReactElement {
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);

  const unitObject = useVehicleRecordSheetUnit();

  const toolbarActions = useRecordSheetToolbarActions(
    unitObject,
    paperSize,
    setPaperSize,
  );

  return (
    <PreviewTabFrame
      className={className}
      testId="vehicle-preview-tab"
      toolbarActions={toolbarActions}
    >
      <VehicleRecordSheetPreview paperSize={paperSize} scale={0.75} />
    </PreviewTabFrame>
  );
}
