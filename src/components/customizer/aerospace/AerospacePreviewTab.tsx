/**
 * AerospacePreviewTab — Preview tab body for the aerospace customizer
 *
 * Aerospace equivalent of the mech `PreviewTab`: reads ONLY the aerospace
 * store, builds an `IAerospaceRecordSheetUnitInput` object, and wires the
 * Download-PDF / Print toolbar actions to `RecordSheetService`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import React, { useMemo, useState } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { useRecordSheetToolbarActions } from '../preview/RecordSheetCanvasPreview';
import { AerospaceRecordSheetPreview } from './AerospaceRecordSheetPreview';
import { buildAerospaceUnitObject } from './buildAerospaceUnitObject';

interface AerospacePreviewTabProps {
  /** Read-only mode (ignored for preview). */
  _readOnly?: boolean;
  /** CSS class name. */
  className?: string;
}

/**
 * Aerospace Preview tab — toolbar + on-canvas record sheet for the active
 * aerospace fighter. Mounted only inside an `AerospaceStoreContext`.
 */
export function AerospacePreviewTab({
  _readOnly = false,
  className = '',
}: AerospacePreviewTabProps): React.ReactElement {
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);

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

  const previewScale = 0.75;
  const toolbarActions = useRecordSheetToolbarActions(
    unitObject,
    paperSize,
    setPaperSize,
  );

  return (
    <PreviewTabFrame
      className={className}
      testId="aerospace-preview-tab"
      toolbarActions={toolbarActions}
    >
      <AerospaceRecordSheetPreview paperSize={paperSize} scale={previewScale} />
    </PreviewTabFrame>
  );
}
