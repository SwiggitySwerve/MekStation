/**
 * Live BattleMech record-sheet canvas.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, { useMemo, useRef } from 'react';

import type { IUnitConfig } from '@/services/printing/recordsheet/types';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { usePreviewValidation } from '@/hooks/useUnitValidation';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import {
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from './RecordSheetCanvasPreview';
import { buildBattleMechPreviewProjection } from './recordSheetPreview.logic';
import { RecordSheetPreviewValidationBanner } from './RecordSheetPreviewValidationBanner';
import { usePreviewUnitState } from './usePreviewUnitState';

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

  // Same unit state as PreviewTab: the one owner's BV projection input plus the sheet-only fields.
  const previewState = usePreviewUnitState();

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
