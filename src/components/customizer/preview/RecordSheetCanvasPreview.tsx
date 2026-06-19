import React from 'react';

import type { IRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import type { PreviewToolbarActions } from './PreviewTabFrame';

interface RenderUnitRecordSheetPreviewInput {
  canvas: HTMLCanvasElement;
  unitObject: IRecordSheetUnitInput;
  paperSize: PaperSize;
  errorMessage: string;
}

interface UseRecordSheetCanvasRendererInput {
  unitObject: IRecordSheetUnitInput;
  paperSize: PaperSize;
  errorMessage: string;
}

export async function exportUnitRecordSheetPDF(
  unitObject: IRecordSheetUnitInput,
  paperSize: PaperSize,
): Promise<void> {
  const data = getRecordSheetService().extractData(unitObject);
  await getRecordSheetService().exportPDF(data, {
    paperSize,
    includePilotData: false,
  });
}

export async function printUnitRecordSheet(
  unitObject: IRecordSheetUnitInput,
  paperSize: PaperSize,
): Promise<void> {
  const tempCanvas = document.createElement('canvas');
  const { width, height } = PAPER_DIMENSIONS[paperSize];
  tempCanvas.width = width;
  tempCanvas.height = height;

  const data = getRecordSheetService().extractData(unitObject);
  await getRecordSheetService().renderPreview(tempCanvas, data, paperSize);
  getRecordSheetService().print(tempCanvas);
}

export async function renderUnitRecordSheetPreview({
  canvas,
  unitObject,
  paperSize,
  errorMessage,
}: RenderUnitRecordSheetPreviewInput): Promise<void> {
  try {
    const data = getRecordSheetService().extractData(unitObject);
    await getRecordSheetService().renderPreview(canvas, data, paperSize);
  } catch (error) {
    logger.error(errorMessage, error);
    drawRecordSheetRenderError(canvas, paperSize);
  }
}

export function drawRecordSheetRenderError(
  canvas: HTMLCanvasElement,
  paperSize: PaperSize,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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

export function useRecordSheetToolbarActions(
  unitObject: IRecordSheetUnitInput,
  paperSize: PaperSize,
  onPaperSizeChange: (paperSize: PaperSize) => void,
): PreviewToolbarActions {
  const onExportPDF = React.useCallback(async () => {
    await exportUnitRecordSheetPDF(unitObject, paperSize);
  }, [unitObject, paperSize]);

  const onPrint = React.useCallback(async () => {
    await printUnitRecordSheet(unitObject, paperSize);
  }, [unitObject, paperSize]);

  return React.useMemo(
    () => ({
      onExportPDF,
      onPrint,
      paperSize,
      onPaperSizeChange,
    }),
    [onExportPDF, onPrint, paperSize, onPaperSizeChange],
  );
}

export function useRecordSheetCanvasRenderer({
  unitObject,
  paperSize,
  errorMessage,
}: UseRecordSheetCanvasRendererInput): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const renderPreview = React.useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await renderUnitRecordSheetPreview({
      canvas,
      unitObject,
      paperSize,
      errorMessage,
    });
  }, [unitObject, paperSize, errorMessage]);

  React.useEffect(() => {
    void renderPreview();
  }, [renderPreview]);

  return canvasRef;
}

interface RecordSheetCanvasPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  testId: string;
  width: number;
  height: number;
  scale: number;
  className?: string;
}

export function RecordSheetCanvasPreview({
  canvasRef,
  testId,
  width,
  height,
  scale,
  className = '',
}: RecordSheetCanvasPreviewProps): React.ReactElement {
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
        data-testid={testId}
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
