/**
 * Preview Tab Component
 *
 * Displays a live record sheet preview with export options.
 * Integrates with the customizer tab system.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';

import { getCalculationService } from '@/services/construction/CalculationService';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useUnitStore } from '@/stores/useUnitStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { RecordSheetPreview } from '../preview/RecordSheetPreview';
import {
  buildEditableMech,
  buildPreviewUnitConfig,
} from './PreviewTab.builders';
import { useMechStructureFields } from './useMechStructureFields';

// =============================================================================
// Types
// =============================================================================

interface PreviewTabProps {
  /** Read-only mode (ignored for preview) */
  _readOnly?: boolean;
  /** CSS class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Preview Tab Component
 *
 * Provides record sheet preview and export functionality.
 */
export function PreviewTab({
  _readOnly = false,
  className = '',
}: PreviewTabProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);

  // Get unit state from store
  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
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

  // Calculate movement
  const walkMP = engineRating > 0 ? Math.floor(engineRating / tonnage) : 0;
  const runMP = Math.ceil(walkMP * 1.5);

  const previewState = useMemo(
    () => ({
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
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      enhancement,
      jumpMP,
      equipment,
    }),
    [
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
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      enhancement,
      jumpMP,
      equipment,
    ],
  );

  /**
   * Convert store state to IEditableMech format for BV calculation
   */
  const editableMech = useMemo(
    () => buildEditableMech(previewState, walkMP),
    [previewState, walkMP],
  );

  /**
   * Calculate Battle Value using the calculation service
   */
  const battleValue = useMemo(() => {
    try {
      return getCalculationService().calculateBattleValue(editableMech);
    } catch (error) {
      logger.warn('Failed to calculate BV:', error);
      return 0;
    }
  }, [editableMech]);

  /**
   * Calculate C-Bill cost using the calculation service
   */
  const cost = useMemo(() => {
    try {
      return getCalculationService().calculateCost(editableMech);
    } catch (error) {
      logger.warn('Failed to calculate cost:', error);
      return 0;
    }
  }, [editableMech]);

  /**
   * Build unit config from store state
   */
  const buildUnitConfig = useCallback(
    () =>
      buildPreviewUnitConfig(previewState, walkMP, runMP, battleValue, cost),
    [previewState, walkMP, runMP, battleValue, cost],
  );

  /**
   * Handle PDF export using SVG template rendering
   */
  const handleExportPDF = useCallback(async () => {
    const unitConfig = buildUnitConfig();
    const data = getRecordSheetService().extractData(unitConfig);

    await getRecordSheetService().exportPDF(data, {
      paperSize,
      includePilotData: false,
    });
  }, [buildUnitConfig, paperSize]);

  /**
   * Handle print
   */
  const handlePrint = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Create a temporary canvas for printing
      const tempCanvas = document.createElement('canvas');
      const { width, height } = PAPER_DIMENSIONS[paperSize];
      tempCanvas.width = width;
      tempCanvas.height = height;

      const unitConfig = buildUnitConfig();
      const data = getRecordSheetService().extractData(unitConfig);
      await getRecordSheetService().renderPreview(tempCanvas, data, paperSize);
      getRecordSheetService().print(tempCanvas);
    } else {
      getRecordSheetService().print(canvas);
    }
  }, [buildUnitConfig, paperSize]);

  /**
   * Capture canvas ref from preview component
   */
  const handleCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  const toolbarActions = useMemo(
    () => ({
      onExportPDF: handleExportPDF,
      onPrint: handlePrint,
      paperSize,
      onPaperSizeChange: setPaperSize,
    }),
    [handleExportPDF, handlePrint, paperSize],
  );

  return (
    <PreviewTabFrame className={className} toolbarActions={toolbarActions}>
      <RecordSheetPreviewWithRef
        paperSize={paperSize}
        scale={0.75}
        onCanvasRef={handleCanvasRef}
      />
    </PreviewTabFrame>
  );
}

// =============================================================================
// Helper Component
// =============================================================================

interface RecordSheetPreviewWithRefProps {
  paperSize: PaperSize;
  scale: number;
  onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

/**
 * RecordSheetPreview wrapper that exposes canvas ref
 */
function RecordSheetPreviewWithRef({
  paperSize,
  scale,
  onCanvasRef,
}: RecordSheetPreviewWithRefProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract canvas ref after render
  useEffect(() => {
    if (containerRef.current) {
      const canvas = containerRef.current.querySelector('canvas');
      onCanvasRef(canvas);
    }
    return () => onCanvasRef(null);
  }, [onCanvasRef]);

  return (
    <div ref={containerRef}>
      <RecordSheetPreview paperSize={paperSize} scale={scale} />
    </div>
  );
}
