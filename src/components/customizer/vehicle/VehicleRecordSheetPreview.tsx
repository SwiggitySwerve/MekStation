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

import React, { useMemo } from 'react';

import { useVehicleStore } from '@/stores/useVehicleStore';
import { PAPER_DIMENSIONS, PaperSize } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../preview/RecordSheetCanvasPreview';
import { buildVehicleUnitObject } from './buildVehicleUnitObject';

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
  // Read every field the unit object needs directly from the vehicle store.
  const id = useVehicleStore((s) => s.id);
  const name = useVehicleStore((s) => s.name);
  const chassis = useVehicleStore((s) => s.chassis);
  const model = useVehicleStore((s) => s.model);
  const tonnage = useVehicleStore((s) => s.tonnage);
  const techBase = useVehicleStore((s) => s.techBase);
  const rulesLevel = useVehicleStore((s) => s.rulesLevel);
  const year = useVehicleStore((s) => s.year);
  const unitType = useVehicleStore((s) => s.unitType);
  const motionType = useVehicleStore((s) => s.motionType);
  const cruiseMP = useVehicleStore((s) => s.cruiseMP);
  const flankMP = useVehicleStore((s) => s.flankMP);
  const armorType = useVehicleStore((s) => s.armorType);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);
  const barRating = useVehicleStore((s) => s.barRating);
  const equipment = useVehicleStore((s) => s.equipment);

  // Build the discriminated vehicle unit object for the record-sheet service.
  const unitObject = useMemo(
    () =>
      buildVehicleUnitObject({
        id,
        name,
        chassis,
        model,
        tonnage,
        techBase,
        rulesLevel,
        year,
        unitType,
        motionType,
        cruiseMP,
        flankMP,
        armorType,
        armorAllocation,
        barRating,
        equipment,
      }),
    [
      id,
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      unitType,
      motionType,
      cruiseMP,
      flankMP,
      armorType,
      armorAllocation,
      barRating,
      equipment,
    ],
  );

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
