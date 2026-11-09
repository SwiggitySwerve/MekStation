/**
 * Live BattleMech record-sheet canvas.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, { useMemo, useRef } from 'react';

import type { IUnitConfig } from '@/services/printing/recordsheet/types';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { usePreviewValidation } from '@/hooks/useUnitValidation';
import { useUnitStore } from '@/stores/useUnitStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { useMechStructureFields } from '../tabs/useMechStructureFields';
import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from './RecordSheetCanvasPreview';
import {
  buildBattleMechPreviewProjection,
  type PreviewUnitState,
} from './recordSheetPreview.logic';
import { RecordSheetPreviewValidationBanner } from './RecordSheetPreviewValidationBanner';

interface RecordSheetPreviewProps {
  paperSize?: PaperSize;
  scale?: number;
  className?: string;
  /** Prebuilt projection shared with PDF and print actions. */
  unitConfig?: IUnitConfig;
}

export function RecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.8,
  className = '',
  unitConfig,
}: RecordSheetPreviewProps): React.ReactElement {
  const { isReady: equipmentRegistryReady } = useEquipmentRegistry();

  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const role = useUnitStore((s) => s.role);
  const configuration = useUnitStore((s) => s.configuration);
  const {
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
  } = useMechStructureFields();
  const armorType = useUnitStore((s) => s.armorType);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const enhancement = useUnitStore((s) => s.enhancement);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const equipment = useUnitStore((s) => s.equipment);
  const bvContext = useUnitStore((s) => s.bvContext);
  const crewSeats = useUnitStore((s) => s.crewSeats);

  const previewState = useMemo<PreviewUnitState>(
    () => ({
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      role,
      configuration,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      enhancement,
      jumpMP,
      equipment,
      bvContext,
      crewSeats,
    }),
    [
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      role,
      configuration,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      enhancement,
      jumpMP,
      equipment,
      bvContext,
      crewSeats,
    ],
  );

  const resolvedUnitConfig = useMemo(
    () =>
      unitConfig ??
      buildBattleMechPreviewProjection(previewState, equipmentRegistryReady)
        .unitConfig,
    [unitConfig, previewState, equipmentRegistryReady],
  );

  const validation = usePreviewValidation();
  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject: resolvedUnitConfig,
    paperSize,
    errorMessage: 'Error rendering BattleMech record sheet preview:',
  });
  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <RecordSheetPreviewValidationBanner
        issues={validation.issues}
        errorCount={validation.errorCount}
        warningCount={validation.warningCount}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        <RecordSheetCanvasPreview
          canvasRef={canvasRef}
          testId="battlemech-record-sheet-canvas"
          width={width}
          height={height}
          scale={scale}
        />
      </div>
    </div>
  );
}

export function useRecordSheetCanvas(): React.RefObject<HTMLCanvasElement | null> {
  return useRef<HTMLCanvasElement | null>(null);
}
