import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { IRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';

import { PaperSize } from '@/types/printing';

import {
  printUnitRecordSheet,
  RecordSheetCanvasPreview,
  useRecordSheetCanvasRenderer,
} from '../RecordSheetCanvasPreview';

type PendingRender = {
  canvas: HTMLCanvasElement;
  id: string;
  resolve: () => void;
};

const pendingRenders: PendingRender[] = [];

const mockExtractData = jest.fn((unit: { id: string }) => ({
  unitType: 'mech' as const,
  id: unit.id,
}));
const mockRenderPreview = jest.fn(
  (canvas: HTMLCanvasElement, data: { id: string }) =>
    new Promise<void>((resolve) => {
      pendingRenders.push({
        canvas,
        id: data.id,
        resolve: () => {
          canvas.width = data.id === 'old' ? 111 : 222;
          canvas.height = 50;
          resolve();
        },
      });
    }),
);
const mockPrintRecordSheet = jest.fn(async () => undefined);
const mockPrint = jest.fn();
const mockExportPDF = jest.fn(async () => undefined);

jest.mock('@/services/printing/RecordSheetService', () => ({
  getRecordSheetService: () => ({
    extractData: mockExtractData,
    renderPreview: mockRenderPreview,
    printRecordSheet: mockPrintRecordSheet,
    print: mockPrint,
    exportPDF: mockExportPDF,
  }),
}));

function unit(id: string): IRecordSheetUnitInput {
  return { id } as IRecordSheetUnitInput;
}

function RendererHarness({
  unitObject,
}: {
  unitObject: IRecordSheetUnitInput;
}): React.ReactElement {
  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize: PaperSize.LETTER,
    errorMessage: 'Error rendering test record sheet preview:',
  });

  return <canvas ref={canvasRef} data-testid="preview-canvas" />;
}

function PreviewWithRenderer({
  unitObject,
}: {
  unitObject: IRecordSheetUnitInput;
}): React.ReactElement {
  const canvasRef = useRecordSheetCanvasRenderer({
    unitObject,
    paperSize: PaperSize.LETTER,
    errorMessage: 'Error rendering test record sheet preview:',
  });

  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId="sheet-canvas"
      width={612}
      height={792}
      scale={0.8}
    />
  );
}

describe('record sheet preview async rendering and print', () => {
  beforeEach(() => {
    pendingRenders.length = 0;
    mockExtractData.mockClear();
    mockRenderPreview.mockClear();
    mockPrintRecordSheet.mockClear();
    mockPrint.mockClear();
    mockExportPDF.mockClear();
  });

  it('does not let an older render overwrite a newer one', async () => {
    const { rerender } = render(<RendererHarness unitObject={unit('old')} />);

    await waitFor(() => expect(pendingRenders).toHaveLength(1));
    rerender(<RendererHarness unitObject={unit('new')} />);
    await waitFor(() => expect(pendingRenders).toHaveLength(2));

    await act(async () => {
      pendingRenders[1]?.resolve();
    });
    await act(async () => {
      pendingRenders[0]?.resolve();
    });

    expect(screen.getByTestId('preview-canvas')).toHaveProperty('width', 222);
  });

  it('does not commit a render after unmount', async () => {
    const { container, unmount } = render(
      <RendererHarness unitObject={unit('old')} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    const widthBefore = canvas?.width;

    await waitFor(() => expect(pendingRenders).toHaveLength(1));
    unmount();

    await act(async () => {
      pendingRenders[0]?.resolve();
    });

    expect(canvas?.width).toBe(widthBefore);
  });

  it('does not regenerate the sheet when only zoom changes', async () => {
    const user = userEvent.setup();
    render(<PreviewWithRenderer unitObject={unit('live')} />);

    await waitFor(() => expect(mockRenderPreview).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom options' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Fit Width' }));

    expect(mockRenderPreview).toHaveBeenCalledTimes(1);
  });

  it('calls printRecordSheet after synchronous extractData', async () => {
    const order: string[] = [];
    mockExtractData.mockImplementation((input: { id: string }) => {
      order.push('extractData');
      return { unitType: 'mech' as const, id: input.id };
    });
    mockPrintRecordSheet.mockImplementation(async () => {
      order.push('printRecordSheet');
    });
    mockRenderPreview.mockImplementation(async () => {
      order.push('renderPreview');
    });
    mockPrint.mockImplementation(() => {
      order.push('print');
    });

    await printUnitRecordSheet(unit('print-me'), PaperSize.A4);

    expect(order).toEqual(['extractData', 'printRecordSheet']);
    expect(mockPrintRecordSheet).toHaveBeenCalledWith(
      { unitType: 'mech', id: 'print-me' },
      PaperSize.A4,
    );
    expect(mockRenderPreview).not.toHaveBeenCalled();
    expect(mockPrint).not.toHaveBeenCalled();
  });
});
