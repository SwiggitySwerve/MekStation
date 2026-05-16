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

import React, { useCallback, useMemo, useState } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PreviewToolbar } from '../preview/PreviewToolbar';
import { buildVehicleUnitObject } from './buildVehicleUnitObject';
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

  // Extract record-sheet data and download a PDF for the vehicle.
  const handleExportPDF = useCallback(async () => {
    const data = getRecordSheetService().extractData(unitObject);
    await getRecordSheetService().exportPDF(data, {
      paperSize,
      includePilotData: false,
    });
  }, [unitObject, paperSize]);

  // Render to an off-screen canvas and open the browser print dialog.
  const handlePrint = useCallback(async () => {
    const tempCanvas = document.createElement('canvas');
    const { width, height } = PAPER_DIMENSIONS[paperSize];
    tempCanvas.width = width;
    tempCanvas.height = height;

    const data = getRecordSheetService().extractData(unitObject);
    await getRecordSheetService().renderPreview(tempCanvas, data, paperSize);
    getRecordSheetService().print(tempCanvas);
  }, [unitObject, paperSize]);

  return (
    <div
      className={`preview-tab ${className}`}
      data-testid="vehicle-preview-tab"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1a1a2e',
      }}
    >
      <PreviewToolbar
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <VehicleRecordSheetPreview paperSize={paperSize} scale={0.75} />
      </div>
    </div>
  );
}
