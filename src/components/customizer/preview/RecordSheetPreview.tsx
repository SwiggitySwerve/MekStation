/**
 * Record Sheet Preview Component
 *
 * Renders a live preview of the BattleMech record sheet on a canvas.
 * Updates automatically when unit configuration changes.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';

import { usePreviewValidation } from '@/hooks/useUnitValidation';
import { recordSheetService } from '@/services/printing/RecordSheetService';
import { useUnitStore } from '@/stores/useUnitStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import {
  buildCriticalSlotsFromEquipment,
  buildPreviewUnitConfig,
  buildRecordSheetEquipment,
  calculatePreviewBattleValueAndCost,
  getMovementProfile,
} from './recordSheetPreview.logic';
import { RecordSheetPreviewValidationBanner } from './RecordSheetPreviewValidationBanner';
import { RecordSheetPreviewZoomControls } from './RecordSheetPreviewZoomControls';

interface RecordSheetPreviewProps {
  /** Paper size for rendering */
  paperSize?: PaperSize;
  /** Initial scale factor for display */
  scale?: number;
  /** CSS class name */
  className?: string;
}

export function RecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale: initialScale = 0.8,
  className = '',
}: RecordSheetPreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialScale);

  const fitToWidth = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32;
      const { width } = PAPER_DIMENSIONS[paperSize];
      const fitScale = containerWidth / width;
      setZoom(Math.min(fitScale, 3.0));
    }
  }, [paperSize]);

  const fitToHeight = useCallback(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight - 32;
      const { height } = PAPER_DIMENSIONS[paperSize];
      const fitScale = containerHeight / height;
      setZoom(Math.min(fitScale, 3.0));
    }
  }, [paperSize]);

  useEffect(() => {
    fitToWidth();
  }, [fitToWidth]);

  const zoomIn = useCallback(() => {
    setZoom((value) => Math.min(value + 0.15, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((value) => Math.max(value - 0.15, 0.2));
  }, []);

  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const configuration = useUnitStore((s) => s.configuration);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const armorType = useUnitStore((s) => s.armorType);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const enhancement = useUnitStore((s) => s.enhancement);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const equipment = useUnitStore((s) => s.equipment);

  const { walkMP, runMP } = useMemo(
    () => getMovementProfile(engineRating, tonnage),
    [engineRating, tonnage],
  );

  const validation = usePreviewValidation();

  const { battleValue, cost } = useMemo(() => {
    return calculatePreviewBattleValueAndCost({
      name,
      chassis,
      model,
      tonnage,
      techBase,
      engineType,
      engineRating,
      walkMP,
      internalStructureType,
      gyroType,
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      equipment,
    });
  }, [
    name,
    chassis,
    model,
    tonnage,
    techBase,
    engineType,
    engineRating,
    walkMP,
    internalStructureType,
    gyroType,
    cockpitType,
    armorType,
    armorAllocation,
    heatSinkType,
    heatSinkCount,
    equipment,
  ]);

  const previewEquipment = useMemo(
    () => buildRecordSheetEquipment(equipment),
    [equipment],
  );

  const criticalSlots = useMemo(
    () => buildCriticalSlotsFromEquipment(equipment),
    [equipment],
  );

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const unitConfig = buildPreviewUnitConfig({
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      configuration,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      walkMP,
      runMP,
      jumpMP,
      equipment: previewEquipment,
      criticalSlots,
      enhancement,
      battleValue,
      cost,
    });

    try {
      const data = recordSheetService.extractData(unitConfig);
      await recordSheetService.renderPreview(canvas, data, paperSize);
    } catch (error) {
      logger.error('Error rendering record sheet preview:', error);

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
  }, [
    name,
    chassis,
    model,
    tonnage,
    techBase,
    rulesLevel,
    year,
    configuration,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    armorType,
    armorAllocation,
    heatSinkType,
    heatSinkCount,
    walkMP,
    runMP,
    jumpMP,
    previewEquipment,
    criticalSlots,
    enhancement,
    battleValue,
    cost,
    paperSize,
  ]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const { width, height } = PAPER_DIMENSIONS[paperSize];
  const displayWidth = width * zoom;
  const displayHeight = height * zoom;

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <RecordSheetPreviewValidationBanner
        issues={validation.issues}
        errorCount={validation.errorCount}
        warningCount={validation.warningCount}
      />

      <div
        ref={containerRef}
        style={{
          flex: 1,
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
          style={{
            width: displayWidth,
            height: displayHeight,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            backgroundColor: '#fff',
          }}
        />
      </div>

      <RecordSheetPreviewZoomControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToWidth={fitToWidth}
        onFitToHeight={fitToHeight}
      />
    </div>
  );
}

export function useRecordSheetCanvas(): React.RefObject<HTMLCanvasElement | null> {
  return useRef<HTMLCanvasElement | null>(null);
}
