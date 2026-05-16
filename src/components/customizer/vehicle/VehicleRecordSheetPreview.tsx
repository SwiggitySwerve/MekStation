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

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Render the record sheet onto the canvas via the service layer.
  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const data = getRecordSheetService().extractData(unitObject);
      await getRecordSheetService().renderPreview(canvas, data, paperSize);
    } catch (error) {
      // A render failure must not crash the customizer — draw an error card.
      logger.error('Error rendering vehicle record sheet preview:', error);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { width, height } = PAPER_DIMENSIONS[paperSize];
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#f00';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Error rendering record sheet', width / 2, height / 2);
      }
    }
  }, [unitObject, paperSize]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'auto',
        padding: '16px',
        backgroundColor: '#2a2a3e',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="vehicle-record-sheet-canvas"
        style={{
          width: width * scale,
          height: height * scale,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          backgroundColor: '#fff',
        }}
      />
    </div>
  );
}
