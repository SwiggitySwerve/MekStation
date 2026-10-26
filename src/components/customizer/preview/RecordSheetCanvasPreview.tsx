import React from 'react';

import type { IRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import type { PreviewToolbarActions } from './PreviewTabFrame';

import { RecordSheetPreviewZoomControls } from './RecordSheetPreviewZoomControls';
import {
  RecordSheetPreviewZoomContext,
  useRecordSheetPreviewZoom,
  type RecordSheetPreviewZoom,
} from './useRecordSheetPreviewZoom';

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
  const service = getRecordSheetService();
  const data = service.extractData(unitObject);
  await service.printRecordSheet(data, paperSize);
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
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1e293b';
  ctx.font = '600 20px sans-serif';
  ctx.fillText('Record sheet unavailable', width / 2, height / 2 - 14);
  ctx.fillStyle = '#475569';
  ctx.font = '14px sans-serif';
  ctx.fillText(
    'The sheet could not be drawn. Reload the page to try again.',
    width / 2,
    height / 2 + 14,
  );
}

function commitStagedRecordSheetPreview(
  target: HTMLCanvasElement,
  staging: HTMLCanvasElement,
): void {
  target.width = staging.width;
  target.height = staging.height;
  if (staging.width === 0 || staging.height === 0) return;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(staging, 0, 0);
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
  const generationRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    const generation = ++generationRef.current;
    const staging = document.createElement('canvas');

    void (async () => {
      await renderUnitRecordSheetPreview({
        canvas: staging,
        unitObject,
        paperSize,
        errorMessage,
      });
      if (!mountedRef.current || generation !== generationRef.current) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      commitStagedRecordSheetPreview(canvas, staging);
    })();
  }, [errorMessage, paperSize, unitObject]);

  return canvasRef;
}

interface RecordSheetCanvasPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  testId: string;
  width: number;
  height: number;
  scale?: number;
  className?: string;
}

/**
 * Scrollable sheet viewer. Inside a `PreviewTabFrame` it follows the zoom the
 * toolbar controls; on its own it keeps a control row under the sheet.
 */
export function RecordSheetCanvasPreview(
  props: RecordSheetCanvasPreviewProps,
): React.ReactElement {
  const sharedZoom = React.useContext(RecordSheetPreviewZoomContext);
  return sharedZoom ? (
    <RecordSheetViewer {...props} zoomState={sharedZoom} />
  ) : (
    <StandaloneRecordSheetViewer {...props} />
  );
}

function StandaloneRecordSheetViewer(
  props: RecordSheetCanvasPreviewProps,
): React.ReactElement {
  const zoomState = useRecordSheetPreviewZoom(props.width, props.height);
  const { zoom, mode, zoomIn, zoomOut, fitToWidth, fitToPage, actualSize } =
    zoomState;
  return (
    <RecordSheetViewer
      {...props}
      zoomState={zoomState}
      footer={
        <RecordSheetPreviewZoomControls
          className="border-border-theme-subtle bg-surface-base border-t p-1.5 sm:justify-end"
          zoom={zoom}
          mode={mode}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitToWidth={fitToWidth}
          onFitToPage={fitToPage}
          onActualSize={actualSize}
        />
      }
    />
  );
}

function RecordSheetViewer({
  canvasRef,
  testId,
  width,
  height,
  className = '',
  zoomState,
  footer,
}: RecordSheetCanvasPreviewProps & {
  zoomState: RecordSheetPreviewZoom;
  footer?: React.ReactNode;
}): React.ReactElement {
  const { containerRef, zoom } = zoomState;

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflow: 'auto',
          padding: '24px',
          backgroundColor: 'var(--surface-deep)',
        }}
      >
        <canvas
          ref={canvasRef}
          data-testid={testId}
          style={{
            flexShrink: 0,
            margin: 'auto',
            width: width * zoom,
            height: height * zoom,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            backgroundColor: '#fff',
          }}
        />
      </div>
      {footer}
    </div>
  );
}
