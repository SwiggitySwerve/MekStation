import React from 'react';

import type { IRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';

import { AppIcon } from '@/components/ui/AppIcon';
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

/**
 * Whether the scrolling viewer has more of the sheet below what is shown.
 * Re-checked on scroll, on resize and whenever the zoom redraws the sheet.
 */
function useMoreBelow(
  containerRef: React.RefObject<HTMLDivElement | null>,
  zoom: number,
): boolean {
  const [moreBelow, setMoreBelow] = React.useState(false);
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = (): void =>
      setMoreBelow(
        container.scrollTop + container.clientHeight <
          container.scrollHeight - 1,
      );
    update();
    container.addEventListener('scroll', update, { passive: true });
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(container);
    return () => {
      container.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [containerRef, zoom]);
  return moreBelow;
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
  const moreBelow = useMoreBelow(containerRef, zoom);

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
        style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}
      >
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            overflow: 'auto',
            backgroundColor: 'var(--surface-deep)',
          }}
        >
          {/* The padding lives on this wrapper (not the scroll container) so a
              zoomed sheet keeps the same 24px gutter on its right edge when it
              scrolls. Phones trim the top gutter so the sheet starts higher. */}
          <div
            className="shrink-0 p-6 max-sm:pt-3"
            style={{ margin: '0 auto' }}
          >
            <canvas
              ref={canvasRef}
              data-testid={testId}
              style={{
                display: 'block',
                flexShrink: 0,
                width: width * zoom,
                height: height * zoom,
                // A hairline edge and a deep drop shadow lift the white sheet
                // off the dark viewer.
                boxShadow:
                  '0 0 0 1px rgba(255, 255, 255, 0.08), 0 10px 28px rgba(0, 0, 0, 0.6)',
                backgroundColor: '#fff',
              }}
            />
          </div>
        </div>
        {/* While the sheet continues below, it fades into the viewer and a
            cue says so, so the cut-off reads as scrolling, not clipped. */}
        {moreBelow ? (
          <>
            <div
              aria-hidden="true"
              data-testid="preview-sheet-fade"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[var(--surface-deep)]"
            />
            <p
              aria-hidden="true"
              data-testid="preview-sheet-scroll-cue"
              className="border-border-theme bg-surface-raised text-text-theme-primary pointer-events-none absolute bottom-2 left-1/2 m-0 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap shadow-lg"
            >
              <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
              Scroll for the rest of the sheet
            </p>
          </>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
