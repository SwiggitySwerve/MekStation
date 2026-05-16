/**
 * AerospaceRecordSheetPreview — on-canvas aerospace record sheet preview
 *
 * Aerospace equivalent of the mech `RecordSheetPreview`: reads ONLY the
 * aerospace store, builds an `IAerospaceRecordSheetUnitInput` object, and
 * renders it through `RecordSheetService.extractData` → `renderPreview`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import { buildAerospaceUnitObject } from './buildAerospaceUnitObject';

interface AerospaceRecordSheetPreviewProps {
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Display scale factor. */
  scale?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Renders a live aerospace record sheet onto a canvas. Mounted only inside an
 * `AerospaceStoreContext`.
 */
export function AerospaceRecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.75,
  className = '',
}: AerospaceRecordSheetPreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const id = useAerospaceStore((s) => s.id);
  const name = useAerospaceStore((s) => s.name);
  const chassis = useAerospaceStore((s) => s.chassis);
  const model = useAerospaceStore((s) => s.model);
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const techBase = useAerospaceStore((s) => s.techBase);
  const rulesLevel = useAerospaceStore((s) => s.rulesLevel);
  const year = useAerospaceStore((s) => s.year);
  const unitType = useAerospaceStore((s) => s.unitType);
  const structuralIntegrity = useAerospaceStore((s) => s.structuralIntegrity);
  const fuelPoints = useAerospaceStore((s) => s.fuelPoints);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const maxThrust = useAerospaceStore((s) => s.maxThrust);
  const heatSinks = useAerospaceStore((s) => s.heatSinks);
  const doubleHeatSinks = useAerospaceStore((s) => s.doubleHeatSinks);
  const armorType = useAerospaceStore((s) => s.armorType);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const hasBombBay = useAerospaceStore((s) => s.hasBombBay);
  const bombCapacity = useAerospaceStore((s) => s.bombCapacity);
  const equipment = useAerospaceStore((s) => s.equipment);

  const unitObject = useMemo(
    () =>
      buildAerospaceUnitObject({
        id,
        name,
        chassis,
        model,
        tonnage,
        techBase,
        rulesLevel,
        year,
        unitType,
        structuralIntegrity,
        fuelPoints,
        safeThrust,
        maxThrust,
        heatSinks,
        doubleHeatSinks,
        armorType,
        armorAllocation,
        hasBombBay,
        bombCapacity,
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
      structuralIntegrity,
      fuelPoints,
      safeThrust,
      maxThrust,
      heatSinks,
      doubleHeatSinks,
      armorType,
      armorAllocation,
      hasBombBay,
      bombCapacity,
      equipment,
    ],
  );

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const data = getRecordSheetService().extractData(unitObject);
      await getRecordSheetService().renderPreview(canvas, data, paperSize);
    } catch (error) {
      logger.error('Error rendering aerospace record sheet preview:', error);
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
        data-testid="aerospace-record-sheet-canvas"
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
