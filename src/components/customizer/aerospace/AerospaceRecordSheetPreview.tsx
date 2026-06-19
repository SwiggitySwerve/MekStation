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

import React, { useMemo } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { PAPER_DIMENSIONS, PaperSize } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../preview/RecordSheetCanvasPreview';
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

  const canvasTestId = 'aerospace-record-sheet-canvas';
  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize,
    errorMessage: 'Error rendering aerospace record sheet preview:',
  });
  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId={canvasTestId}
      width={width}
      height={height}
      scale={scale}
      className={className}
    />
  );
}
